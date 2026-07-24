-- service_role grants (missed in migration 002)
-- The service-role key is meant to bypass RLS entirely and have full
-- access, but like `authenticated`/`anon` in migration 002, it still
-- needs an explicit table-level GRANT for tables created manually via
-- the SQL editor. Without this, Edge Functions using adminClient()
-- (which uses the service-role key) hit "permission denied for table X"
-- even though the code is completely correct, Postgres blocks it
-- before RLS is even evaluated.
--
-- Run this in the Supabase SQL editor. Safe to re-run.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
