-- assigned-PM visibility hardening
-- complaints_select only let a PM see complaints via branch matching
-- (is_branch_staff() AND branch_id = current_app_branch_id()), never
-- directly via "this is assigned to me". In the normal case those two
-- usually line up, but there's no reason a PM's ability to see their
-- own assigned complaints should depend on an indirect branch match at
-- all, it should just always be true. Same reasoning applied to
-- feedback: a PM couldn't see feedback attributed to them (staff_id)
-- unless it also happened to match their branch.

DROP POLICY IF EXISTS "complaints_select" ON complaints;
CREATE POLICY "complaints_select" ON complaints FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR assigned_pm_id = current_app_user_id()
    OR is_management() OR is_marketing()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );

DROP POLICY IF EXISTS "feedback_select" ON feedback;
CREATE POLICY "feedback_select" ON feedback FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR staff_id = current_app_user_id()
    OR is_management() OR is_marketing()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );
