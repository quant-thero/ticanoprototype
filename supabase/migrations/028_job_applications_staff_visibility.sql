-- job applications must be visible to Service Manager too
-- (merged from a parallel branch) intentionally scoped
-- job_applications visibility to Marketing only, reasoning that
-- Marketing owns careers/hiring. But ServiceManagerDashboard.jsx has
-- its own "Applications" tab rendering JobApplicationsModule, that
-- tab would show nothing for a Service Manager under the
-- Marketing-only policy. Broadened to match how the app is actually
-- used: is_staff() (Portfolio Manager, Service Manager, Director,
-- Admin) can view, same shape as improvement_feedback's own policy.

DROP POLICY IF EXISTS "job_applications_select_staff" ON job_applications;
CREATE POLICY "job_applications_select_staff" ON job_applications FOR SELECT
  USING (is_staff() OR is_marketing());

DROP POLICY IF EXISTS "job_applications_update_staff" ON job_applications;
CREATE POLICY "job_applications_update_staff" ON job_applications FOR UPDATE
  USING (is_staff() OR is_marketing()) WITH CHECK (is_staff() OR is_marketing());

-- Same gap on the actual CV file storage, the table-level policies
-- above are meaningless if the CV file itself still can't be opened.
-- narrowed this to Marketing only when fixing a different
-- issue; broadened to match: Service Manager's Applications tab needs
-- to actually open/download the files it lists.
DROP POLICY IF EXISTS "cvs_staff_read" ON storage.objects;
CREATE POLICY "cvs_staff_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'cvs' AND (is_staff() OR is_marketing()));
