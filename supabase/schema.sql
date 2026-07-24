-- TICANO GROUP, PostgreSQL Database Schema
-- Trade-finance complaint, client & marketing platform (Botswana SME)
--
-- Target: PostgreSQL 14+ (Supabase)
-- Grounded in the application's data layer (src/services/api.js +
-- src/utils/constants.js). Replaces the in-memory mock store.
-- Updated to cover the Client Portfolio (PM CRM) module, the merged
-- system-wide audit log, auto-picked 5-star testimonials, and the
-- homepage promo flyer/image field added after the original version
-- of this schema.
--
-- Conventions
-- - snake_case identifiers, plural table names
-- - BIGINT identity primary keys
-- - TIMESTAMPTZ for all timestamps (store UTC)
-- - CITEXT for emails (case-insensitive uniqueness)
-- - ENUM types for fixed vocabularies; lookup tables for
-- business-extensible lists (categories, referral sources)
-- - ON DELETE chosen per relationship (RESTRICT by default,
-- CASCADE for child/detail rows, SET NULL for soft references)
--
-- Auth note: `users` is this schema's own identity table (with its own
-- password_hash), not Supabase Auth's auth.users. If you adopt Supabase
-- Auth instead, add a `auth_user_id UUID REFERENCES auth.users(id)`
-- column to `users` and base RLS policies on auth.uid() via that column.
-- RLS is intentionally not included below, add it once the auth
-- approach (custom vs Supabase Auth) is decided, mirroring the app's
-- role scopes (PM → own complaints/portfolio clients only, Service
-- Manager → own branch, Director/Admin → everything, Customer → own
-- records only).

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext; -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid(), if needed

-- Shared trigger: keep updated_at current on UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. ENUM TYPES (fixed vocabularies from constants.js)
CREATE TYPE user_role AS ENUM ('customer','portfolio_manager','service_manager','director','marketing','admin');
CREATE TYPE client_type AS ENUM ('new','existing');
CREATE TYPE journey_stage AS ENUM ('before_applying','during_application','after_disbursement');
CREATE TYPE complaint_status AS ENUM ('created','assigned','in_progress','customer_contacted','pending_customer','escalated','resolved','closed');
CREATE TYPE complaint_severity AS ENUM ('minor','moderate','major','critical');
CREATE TYPE complaint_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE complaint_sentiment AS ENUM ('positive','neutral','negative','urgent_concern');
CREATE TYPE escalation_level AS ENUM ('service_manager','director');
CREATE TYPE root_cause_group AS ENUM ('Service Issues','Process Issues','System Issues');
CREATE TYPE note_type AS ENUM ('internal','customer');
CREATE TYPE feedback_source AS ENUM ('client_portal','public_link','survey');
CREATE TYPE lead_status AS ENUM ('New','Contacted','Interested','Converted','Lost');
CREATE TYPE application_status AS ENUM ('New','Under Review','Shortlisted','Rejected','Hired');
CREATE TYPE content_status AS ENUM ('draft','published');
CREATE TYPE announcement_priority AS ENUM ('info','normal','high');
CREATE TYPE question_type AS ENUM ('rating','choice','text');
CREATE TYPE career_type AS ENUM ('Full-time','Part-time','Internship','Voluntary');
CREATE TYPE promo_mode AS ENUM ('banner','popup');
CREATE TYPE promo_theme AS ENUM ('red','charcoal','light');
CREATE TYPE legal_doc_type AS ENUM ('privacy','terms','cookie');
CREATE TYPE notify_channel AS ENUM ('whatsapp','email','sms');
CREATE TYPE assistance_status AS ENUM ('Funded','Completed','Cancelled','Expired');
CREATE TYPE contact_method AS ENUM ('Phone','WhatsApp','Email','Physical visit');
CREATE TYPE testimonial_source AS ENUM ('manual','survey');

-- 2. REFERENCE / LOOKUP TABLES

-- Branches (BRANCH_DIRECTORY). "Head Office" included for director/admin/marketing.
CREATE TABLE branches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Botswana',
  phone TEXT,
  email CITEXT,
  manager_name TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Complaint categories grouped by journey stage (COMPLAINT_CATEGORIES).
CREATE TABLE complaint_categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journey_stage journey_stage NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (journey_stage, name)
);

-- Referral sources (REFERRAL_SOURCES), used by leads & client registration.
CREATE TABLE referral_sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. IDENTITY: users + role-specific profiles

-- Unified account for every person who can authenticate (clients + staff).
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  email CITEXT UNIQUE, -- nullable: anonymous/lead-only contacts
  whatsapp_number TEXT,
  password_hash TEXT, -- NULL until set; bcrypt/argon2
  role user_role NOT NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch ON users(branch_id);

-- Customer-specific profile (1:1 with users where role = 'customer').
-- client_code renders the TIC-000001 identifier seen in the app.
CREATE TABLE client_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  client_code TEXT GENERATED ALWAYS AS ('TIC-' || lpad(user_id::text, 6, '0')) STORED,
  client_type client_type NOT NULL DEFAULT 'new',
  industry TEXT,
  occupation TEXT,
  gender TEXT,
  marital_status TEXT,
  nationality TEXT DEFAULT 'Motswana',
  physical_address TEXT,
  city TEXT,
  base_location TEXT,
  preferred_branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  assigned_pm_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  emergency_contact_name TEXT,
  emergency_contact_number TEXT,
  referral_source_id BIGINT REFERENCES referral_sources(id) ON DELETE SET NULL,
  referral_other_text TEXT,
  -- opt-ins (§14 birthday, §16 location, tender alerts)
  location_sharing_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  birthday_messages_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  date_of_birth DATE, -- only stored if opted in
  tender_notifications_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_client_profiles_updated BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_client_profiles_pm ON client_profiles(assigned_pm_id);
CREATE INDEX idx_client_profiles_type ON client_profiles(client_type);

-- Staff-specific profile (1:1 with users where role != 'customer').
-- staff_code renders the TIC-0001 identifier seen in the app.
CREATE TABLE staff_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  staff_code TEXT GENERATED ALWAYS AS ('TIC-' || lpad(user_id::text, 4, '0')) STORED,
  job_title TEXT,
  -- PM matchmaking data (PM_DIRECTORY.categoryStrengths)
  category_strengths TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_staff_profiles_updated BEFORE UPDATE ON staff_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-user notification preferences (Profile › Preferences toggles).
CREATE TABLE user_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  notify_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  dark_mode BOOLEAN NOT NULL DEFAULT FALSE
);

-- Birthday messaging preference (BIRTHDAY_PREFS).
CREATE TABLE birthday_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  channel notify_channel NOT NULL DEFAULT 'whatsapp',
  birthday_date DATE
);

-- 4. COMPLAINT TRACKING (core domain)

-- App-generated human ticket id is TCN-0001. Sequence backs that format.
CREATE SEQUENCE complaint_ticket_seq START 1;

CREATE TABLE complaints (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket TEXT NOT NULL UNIQUE, -- e.g. 'TCN-0001'
  -- reporter: customer_id NULL when anonymous; snapshot name retained
  customer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL, -- snapshot, or ANON-000001
  anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  anonymous_code TEXT, -- 'ANON-000001' when anonymous
  client_type client_type,
  -- classification
  journey_stage journey_stage NOT NULL,
  category_id BIGINT REFERENCES complaint_categories(id) ON DELETE RESTRICT,
  category_name TEXT NOT NULL, -- snapshot (categories may be 'Other')
  severity complaint_severity NOT NULL,
  priority complaint_priority NOT NULL,
  sentiment complaint_sentiment NOT NULL DEFAULT 'neutral',
  status complaint_status NOT NULL DEFAULT 'created',
  description TEXT NOT NULL,
  branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  assigned_pm_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  -- root cause (set on resolution)
  root_cause_group root_cause_group,
  root_cause TEXT,
  root_cause_notes TEXT,
  -- lifecycle timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_complaints_updated BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_branch ON complaints(branch_id);
CREATE INDEX idx_complaints_pm ON complaints(assigned_pm_id);
CREATE INDEX idx_complaints_customer ON complaints(customer_id);
CREATE INDEX idx_complaints_created ON complaints(created_at);

-- Escalation events (PM → Service Manager → Director).
CREATE TABLE complaint_escalations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  escalated_by TEXT NOT NULL, -- actor name (or user_id ref)
  escalated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  escalated_to escalation_level NOT NULL DEFAULT 'service_manager',
  reason TEXT NOT NULL,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_escalations_complaint ON complaint_escalations(complaint_id);

-- Ordered lifecycle timeline (complaint.timeline[]).
CREATE TABLE complaint_timeline (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  status complaint_status,
  actor TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_complaint ON complaint_timeline(complaint_id, occurred_at);

-- Internal + customer-facing notes (complaint.internalNotes / customerNotes).
CREATE TABLE complaint_notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  note_type note_type NOT NULL,
  author TEXT NOT NULL,
  author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_complaint ON complaint_notes(complaint_id);

-- Post-resolution satisfaction survey (complaint.satisfaction).
CREATE TABLE complaint_satisfaction (
  complaint_id BIGINT PRIMARY KEY REFERENCES complaints(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issue_resolved BOOLEAN,
  communication_satisfactory BOOLEAN,
  pm_professional BOOLEAN,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comments TEXT
);

-- Immutable audit trail (§15), every state change appends a row.
CREATE TABLE complaint_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complaint_id BIGINT REFERENCES complaints(id) ON DELETE SET NULL,
  ticket TEXT,
  performed_by TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_complaint ON complaint_audit_log(complaint_id);

-- 5. FEEDBACK & RATINGS

-- Star ratings / comments (client portal, public review link, survey).
CREATE TABLE feedback (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  staff_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  service_type TEXT,
  source feedback_source NOT NULL DEFAULT 'client_portal',
  review_token TEXT UNIQUE, -- for public review links
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_branch ON feedback(branch_id);
CREATE INDEX idx_feedback_staff ON feedback(staff_id);

-- "How can we improve?" submissions (IMPROVEMENT_FEEDBACK).
CREATE TABLE improvement_feedback (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category TEXT NOT NULL, -- IMPROVEMENT_CATEGORIES
  body TEXT NOT NULL,
  author_name TEXT, -- 'Anonymous' allowed
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. LEADS (potential clients)
CREATE TABLE leads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  referral_source_id BIGINT REFERENCES referral_sources(id) ON DELETE SET NULL,
  referral_source_text TEXT, -- snapshot / free-text source
  product TEXT,
  status lead_status NOT NULL DEFAULT 'New',
  notes TEXT,
  added_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  added_by_name TEXT,
  converted_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_branch ON leads(branch_id);
-- De-duplication helper: normalised phone digits should be unique.
CREATE UNIQUE INDEX uq_leads_phone_digits
  ON leads ((regexp_replace(phone, '\D', '', 'g')));

-- 6b. CLIENT PORTFOLIO (Portfolio Manager CRM for PO financing clients)
-- Tracks how many times a PM has assisted each client with PO financing
-- facilitation, plus independent contact/retention tracking. Distinct
-- from client_profiles (registered platform customers), a portfolio
-- client is a company/contact a PM has worked with, which may or may
-- not also have a platform login. Read access is also exposed to
-- Service Manager and Director for oversight (org-wide, all PMs).
CREATE TABLE portfolio_clients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_code TEXT GENERATED ALWAYS AS ('TIC-' || lpad(id::text, 6, '0')) STORED,
  company_name TEXT NOT NULL,
  reg_number TEXT,
  contact_person TEXT,
  phone TEXT,
  email CITEXT,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  industry TEXT,
  pm_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Contact / retention tracking, independent of assistance records.
  last_contact_date DATE,
  next_follow_up_date DATE,
  contact_status_notes TEXT,
  preferred_contact_method contact_method NOT NULL DEFAULT 'Phone',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_portfolio_clients_updated BEFORE UPDATE ON portfolio_clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_portfolio_clients_pm ON portfolio_clients(pm_id);
CREATE INDEX idx_portfolio_clients_branch ON portfolio_clients(branch_id);
CREATE INDEX idx_portfolio_clients_lastcontact ON portfolio_clients(last_contact_date);
-- De-duplication helpers used by the Excel import flow (client_code takes
-- priority in application logic; reg number / phone / email are fallbacks).
CREATE UNIQUE INDEX uq_portfolio_clients_reg ON portfolio_clients(reg_number) WHERE reg_number IS NOT NULL;

-- Manually logged PO financing facilitation events, never auto-created.
-- A client's "times assisted" count is always COUNT(*) of these rows,
-- never a stored/editable column.
CREATE TABLE assistance_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  portfolio_client_id BIGINT NOT NULL REFERENCES portfolio_clients(id) ON DELETE CASCADE,
  assistance_date DATE NOT NULL DEFAULT current_date,
  po_number TEXT,
  buyer_name TEXT,
  goods_description TEXT,
  po_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_financed NUMERIC(14,2) NOT NULL DEFAULT 0,
  client_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
  industry TEXT,
  funding_institution TEXT,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  status assistance_status NOT NULL DEFAULT 'Funded',
  notes TEXT,
  attachment_urls TEXT[] NOT NULL DEFAULT '{}', -- PO, invoice, contract, delivery docs
  pm_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_assistance_records_updated BEFORE UPDATE ON assistance_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_assistance_client ON assistance_records(portfolio_client_id);
CREATE INDEX idx_assistance_date ON assistance_records(assistance_date);
CREATE INDEX idx_assistance_status ON assistance_records(status);

-- 7. QUESTIONNAIRES / SURVEYS (Marketing)
CREATE TABLE questionnaires (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_questionnaires_updated BEFORE UPDATE ON questionnaires
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE questionnaire_questions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  questionnaire_id BIGINT NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL, -- 'q1','q2' within a questionnaire
  type question_type NOT NULL,
  text TEXT NOT NULL,
  options TEXT[], -- for type='choice'
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (questionnaire_id, question_key)
);

CREATE TABLE questionnaire_responses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  questionnaire_id BIGINT NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT, -- snapshot
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (questionnaire_id, client_id) -- one response per client
);

CREATE TABLE questionnaire_answers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  response_id BIGINT NOT NULL REFERENCES questionnaire_responses(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questionnaire_questions(id) ON DELETE CASCADE,
  answer TEXT, -- rating stored as text/number
  UNIQUE (response_id, question_id)
);

-- 8. MARKETING: tenders, subscribers, blog, testimonials

-- Tender / opportunity broadcasts to filtered client segments.
CREATE TABLE tender_broadcasts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{dashboard}', -- dashboard|email|whatsapp
  filter_branch TEXT NOT NULL DEFAULT 'All',
  filter_client_type TEXT NOT NULL DEFAULT 'All',
  filter_industry TEXT NOT NULL DEFAULT 'All',
  filter_status TEXT NOT NULL DEFAULT 'All',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_by TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tender_broadcasts_sent ON tender_broadcasts(sent_at DESC);

-- Public tender-alert opt-in list (login page, registration, profile).
-- user_id is NULL for visitors who subscribed without an account.
CREATE TABLE tender_subscribers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  phone TEXT,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ -- NULL = currently subscribed
);
CREATE INDEX idx_tender_subscribers_active
  ON tender_subscribers(email) WHERE unsubscribed_at IS NULL;

-- Blog posts / announcements shown on the public homepage.
CREATE TABLE blog_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT,
  category TEXT, -- News|Education|Announcement|Promotion|Update
  author TEXT,
  status content_status NOT NULL DEFAULT 'published',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  scheduled_for DATE, -- hidden until this date
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_blog_posts_updated BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_blog_status ON blog_posts(status);

-- Customer testimonials (homepage).
CREATE TABLE testimonials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- 'manual': added directly by Marketing (e.g. a quote sent by WhatsApp/SMS).
  -- 'survey': auto-picked from a 5-star complaint_satisfaction response.
  source testimonial_source NOT NULL DEFAULT 'manual',
  source_complaint_id BIGINT REFERENCES complaints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- A given 5-star survey response should only ever generate one testimonial.
CREATE UNIQUE INDEX uq_testimonials_source_complaint
  ON testimonials(source_complaint_id) WHERE source_complaint_id IS NOT NULL;

-- 9. CAREERS
CREATE TABLE careers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  type career_type NOT NULL DEFAULT 'Full-time',
  location TEXT,
  department TEXT,
  description TEXT NOT NULL,
  requirements TEXT,
  closing_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- published vs hidden
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_careers_updated BEFORE UPDATE ON careers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE job_applications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  career_id BIGINT REFERENCES careers(id) ON DELETE SET NULL,
  position TEXT NOT NULL, -- snapshot of role title
  applicant_name TEXT NOT NULL,
  email CITEXT NOT NULL,
  phone TEXT,
  cover_note TEXT,
  cv_file_name TEXT,
  cv_mime_type TEXT,
  cv_size_bytes INTEGER,
  cv_url TEXT, -- object-storage key/URL (not a data URL)
  status application_status NOT NULL DEFAULT 'New',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_applications_career ON job_applications(career_id);
CREATE INDEX idx_applications_status ON job_applications(status);

-- 10. CONTENT, CONFIG & OPS

-- Staff announcements with role targeting (ANNOUNCEMENTS).
CREATE TABLE announcements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT,
  author_role user_role,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  status content_status NOT NULL DEFAULT 'published',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which roles each announcement targets (announcement.targetRoles[]).
CREATE TABLE announcement_targets (
  announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  PRIMARY KEY (announcement_id, role)
);

-- In-app notification feed (NotificationContext). link_tab deep-links a dashboard tab.
CREATE TABLE notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  audience_role user_role, -- role-wide notifications
  type TEXT NOT NULL, -- complaint|escalation|lead|report|system|...
  title TEXT NOT NULL,
  body TEXT,
  link_tab TEXT, -- deep-link target tab
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Knowledge base articles (KB_ARTICLES).
CREATE TABLE kb_articles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_kb_updated BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- WhatsApp message templates, scoped by role (WA_TEMPLATES_BY_ROLE).
CREATE TABLE wa_templates (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, template_key)
);
CREATE TRIGGER trg_wa_templates_updated BEFORE UPDATE ON wa_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Admin-editable site settings (SITE_SETTINGS) as namespaced JSON blobs:
-- keys like 'contact','social','homepage','login_page','mission_vision'.
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Director homepage announcement banner (HOMEPAGE_ANNOUNCEMENT), latest row wins.
CREATE TABLE homepage_announcements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT,
  message TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing homepage promo banner/popup (HOMEPAGE_PROMO), latest row wins.
CREATE TABLE homepage_promos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mode promo_mode NOT NULL DEFAULT 'banner',
  title TEXT,
  message TEXT,
  cta_label TEXT,
  cta_link TEXT,
  theme promo_theme NOT NULL DEFAULT 'red',
  image_url TEXT, -- uploaded flyer/photo (Supabase Storage URL)
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legal documents with draft/publish workflow + revision history.
CREATE TABLE legal_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_type legal_doc_type NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_legal_updated BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE legal_document_revisions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT,
  status content_status NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail for site/legal settings changes (SITE_AUDIT).
CREATE TABLE site_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area TEXT NOT NULL, -- 'site_settings','legal','promo'...
  field TEXT,
  previous_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- General system-wide activity feed (Admin › Audit Logs). Every module
-- auth, user management, branches, content, client portfolio, marketing,
-- complaints, feeds into this single table so Admin can see real system
-- activity across the whole platform, filterable by module. Complaint and
-- content changes are also captured in their own detail tables above
-- (complaint_audit_log, site_audit_log); this table is the merged,
-- module-tagged view shown in the Admin dashboard.
CREATE TABLE system_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module TEXT NOT NULL, -- 'Security','User Management','Branches','Content','Complaints','Client Portfolio','Marketing'
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL DEFAULT 'system',
  details TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_audit_module ON system_audit_log(module);
CREATE INDEX idx_system_audit_time ON system_audit_log(occurred_at DESC);

-- 11. CONVENIENCE VIEWS

-- All currently open complaints (non-terminal statuses) with days-open.
CREATE VIEW v_open_complaints AS
SELECT c.*,
       EXTRACT(DAY FROM now() - c.created_at)::int AS days_open
FROM complaints c
WHERE c.status NOT IN ('resolved','closed');

-- Per-branch complaint summary for dashboards.
CREATE VIEW v_branch_complaint_summary AS
SELECT b.id AS branch_id,
       b.name AS branch,
       count(c.id) AS total_complaints,
       count(c.id) FILTER (WHERE c.status NOT IN ('resolved','closed')) AS open_complaints,
       count(c.id) FILTER (WHERE c.status = 'escalated') AS escalated,
       count(c.id) FILTER (WHERE c.status = 'closed') AS closed
FROM branches b
LEFT JOIN complaints c ON c.branch_id = b.id
GROUP BY b.id, b.name;

-- 12. SEED REFERENCE DATA (branches, categories, referral sources)
INSERT INTO branches (name, city, country) VALUES
  ('Gaborone','Gaborone','Botswana'),
  ('Francistown','Francistown','Botswana'),
  ('Maun','Maun','Botswana'),
  ('Palapye','Palapye','Botswana'),
  ('Phikwe','Selebi-Phikwe','Botswana'),
  ('Head Office','Gaborone','Botswana');

INSERT INTO referral_sources (name) VALUES
  ('Facebook'),('WhatsApp'),('Google Search'),('Friend or Family Referral'),
  ('Walk-in'),('Radio / Newspaper'),('CEDA Referral'),
  ('Business Partner Referral'),('Existing Customer Referral'),('Other');

INSERT INTO complaint_categories (journey_stage, name) VALUES
  ('before_applying','Poor service'),
  ('before_applying','Information not provided'),
  ('before_applying','Delayed response'),
  ('before_applying','Difficulty contacting staff'),
  ('before_applying','Other'),
  ('during_application','Application delays'),
  ('during_application','Missing feedback'),
  ('during_application','Staff conduct'),
  ('during_application','Documentation issues'),
  ('during_application','Other'),
  ('after_disbursement','Follow-up service'),
  ('after_disbursement','Payment issues'),
  ('after_disbursement','Interest Issues'),
  ('after_disbursement','Customer support issues'),
  ('after_disbursement','Incorrect information'),
  ('after_disbursement','Other');

COMMIT;

-- END OF SCHEMA
-- Next steps:
-- 1. Decide on auth approach (custom users table above vs Supabase
-- Auth), see the note at the top of this file.
-- 2. Layer Row-Level Security (RLS) policies so a Service Manager only
-- sees their branch, a PM only their assigned complaints and
-- portfolio clients, and clients only their own records, mirroring
-- the app's role scopes.
-- 3. Create a Storage bucket (e.g. "public-media") for the homepage
-- promo flyer image and any complaint/assistance attachments, and
-- point homepage_promos.image_url / assistance_records.attachment_urls
-- at it instead of storing base64 blobs in the database.
