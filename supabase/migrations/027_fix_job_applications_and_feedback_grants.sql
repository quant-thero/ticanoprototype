-- repair: re-assert job_applications + improvement_feedback
-- write access ("permission denied for table X")
-- "permission denied for table X" is a base GRANT error, not an RLS
-- policy rejection (that would say "new row violates row-level security
-- policy" instead), see migration 002's note on this. Both
-- job_applications (migration 004) and improvement_feedback (migration
-- 010) already have the correct GRANT statements written, but the
-- live database is still rejecting inserts on both, which means those
-- statements never actually executed against this project (or ran
-- before the table existed / got reset since). This migration re-
-- asserts everything needed for both tables from scratch, idempotently,
-- so running it guarantees a correct end state regardless of what's
-- already live.
--
-- Includes the sequence-usage grant too (needed for the identity
-- column's nextval() on INSERT), this is the part most likely to have
-- been missed, since it's easy to grant the table but forget the
-- sequence and still get a permission error.
--
-- Run this in the Supabase SQL editor. Safe to re-run.

-- ---- job_applications (CV / careers apply form, public, anon) ----
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_applications_insert_public" ON job_applications;
CREATE POLICY "job_applications_insert_public" ON job_applications FOR INSERT
  WITH CHECK (true);

-- Matches migration 008's intent exactly: job applications are reviewed
-- by Marketing (+ Director/Admin via is_marketing()), not by PMs/Service
-- Managers, unlike improvement_feedback below which is_staff() also sees.
DROP POLICY IF EXISTS "job_applications_select_staff" ON job_applications;
CREATE POLICY "job_applications_select_staff" ON job_applications FOR SELECT
  USING (is_marketing());

DROP POLICY IF EXISTS "job_applications_update_staff" ON job_applications;
CREATE POLICY "job_applications_update_staff" ON job_applications FOR UPDATE
  USING (is_marketing()) WITH CHECK (is_marketing());

GRANT SELECT, INSERT, UPDATE, DELETE ON job_applications TO authenticated;
GRANT INSERT ON job_applications TO anon;

-- ---- improvement_feedback (suggestions form), repeat of migration 010,
-- since the same class of failure recurred here too ----
ALTER TABLE improvement_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "improvement_feedback_insert" ON improvement_feedback;
CREATE POLICY "improvement_feedback_insert" ON improvement_feedback FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "improvement_feedback_select_staff" ON improvement_feedback;
CREATE POLICY "improvement_feedback_select_staff" ON improvement_feedback FOR SELECT
  USING (is_staff() OR is_marketing());

GRANT SELECT, INSERT ON improvement_feedback TO authenticated;
GRANT INSERT ON improvement_feedback TO anon;

-- ---- Sequences, both tables use identity/serial primary keys; INSERT
-- fails with a permission error on the sequence even when the table
-- grant above is correct, if this part is missing. Re-asserted for
-- every table's sequence, not just these two, since this is the
-- cheapest possible insurance against the same class of bug recurring
-- on some other public-facing form later.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
