-- link `users` to Supabase Auth + RLS for Auth/Complaints
-- Context: schema.sql already defines `users` with its own BIGINT
-- identity PK and a `password_hash` column, but nothing actually ties a
-- row to a real Supabase Auth account (auth.users). The Edge Functions
-- in supabase/functions/ were written against a different, earlier
-- design (a `profiles` table keyed directly by auth.uid()) that was
-- never reconciled with schema.sql. This migration reconciles the two:
-- we keep the BIGINT `users.id` (everything else in the schema, 41
-- tables, already references it as a foreign key), and add a `
-- auth_user_id` column that links each row to its real auth.users
-- account. `password_hash` is no longer used, Supabase Auth now owns
-- credentials/hashing/sessions, and can be dropped later once you've
-- confirmed nothing still reads it.
--
-- Run this in the Supabase SQL editor (staging first if you have one).
-- It's safe to re-run, every statement is guarded with IF NOT EXISTS /
-- OR REPLACE / DROP POLICY IF EXISTS.

-- 1. Link users -> auth.users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- 2. Helper functions (SECURITY DEFINER so they bypass RLS internally
-- otherwise a policy on `users` that queries `users` recurses).
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS BIGINT
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_app_role() RETURNS user_role
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_app_branch_id() RETURNS BIGINT
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT branch_id FROM users WHERE auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT current_app_role() IN ('portfolio_manager','service_manager','director','admin');
$$;

CREATE OR REPLACE FUNCTION is_management() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT current_app_role() IN ('director','admin');
$$;

CREATE OR REPLACE FUNCTION is_branch_staff() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT current_app_role() IN ('portfolio_manager','service_manager');
$$;

-- 3. users / client_profiles / staff_profiles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT
  USING (auth_user_id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "users_insert_self" ON users;
CREATE POLICY "users_insert_self" ON users FOR INSERT
  WITH CHECK (auth_user_id = auth.uid() AND role = 'customer');

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE
  USING (auth_user_id = auth.uid() OR is_management())
  WITH CHECK (auth_user_id = auth.uid() OR is_management());

DROP POLICY IF EXISTS "client_profiles_select" ON client_profiles;
CREATE POLICY "client_profiles_select" ON client_profiles FOR SELECT
  USING (user_id = current_app_user_id() OR is_staff());

DROP POLICY IF EXISTS "client_profiles_insert_self" ON client_profiles;
CREATE POLICY "client_profiles_insert_self" ON client_profiles FOR INSERT
  WITH CHECK (user_id = current_app_user_id());

DROP POLICY IF EXISTS "client_profiles_update" ON client_profiles;
CREATE POLICY "client_profiles_update" ON client_profiles FOR UPDATE
  USING (user_id = current_app_user_id() OR is_staff())
  WITH CHECK (user_id = current_app_user_id() OR is_staff());

DROP POLICY IF EXISTS "staff_profiles_select" ON staff_profiles;
CREATE POLICY "staff_profiles_select" ON staff_profiles FOR SELECT
  USING (user_id = current_app_user_id() OR is_staff());

DROP POLICY IF EXISTS "staff_profiles_manage" ON staff_profiles;
CREATE POLICY "staff_profiles_manage" ON staff_profiles FOR ALL
  USING (is_management())
  WITH CHECK (is_management());

-- 4. branches, public reference data, readable by anyone signed in
-- (the public landing page reads branches via the anon key too, so
-- keep an anon-read policy as well).
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_select_all" ON branches;
CREATE POLICY "branches_select_all" ON branches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "branches_manage" ON branches;
CREATE POLICY "branches_manage" ON branches FOR ALL
  USING (is_management())
  WITH CHECK (is_management());

-- 5. complaints + related tables
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_satisfaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "complaint_categories_select" ON complaint_categories;
CREATE POLICY "complaint_categories_select" ON complaint_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "complaints_select" ON complaints;
CREATE POLICY "complaints_select" ON complaints FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR is_management()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );

DROP POLICY IF EXISTS "complaints_insert" ON complaints;
CREATE POLICY "complaints_insert" ON complaints FOR INSERT
  WITH CHECK (customer_id = current_app_user_id() OR is_staff());

DROP POLICY IF EXISTS "complaints_update" ON complaints;
CREATE POLICY "complaints_update" ON complaints FOR UPDATE
  USING (
    is_management()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  )
  WITH CHECK (
    is_management()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );

DROP POLICY IF EXISTS "complaint_timeline_select" ON complaint_timeline;
CREATE POLICY "complaint_timeline_select" ON complaint_timeline FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_timeline.complaint_id
    AND (c.customer_id = current_app_user_id() OR is_management()
         OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ));

DROP POLICY IF EXISTS "complaint_timeline_insert" ON complaint_timeline;
CREATE POLICY "complaint_timeline_insert" ON complaint_timeline FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_timeline.complaint_id
    AND (c.customer_id = current_app_user_id() OR is_management()
         OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ));

DROP POLICY IF EXISTS "complaint_escalations_all" ON complaint_escalations;
CREATE POLICY "complaint_escalations_all" ON complaint_escalations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_escalations.complaint_id
    AND (is_management() OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_escalations.complaint_id
    AND (is_management() OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ));

DROP POLICY IF EXISTS "complaint_satisfaction_select" ON complaint_satisfaction;
CREATE POLICY "complaint_satisfaction_select" ON complaint_satisfaction FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_satisfaction.complaint_id
    AND (c.customer_id = current_app_user_id() OR is_management()
         OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ));

DROP POLICY IF EXISTS "complaint_satisfaction_insert" ON complaint_satisfaction;
CREATE POLICY "complaint_satisfaction_insert" ON complaint_satisfaction FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_satisfaction.complaint_id
    AND c.customer_id = current_app_user_id()
  ));

DROP POLICY IF EXISTS "complaint_notes_select" ON complaint_notes;
CREATE POLICY "complaint_notes_select" ON complaint_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_notes.complaint_id
    AND (
      (complaint_notes.note_type = 'customer' AND c.customer_id = current_app_user_id())
      OR is_management()
      OR (is_branch_staff() AND c.branch_id = current_app_branch_id())
    )
  ));

DROP POLICY IF EXISTS "complaint_notes_insert" ON complaint_notes;
CREATE POLICY "complaint_notes_insert" ON complaint_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_notes.complaint_id
    AND (is_management() OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ));

DROP POLICY IF EXISTS "complaint_audit_log_select" ON complaint_audit_log;
CREATE POLICY "complaint_audit_log_select" ON complaint_audit_log FOR SELECT
  USING (is_staff());

DROP POLICY IF EXISTS "complaint_audit_log_insert" ON complaint_audit_log;
CREATE POLICY "complaint_audit_log_insert" ON complaint_audit_log FOR INSERT
  WITH CHECK (is_staff());

-- 6. Complaint automation, ticket numbers, updated_at, initial timeline
-- entry. Doing this in the DB (not client-side) avoids race conditions
-- on ticket numbers when multiple people submit at once.
CREATE SEQUENCE IF NOT EXISTS complaint_ticket_seq START 1;

CREATE OR REPLACE FUNCTION set_complaint_ticket() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.ticket IS NULL OR NEW.ticket = '' THEN
    NEW.ticket := 'TCN-' || lpad(nextval('complaint_ticket_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_complaint_ticket ON complaints;
CREATE TRIGGER trg_set_complaint_ticket
  BEFORE INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_complaint_ticket();

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_touch ON complaints;
CREATE TRIGGER trg_complaints_touch
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION log_complaint_created() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO complaint_timeline (complaint_id, event, status, actor)
  VALUES (NEW.id, 'Created', NEW.status, NEW.customer_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_created_timeline ON complaints;
CREATE TRIGGER trg_complaint_created_timeline
  AFTER INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION log_complaint_created();

-- 7. NOTES / TODO for you:
-- - `users.password_hash` is now unused (Supabase Auth owns
-- credentials). Safe to DROP COLUMN once you confirm nothing
-- references it, but leaving it nullable is harmless for now.
-- - Only 'customer' self-signup is allowed via RLS (see
-- users_insert_self). Staff accounts (portfolio_manager,
-- service_manager, director, marketing, admin) must be created by
-- an admin, there's no self-signup path for those roles, by
-- design. Use the Supabase dashboard or an Edge Function with the
-- service-role key for that (the admin-reset-password function is a
-- model for how to do this safely).
-- - This migration does not yet cover leads/client_portfolio/
-- knowledge_base/etc. RLS, those tables aren't wired into the
-- frontend yet, so are left as-is until that module is migrated.
