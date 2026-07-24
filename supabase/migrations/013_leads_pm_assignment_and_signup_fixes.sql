-- leads/PM assignment + client self-registration fixes
-- Fixes the sign-up -> assignment flow:
--
-- 1. leads.name vs leads.full_name mismatch, schema.sql shipped the
-- column as `name`, but every read/write in supabaseApi.js (getLeads,
-- createLead, importLeads) has always used `full_name`. Any insert
-- into `leads` from the app has therefore been failing outright.
-- Renamed here to match the app code (rewriting every call site
-- instead touches far more surface for the same result).
-- 2. leads.email, mapLead() already reads row.email, but the column
-- never existed, so it silently returned null forever. Added so a
-- lead captured from a client's own registration can retain their
-- email for follow-up.
-- 3. leads.assigned_pm_id, new column. Lets a lead be routed to a
-- specific Portfolio Manager, so it shows up on that PM's own
-- "Potential Clients" tab as well as the Service Manager's org-wide
-- one.
-- 4. assign_signup_lead(), a client's own registration session is
-- subject to RLS (client_profiles_select/users_select only expose
-- their own row), so it has no way to read PM headcount/workload to
-- pick who should follow up. This SECURITY DEFINER function (same
-- pattern as current_app_user_id()/current_app_role() in migration
-- 001) does the PM lookup + load-balancing + lead insert in one
-- privileged step, but only for the caller's own account, and only
-- once per account.
--
-- Run this in the Supabase SQL editor, after 001-008. Safe to re-run.

-- 1. Rename leads.name -> leads.full_name (only if not already done)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE leads RENAME COLUMN name TO full_name;
  END IF;
END $$;

-- 2. Add leads.email
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email CITEXT;

-- 3. Add leads.assigned_pm_id + index
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_pm_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_pm ON leads(assigned_pm_id);

-- 4. assign_signup_lead(p_customer_user_id), self-service, one-shot,
-- SECURITY DEFINER so it can see PM headcount/workload that the
-- calling customer's own RLS grants would otherwise hide.
--
-- Routing: active Portfolio Managers in the client's preferred branch,
-- ranked by their current count of open (not Converted/Lost) leads
-- ties broken by lowest id for determinism. Falls back to every active
-- PM org-wide if the preferred branch currently has none, so a lead
-- never goes unrouted just because a branch is short-staffed.
CREATE OR REPLACE FUNCTION assign_signup_lead(p_customer_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id BIGINT;
  v_name TEXT;
  v_phone TEXT;
  v_email CITEXT;
  v_referral TEXT;
  v_pm_id BIGINT;
BEGIN
  -- Self-service only: the caller must be signed in as this exact
  -- customer. Staff cannot invoke this on someone else's behalf.
  IF current_app_role() <> 'customer' OR current_app_user_id() <> p_customer_user_id THEN
    RETURN;
  END IF;

  -- Idempotent: a customer only ever gets one sign-up lead.
  IF EXISTS (SELECT 1 FROM leads WHERE converted_user_id = p_customer_user_id) THEN
    RETURN;
  END IF;

  SELECT u.full_name, u.whatsapp_number, u.email, cp.preferred_branch_id, cp.referral_other_text
    INTO v_name, v_phone, v_email, v_branch_id, v_referral
  FROM users u
  JOIN client_profiles cp ON cp.user_id = u.id
  WHERE u.id = p_customer_user_id;

  IF v_name IS NULL THEN
    RETURN; -- profile not found/not yet created, nothing to route
  END IF;

  -- Least-loaded active PM in the client's preferred branch.
  SELECT pm.id INTO v_pm_id
  FROM users pm
  LEFT JOIN (
    SELECT assigned_pm_id, COUNT(*) AS open_leads
    FROM leads
    WHERE assigned_pm_id IS NOT NULL AND status NOT IN ('Converted', 'Lost')
    GROUP BY assigned_pm_id
  ) load ON load.assigned_pm_id = pm.id
  WHERE pm.role = 'portfolio_manager' AND pm.is_active = TRUE
    AND v_branch_id IS NOT NULL AND pm.branch_id = v_branch_id
  ORDER BY COALESCE(load.open_leads, 0) ASC, pm.id ASC
  LIMIT 1;

  -- Fallback: no active PM in that branch, balance org-wide instead.
  IF v_pm_id IS NULL THEN
    SELECT pm.id INTO v_pm_id
    FROM users pm
    LEFT JOIN (
      SELECT assigned_pm_id, COUNT(*) AS open_leads
      FROM leads
      WHERE assigned_pm_id IS NOT NULL AND status NOT IN ('Converted', 'Lost')
      GROUP BY assigned_pm_id
    ) load ON load.assigned_pm_id = pm.id
    WHERE pm.role = 'portfolio_manager' AND pm.is_active = TRUE
    ORDER BY COALESCE(load.open_leads, 0) ASC, pm.id ASC
    LIMIT 1;
  END IF;

  INSERT INTO leads (
    full_name, phone, email, branch_id, referral_source_text, product, status,
    notes, added_by_user_id, added_by_name, assigned_pm_id, converted_user_id
  ) VALUES (
    v_name, v_phone, v_email, v_branch_id, v_referral, 'New client sign-up', 'New',
    'Self-registered via the client portal, awaiting first PM contact.',
    p_customer_user_id, v_name, v_pm_id, p_customer_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION assign_signup_lead(BIGINT) TO authenticated;
