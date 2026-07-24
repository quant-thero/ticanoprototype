-- stop sending Director non-actionable notifications
-- Two notification triggers were broadcasting to both service_manager
-- AND director every time, but the director copy had no deep-link
-- (link_tab was NULL in both cases), because there was never actually
-- anywhere for a Director to go act on either one. New client signups
-- are Service Manager's operational concern (assigning a PM);
-- improvement-feedback suggestions are also Service Manager's. Both
-- were just noise for Director, flagged, unactionable, no way to
-- clear it except generically marking it read.
--
-- This isn't "Director sees less" broadly, escalations targeted at
-- Director specifically are untouched, since those genuinely need
-- Director's attention and have a real place to go act on them.

CREATE OR REPLACE FUNCTION notify_new_client_signup(p_customer_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
  v_branch TEXT;
  v_type TEXT;
BEGIN
  IF current_app_role() <> 'customer' OR current_app_user_id() <> p_customer_user_id THEN
    RETURN;
  END IF;

  SELECT u.full_name, b.name, cp.client_type
    INTO v_name, v_branch, v_type
  FROM users u
  JOIN client_profiles cp ON cp.user_id = u.id
  LEFT JOIN branches b ON b.id = cp.preferred_branch_id
  WHERE u.id = p_customer_user_id;

  IF v_name IS NULL THEN
    RETURN;
  END IF;

  -- Service Manager only now, this is who actually needs to assign a
  -- PM to the new client; Director had no deep-link and nothing to do.
  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    ('service_manager', 'client', 'New client registered',
     v_name || ' (' || COALESCE(v_type, 'new') || ' client) registered'
       || CASE WHEN v_branch IS NOT NULL THEN ' at ' || v_branch ELSE '' END
       || ' and is awaiting Portfolio Manager assignment.', 'Unassigned');
END;
$$;

CREATE OR REPLACE FUNCTION improvement_feedback_notify() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Service Manager only, same reasoning as above; Director had no
  -- deep-link target for this either.
  INSERT INTO notifications (audience_role, type, title, body, link_tab) VALUES
    ('service_manager', 'feedback', 'New suggestion received',
     COALESCE(NEW.author_name, 'A client') || ' shared a suggestion (' || NEW.category || ').', 'Improvement Feedback');
  RETURN NEW;
END;
$$;
