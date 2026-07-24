-- PM's own complaints queue, not the whole org's
-- get_queue_overview() is only ever called from PmDashboard.jsx's
-- Queue tab, but it returned every open complaint org-wide, a PM
-- looking at "their queue" was actually seeing every other PM's
-- waiting clients too, not specifically the ones waiting on them.
--
-- Fixed by scoping to the caller: a PM sees only complaints assigned
-- to them; management roles (service_manager/director/admin) still see
-- the full org-wide queue, since that broader view is legitimate for
-- them and nothing currently depends on PMs seeing it.

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
    AND (is_management() OR c.assigned_pm_id = current_app_user_id())
  ORDER BY priority_rank(c.priority::TEXT) ASC, c.created_at ASC;
END;
$$;
