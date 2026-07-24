-- fix marketing role being excluded from RLS entirely
-- is_staff() only ever checked ('portfolio_manager','service_manager',
-- 'director','admin'), the 'marketing' role was never included. Every
-- policy gating writes with is_staff() silently blocked Marketing from
-- managing their own content: homepage promotions, testimonials, blog
-- posts, careers listings, job application review, tender broadcasts,
-- questionnaires, and leads. This is why "new row violates row-level
-- security policy" showed up creating a promotion, the same block was
-- actually present everywhere Marketing writes data.
--
-- Fix: a dedicated is_marketing() helper (marketing + director + admin,
-- since management can reasonably oversee marketing content too),
-- applied to every table Marketing actually owns. Deliberately NOT
-- added to the broader is_staff(), that function also gates complaints,
-- client portfolio, and internal knowledge base, which marketing should
-- not have access to.
--
-- Run this in the Supabase SQL editor. Safe to re-run.

CREATE OR REPLACE FUNCTION is_marketing() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT current_app_role() IN ('marketing', 'director', 'admin');
$$;

-- ---- Homepage Promotions ----
DROP POLICY IF EXISTS "homepage_promos_manage" ON homepage_promos;
CREATE POLICY "homepage_promos_manage" ON homepage_promos FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

-- ---- Testimonials ----
DROP POLICY IF EXISTS "testimonials_manage" ON testimonials;
CREATE POLICY "testimonials_manage" ON testimonials FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

-- ---- Blog posts ----
DROP POLICY IF EXISTS "blog_posts_manage" ON blog_posts;
CREATE POLICY "blog_posts_manage" ON blog_posts FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

-- ---- Careers + job applications ----
DROP POLICY IF EXISTS "careers_manage" ON careers;
CREATE POLICY "careers_manage" ON careers FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

DROP POLICY IF EXISTS "job_applications_select_staff" ON job_applications;
CREATE POLICY "job_applications_select_staff" ON job_applications FOR SELECT
  USING (is_marketing());

DROP POLICY IF EXISTS "job_applications_update_staff" ON job_applications;
CREATE POLICY "job_applications_update_staff" ON job_applications FOR UPDATE
  USING (is_marketing()) WITH CHECK (is_marketing());

-- ---- Tenders ----
DROP POLICY IF EXISTS "tender_broadcasts_all_staff" ON tender_broadcasts;
CREATE POLICY "tender_broadcasts_all_staff" ON tender_broadcasts FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

DROP POLICY IF EXISTS "tender_subscribers_select_staff" ON tender_subscribers;
CREATE POLICY "tender_subscribers_select_staff" ON tender_subscribers FOR SELECT
  USING (is_marketing());

DROP POLICY IF EXISTS "tender_subscribers_update_staff" ON tender_subscribers;
CREATE POLICY "tender_subscribers_update_staff" ON tender_subscribers FOR UPDATE
  USING (is_marketing()) WITH CHECK (is_marketing());

-- ---- Questionnaires ----
DROP POLICY IF EXISTS "questionnaires_select" ON questionnaires;
CREATE POLICY "questionnaires_select" ON questionnaires FOR SELECT
  USING (status = 'published' OR is_marketing());

DROP POLICY IF EXISTS "questionnaires_manage" ON questionnaires;
CREATE POLICY "questionnaires_manage" ON questionnaires FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

DROP POLICY IF EXISTS "questionnaire_questions_select" ON questionnaire_questions;
CREATE POLICY "questionnaire_questions_select" ON questionnaire_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM questionnaires q WHERE q.id = questionnaire_questions.questionnaire_id AND (q.status = 'published' OR is_marketing())));

DROP POLICY IF EXISTS "questionnaire_questions_manage" ON questionnaire_questions;
CREATE POLICY "questionnaire_questions_manage" ON questionnaire_questions FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

DROP POLICY IF EXISTS "questionnaire_responses_select" ON questionnaire_responses;
CREATE POLICY "questionnaire_responses_select" ON questionnaire_responses FOR SELECT
  USING (client_id = current_app_user_id() OR is_marketing());

DROP POLICY IF EXISTS "questionnaire_answers_select" ON questionnaire_answers;
CREATE POLICY "questionnaire_answers_select" ON questionnaire_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM questionnaire_responses r WHERE r.id = questionnaire_answers.response_id AND (r.client_id = current_app_user_id() OR is_marketing())));

-- ---- Leads, created/managed by both Marketing and Portfolio Managers ----
DROP POLICY IF EXISTS "leads_all_staff" ON leads;
CREATE POLICY "leads_all_staff" ON leads FOR ALL
  USING (is_staff() OR is_marketing()) WITH CHECK (is_staff() OR is_marketing());

-- ---- Referral sources, Marketing's own reference data, not just management's ----
DROP POLICY IF EXISTS "referral_sources_manage" ON referral_sources;
CREATE POLICY "referral_sources_manage" ON referral_sources FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

-- ---- Complaints, Marketing's Reports tab (client satisfaction, monthly
-- executive reports) needs aggregate complaint stats; was staff-only before.
DROP POLICY IF EXISTS "complaints_select" ON complaints;
CREATE POLICY "complaints_select" ON complaints FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR is_management() OR is_marketing()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );

-- ---- client_profiles, Active Client Analytics (Marketing + Service
-- Manager dashboards) needs to read customer profiles org-wide to compute
-- new-vs-existing client counts; was staff-only before.
DROP POLICY IF EXISTS "client_profiles_select" ON client_profiles;
CREATE POLICY "client_profiles_select" ON client_profiles FOR SELECT
  USING (user_id = current_app_user_id() OR is_staff() OR is_marketing());

-- ---- Improvement feedback, Marketing/Service Manager both review this ----
DROP POLICY IF EXISTS "improvement_feedback_select_staff" ON improvement_feedback;
CREATE POLICY "improvement_feedback_select_staff" ON improvement_feedback FOR SELECT
  USING (is_staff() OR is_marketing());

-- ---- Storage, marketing-images/cvs buckets were also still gated by
-- is_staff() (missed in the first pass, since Storage policies live in a
-- different table, storage.objects, from the content tables above).
-- Promo flyers, blog images, and career listing images all upload to
-- marketing-images, so this was blocking image uploads specifically even
-- after the homepage_promos table policy itself was fixed.
DROP POLICY IF EXISTS "marketing_images_staff_write" ON storage.objects;
CREATE POLICY "marketing_images_staff_write" ON storage.objects FOR ALL
  USING (bucket_id = 'marketing-images' AND is_marketing())
  WITH CHECK (bucket_id = 'marketing-images' AND is_marketing());

DROP POLICY IF EXISTS "cvs_staff_read" ON storage.objects;
CREATE POLICY "cvs_staff_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'cvs' AND is_marketing());

-- ---- Feedback + complaint_satisfaction, CSAT trend is shown on the
-- Marketing dashboard too, not just Director's, so Marketing needs to see
-- ratings org-wide the same way is_management() already does.
DROP POLICY IF EXISTS "feedback_select" ON feedback;
CREATE POLICY "feedback_select" ON feedback FOR SELECT
  USING (
    customer_id = current_app_user_id()
    OR is_management() OR is_marketing()
    OR (is_branch_staff() AND branch_id = current_app_branch_id())
  );

DROP POLICY IF EXISTS "complaint_satisfaction_select" ON complaint_satisfaction;
CREATE POLICY "complaint_satisfaction_select" ON complaint_satisfaction FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM complaints c WHERE c.id = complaint_satisfaction.complaint_id
    AND (c.customer_id = current_app_user_id() OR is_management() OR is_marketing()
         OR (is_branch_staff() AND c.branch_id = current_app_branch_id()))
  ));
