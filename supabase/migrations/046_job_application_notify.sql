-- notification trigger for new job applications
-- The merged Service Manager / Marketing dashboards use a notification-
-- based tab badge system (see ServiceManagerDashboard.jsx / Marketing-
-- Dashboard.jsx), every other tab's badge count comes from real
-- notification rows already being created by an existing trigger
-- (complaints, escalations, branch changes, improvement feedback).
-- job_applications was the one exception with no trigger at all, which
-- would have made the "Applications" tab badge permanently show 0
-- regardless of how many new applications actually came in.

CREATE OR REPLACE FUNCTION job_application_notify() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    ('marketing', 'application', 'New job application received',
     NEW.applicant_name || ' applied for ' || NEW.position || '.', 'Careers'),
    ('service_manager', 'application', 'New job application received',
     NEW.applicant_name || ' applied for ' || NEW.position || '.', 'Applications');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_application_notify ON job_applications;
CREATE TRIGGER trg_job_application_notify
  AFTER INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION job_application_notify();
