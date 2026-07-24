-- client ↔ Service Manager ↔ PM link + live sync
-- Fixes three related gaps found during a support review:
--
-- 1. When a client registered, `notifications` INSERT is restricted to
-- `is_staff()` (migration 006), so the new customer's own session
-- could never tell the Service Manager/Director a fresh signup
-- existed, the row landed in `client_profiles` with no PM, but
-- nobody was told to look at it. notify_new_client_signup() is a
-- SECURITY DEFINER RPC (same self-service-only pattern as
-- assign_signup_lead() in migration 009) that raises that
-- notification on the client's behalf.
--
-- 2. `leads` and `client_profiles` were never added to the
-- `supabase_realtime` publication (only site_settings, notifications,
-- complaints and complaint_escalations were, in migration 007), so
-- the Service Manager's "Unassigned" and "Potential Clients" screens
-- could only ever show data as of the last manual refresh, a new
-- signup or lead never appeared live. Also adding
-- improvement_feedback and questionnaire_responses so staff-facing
-- feedback views update the same way.
--
-- 3. There was no load-balanced bulk auto-assign for `leads` (only
-- client_profiles had autoAssignCustomers) and no per-lead manual
-- assignment RPC, assign_lead_to_pm()/auto_assign_leads() bring
-- leads to parity with the customer-assignment flow so a Service
-- Manager can assign or bulk-auto-assign potential clients to a PM
-- the same way they already do for registered customers.
--
-- Run this after 001-009. Safe to re-run.

-- 1. notify_new_client_signup(p_customer_user_id)
CREATE OR REPLACE FUNCTION notify_new_client_signup(p_customer_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
  v_branch TEXT;
  v_type TEXT;
BEGIN
  -- Self-service only: the caller must be signed in as this exact
  -- customer, same guard as assign_signup_lead().
  IF current_app_role() <> 'customer' OR current_app_user_id() <> p_customer_user_id THEN
    RETURN;
  END IF;

  SELECT u.full_name, b.name, cp.client_type
    INTO v_name, v_branch, v_type
  FROM users u
  JOIN client_profiles cp ON cp.user_id = u.id
  LEFT JOIN branches b ON b.id = cp.preferred_branch_id
  WHERE u.id = p_customer_user_id;

  IF v_name IS NULL THEN
    RETURN; -- profile not found yet, nothing to announce
  END IF;

  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    ('service_manager', 'client', 'New client registered',
     v_name || ' (' || COALESCE(v_type, 'new') || ' client) registered'
       || CASE WHEN v_branch IS NOT NULL THEN ' at ' || v_branch ELSE '' END
       || ' and is awaiting Portfolio Manager assignment.', 'Unassigned'),
    ('director', 'client', 'New client registered',
     v_name || ' registered' || CASE WHEN v_branch IS NOT NULL THEN ' at ' || v_branch ELSE '' END || '.', NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION notify_new_client_signup(BIGINT) TO authenticated;

-- 2. assign_lead_to_pm(p_lead_id, p_pm_id), manual assignment, staff-only.
-- p_pm_id may be NULL, in which case the least-loaded active PM in the
-- lead's branch is picked (falling back org-wide), same rule as
-- auto_assign_leads() below.
CREATE OR REPLACE FUNCTION assign_lead_to_pm(p_lead_id BIGINT, p_pm_id BIGINT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id BIGINT;
  v_pm_id BIGINT := p_pm_id;
  v_lead_name TEXT;
  v_pm_name TEXT;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Only staff can assign leads';
  END IF;

  SELECT branch_id, full_name INTO v_branch_id, v_lead_name FROM leads WHERE id = p_lead_id;
  IF v_lead_name IS NULL THEN
    RAISE EXCEPTION 'Lead % not found', p_lead_id;
  END IF;

  IF v_pm_id IS NULL THEN
    SELECT pm.id INTO v_pm_id
    FROM users pm
    LEFT JOIN (
      SELECT assigned_pm_id, COUNT(*) AS open_leads
      FROM leads WHERE assigned_pm_id IS NOT NULL AND status NOT IN ('Converted', 'Lost')
      GROUP BY assigned_pm_id
    ) load ON load.assigned_pm_id = pm.id
    WHERE pm.role = 'portfolio_manager' AND pm.is_active = TRUE
      AND v_branch_id IS NOT NULL AND pm.branch_id = v_branch_id
    ORDER BY COALESCE(load.open_leads, 0) ASC, pm.id ASC LIMIT 1;

    IF v_pm_id IS NULL THEN
      SELECT pm.id INTO v_pm_id
      FROM users pm
      LEFT JOIN (
        SELECT assigned_pm_id, COUNT(*) AS open_leads
        FROM leads WHERE assigned_pm_id IS NOT NULL AND status NOT IN ('Converted', 'Lost')
        GROUP BY assigned_pm_id
      ) load ON load.assigned_pm_id = pm.id
      WHERE pm.role = 'portfolio_manager' AND pm.is_active = TRUE
      ORDER BY COALESCE(load.open_leads, 0) ASC, pm.id ASC LIMIT 1;
    END IF;
  END IF;

  IF v_pm_id IS NULL THEN
    RAISE EXCEPTION 'No active Portfolio Managers available to assign';
  END IF;

  UPDATE leads SET assigned_pm_id = v_pm_id WHERE id = p_lead_id;

  SELECT full_name INTO v_pm_name FROM users WHERE id = v_pm_id;
  INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
    (v_pm_id, 'lead', 'Potential client assigned to you',
     v_lead_name || ' has been assigned to you as a potential client.', 'Leads');

  RETURN v_pm_id;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_lead_to_pm(BIGINT, BIGINT) TO authenticated;

-- 3. auto_assign_leads(), bulk load-balanced assignment of every
-- currently-unassigned lead, staff-only. Mirrors autoAssignCustomers()
-- in supabaseApi.js but server-side so it can run in one round trip.
CREATE OR REPLACE FUNCTION auto_assign_leads()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Only staff can auto-assign leads';
  END IF;

  FOR r IN SELECT id FROM leads WHERE assigned_pm_id IS NULL ORDER BY created_at ASC LOOP
    PERFORM assign_lead_to_pm(r.id, NULL);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_assign_leads() TO authenticated;

-- 4. Realtime, add the tables the Unassigned/Leads/Improvement Feedback
-- screens now subscribe to.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE client_profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE leads; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE improvement_feedback; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE questionnaire_responses; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
