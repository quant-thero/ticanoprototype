-- fix complaint queue position (was always near-zero)
-- getQueuePosition() queried the complaints table directly as the
-- customer, with no customer_id filter, expecting to see the FULL
-- queue across all customers at their branch. But complaints_select
-- RLS correctly limits a plain customer to only their OWN complaints
-- (as it should, customers can't see each other's cases), so the
-- query was silently scoped down to just their own 1-2 rows, making
-- the queue look nearly empty regardless of how busy things actually
-- were. This adds a SECURITY DEFINER function that computes the real
-- aggregate position/count without ever exposing other customers'
-- complaint details, only numbers, never rows.

CREATE OR REPLACE FUNCTION get_queue_position(p_complaint_id BIGINT)
RETURNS TABLE (queue_position INTEGER, total_in_queue INTEGER, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_branch_id BIGINT;
  v_customer_id BIGINT;
BEGIN
  SELECT branch_id, customer_id INTO v_branch_id, v_customer_id FROM complaints WHERE id = p_complaint_id;

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
      AND c.branch_id IS NOT DISTINCT FROM v_branch_id
  )
  SELECT q.rn::INTEGER, (SELECT COUNT(*)::INTEGER FROM queue), q.status
  FROM queue q
  WHERE q.id = p_complaint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_queue_position(BIGINT) TO authenticated;
