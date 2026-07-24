-- wa_templates RLS/grants + seed existing templates

alter table wa_templates enable row level security;

drop policy if exists "wa_templates_select" on wa_templates;
create policy "wa_templates_select" on wa_templates for select
  using (is_active = true or is_staff());

drop policy if exists "wa_templates_manage" on wa_templates;
create policy "wa_templates_manage" on wa_templates for all
  using (is_management()) with check (is_management());

grant select, insert, update, delete on wa_templates to authenticated;

-- Preserve the existing message templates (real business content, not
-- placeholder data) rather than losing them when this module moves off
-- the in-memory mock array. Safe to re-run, ON CONFLICT skips rows that
-- already exist.
insert into wa_templates (role, name, template_key, body, variables, is_active) values
  ('admin', 'System Maintenance Notice', 'maintenance', 'Hi [Name], the Ticano system will be under maintenance on [Date] from [Start] to [End]. Please save your work before this time. Ticano IT Admin', ARRAY['Name','Date','Start','End'], true),
  ('admin', 'New User Account Created', 'new_user', 'Hi [Name], your Ticano system account has been created. Username: [Email]. Please log in and change your password immediately. Ticano Admin', ARRAY['Name','Email'], true),
  ('admin', 'Password Reset Instructions', 'password_reset', 'Hi [Name], a password reset was requested for your Ticano account. If this was you, click [Link] to set a new password. If not, contact IT immediately.', ARRAY['Name','Link'], true),
  ('admin', 'Security Alert', 'security_alert', 'SECURITY ALERT: Unusual login activity detected on the Ticano system for [User] on [Date] at [Time]. Please review the audit trail and take action if needed.', ARRAY['User','Date','Time'], true),
  ('admin', 'Database Backup Confirmation', 'db_backup', 'Hi [Name], the scheduled database backup completed successfully on [Date] at [Time]. Backup size: [Size]. Next backup: [Next]. Ticano System', ARRAY['Name','Date','Time','Size','Next'], true),
  ('admin', 'IT Support Response', 'it_support', 'Hi [Name], your IT support request [Ticket] has been received. Our team will respond within [SLA]. Reference: [Ticket]. Ticano IT Team', ARRAY['Name','Ticket','SLA'], true),

  ('portfolio_manager', 'Complaint Received', 'complaint_received', 'Hi [Name], your complaint has been received and assigned ticket number [Ticket]. I am [PM] and I will be handling your case. I will be in touch within 24 hours.', ARRAY['Name','Ticket','PM'], true),
  ('portfolio_manager', 'Document Request', 'document_request', 'Hi [Name], to continue processing your [Product] application, I need the following documents: [Documents]. Please bring or send them at your earliest convenience. [PM]', ARRAY['Name','Product','Documents','PM'], true),
  ('portfolio_manager', 'Application Update', 'application_update', 'Hi [Name], I wanted to update you on your [Product] application. Current status: [Status]. Next step: [Next]. Feel free to reply if you have questions. [PM]', ARRAY['Name','Product','Status','Next','PM'], true),
  ('portfolio_manager', 'Follow-up Check-in', 'followup', 'Hi [Name], just checking in to see how everything is going with your Ticano account. Is there anything I can help you with?, [PM], your Portfolio Manager', ARRAY['Name','PM'], true),
  ('portfolio_manager', 'Review Request', 'review_request', 'Hi [Name], thank you for allowing us to assist you. Your feedback means a lot to us! Please share your experience: [Link]. It only takes 2 minutes. [PM]', ARRAY['Name','Link','PM'], true),

  ('service_manager', 'Escalation Notice to Client', 'escalation_client', 'Dear [Name], we sincerely apologise for the delay on your complaint [Ticket]. This has been escalated to our senior management and will be resolved within 2 business days. Ticano [Branch]', ARRAY['Name','Ticket','Branch'], true),
  ('service_manager', 'Branch Update to Staff', 'branch_update', 'Team update: [Message]. Please acknowledge and ensure compliance by [Deadline]. Raise any concerns directly with me. [Manager], Service Manager [Branch]', ARRAY['Message','Deadline','Manager','Branch'], true),
  ('service_manager', 'SLA Warning to PM', 'sla_warning', 'Urgent: Complaint [Ticket] for client [Name] is approaching its SLA deadline. Please update the status and provide a resolution plan by [Deadline]. [Manager]', ARRAY['Ticket','Name','Deadline','Manager'], true),
  ('service_manager', 'Staff Performance Alert', 'staff_alert', 'Hi [PM], I wanted to discuss your current complaint load and performance metrics. Please schedule a brief call with me this week. [Manager], Service Manager', ARRAY['PM','Manager'], true),
  ('service_manager', 'SLA Breach Notice', 'sla_breach', 'ALERT: Complaint [Ticket] has breached its 14-day SLA. Client: [Name]. This has been flagged to the Director. Immediate action required. [Manager]', ARRAY['Ticket','Name','Manager'], true),

  ('director', 'VIP Client Communication', 'vip_client', 'Dear [Name], as Director of Ticano Group, I personally want to assure you that your concern is being handled at the highest level. I will ensure [Commitment] by [Date]. [Director]', ARRAY['Name','Commitment','Date','Director'], true),
  ('director', 'Executive Escalation Response', 'exec_escalation', 'Dear [Name], I have personally reviewed your complaint [Ticket] and have assigned it to our most senior team. You will receive a resolution by [Date]. [Director], Ticano Group', ARRAY['Name','Ticket','Date','Director'], true),
  ('director', 'Branch Manager Directive', 'branch_directive', 'Hi [Manager], following my review of [Branch] performance, I need the following addressed by [Deadline]: [Action]. Please confirm receipt. [Director]', ARRAY['Manager','Branch','Deadline','Action','Director'], true),
  ('director', 'Policy Update Notice', 'policy_update', 'Team, effective [Date], the following policy update applies: [Policy]. Please ensure all staff are briefed. Questions to be directed to your Service Manager. [Director]', ARRAY['Date','Policy','Director'], true),
  ('director', 'Quarterly Review Invite', 'quarterly_review', 'Hi [Name], you are invited to the Q[Quarter] performance review on [Date] at [Time]. Location: [Venue]. Please confirm attendance. [Director], Ticano Group', ARRAY['Name','Quarter','Date','Time','Venue','Director'], true)
on conflict (role, template_key) do nothing;

-- system_audit_log + homepage_announcements RLS/grants
alter table system_audit_log enable row level security;
alter table homepage_announcements enable row level security;

drop policy if exists "system_audit_log_select_staff" on system_audit_log;
create policy "system_audit_log_select_staff" on system_audit_log for select
  using (is_staff());
drop policy if exists "system_audit_log_insert_staff" on system_audit_log;
create policy "system_audit_log_insert_staff" on system_audit_log for insert
  with check (is_staff());

drop policy if exists "homepage_announcements_select_public" on homepage_announcements;
create policy "homepage_announcements_select_public" on homepage_announcements for select
  using (true);
drop policy if exists "homepage_announcements_manage" on homepage_announcements;
create policy "homepage_announcements_manage" on homepage_announcements for all
  using (is_management()) with check (is_management());

grant select, insert, update, delete on system_audit_log, homepage_announcements to authenticated;
grant select on homepage_announcements to anon;

-- kb_articles RLS/grants, internal staff resource, not public
alter table kb_articles enable row level security;

drop policy if exists "kb_articles_select_staff" on kb_articles;
create policy "kb_articles_select_staff" on kb_articles for select
  using (is_staff());
drop policy if exists "kb_articles_manage" on kb_articles;
create policy "kb_articles_manage" on kb_articles for all
  using (is_management()) with check (is_management());

grant select, insert, update, delete on kb_articles to authenticated;

-- feedback RLS/grants
alter table feedback enable row level security;

drop policy if exists "feedback_select" on feedback;
create policy "feedback_select" on feedback for select
  using (
    customer_id = current_app_user_id()
    OR is_management()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );

drop policy if exists "feedback_insert" on feedback;
create policy "feedback_insert" on feedback for insert
  with check (true);

grant select, insert on feedback to authenticated;
grant insert on feedback to anon;

-- improvement_feedback RLS/grants
alter table improvement_feedback enable row level security;

drop policy if exists "improvement_feedback_select_staff" on improvement_feedback;
create policy "improvement_feedback_select_staff" on improvement_feedback for select
  using (is_staff());
drop policy if exists "improvement_feedback_insert" on improvement_feedback;
create policy "improvement_feedback_insert" on improvement_feedback for insert
  with check (true);

grant select, insert on improvement_feedback to authenticated;
grant insert on improvement_feedback to anon;

-- notifications RLS/grants
alter table notifications enable row level security;

drop policy if exists "notifications_select" on notifications;
create policy "notifications_select" on notifications for select
  using (user_id = current_app_user_id() OR audience_role = current_app_role());

drop policy if exists "notifications_update" on notifications;
create policy "notifications_update" on notifications for update
  using (user_id = current_app_user_id() OR audience_role = current_app_role())
  with check (user_id = current_app_user_id() OR audience_role = current_app_role());

drop policy if exists "notifications_insert_staff" on notifications;
create policy "notifications_insert_staff" on notifications for insert
  with check (is_staff());

grant select, insert, update on notifications to authenticated;
