-- repair: re-assert improvement_feedback + complaints
-- write access
-- Both the submitComplaint() and submitImprovementFeedback() code paths
-- and their target RLS policies check out correctly on review, which
-- points to these specific policies not actually being live in the
-- database (e.g. migration 006 not fully run, or run before a later
-- migration reset something). This migration re-asserts everything
-- needed for both tables from scratch, idempotently, so running it
-- guarantees a correct end state regardless of what's already there.
--
-- Run this in the Supabase SQL editor. Safe to re-run.

-- ---- improvement_feedback ----
ALTER TABLE improvement_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "improvement_feedback_insert" ON improvement_feedback;
CREATE POLICY "improvement_feedback_insert" ON improvement_feedback FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "improvement_feedback_select_staff" ON improvement_feedback;
CREATE POLICY "improvement_feedback_select_staff" ON improvement_feedback FOR SELECT
  USING (is_staff() OR is_marketing());

GRANT SELECT, INSERT ON improvement_feedback TO authenticated;
GRANT INSERT ON improvement_feedback TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- ---- complaints ----
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "complaints_insert" ON complaints;
CREATE POLICY "complaints_insert" ON complaints FOR INSERT
  WITH CHECK (customer_id = current_app_user_id() OR is_staff());

DROP POLICY IF EXISTS "complaints_select" ON complaints;
CREATE POLICY "complaints_select" ON complaints FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR is_management() OR is_marketing()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON complaints TO authenticated;

-- If a complaint is ever submitted anonymously (customer_id IS NULL,
-- anonymous = true), current_app_user_id() can't match anything, allow
-- that specific case explicitly rather than only through is_staff().
DROP POLICY IF EXISTS "complaints_insert_anonymous" ON complaints;
CREATE POLICY "complaints_insert_anonymous" ON complaints FOR INSERT
  WITH CHECK (anonymous = true AND customer_id IS NULL);
