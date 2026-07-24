-- table-level grants
-- RLS policies (migration 001) control WHICH ROWS a role can see/edit,
-- but Postgres also requires a base GRANT before a role can touch a
-- table at all, "permission denied for table X" means that base grant
-- is missing, regardless of how correct the RLS policies are. Tables
-- created via the SQL editor don't get this automatically; only tables
-- created through Supabase's dashboard UI do.
--
-- `authenticated` = any signed-in user (customer or staff), RLS still
-- restricts rows per the policies in migration 001.
-- `anon` = signed-out visitors, only given read access to public
-- reference data (branches, complaint categories), and only insert
-- access needed for a customer's own signup path.
--
-- Run this in the Supabase SQL editor. Safe to re-run.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  users, client_profiles, staff_profiles,
  complaints, complaint_timeline, complaint_escalations, complaint_satisfaction, complaint_notes,
  complaint_audit_log
to authenticated;

grant select on
  branches, complaint_categories
to authenticated, anon;

-- Grant usage on the identity sequences these tables' auto-increment
-- columns rely on, INSERT fails without this even if the table grant
-- above is in place.
grant usage, select on all sequences in schema public to authenticated;

-- Make sure any table added later (as more modules get migrated) gets
-- sane default grants automatically, instead of hitting this same error
-- again for every new table.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
