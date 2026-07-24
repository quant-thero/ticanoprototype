-- "permission denied for table branches" on branch edit/delete is a base
-- GRANT issue, not RLS (RLS would say "new row violates row-level
-- security policy" instead — see migration 027 for the same class of
-- bug on job_applications/improvement_feedback). branches was created in
-- the original schema.sql and never got its own explicit GRANT since it
-- predates that pattern, so it's been running on whatever default
-- privileges happened to be in place at the time. Re-asserting it here
-- from scratch, idempotent, safe to re-run.

GRANT SELECT, INSERT, UPDATE, DELETE ON branches TO authenticated;
GRANT SELECT ON branches TO anon;

-- Identity column still needs sequence usage for INSERT to succeed.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
