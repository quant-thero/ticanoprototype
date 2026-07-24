-- let Director add notes to a branch's Health Scorecard
-- The Branch Health tab (§10) only ever showed the computed score/grade
-- with no way to record context, why a branch dipped this month, a
-- mitigation plan already in motion, something that explains an
-- otherwise-alarming number. This adds a notes thread per branch,
-- same shape as complaint_notes, scoped to Director/Admin since Branch
-- Health is a Director-only view.

CREATE TABLE IF NOT EXISTS branch_health_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branch_health_notes_branch ON branch_health_notes(branch_id, created_at DESC);

ALTER TABLE branch_health_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_health_notes_select" ON branch_health_notes;
CREATE POLICY "branch_health_notes_select" ON branch_health_notes FOR SELECT
  USING (is_management());

DROP POLICY IF EXISTS "branch_health_notes_insert" ON branch_health_notes;
CREATE POLICY "branch_health_notes_insert" ON branch_health_notes FOR INSERT
  WITH CHECK (is_management());

DROP POLICY IF EXISTS "branch_health_notes_delete" ON branch_health_notes;
CREATE POLICY "branch_health_notes_delete" ON branch_health_notes FOR DELETE
  USING (is_management());

GRANT SELECT, INSERT, DELETE ON branch_health_notes TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
