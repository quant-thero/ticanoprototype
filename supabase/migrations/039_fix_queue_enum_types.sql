-- fix enum/text type mismatch in queue functions
-- complaints.status and complaints.priority are custom Postgres ENUM
-- types (complaint_status, complaint_priority), not TEXT, migration
-- 037's queue functions declared TEXT return columns and tried to
-- return the raw enum values into them, which Postgres accepts at
-- CREATE FUNCTION time (not fully type-checked until it actually runs)
-- but fails at call time with "Returned type complaint_status does not
-- match expected type text". Every enum column is now explicitly cast
-- to TEXT wherever it flows into a TEXT-typed output or comparison.

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

DROP FUNCTION IF EXISTS get_queue_position(BIGINT);
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
    SELECT c.id, c.status::TEXT AS status, c.priority::TEXT AS priority,
           ROW_NUMBER() OVER (ORDER BY priority_rank(c.priority::TEXT) ASC, c.created_at ASC) AS rn
    FROM complaints c
    WHERE c.status::TEXT IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
  )
  SELECT q.rn::INTEGER, (SELECT COUNT(*)::INTEGER FROM queue), q.status, q.priority
  FROM queue q
  WHERE q.id = p_complaint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_position(BIGINT) TO authenticated;

DROP FUNCTION IF EXISTS get_queue_overview();
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
    ROW_NUMBER() OVER (ORDER BY priority_rank(c.priority::TEXT) ASC, c.created_at ASC)::INTEGER,
    c.id, c.ticket, c.customer_name, c.priority::TEXT, c.status::TEXT,
    b.name, u.full_name,
    c.created_at,
    EXTRACT(EPOCH FROM (now() - c.created_at))::INTEGER / 60
  FROM complaints c
  LEFT JOIN branches b ON b.id = c.branch_id
  LEFT JOIN users u ON u.id = c.assigned_pm_id
  WHERE c.status::TEXT IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
  ORDER BY priority_rank(c.priority::TEXT) ASC, c.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_overview() TO authenticated;

DROP FUNCTION IF EXISTS get_queue_stats();
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
    SELECT *, status::TEXT AS status_text, priority::TEXT AS priority_text
    FROM complaints
    WHERE status::TEXT IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
  ), longest AS (
    SELECT ticket, EXTRACT(EPOCH FROM (now() - created_at))::INTEGER / 60 AS mins
    FROM active ORDER BY created_at ASC LIMIT 1
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM active),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority_text = 'urgent'),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority_text = 'high'),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority_text = 'medium'),
    (SELECT COUNT(*)::INTEGER FROM active WHERE priority_text = 'low'),
    (SELECT ticket FROM longest),
    (SELECT mins FROM longest);
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_stats() TO authenticated;
