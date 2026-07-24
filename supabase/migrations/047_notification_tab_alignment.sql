-- align notification link_tab values with real tab ids
-- Found while adding unread-count badges directly on dashboard tabs
-- (not just the notification bell): assign_lead_to_pm() sent
-- link_tab = 'Leads' (capitalized) to the assigned Portfolio Manager,
-- but PmDashboard.jsx's own tab id for that screen is lowercase
-- 'leads'. The notification itself was always created correctly
-- the badge (and deep-link) just never matched anything client-side.
--
-- Safe to re-run.

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
  -- 'leads' (lowercase) matches PmDashboard.jsx's own tab id, was
  -- 'Leads' (capitalized), which never matched anything client-side.
  INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
    (v_pm_id, 'lead', 'Potential client assigned to you',
     v_lead_name || ' has been assigned to you as a potential client.', 'leads');

  RETURN v_pm_id;
END;
$$;
