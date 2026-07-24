-- stop notifying Admin about complaint escalations
-- complaint_escalations_notify() (migration 023) included Admin in
-- every escalation notification "for full oversight", but Admin's
-- role here is system administration, not day-to-day complaint
-- handling, which Service Manager and Director already cover. Removed.

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
     CASE WHEN NEW.escalated_to = 'director' THEN 'complaints:' || NEW.complaint_id ELSE NULL END);

  IF v_pm_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, link_tab) VALUES
      (v_pm_id, 'escalation', 'Your complaint was escalated',
       COALESCE(v_ticket, 'Your complaint') || ' has been escalated to ' || COALESCE(NEW.escalated_to::TEXT, 'management') || '.', 'complaints:' || NEW.complaint_id);
  END IF;

  RETURN NEW;
END;
$$;
