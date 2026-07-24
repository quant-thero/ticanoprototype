-- deep-link notifications to the specific complaint
-- complaints_notify_new() and complaint_escalations_notify() (migration
-- 015) only ever linked to the general tab (e.g. 'complaints'), not the
-- specific complaint that triggered the notification, so clicking one
-- took you to a list you'd then have to search through, rather than
-- straight to the actual case. The complaint ID is now encoded into
-- link_tab as 'complaints:<id>' (parsed client-side, see Navbar.jsx
-- openNotification and ClientDashboard/PmDashboard/
-- ServiceManagerDashboard's deep-link handling).

CREATE OR REPLACE FUNCTION complaints_notify_new() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_pm_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
      (NEW.assigned_pm_id, 'complaint', 'New complaint from your client',
       COALESCE(NEW.customer_name, 'A client') || ' submitted a complaint (' || NEW.ticket || ').', 'complaints:' || NEW.id);
  ELSE
    INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
      ('service_manager', 'complaint', 'New unassigned complaint',
       COALESCE(NEW.customer_name, 'A client') || ' submitted a complaint (' || NEW.ticket || ') with no Portfolio Manager on file.', 'Unassigned');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION complaint_escalations_notify() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket TEXT;
  v_customer TEXT;
  v_pm_id BIGINT;
BEGIN
  SELECT ticket, customer_name, assigned_pm_id INTO v_ticket, v_customer, v_pm_id
  FROM complaints WHERE id = NEW.complaint_id;

  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    (COALESCE(NEW.escalated_to::TEXT, 'service_manager')::user_role, 'escalation', 'Complaint escalated',
     COALESCE(v_ticket, 'A complaint') || ' (' || COALESCE(v_customer, 'client') || ') was escalated by '
       || COALESCE(NEW.escalated_by, 'staff') || '. Reason: ' || NEW.reason, 'complaints:' || NEW.complaint_id),
    ('director', 'escalation', 'Complaint escalated',
     COALESCE(v_ticket, 'A complaint') || ' (' || COALESCE(v_customer, 'client') || ') was escalated.',
     CASE WHEN NEW.escalated_to = 'director' THEN 'complaints:' || NEW.complaint_id ELSE NULL END),
    ('admin', 'escalation', 'Complaint escalated',
     COALESCE(v_ticket, 'A complaint') || ' (' || COALESCE(v_customer, 'client') || ') was escalated.', NULL);

  IF v_pm_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
      (v_pm_id, 'escalation', 'Your complaint was escalated',
       COALESCE(v_ticket, 'Your complaint') || ' has been escalated to ' || COALESCE(NEW.escalated_to::TEXT, 'management') || '.', 'complaints:' || NEW.complaint_id);
  END IF;

  RETURN NEW;
END;
$$;
