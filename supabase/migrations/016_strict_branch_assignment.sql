-- strict branch-only PM assignment + client_profiles sync
-- Two real bugs in assign_signup_lead() and assign_lead_to_pm()
-- (migrations 013/014):
--
-- 1. Both fell back to assigning ANY active PM org-wide when the
-- client's preferred branch had none available. A client should
-- only ever be routed to a PM in their own preferred branch, if
-- that branch currently has no active PM, the lead should stay
-- unassigned (visible to Service Managers as needing attention)
-- rather than silently crossing branches.
--
-- 2. Neither function touched client_profiles.assigned_pm_id, they
-- only set leads.assigned_pm_id. Since a client's own dashboard
-- reads client_profiles (not leads) to show "Your Portfolio
-- Manager", a client whose only assignment happened through the
-- lead-routing system (e.g. automatically at signup) would keep
-- showing "Not yet assigned" indefinitely, even though a PM had
-- genuinely been assigned to their lead. Fixed by syncing
-- client_profiles whenever a lead's converted_user_id links back to
-- a real registered customer, which is always true for
-- signup-generated leads, and true for any lead a PM later converts.
--
-- Run this after 001-015. Safe to re-run.

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
  IF current_app_role() <> 'customer' OR current_app_user_id() <> p_customer_user_id THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM leads WHERE converted_user_id = p_customer_user_id) THEN
    RETURN;
  END IF;

  SELECT u.full_name, u.whatsapp_number, u.email, cp.preferred_branch_id, cp.referral_other_text
    INTO v_name, v_phone, v_email, v_branch_id, v_referral
  FROM users u
  JOIN client_profiles cp ON cp.user_id = u.id
  WHERE u.id = p_customer_user_id;

  IF v_name IS NULL THEN
    RETURN;
  END IF;

  -- Least-loaded active PM in the client's preferred branch, branch-only,
  -- no org-wide fallback. If their branch has no active PM right now, the
  -- lead is created unassigned rather than routed to a stranger elsewhere.
  IF v_branch_id IS NOT NULL THEN
    SELECT pm.id INTO v_pm_id
    FROM users pm
    LEFT JOIN (
      SELECT assigned_pm_id, COUNT(*) AS open_leads
      FROM leads
      WHERE assigned_pm_id IS NOT NULL AND status NOT IN ('Converted', 'Lost')
      GROUP BY assigned_pm_id
    ) load ON load.assigned_pm_id = pm.id
    WHERE pm.role = 'portfolio_manager' AND pm.is_active = TRUE AND pm.branch_id = v_branch_id
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

  -- Keep the client's own "Your Portfolio Manager" display in sync
  -- without this, a PM assigned only through lead-routing would never
  -- show up on the client's own dashboard, which reads client_profiles.
  IF v_pm_id IS NOT NULL THEN
    UPDATE client_profiles SET assigned_pm_id = v_pm_id
    WHERE user_id = p_customer_user_id AND assigned_pm_id IS NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assign_lead_to_pm(p_lead_id BIGINT, p_pm_id BIGINT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id BIGINT;
  v_pm_id BIGINT := p_pm_id;
  v_lead_name TEXT;
  v_pm_name TEXT;
  v_converted_user BIGINT;
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Only staff can assign leads';
  END IF;

  SELECT branch_id, full_name, converted_user_id INTO v_branch_id, v_lead_name, v_converted_user FROM leads WHERE id = p_lead_id;
  IF v_lead_name IS NULL THEN
    RAISE EXCEPTION 'Lead % not found', p_lead_id;
  END IF;

  -- Branch-only, same as assign_signup_lead(), no org-wide fallback.
  -- A staff member can still explicitly pass p_pm_id to override this if
  -- there's a genuine reason to cross branches; auto-assignment never will.
  IF v_pm_id IS NULL AND v_branch_id IS NOT NULL THEN
    SELECT pm.id INTO v_pm_id
    FROM users pm
    LEFT JOIN (
      SELECT assigned_pm_id, COUNT(*) AS open_leads
      FROM leads WHERE assigned_pm_id IS NOT NULL AND status NOT IN ('Converted', 'Lost')
      GROUP BY assigned_pm_id
    ) load ON load.assigned_pm_id = pm.id
    WHERE pm.role = 'portfolio_manager' AND pm.is_active = TRUE AND pm.branch_id = v_branch_id
    ORDER BY COALESCE(load.open_leads, 0) ASC, pm.id ASC LIMIT 1;
  END IF;

  IF v_pm_id IS NULL THEN
    RAISE EXCEPTION 'No active Portfolio Manager available in this lead''s branch';
  END IF;

  UPDATE leads SET assigned_pm_id = v_pm_id WHERE id = p_lead_id;

  -- Same client_profiles sync as assign_signup_lead(), a lead created at
  -- signup carries converted_user_id from the start, so this keeps the
  -- client's own dashboard correct regardless of which function assigned it.
  IF v_converted_user IS NOT NULL THEN
    UPDATE client_profiles SET assigned_pm_id = v_pm_id
    WHERE user_id = v_converted_user AND assigned_pm_id IS NULL;
  END IF;

  SELECT full_name INTO v_pm_name FROM users WHERE id = v_pm_id;
  INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
    (v_pm_id, 'lead', 'Potential client assigned to you',
     v_lead_name || ' has been assigned to you as a potential client.', 'Leads');

  RETURN v_pm_id;
END;
$$;

-- auto_assign_leads() needs updating too now that assign_lead_to_pm() can
-- raise (branch has no active PM) instead of silently falling back
-- org-wide, without this fix, ONE lead in an empty branch would abort
-- the entire batch and leave every subsequent lead unassigned too.
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
    BEGIN
      PERFORM assign_lead_to_pm(r.id, NULL);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- No active PM in this lead's branch, leave it unassigned and
      -- keep going with the rest of the batch.
      NULL;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;


-- One-time backfill, customers already affected by the missing sync
-- (assigned via a lead before this fix, but their own client_profiles
-- row was never updated) get fixed retroactively here, not just future
-- assignments going forward.
UPDATE client_profiles cp
SET assigned_pm_id = l.assigned_pm_id
FROM leads l
WHERE l.converted_user_id = cp.user_id
  AND l.assigned_pm_id IS NOT NULL
  AND cp.assigned_pm_id IS NULL;
