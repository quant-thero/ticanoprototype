-- full dynamic queue system
-- Rebuilds queue position with priority-first ordering (Urgent > High >
-- Medium > Low, then oldest-first within each priority), adds PM/SM
-- queue overview functions, and wires timeline events + targeted
-- notifications into the existing complaint lifecycle triggers.
--
-- Note on scope: "notify customers when queue position changes" is
-- implemented for changes to THAT customer's own complaint (their
-- priority changing, being assigned, leaving the queue), not for
-- every other customer whose position shifts by one when a totally
-- unrelated complaint elsewhere resolves. Pushing a notification to
-- every affected customer on every single queue change (potentially
-- the whole active queue, on every resolution) isn't a reasonable
-- notification volume, position is instead always freely available
-- on demand (dynamically computed, never stored/hardcoded, exactly as
-- specified) via the queue card, which is the accurate real-time
-- source of truth whenever they look.

-- Priority rank helper, used for ordering everywhere below.
CREATE OR REPLACE FUNCTION priority_rank(p TEXT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
    ELSE 5
  END;
$$;

-- Customer-facing: this complaint's queue position, ordered by
-- priority first, then oldest-first.
CREATE OR REPLACE FUNCTION get_queue_position(p_complaint_id BIGINT)
RETURNS TABLE (queue_position INTEGER, total_in_queue INTEGER, status TEXT, priority TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer_id BIGINT;
BEGIN
  SELECT customer_id INTO v_customer_id FROM complaints WHERE id = p_complaint_id;

  IF v_customer_id IS DISTINCT FROM current_app_user_id() AND NOT is_staff() AND NOT is_management() THEN
    RAISE EXCEPTION 'Not authorized to view this complaint''s queue position';
  END IF;

  RETURN QUERY
  WITH queue AS (
    SELECT c.id, c.status, c.priority,
           ROW_NUMBER() OVER (ORDER BY priority_rank(c.priority) ASC, c.created_at ASC) AS rn
    FROM complaints c
    WHERE c.status IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
  )
  SELECT q.rn::INTEGER, (SELECT COUNT(*)::INTEGER FROM queue), q.status, q.priority
  FROM queue q
  WHERE q.id = p_complaint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_position(BIGINT) TO authenticated;

-- Staff-facing: the full active queue, in order, used by both the PM
-- dashboard (queue order + who's assigned) and Service Manager (queue
-- stats derived from the same view). is_staff()-gated; a plain
-- customer gets nothing from this one.
CREATE OR REPLACE FUNCTION get_queue_overview()
RETURNS TABLE (
  queue_position INTEGER, complaint_id BIGINT, ticket TEXT, customer_name TEXT,
  priority TEXT, status TEXT, branch_name TEXT, assigned_pm_name TEXT,
  created_at TIMESTAMPTZ, waiting_minutes INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_staff() AND NOT is_management() THEN
    RAISE EXCEPTION 'Not authorized to view the queue overview';
  END IF;

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY priority_rank(c.priority) ASC, c.created_at ASC)::INTEGER,
    c.id, c.ticket, c.customer_name, c.priority, c.status,
    b.name, u.full_name,
    c.created_at,
    EXTRACT(EPOCH FROM (now() - c.created_at))::INTEGER / 60
  FROM complaints c
  LEFT JOIN branches b ON b.id = c.branch_id
  LEFT JOIN users u ON u.id = c.assigned_pm_id
  WHERE c.status IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
  ORDER BY priority_rank(c.priority) ASC, c.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_overview() TO authenticated;

-- Service Manager queue stats: total waiting, breakdown by priority,
-- longest-waiting complaint.
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE (
  total_waiting INTEGER, urgent_count INTEGER, high_count INTEGER,
  medium_count INTEGER, low_count INTEGER,
  longest_waiting_ticket TEXT, longest_waiting_minutes INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_staff() AND NOT is_management() THEN
    RAISE EXCEPTION 'Not authorized to view queue stats';
  END IF;

  RETURN QUERY
  WITH active AS (
    SELECT * FROM complaints
    WHERE status IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
  ), longest AS (
    SELECT ticket, EXTRACT(EPOCH FROM (now() - created_at))::INTEGER / 60 AS mins
    FROM active ORDER BY created_at ASC LIMIT 1
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM active),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority = 'urgent'),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority = 'high'),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority = 'medium'),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority = 'low'),
    (SELECT ticket FROM longest),
    (SELECT mins FROM longest);
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_stats() TO authenticated;

-- Timeline events + targeted notifications, wired into the actual
-- lifecycle: submission, priority change, PM assignment, leaving the
-- queue (resolved/closed).

-- On INSERT, "Added to Queue" (only if it actually starts in a queue
-- status, which is always true today, but guards against future statuses).
CREATE OR REPLACE FUNCTION complaint_queue_added() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated') THEN
    INSERT INTO complaint_timeline (complaint_id, event, status, actor)
    VALUES (NEW.id, 'Complaint added to queue', NEW.status, 'System');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'complaint_queue_added failed for complaint %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_queue_added ON complaints;
CREATE TRIGGER trg_complaint_queue_added
  AFTER INSERT ON complaints
  FOR EACH ROW EXECUTE FUNCTION complaint_queue_added();

-- On UPDATE, priority change, PM assignment, or leaving the queue.
CREATE OR REPLACE FUNCTION complaint_queue_updated() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_left_queue BOOLEAN;
BEGIN
  -- Priority changed, and it's still an active queue item.
  IF NEW.priority IS DISTINCT FROM OLD.priority
     AND NEW.status IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated') THEN
    INSERT INTO complaint_timeline (complaint_id, event, status, actor)
    VALUES (NEW.id, 'Queue position updated (priority changed to ' || NEW.priority || ')', NEW.status, 'System');

    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, link_tab)
      VALUES (NEW.customer_id, 'complaint', 'Your queue position has updated',
        NEW.ticket || '''s priority changed, which may affect its position in the queue.', 'complaints:' || NEW.id);
    END IF;
  END IF;

  -- PM newly assigned (was null, now set), a Portfolio Manager is
  -- picking this up, distinct from "resolved" (see the earlier
  -- migration 015 assignment trigger, which already notifies the PM
  -- themselves, this one notifies the CUSTOMER instead).
  IF NEW.assigned_pm_id IS NOT NULL AND OLD.assigned_pm_id IS NULL THEN
    INSERT INTO complaint_timeline (complaint_id, event, status, actor)
    VALUES (NEW.id, 'Portfolio Manager assigned, complaint is now being worked on', NEW.status, 'System');

    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, link_tab)
      VALUES (NEW.customer_id, 'complaint', 'A Portfolio Manager is now handling your complaint',
        NEW.ticket || ' has been assigned and work has begun.', 'complaints:' || NEW.id);
    END IF;
  END IF;

  -- Left the queue, resolved, closed, or cancelled.
  v_left_queue := OLD.status IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
                  AND NEW.status IN ('resolved', 'closed', 'cancelled')
                  AND NEW.status IS DISTINCT FROM OLD.status;

  IF v_left_queue THEN
    INSERT INTO complaint_timeline (complaint_id, event, status, actor)
    VALUES (NEW.id, 'Complaint left the queue (' || NEW.status || ')', NEW.status, 'System');

    IF NEW.customer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, body, link_tab)
      VALUES (NEW.customer_id, 'complaint',
        CASE WHEN NEW.status = 'resolved' THEN 'Your complaint has been resolved' ELSE 'Your complaint has been closed' END,
        NEW.ticket || ' is no longer in the queue.', 'complaints:' || NEW.id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'complaint_queue_updated failed for complaint %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaint_queue_updated ON complaints;
CREATE TRIGGER trg_complaint_queue_updated
  AFTER UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION complaint_queue_updated();
