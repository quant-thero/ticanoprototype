-- Marketing module RLS + grants
-- Covers: leads, questionnaires (+questions/responses/answers),
-- tender_broadcasts, tender_subscribers, blog_posts, testimonials,
-- careers, job_applications, homepage_promos, referral_sources.
--
-- Pattern used throughout:
-- - Public/marketing content (blog, testimonials, careers, promos,
-- referral sources) is readable by EVERYONE (anon + authenticated),
-- since the public homepage needs it, but only enabled/published
-- rows. Staff can see and manage everything, including drafts.
-- - Lead-gen forms (job applications, tender subscribe, questionnaire
-- responses) allow an anon/authenticated INSERT of just their own
-- submission, but no read/update/delete, that stays staff-only.
-- - Internal marketing tools (leads, tender broadcasts) are staff-only,
-- no public access at all.
--
-- Run this in the Supabase SQL editor. Safe to re-run.

alter table leads enable row level security;
alter table questionnaires enable row level security;
alter table questionnaire_questions enable row level security;
alter table questionnaire_responses enable row level security;
alter table questionnaire_answers enable row level security;
alter table tender_broadcasts enable row level security;
alter table tender_subscribers enable row level security;
alter table blog_posts enable row level security;
alter table testimonials enable row level security;
alter table careers enable row level security;
alter table job_applications enable row level security;
alter table homepage_promos enable row level security;
alter table referral_sources enable row level security;

-- Leads, internal only, no public access
drop policy if exists "leads_all_staff" on leads;
create policy "leads_all_staff" on leads for all
  using (is_staff()) with check (is_staff());

-- Questionnaires, staff manage; clients read published ones and submit
-- their own single response.
drop policy if exists "questionnaires_select" on questionnaires;
create policy "questionnaires_select" on questionnaires for select
  using (status = 'published' or is_staff());
drop policy if exists "questionnaires_manage" on questionnaires;
create policy "questionnaires_manage" on questionnaires for all
  using (is_staff()) with check (is_staff());

drop policy if exists "questionnaire_questions_select" on questionnaire_questions;
create policy "questionnaire_questions_select" on questionnaire_questions for select
  using (exists (select 1 from questionnaires q where q.id = questionnaire_questions.questionnaire_id and (q.status = 'published' or is_staff())));
drop policy if exists "questionnaire_questions_manage" on questionnaire_questions;
create policy "questionnaire_questions_manage" on questionnaire_questions for all
  using (is_staff()) with check (is_staff());

drop policy if exists "questionnaire_responses_select" on questionnaire_responses;
create policy "questionnaire_responses_select" on questionnaire_responses for select
  using (client_id = current_app_user_id() or is_staff());
drop policy if exists "questionnaire_responses_insert" on questionnaire_responses;
create policy "questionnaire_responses_insert" on questionnaire_responses for insert
  with check (client_id = current_app_user_id());

drop policy if exists "questionnaire_answers_select" on questionnaire_answers;
create policy "questionnaire_answers_select" on questionnaire_answers for select
  using (exists (select 1 from questionnaire_responses r where r.id = questionnaire_answers.response_id and (r.client_id = current_app_user_id() or is_staff())));
drop policy if exists "questionnaire_answers_insert" on questionnaire_answers;
create policy "questionnaire_answers_insert" on questionnaire_answers for insert
  with check (exists (select 1 from questionnaire_responses r where r.id = questionnaire_answers.response_id and r.client_id = current_app_user_id()));

-- Tenders, broadcasts are internal; subscribing is public
drop policy if exists "tender_broadcasts_all_staff" on tender_broadcasts;
create policy "tender_broadcasts_all_staff" on tender_broadcasts for all
  using (is_staff()) with check (is_staff());

drop policy if exists "tender_subscribers_insert_public" on tender_subscribers;
create policy "tender_subscribers_insert_public" on tender_subscribers for insert
  with check (true);
drop policy if exists "tender_subscribers_select_staff" on tender_subscribers;
create policy "tender_subscribers_select_staff" on tender_subscribers for select
  using (is_staff());
drop policy if exists "tender_subscribers_update_staff" on tender_subscribers;
create policy "tender_subscribers_update_staff" on tender_subscribers for update
  using (is_staff()) with check (is_staff());

-- Blog, public reads published posts, staff manage everything
drop policy if exists "blog_posts_select_public" on blog_posts;
create policy "blog_posts_select_public" on blog_posts for select
  using (status = 'published' or is_staff());
drop policy if exists "blog_posts_manage" on blog_posts;
create policy "blog_posts_manage" on blog_posts for all
  using (is_staff()) with check (is_staff());

-- Testimonials, public reads enabled ones, staff manage everything
drop policy if exists "testimonials_select_public" on testimonials;
create policy "testimonials_select_public" on testimonials for select
  using (enabled = true or is_staff());
drop policy if exists "testimonials_manage" on testimonials;
create policy "testimonials_manage" on testimonials for all
  using (is_staff()) with check (is_staff());

-- Careers, public reads active listings; applying is public insert-only
drop policy if exists "careers_select_public" on careers;
create policy "careers_select_public" on careers for select
  using (is_active = true or is_staff());
drop policy if exists "careers_manage" on careers;
create policy "careers_manage" on careers for all
  using (is_staff()) with check (is_staff());

drop policy if exists "job_applications_insert_public" on job_applications;
create policy "job_applications_insert_public" on job_applications for insert
  with check (true);
drop policy if exists "job_applications_select_staff" on job_applications;
create policy "job_applications_select_staff" on job_applications for select
  using (is_staff());
drop policy if exists "job_applications_update_staff" on job_applications;
create policy "job_applications_update_staff" on job_applications for update
  using (is_staff()) with check (is_staff());

-- Homepage promos, public reads the live one, staff manage everything
drop policy if exists "homepage_promos_select_public" on homepage_promos;
create policy "homepage_promos_select_public" on homepage_promos for select
  using (enabled = true or is_staff());
drop policy if exists "homepage_promos_manage" on homepage_promos;
create policy "homepage_promos_manage" on homepage_promos for all
  using (is_staff()) with check (is_staff());

-- Referral sources, public read (used in signup form dropdown), staff manage
drop policy if exists "referral_sources_select_public" on referral_sources;
create policy "referral_sources_select_public" on referral_sources for select
  using (true);
drop policy if exists "referral_sources_manage" on referral_sources;
create policy "referral_sources_manage" on referral_sources for all
  using (is_management()) with check (is_management());

-- Grants, same three-role pattern as migrations 002/003. Anon needs
-- explicit SELECT/INSERT on the public-facing tables since RLS only
-- decides which ROWS, not whether the role can touch the table at all.
grant select, insert, update, delete on
  leads, questionnaires, questionnaire_questions, questionnaire_responses, questionnaire_answers,
  tender_broadcasts, tender_subscribers, blog_posts, testimonials, careers, job_applications,
  homepage_promos, referral_sources
to authenticated;

grant select on blog_posts, testimonials, careers, homepage_promos, referral_sources to anon;
grant insert on tender_subscribers, job_applications, questionnaire_responses, questionnaire_answers to anon;

-- Storage, promo/blog images and CVs. Buckets created idempotently;
-- adjust in Dashboard > Storage if you'd rather configure manually.
insert into storage.buckets (id, name, public)
values ('marketing-images', 'marketing-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

drop policy if exists "marketing_images_public_read" on storage.objects;
create policy "marketing_images_public_read" on storage.objects for select
  using (bucket_id = 'marketing-images');

drop policy if exists "marketing_images_staff_write" on storage.objects;
create policy "marketing_images_staff_write" on storage.objects for all
  using (bucket_id = 'marketing-images' and is_staff())
  with check (bucket_id = 'marketing-images' and is_staff());

drop policy if exists "cvs_public_upload" on storage.objects;
create policy "cvs_public_upload" on storage.objects for insert
  with check (bucket_id = 'cvs');

drop policy if exists "cvs_staff_read" on storage.objects;
create policy "cvs_staff_read" on storage.objects for select
  using (bucket_id = 'cvs' and is_staff());

-- Branches, Admin's Branch Management UI manages a couple of fields
-- (opening hours, region) that weren't in the original schema.
alter table branches add column if not exists open_hours text;
alter table branches add column if not exists region text;
