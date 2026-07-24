-- job application notifications go to Service Manager only
-- notified both Marketing and Service Manager on a new
-- job application. Per updated requirements, applications submitted
-- under Careers should surface only in Service Manager's Applications
-- section, Marketing no longer gets a notification for this event.

CREATE OR REPLACE FUNCTION job_application_notify() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    ('service_manager', 'application', 'New job application received',
     NEW.applicant_name || ' applied for ' || NEW.position || '.', 'Applications');
  RETURN NEW;
END;
$$;
