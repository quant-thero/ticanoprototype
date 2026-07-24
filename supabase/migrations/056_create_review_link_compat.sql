-- create_review_link compatibility function
-- Error: "Could not find the function public.create_review_link(...)
-- in the schema cache." A colleague built a separate, parallel review-
-- link system (review_links table, create_review_link/get_review_link_
-- status/submit_review_feedback functions) as part of an earlier
-- WhatsApp fix, but its migration was never actually run here, while
-- some deployed frontend code still calls create_review_link().
--
-- Rather than stand up that whole separate system (which would split
-- review data across two disconnected tables, review_links and
-- feedback_requests, breaking the CSAT rollup), this adds
-- create_review_link() as a thin compatibility wrapper around the
-- existing, unified create_feedback_request(). Same function name and
-- parameters the frontend already expects, same token format, same
-- /feedback/:token public page, but the data lands in one place.

CREATE OR REPLACE FUNCTION create_review_link(
  p_recipient_name TEXT,
  p_phone TEXT,
  p_customer_id BIGINT DEFAULT NULL,
  p_lead_id BIGINT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT t.token INTO v_token
  FROM create_feedback_request(
    'other', -- p_interaction_type
    NULL, -- p_interaction_id
    CASE WHEN p_lead_id IS NOT NULL THEN 'Lead #' || p_lead_id ELSE NULL END, -- p_interaction_note
    p_customer_id, -- p_client_id
    p_recipient_name, -- p_client_name
    p_phone, -- p_client_phone
    NULL -- p_expires_in_days
  ) AS t;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION create_review_link(TEXT, TEXT, BIGINT, BIGINT) TO authenticated;
