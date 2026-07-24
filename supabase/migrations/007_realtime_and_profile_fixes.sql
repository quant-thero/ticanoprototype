-- realtime sync + profile self-service persistence
-- Three gaps found while auditing why saved changes (password, avatar,
-- mobile number, maintenance mode) weren't sticking, and why nothing
-- updated live across sessions:
--
-- 1. user_preferences had NO row level security at all, not even
-- enabled. Any authenticated user could read or overwrite any other
-- user's notification/dark-mode preferences. It also had no INSERT
-- policy, so an upsert from a fresh account would fail outright.
--
-- 2. No table was added to the `supabase_realtime` publication, so
-- nothing in the app could ever get a live push, every screen only
-- ever saw data as of its last page load/refetch.
--
-- 3. There was no Storage bucket for profile pictures, so there was
-- nowhere for a real avatar upload to go.
--
-- Safe to re-run.

-- 1. user_preferences RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_select" ON user_preferences;
CREATE POLICY "user_preferences_select" ON user_preferences FOR SELECT
  USING (user_id = current_app_user_id() OR is_staff());

DROP POLICY IF EXISTS "user_preferences_insert_self" ON user_preferences;
CREATE POLICY "user_preferences_insert_self" ON user_preferences FOR INSERT
  WITH CHECK (user_id = current_app_user_id());

DROP POLICY IF EXISTS "user_preferences_update_self" ON user_preferences;
CREATE POLICY "user_preferences_update_self" ON user_preferences FOR UPDATE
  USING (user_id = current_app_user_id())
  WITH CHECK (user_id = current_app_user_id());

GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;

-- 2. Realtime, add the tables the app now subscribes to
-- (src/services/supabaseApi.js: subscribeToTable)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE complaints;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE complaint_escalations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 3. Storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_authenticated_upload" ON storage.objects;
CREATE POLICY "avatars_authenticated_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "avatars_authenticated_update" ON storage.objects;
CREATE POLICY "avatars_authenticated_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Client Portfolio, portfolio_clients + assistance_records RLS/grants
ALTER TABLE portfolio_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_clients_select" ON portfolio_clients;
CREATE POLICY "portfolio_clients_select" ON portfolio_clients FOR SELECT
  USING (pm_id = current_app_user_id() OR is_management() OR (is_branch_staff() AND branch_id = current_app_branch_id()));

DROP POLICY IF EXISTS "portfolio_clients_insert" ON portfolio_clients;
CREATE POLICY "portfolio_clients_insert" ON portfolio_clients FOR INSERT
  WITH CHECK (is_staff());

DROP POLICY IF EXISTS "portfolio_clients_update" ON portfolio_clients;
CREATE POLICY "portfolio_clients_update" ON portfolio_clients FOR UPDATE
  USING (pm_id = current_app_user_id() OR is_management() OR (is_branch_staff() AND branch_id = current_app_branch_id()))
  WITH CHECK (pm_id = current_app_user_id() OR is_management() OR (is_branch_staff() AND branch_id = current_app_branch_id()));

DROP POLICY IF EXISTS "assistance_records_select" ON assistance_records;
CREATE POLICY "assistance_records_select" ON assistance_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM portfolio_clients c WHERE c.id = assistance_records.portfolio_client_id
    AND (c.pm_id = current_app_user_id() OR is_management() OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ));

DROP POLICY IF EXISTS "assistance_records_manage" ON assistance_records;
CREATE POLICY "assistance_records_manage" ON assistance_records FOR ALL
  USING (is_staff()) WITH CHECK (is_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_clients, assistance_records TO authenticated;

-- complaint_satisfaction, add the missing UPDATE policy. submitSatisfactionSurvey
-- uses an upsert (insert ... on conflict do update), which needs an UPDATE
-- policy even though the update path rarely fires, a customer only
-- submits their own survey once, but the upsert always checks for it.
DROP POLICY IF EXISTS "complaint_satisfaction_update" ON complaint_satisfaction;
CREATE POLICY "complaint_satisfaction_update" ON complaint_satisfaction FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_satisfaction.complaint_id
    AND c.customer_id = current_app_user_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_satisfaction.complaint_id
    AND c.customer_id = current_app_user_id()
  ));
