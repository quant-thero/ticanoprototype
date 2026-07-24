-- Service Manager is org-wide, not branch-scoped
-- Root cause of "Service Manager dashboard sees nothing anywhere":
-- every RLS policy involving branch-scoped staff was written as
-- `is_branch_staff() AND branch_id = current_app_branch_id()`, correct
-- for a Portfolio Manager (who does belong to one specific branch), but
-- wrong for this organization's Service Manager, who is a single
-- person overseeing ALL branches with no branch_id of their own. Since
-- `branch_id = NULL` can never be true in SQL, every one of these
-- checks silently failed for that account, across every table at once
--, which is exactly the "nothing works anywhere" symptom reported.
--
-- Fix: a new helper, current_user_branch_matches(target_branch_id),
-- replaces every occurrence of that pattern. For a Portfolio Manager it
-- behaves exactly as before (their own branch only). For a Service
-- Manager it's unconditionally true, matching the real org structure
-- of one Service Manager across every branch. If this business is ever
-- restructured to have branch-specific Service Managers instead, this
-- is the one function to change back, rather than 11 separate policies.

CREATE OR REPLACE FUNCTION current_user_branch_matches(target_branch_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN current_app_role() = 'service_manager' THEN TRUE
    WHEN current_app_role() = 'portfolio_manager' THEN target_branch_id IS NOT NULL AND target_branch_id = current_app_branch_id()
    ELSE FALSE
  END;
$$;

-- ---- complaints ----
DROP POLICY IF EXISTS "complaints_select" ON complaints;
CREATE POLICY "complaints_select" ON complaints FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR assigned_pm_id = current_app_user_id()
    OR is_management() OR is_marketing()
    OR current_user_branch_matches(branch_id)
  );

DROP POLICY IF EXISTS "complaints_update" ON complaints;
CREATE POLICY "complaints_update" ON complaints FOR UPDATE
  USING (is_management() OR current_user_branch_matches(branch_id))
  WITH CHECK (is_management() OR current_user_branch_matches(branch_id));

-- ---- complaint_timeline ----
DROP POLICY IF EXISTS "complaint_timeline_select" ON complaint_timeline;
CREATE POLICY "complaint_timeline_select" ON complaint_timeline FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_timeline.complaint_id
    AND (c.customer_id = current_app_user_id() OR is_management() OR current_user_branch_matches(c.branch_id))
  ));

DROP POLICY IF EXISTS "complaint_timeline_insert" ON complaint_timeline;
CREATE POLICY "complaint_timeline_insert" ON complaint_timeline FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_timeline.complaint_id
    AND (c.customer_id = current_app_user_id() OR is_management() OR current_user_branch_matches(c.branch_id))
  ));

-- ---- complaint_escalations ----
DROP POLICY IF EXISTS "complaint_escalations_all" ON complaint_escalations;
CREATE POLICY "complaint_escalations_all" ON complaint_escalations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_escalations.complaint_id
    AND (is_management() OR current_user_branch_matches(c.branch_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_escalations.complaint_id
    AND (is_management() OR current_user_branch_matches(c.branch_id))
  ));

-- ---- complaint_satisfaction ----
DROP POLICY IF EXISTS "complaint_satisfaction_select" ON complaint_satisfaction;
CREATE POLICY "complaint_satisfaction_select" ON complaint_satisfaction FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_satisfaction.complaint_id
    AND (c.customer_id = current_app_user_id() OR is_management() OR current_user_branch_matches(c.branch_id))
  ));

-- ---- complaint_notes ----
DROP POLICY IF EXISTS "complaint_notes_select" ON complaint_notes;
CREATE POLICY "complaint_notes_select" ON complaint_notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_notes.complaint_id
    AND (
      (complaint_notes.note_type = 'customer' AND c.customer_id = current_app_user_id())
      OR is_management()
      OR current_user_branch_matches(c.branch_id)
    )
  ));

DROP POLICY IF EXISTS "complaint_notes_insert" ON complaint_notes;
CREATE POLICY "complaint_notes_insert" ON complaint_notes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_notes.complaint_id
    AND (is_management() OR current_user_branch_matches(c.branch_id))
  ));

-- ---- feedback ----
DROP POLICY IF EXISTS "feedback_select" ON feedback;
CREATE POLICY "feedback_select" ON feedback FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR staff_id = current_app_user_id()
    OR is_management() OR is_marketing()
    OR current_user_branch_matches(branch_id)
  );

-- ---- portfolio_clients ----
DROP POLICY IF EXISTS "portfolio_clients_select" ON portfolio_clients;
CREATE POLICY "portfolio_clients_select" ON portfolio_clients FOR SELECT
  USING (pm_id = current_app_user_id() OR is_management() OR current_user_branch_matches(branch_id));

DROP POLICY IF EXISTS "portfolio_clients_update" ON portfolio_clients;
CREATE POLICY "portfolio_clients_update" ON portfolio_clients FOR UPDATE
  USING (pm_id = current_app_user_id() OR is_management() OR current_user_branch_matches(branch_id))
  WITH CHECK (pm_id = current_app_user_id() OR is_management() OR current_user_branch_matches(branch_id));
