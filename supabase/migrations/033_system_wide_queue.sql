-- queue position is system-wide, not branch-scoped
-- get_queue_position() (migration 029) scoped the queue to the
-- complaint's own branch. Clarified requirement: it should reflect the
-- total count of active (not resolved/closed) complaints across the
-- whole system, e.g. 3 active complaints system-wide means a brand
-- new one becomes #4, with 3 ahead of it, regardless of branch.

CREATE OR REPLACE FUNCTION get_queue_position(p_complaint_id BIGINT)
RETURNS TABLE (queue_position INTEGER, total_in_queue INTEGER, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer_id BIGINT;
BEGIN
  SELECT customer_id INTO v_customer_id FROM complaints WHERE id = p_complaint_id;

  -- Only the complaint's own customer (or staff) can ask about it
  -- mirrors complaints_select's ownership check, since this function
  -- runs with elevated privileges and must enforce that itself.
  IF v_customer_id IS DISTINCT FROM current_app_user_id() AND NOT is_staff() AND NOT is_management() THEN
    RAISE EXCEPTION 'Not authorized to view this complaint''s queue position';
  END IF;

  RETURN QUERY
  WITH queue AS (
    SELECT c.id, c.status, ROW_NUMBER() OVER (ORDER BY c.created_at ASC) AS rn
    FROM complaints c
    WHERE c.status IN ('created', 'assigned', 'in_progress', 'customer_contacted', 'pending_customer', 'escalated')
  )
  SELECT q.rn::INTEGER, (SELECT COUNT(*)::INTEGER FROM queue), q.status
  FROM queue q
  WHERE q.id = p_complaint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_position(BIGINT) TO authenticated;
