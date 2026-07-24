-- site_settings + site_audit_log RLS/grants

alter table site_settings enable row level security;
alter table site_audit_log enable row level security;

drop policy if exists "site_settings_select_public" on site_settings;
create policy "site_settings_select_public" on site_settings for select
  using (true);

drop policy if exists "site_settings_manage" on site_settings;
create policy "site_settings_manage" on site_settings for all
  using (is_management()) with check (is_management());

drop policy if exists "site_audit_log_select_staff" on site_audit_log;
create policy "site_audit_log_select_staff" on site_audit_log for select
  using (is_staff());

drop policy if exists "site_audit_log_insert_staff" on site_audit_log;
create policy "site_audit_log_insert_staff" on site_audit_log for insert
  with check (is_staff());

grant select, insert, update, delete on site_settings, site_audit_log to authenticated;
grant select on site_settings to anon;
