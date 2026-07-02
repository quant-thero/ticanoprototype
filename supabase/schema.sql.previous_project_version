-- =====================================================================
--  TICANO GROUP — SUPABASE / POSTGRES SCHEMA
--  Trade-finance complaint & client-management platform (Botswana, NBFIRA).
--
--  Grounded in the application's in-memory data layer (src/services/api.js)
--  and enums (src/utils/constants.js). Designed to run on Supabase
--  (PostgreSQL 15+) with Auth + Row Level Security.
--
--  Run order: this file is idempotent-ish and ordered (extensions → enums →
--  helpers → tables → indexes → RLS → storage → seed notes).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists citext;         -- case-insensitive email


-- ---------------------------------------------------------------------
-- 1. ENUMERATED TYPES  (values match the app exactly so no mapping layer)
-- ---------------------------------------------------------------------
create type user_role            as enum ('customer','portfolio_manager','service_manager','director','marketing','admin');
create type client_type          as enum ('new','existing');
create type lead_status          as enum ('New','Contacted','Interested','Converted','Lost');
create type journey_stage        as enum ('before_applying','during_application','after_disbursement');
create type complaint_status     as enum ('created','assigned','in_progress','customer_contacted','pending_customer','escalated','resolved','closed');
create type complaint_severity   as enum ('minor','moderate','major','critical');
create type complaint_priority   as enum ('low','medium','high','urgent');
create type sentiment_tag        as enum ('positive','neutral','negative','urgent_concern');
create type note_audience        as enum ('internal','customer');
create type application_status   as enum ('New','Under Review','Shortlisted','Rejected','Hired');
create type questionnaire_status as enum ('draft','published');
create type question_type        as enum ('rating','choice','text');
create type career_type          as enum ('Full-time','Part-time','Internship','Contract','Temporary');
create type announcement_priority as enum ('info','normal','high');
create type promo_mode           as enum ('banner','popup');
create type promo_theme          as enum ('red','charcoal','light');


-- ---------------------------------------------------------------------
-- 2. GENERIC HELPERS
-- ---------------------------------------------------------------------

-- Keep updated_at fresh on UPDATE.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: the role/branch helper functions (current_app_role, current_branch_id,
-- is_org_wide, is_staff) are defined just AFTER the profiles table below,
-- because they query it and `language sql` bodies are validated at creation.


-- ---------------------------------------------------------------------
-- 3. BRANCHES
--    Mirrors BRANCH_DIRECTORY / BRANCH_INFO. Single source of truth for
--    the map, landing page and admin branch manager.
-- ---------------------------------------------------------------------
create table public.branches (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text,
  city         text,
  region       text,
  country      text not null default 'Botswana',
  phone        text,
  mobile       text,
  email        citext,
  manager_name text,
  open_hours   text default 'Mon–Fri 08:00–17:00, Sat 09:00–12:00',
  lat          double precision,
  lng          double precision,
  service_areas text[] default '{}',          -- BRANCH_INFO.areas
  is_active    boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_branches_updated before update on public.branches
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 4. PROFILES  (1:1 with auth.users — every login, staff or client)
-- ---------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null default 'customer',
  full_name       text not null,
  email           citext unique,
  phone           text,
  whatsapp_number text,
  branch_id       uuid references public.branches(id) on delete set null,
  -- customer-only attributes (null for staff)
  client_type     client_type,
  is_active       boolean not null default true,
  -- notification opt-ins (profile / birthday prefs)
  whatsapp_optin  boolean not null default false,
  birthday_optin  boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.profiles (role);
create index on public.profiles (branch_id);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.email),
          new.email,
          coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer'))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Role / branch helpers (defined here because they query profiles) ----
-- SECURITY DEFINER so RLS policies can call them without recursing into
-- profiles' own policies.

-- Role of the currently authenticated user.
create or replace function public.current_app_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Branch of the currently authenticated user (NULL for head-office roles).
create or replace function public.current_branch_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select branch_id from public.profiles where id = auth.uid()
$$;

-- Convenience predicate: caller has org-wide visibility.
create or replace function public.is_org_wide()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() in ('director','admin','marketing')
$$;

-- Convenience predicate: caller is back-office staff (any non-customer role).
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_app_role() in
    ('portfolio_manager','service_manager','director','marketing','admin')
$$;

grant execute on function
  public.current_app_role(), public.current_branch_id(),
  public.is_org_wide(), public.is_staff()
to anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. CLIENTS  (CRM master — the businesses complaints/tenders target)
--    A client may or may not have a login (profile_id). Walk-ins and
--    anonymous complainants need no auth user, hence the separation.
--    client_code is the permanent TIC-000001 identifier.
-- ---------------------------------------------------------------------
create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  client_no    bigint generated by default as identity,         -- numeric backbone
  client_code  text generated always as ('TIC-' || lpad(client_no::text, 6, '0')) stored,
  profile_id   uuid unique references public.profiles(id) on delete set null,
  full_name    text not null,
  email        citext,
  phone        text,
  branch_id    uuid references public.branches(id) on delete set null,
  client_type  client_type not null default 'new',
  industry     text,
  assigned_pm_id uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index on public.clients (client_code);
create index on public.clients (branch_id);
create index on public.clients (assigned_pm_id);
create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 6. LEADS  (sales / referral pipeline before a lead becomes a client)
-- ---------------------------------------------------------------------
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  phone           text not null,
  email           citext,
  branch_id       uuid references public.branches(id) on delete set null,
  referral_source text,        -- REFERRAL_SOURCES
  recorded_via    text,        -- REFERRAL_RECORDED_BY
  product         text,        -- INTERESTED_PRODUCTS
  status          lead_status not null default 'New',
  added_by_id     uuid references public.profiles(id) on delete set null,
  added_by_name   text,        -- denormalised label (imports/system)
  converted_client_id uuid references public.clients(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.leads (branch_id);
create index on public.leads (status);
-- de-dup support for bulk import (phone digits + name)
create index on public.leads (phone);
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 7. COMPLAINTS  (the core lifecycle entity)
--    Created → Assigned → In Progress → Customer Contacted →
--    Pending Customer → Escalated → Resolved → Closed
-- ---------------------------------------------------------------------
create table public.complaints (
  id               uuid primary key default gen_random_uuid(),
  ticket_no        bigint generated by default as identity,
  ticket           text generated always as ('TCN-' || lpad(ticket_no::text, 4, '0')) stored,
  client_id        uuid references public.clients(id) on delete set null,  -- null when anonymous
  customer_name    text,                 -- snapshot or ANON-xxxxxx label
  client_type      client_type not null default 'existing',
  anonymous        boolean not null default false,
  branch_id        uuid not null references public.branches(id),
  journey_stage    journey_stage not null,
  category         text not null,
  description      text not null,
  voice_note_path  text,                 -- Supabase Storage object path
  severity         complaint_severity not null default 'moderate',
  priority         complaint_priority not null default 'medium',
  sentiment        sentiment_tag not null default 'neutral',
  status           complaint_status not null default 'created',
  assigned_pm_id   uuid references public.profiles(id) on delete set null,
  -- escalation (inlined — single escalation per complaint in the app)
  escalated_at     timestamptz,
  escalated_by     text,
  escalation_reason text,
  -- root cause (required on closure)
  root_cause_group text,
  root_cause       text,
  root_cause_notes text,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  closed_at        timestamptz,
  updated_at       timestamptz not null default now()
);
create index on public.complaints (branch_id);
create index on public.complaints (status);
create index on public.complaints (assigned_pm_id);
create index on public.complaints (client_id);
create index on public.complaints (created_at desc);
create trigger trg_complaints_updated before update on public.complaints
  for each row execute function public.set_updated_at();

-- 7a. Timeline events (status history shown in the complaint detail view)
create table public.complaint_events (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  event        text not null,
  status       complaint_status,
  actor        text,
  occurred_at  timestamptz not null default now()
);
create index on public.complaint_events (complaint_id, occurred_at);

-- 7b. Notes — internal (staff-only) OR customer-facing updates
create table public.complaint_notes (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  audience     note_audience not null default 'internal',
  author_id    uuid references public.profiles(id) on delete set null,
  author_name  text,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index on public.complaint_notes (complaint_id);

-- 7c. Immutable audit trail (§15) — who did what, when, old→new status
create table public.complaint_audit (
  id             uuid primary key default gen_random_uuid(),
  complaint_id   uuid not null references public.complaints(id) on delete cascade,
  ticket         text,
  action         text not null,           -- Created / Assigned / Escalated / ...
  previous_value text,
  new_value      text,
  actor_id       uuid references public.profiles(id) on delete set null,
  actor_name     text,
  occurred_at    timestamptz not null default now()
);
create index on public.complaint_audit (complaint_id, occurred_at);

-- 7d. Post-closure satisfaction survey (1:1)
create table public.complaint_satisfaction (
  complaint_id            uuid primary key references public.complaints(id) on delete cascade,
  issue_resolved          boolean,
  communication_ok        boolean,
  pm_professional         boolean,
  rating                  smallint check (rating between 1 and 5),
  comments                text,
  submitted_at            timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 8. IMPROVEMENT FEEDBACK (§3) — suggestions, separate from complaints
-- ---------------------------------------------------------------------
create table public.improvement_feedback (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,        -- IMPROVEMENT_CATEGORIES
  body        text not null,
  author_name text default 'Anonymous',
  is_anonymous boolean not null default false,
  branch_id   uuid references public.branches(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.improvement_feedback (branch_id);
create index on public.improvement_feedback (category);


-- ---------------------------------------------------------------------
-- 9. KNOWLEDGE BASE (§8)
-- ---------------------------------------------------------------------
create table public.kb_articles (
  id         uuid primary key default gen_random_uuid(),
  category   text not null,         -- KB_CATEGORIES
  title      text not null,
  body       text not null,
  author_id  uuid references public.profiles(id) on delete set null,
  author_name text default 'Admin',
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.kb_articles (category) where archived = false;
create trigger trg_kb_updated before update on public.kb_articles
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 10. QUESTIONNAIRES (Marketing surveys) + responses
-- ---------------------------------------------------------------------
create table public.questionnaires (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      questionnaire_status not null default 'draft',
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text default 'Marketing Team',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_qn_updated before update on public.questionnaires
  for each row execute function public.set_updated_at();

create table public.questionnaire_questions (
  id               uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  position         int not null default 0,
  type             question_type not null,
  text             text not null,
  options          text[]                          -- for type = 'choice'
);
create index on public.questionnaire_questions (questionnaire_id, position);

create table public.questionnaire_responses (
  id               uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public.questionnaires(id) on delete cascade,
  client_id        uuid references public.clients(id) on delete set null,
  client_name      text,
  answers          jsonb not null default '{}',     -- { question_id: value }
  submitted_at     timestamptz not null default now()
);
create index on public.questionnaire_responses (questionnaire_id);


-- ---------------------------------------------------------------------
-- 11. TENDER BROADCASTS (Marketing) + public opt-in subscribers
-- ---------------------------------------------------------------------
create table public.tender_broadcasts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text not null,
  channels        text[] not null default '{dashboard}',  -- dashboard/email/whatsapp
  audience_filter jsonb not null default '{}',             -- {branch,clientType,industry,status}
  recipient_count int not null default 0,
  sent_by_id      uuid references public.profiles(id) on delete set null,
  sent_by_name    text,
  is_public       boolean not null default true,           -- surfaces on landing page
  sent_at         timestamptz not null default now()
);
create index on public.tender_broadcasts (sent_at desc);

create table public.tender_subscribers (
  id           uuid primary key default gen_random_uuid(),
  email        citext not null unique,
  phone        text,
  subscribed_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 12. CAREERS + job applications
-- ---------------------------------------------------------------------
create table public.careers (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  type         career_type not null default 'Full-time',
  location     text,
  department   text,
  description  text,
  requirements text,
  closing_date date,
  is_active    boolean not null default true,     -- published to public site
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.careers (is_active);
create trigger trg_careers_updated before update on public.careers
  for each row execute function public.set_updated_at();

create table public.job_applications (
  id             uuid primary key default gen_random_uuid(),
  career_id      uuid references public.careers(id) on delete set null,
  position       text,                              -- snapshot of title
  applicant_name text not null,
  email          citext not null,
  phone          text,
  cover_note     text,
  cv_path        text,                              -- Storage object path
  cv_file_name   text,
  cv_mime_type   text,
  cv_size_bytes  bigint,
  status         application_status not null default 'New',
  applied_at     timestamptz not null default now()
);
create index on public.job_applications (career_id);
create index on public.job_applications (status);


-- ---------------------------------------------------------------------
-- 13. TESTIMONIALS (Marketing-managed, shown on homepage)
-- ---------------------------------------------------------------------
create table public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text,
  rating     smallint not null default 5 check (rating between 1 and 5),
  comment    text not null,
  branch_id  uuid references public.branches(id) on delete set null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_testimonials_updated before update on public.testimonials
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 14. ANNOUNCEMENTS (Director / Admin — role-targeted internal notices)
-- ---------------------------------------------------------------------
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  author_id    uuid references public.profiles(id) on delete set null,
  author_name  text,
  author_role  user_role,
  target_roles user_role[] not null default '{}',
  priority     announcement_priority not null default 'normal',
  status       questionnaire_status not null default 'draft',   -- draft / published
  start_date   date,
  end_date     date,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.announcements (status);
create trigger trg_announcements_updated before update on public.announcements
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 15. REVIEW REQUESTS (WhatsApp review links)
-- ---------------------------------------------------------------------
create table public.review_requests (
  id          uuid primary key default gen_random_uuid(),
  recipient   text not null,
  phone       text,
  kind        text not null default 'customer',   -- customer | lead
  sent_by_id  uuid references public.profiles(id) on delete set null,
  sent_by_name text,
  completed   boolean not null default false,
  sent_at     timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 16. NOTIFICATIONS (per-user in-app notifications, deep-linkable)
-- ---------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  link        text,                 -- deep-link tab/route
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.notifications (user_id, is_read);


-- ---------------------------------------------------------------------
-- 17. SITE CONFIG (admin-editable public content) + content audit
--     Single-row tables (enforced by a constant primary key) keep the
--     "settings" semantics of the app while staying relational.
-- ---------------------------------------------------------------------
create table public.site_settings (
  id             boolean primary key default true check (id),       -- single row
  contact_email  citext,
  contact_phone  text,
  mission        text,
  vision         text,
  social         jsonb not null default '{}',     -- {facebook:{url,enabled}, ...}
  branch_contacts jsonb not null default '[]',
  homepage       jsonb not null default '{}',     -- hero copy, stats, service cards
  login_page     jsonb not null default '{}',
  legal          jsonb not null default '{}',     -- {privacy:{published,draft,revisions}, ...}
  updated_at     timestamptz not null default now()
);
create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

create table public.homepage_announcement (
  id         boolean primary key default true check (id),
  is_enabled boolean not null default false,
  text       text,
  link       text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table public.homepage_promo (
  id         boolean primary key default true check (id),
  is_enabled boolean not null default false,
  mode       promo_mode not null default 'banner',
  theme      promo_theme not null default 'red',
  title      text,
  message    text,
  cta_label  text,
  cta_link   text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table public.site_audit (
  id             uuid primary key default gen_random_uuid(),
  section        text not null,
  actor_id       uuid references public.profiles(id) on delete set null,
  actor_name     text default 'Admin',
  previous_value text,
  new_value      text,
  occurred_at    timestamptz not null default now()
);


-- =====================================================================
-- 18. ROW LEVEL SECURITY
--     This is what the current app is missing — access is enforced in
--     the database, not the browser. Policies follow ACCESS_MATRIX:
--       customer        → own records only
--       PM / SM         → own branch
--       director/admin  → org-wide
--       marketing       → org-wide aggregate, no client identity*
--     (*column masking for marketing is done via the view at the end.)
-- =====================================================================
alter table public.branches               enable row level security;
alter table public.profiles               enable row level security;
alter table public.clients                enable row level security;
alter table public.leads                  enable row level security;
alter table public.complaints             enable row level security;
alter table public.complaint_events       enable row level security;
alter table public.complaint_notes        enable row level security;
alter table public.complaint_audit        enable row level security;
alter table public.complaint_satisfaction enable row level security;
alter table public.improvement_feedback   enable row level security;
alter table public.kb_articles            enable row level security;
alter table public.questionnaires         enable row level security;
alter table public.questionnaire_questions enable row level security;
alter table public.questionnaire_responses enable row level security;
alter table public.tender_broadcasts      enable row level security;
alter table public.tender_subscribers     enable row level security;
alter table public.careers                enable row level security;
alter table public.job_applications       enable row level security;
alter table public.testimonials           enable row level security;
alter table public.announcements          enable row level security;
alter table public.review_requests        enable row level security;
alter table public.notifications          enable row level security;
alter table public.site_settings          enable row level security;
alter table public.homepage_announcement  enable row level security;
alter table public.homepage_promo         enable row level security;
alter table public.site_audit             enable row level security;

-- ---- BRANCHES: public can read active branches; only admin writes -----
create policy branches_public_read on public.branches
  for select to anon, authenticated using (is_active or public.is_staff());
create policy branches_admin_write on public.branches
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---- PROFILES ---------------------------------------------------------
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid()
         or public.is_org_wide()
         or (public.current_app_role() in ('portfolio_manager','service_manager')
             and branch_id = public.current_branch_id()));
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid());
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---- CLIENTS ----------------------------------------------------------
create policy clients_read on public.clients
  for select to authenticated
  using (profile_id = auth.uid()
         or public.is_org_wide()
         or (public.current_app_role() in ('portfolio_manager','service_manager')
             and branch_id = public.current_branch_id()));
create policy clients_staff_write on public.clients
  for all to authenticated
  using (public.current_app_role() in ('portfolio_manager','service_manager','admin','director'))
  with check (public.current_app_role() in ('portfolio_manager','service_manager','admin','director'));

-- ---- LEADS (branch staff + org-wide; no customer access) --------------
create policy leads_read on public.leads
  for select to authenticated
  using (public.is_org_wide()
         or (public.current_app_role() in ('portfolio_manager','service_manager')
             and branch_id = public.current_branch_id()));
create policy leads_write on public.leads
  for all to authenticated
  using (public.is_staff() and public.current_app_role() <> 'marketing')
  with check (public.is_staff() and public.current_app_role() <> 'marketing');

-- ---- COMPLAINTS -------------------------------------------------------
-- Customers may file a complaint and see their own; staff see by scope.
create policy complaints_read on public.complaints
  for select to authenticated
  using (
    public.current_app_role() in ('director','admin','marketing')
    or (public.current_app_role() in ('portfolio_manager','service_manager')
        and branch_id = public.current_branch_id())
    or client_id in (select id from public.clients where profile_id = auth.uid())
  );
create policy complaints_customer_insert on public.complaints
  for insert to authenticated
  with check (
    client_id in (select id from public.clients where profile_id = auth.uid())
    or public.is_staff()
  );
-- anonymous public complaints (no login) — allow anon insert of anonymous rows
create policy complaints_anon_insert on public.complaints
  for insert to anon
  with check (anonymous = true);
create policy complaints_staff_update on public.complaints
  for update to authenticated
  using (
    public.current_app_role() in ('director','admin')
    or (public.current_app_role() in ('portfolio_manager','service_manager')
        and branch_id = public.current_branch_id())
  );

-- Child tables inherit visibility from the parent complaint.
create policy comp_events_read on public.complaint_events
  for select to authenticated using (
    exists (select 1 from public.complaints c where c.id = complaint_id));   -- parent RLS already filters
create policy comp_events_write on public.complaint_events
  for insert to authenticated with check (public.is_staff());

-- Internal notes: staff only. Customer notes: visible to the owning client too.
create policy comp_notes_read on public.complaint_notes
  for select to authenticated using (
    public.is_staff()
    or (audience = 'customer'
        and complaint_id in (
          select id from public.complaints
          where client_id in (select id from public.clients where profile_id = auth.uid())))
  );
create policy comp_notes_write on public.complaint_notes
  for insert to authenticated with check (public.is_staff());

create policy comp_audit_read on public.complaint_audit
  for select to authenticated using (public.is_staff());
create policy comp_audit_write on public.complaint_audit
  for insert to authenticated with check (public.is_staff());

create policy comp_sat_rw on public.complaint_satisfaction
  for all to authenticated
  using (
    public.is_staff()
    or complaint_id in (
      select id from public.complaints
      where client_id in (select id from public.clients where profile_id = auth.uid())))
  with check (
    public.is_staff()
    or complaint_id in (
      select id from public.complaints
      where client_id in (select id from public.clients where profile_id = auth.uid())));

-- ---- IMPROVEMENT FEEDBACK (anyone can submit; staff read by scope) ----
create policy feedback_insert_any on public.improvement_feedback
  for insert to anon, authenticated with check (true);
create policy feedback_read on public.improvement_feedback
  for select to authenticated
  using (public.is_org_wide()
         or (public.is_staff() and branch_id = public.current_branch_id()));

-- ---- KNOWLEDGE BASE (staff read; admin/director write) ----------------
create policy kb_read on public.kb_articles
  for select to authenticated using (public.is_staff());
create policy kb_write on public.kb_articles
  for all to authenticated
  using (public.current_app_role() in ('admin','director'))
  with check (public.current_app_role() in ('admin','director'));

-- ---- QUESTIONNAIRES (public sees published; marketing manages) --------
create policy qn_public_read on public.questionnaires
  for select to anon, authenticated
  using (status = 'published' or public.current_app_role() in ('marketing','admin','director'));
create policy qn_manage on public.questionnaires
  for all to authenticated
  using (public.current_app_role() in ('marketing','admin'))
  with check (public.current_app_role() in ('marketing','admin'));
create policy qn_q_public_read on public.questionnaire_questions
  for select to anon, authenticated using (true);
create policy qn_q_manage on public.questionnaire_questions
  for all to authenticated
  using (public.current_app_role() in ('marketing','admin'))
  with check (public.current_app_role() in ('marketing','admin'));
create policy qn_resp_insert on public.questionnaire_responses
  for insert to anon, authenticated with check (true);
create policy qn_resp_read on public.questionnaire_responses
  for select to authenticated
  using (public.current_app_role() in ('marketing','admin','director'));

-- ---- TENDERS (public reads the public ones; marketing manages) --------
create policy tenders_public_read on public.tender_broadcasts
  for select to anon, authenticated
  using (is_public or public.current_app_role() in ('marketing','admin','director'));
create policy tenders_manage on public.tender_broadcasts
  for all to authenticated
  using (public.current_app_role() in ('marketing','admin'))
  with check (public.current_app_role() in ('marketing','admin'));
create policy tender_sub_insert on public.tender_subscribers
  for insert to anon, authenticated with check (true);
create policy tender_sub_read on public.tender_subscribers
  for select to authenticated
  using (public.current_app_role() in ('marketing','admin'));

-- ---- CAREERS (public sees active; marketing/admin manage) -------------
create policy careers_public_read on public.careers
  for select to anon, authenticated
  using (is_active or public.current_app_role() in ('marketing','admin'));
create policy careers_manage on public.careers
  for all to authenticated
  using (public.current_app_role() in ('marketing','admin'))
  with check (public.current_app_role() in ('marketing','admin'));

-- ---- JOB APPLICATIONS (public submits; staff review) ------------------
create policy applications_insert_any on public.job_applications
  for insert to anon, authenticated with check (true);
create policy applications_read on public.job_applications
  for select to authenticated
  using (public.current_app_role() in ('marketing','admin','service_manager','director'));
create policy applications_update on public.job_applications
  for update to authenticated
  using (public.current_app_role() in ('marketing','admin','service_manager','director'));

-- ---- TESTIMONIALS (public sees enabled; marketing manages) ------------
create policy testimonials_public_read on public.testimonials
  for select to anon, authenticated
  using (is_enabled or public.current_app_role() in ('marketing','admin'));
create policy testimonials_manage on public.testimonials
  for all to authenticated
  using (public.current_app_role() in ('marketing','admin'))
  with check (public.current_app_role() in ('marketing','admin'));

-- ---- ANNOUNCEMENTS (targeted to the caller's role) --------------------
create policy announcements_read on public.announcements
  for select to authenticated
  using (
    public.current_app_role() in ('director','admin')
    or (status = 'published' and public.current_app_role() = any (target_roles))
  );
create policy announcements_manage on public.announcements
  for all to authenticated
  using (public.current_app_role() in ('director','admin'))
  with check (public.current_app_role() in ('director','admin'));

-- ---- REVIEW REQUESTS (staff only) -------------------------------------
create policy reviews_staff on public.review_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---- NOTIFICATIONS (each user sees only their own) --------------------
create policy notifications_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_own_update on public.notifications
  for update to authenticated using (user_id = auth.uid());
create policy notifications_insert on public.notifications
  for insert to authenticated with check (public.is_staff() or user_id = auth.uid());

-- ---- SITE CONFIG (public reads; admin writes; director/marketing for
--      their respective homepage widgets) --------------------------------
create policy site_settings_read on public.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_admin on public.site_settings
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy hp_ann_read on public.homepage_announcement
  for select to anon, authenticated using (true);
create policy hp_ann_write on public.homepage_announcement
  for all to authenticated
  using (public.current_app_role() in ('director','admin'))
  with check (public.current_app_role() in ('director','admin'));

create policy hp_promo_read on public.homepage_promo
  for select to anon, authenticated using (true);
create policy hp_promo_write on public.homepage_promo
  for all to authenticated
  using (public.current_app_role() in ('marketing','admin'))
  with check (public.current_app_role() in ('marketing','admin'));

create policy site_audit_read on public.site_audit
  for select to authenticated using (public.current_app_role() in ('admin','director'));
create policy site_audit_insert on public.site_audit
  for insert to authenticated with check (public.is_staff());


-- =====================================================================
-- 19. MARKETING VIEW — complaints WITHOUT client identity (§23)
--     Marketing has national visibility but must not see who complained.
--     Query this view from the marketing dashboard instead of the table.
-- =====================================================================
create or replace view public.complaints_marketing
with (security_invoker = true) as
  select id, ticket, branch_id, journey_stage, category, severity, priority,
         sentiment, status, created_at, resolved_at, closed_at,
         root_cause_group, root_cause
  from public.complaints;
grant select on public.complaints_marketing to authenticated;


-- =====================================================================
-- 20. STORAGE BUCKETS (run in Supabase; private — never public)
--     CVs and complaint voice notes contain PII and must stay private,
--     accessed only via signed URLs generated server-side.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false), ('voice-notes', 'voice-notes', false)
on conflict (id) do nothing;

-- Staff may read CVs; anyone may upload an application CV.
create policy "cv upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'cvs');
create policy "cv read staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs' and public.is_staff());

-- Voice notes: uploaded with a complaint, read by staff.
create policy "voice upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'voice-notes');
create policy "voice read staff" on storage.objects
  for select to authenticated
  using (bucket_id = 'voice-notes' and public.is_staff());


-- =====================================================================
-- 21. SEED NOTES
--   • Insert the five branches first (Gaborone, Francistown, Maun,
--     Palapye, Selebi-Phikwe) so FKs resolve, then create the singleton
--     config rows:
--         insert into public.site_settings (id) values (true);
--         insert into public.homepage_announcement (id) values (true);
--         insert into public.homepage_promo (id) values (true);
--   • Staff accounts are created via Supabase Auth; their profile row is
--     created automatically by handle_new_user(), then an admin sets the
--     correct role/branch_id.
--   • client_code (TIC-000001) and ticket (TCN-0001) are generated — never
--     write them directly.
-- =====================================================================
