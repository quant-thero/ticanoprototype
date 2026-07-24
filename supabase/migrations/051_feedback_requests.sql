-- Customer Feedback Request system
-- Replaces the old review-link flow, which had real gaps:
-- - The token was a client-side base64 blob (pm+branch only, no
-- server record at all until AFTER submission)
-- - "Already used" was enforced by a pre-check the client could just
-- skip, submitFeedback() itself never verified anything
-- - No link to a specific interaction, no client identity captured,
-- no expiry, no "Sent" state to track before someone responds
--
-- This introduces feedback_requests as a real row created the moment a
-- link is generated (so "Sent" is trackable, not inferred), with the
-- one-time-use check enforced atomically in the UPDATE itself, the
-- same class of fix as the earlier queue/attach-function work.

CREATE TYPE feedback_interaction_type AS ENUM
  ('complaint', 'walk_in', 'enquiry', 'consultation', 'phone_call', 'application', 'follow_up', 'other');
CREATE TYPE feedback_request_status AS ENUM ('sent', 'completed', 'expired');

CREATE TABLE feedback_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),

  interaction_type feedback_interaction_type NOT NULL,
  interaction_id BIGINT, -- e.g. complaint id when type = 'complaint'; null for types with no formal record
  interaction_note TEXT, -- free text, e.g. "PO financing consultation"

  client_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,

  staff_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL, -- snapshot, survives a later name change or deactivation
  staff_role user_role NOT NULL,

  branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL, -- the STAFF member's branch, not necessarily the client's preferred one
  branch_name TEXT,

  status feedback_request_status NOT NULL DEFAULT 'sent',
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,

  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- null = never expires
  completed_at TIMESTAMPTZ,

  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_feedback_requests_staff ON feedback_requests(staff_id) WHERE status = 'completed';
CREATE INDEX idx_feedback_requests_branch ON feedback_requests(branch_id) WHERE status = 'completed';
CREATE INDEX idx_feedback_requests_token ON feedback_requests(token);
CREATE INDEX idx_feedback_requests_sent_by ON feedback_requests(created_by, sent_at DESC);

ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_requests_staff_select" ON feedback_requests;
CREATE POLICY "feedback_requests_staff_select" ON feedback_requests FOR SELECT
  USING (created_by = current_app_user_id() OR staff_id = current_app_user_id() OR is_management());

DROP POLICY IF EXISTS "feedback_requests_staff_insert" ON feedback_requests;
CREATE POLICY "feedback_requests_staff_insert" ON feedback_requests FOR INSERT
  WITH CHECK (is_staff() OR is_management() OR is_marketing());

GRANT SELECT ON feedback_requests TO authenticated;
GRANT INSERT ON feedback_requests TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- No SELECT/UPDATE grant to anon/authenticated beyond the above, the
-- public feedback page and its submission both go through SECURITY
-- DEFINER functions below, never touching the table directly. This is
-- what makes the anonymous, no-login flow safe: the token is the only
-- credential, and it's checked entirely server-side.

CREATE OR REPLACE FUNCTION create_feedback_request(
  p_interaction_type TEXT,
  p_interaction_id BIGINT,
  p_interaction_note TEXT,
  p_client_id BIGINT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_expires_in_days INTEGER DEFAULT NULL
) RETURNS TABLE (token TEXT, id BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_staff_id BIGINT := current_app_user_id();
  v_staff_name TEXT;
  v_staff_role user_role;
  v_branch_id BIGINT;
  v_branch_name TEXT;
  v_new_id BIGINT;
  v_new_token TEXT;
BEGIN
  IF NOT (is_staff() OR is_management() OR is_marketing()) THEN
    RAISE EXCEPTION 'Only staff can send a feedback request';
  END IF;
  IF p_client_name IS NULL OR TRIM(p_client_name) = '' THEN
    RAISE EXCEPTION 'Client name is required';
  END IF;

  SELECT full_name, role, branch_id INTO v_staff_name, v_staff_role, v_branch_id FROM users WHERE id = v_staff_id;
  SELECT name INTO v_branch_name FROM branches WHERE id = v_branch_id;

  INSERT INTO feedback_requests (
    interaction_type, interaction_id, interaction_note,
    client_id, client_name, client_phone,
    staff_id, staff_name, staff_role, branch_id, branch_name,
    expires_at, created_by
  ) VALUES (
    p_interaction_type::feedback_interaction_type, p_interaction_id, NULLIF(TRIM(p_interaction_note), ''),
    p_client_id, TRIM(p_client_name), NULLIF(TRIM(p_client_phone), ''),
    v_staff_id, COALESCE(v_staff_name, 'Ticano Staff'), v_staff_role, v_branch_id, v_branch_name,
    CASE WHEN p_expires_in_days IS NOT NULL THEN now() + (p_expires_in_days || ' days')::interval ELSE NULL END,
    v_staff_id
  )
  RETURNING feedback_requests.id, feedback_requests.token INTO v_new_id, v_new_token;

  RETURN QUERY SELECT v_new_token, v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_feedback_request(TEXT, BIGINT, TEXT, BIGINT, TEXT, TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION get_feedback_request_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM feedback_requests WHERE token = p_token;

  IF r.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF r.status = 'completed' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_completed');
  END IF;
  IF r.status = 'expired' OR (r.expires_at IS NOT NULL AND r.expires_at < now()) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'clientName', r.client_name,
    'staffName', r.staff_name,
    'branchName', r.branch_name,
    'interactionType', r.interaction_type,
    'interactionNote', r.interaction_note
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_feedback_request_by_token(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION submit_feedback_request(p_token TEXT, p_rating INTEGER, p_comment TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id BIGINT;
  v_client_name TEXT;
  v_branch_id BIGINT;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  UPDATE feedback_requests
  SET status = 'completed', rating = p_rating, comment = NULLIF(TRIM(p_comment), ''), completed_at = now()
  WHERE token = p_token
    AND status = 'sent'
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING id, client_name, branch_id INTO v_id, v_client_name, v_branch_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'This feedback link is no longer valid, it may have already been used or expired.');
  END IF;

  BEGIN
    IF p_rating = 5 THEN
      INSERT INTO testimonials (name, rating, comment, branch_id, enabled, source, review_status)
      VALUES (COALESCE(v_client_name, 'A Ticano client'), p_rating,
        COALESCE(NULLIF(TRIM(p_comment), ''), 'Excellent, professional service from start to finish.'),
        v_branch_id, FALSE, 'survey', 'pending');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'feedback_request testimonial insert failed for request %: %', v_id, SQLERRM;
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Thank you for your feedback!');
END;
$$;

GRANT EXECUTE ON FUNCTION submit_feedback_request(TEXT, INTEGER, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_staff_csat(p_staff_id BIGINT)
RETURNS TABLE (avg_rating NUMERIC, total_responses INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROUND(AVG(rating), 2), COUNT(*)::INTEGER
  FROM feedback_requests WHERE staff_id = p_staff_id AND status = 'completed';
$$;

CREATE OR REPLACE FUNCTION get_branch_csat(p_branch_id BIGINT)
RETURNS TABLE (avg_rating NUMERIC, total_responses INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROUND(AVG(rating), 2), COUNT(*)::INTEGER
  FROM feedback_requests WHERE branch_id = p_branch_id AND status = 'completed';
$$;

CREATE OR REPLACE FUNCTION get_company_csat()
RETURNS TABLE (avg_rating NUMERIC, branches_included INTEGER, total_responses INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH per_branch AS (
    SELECT branch_id, AVG(rating) AS branch_avg, COUNT(*) AS n
    FROM feedback_requests
    WHERE status = 'completed' AND branch_id IS NOT NULL
    GROUP BY branch_id
  )
  SELECT ROUND(AVG(branch_avg), 2), COUNT(*)::INTEGER, SUM(n)::INTEGER FROM per_branch;
$$;

GRANT EXECUTE ON FUNCTION get_staff_csat(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_branch_csat(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_csat() TO authenticated;

CREATE OR REPLACE FUNCTION get_all_staff_csat()
RETURNS TABLE (staff_id BIGINT, staff_name TEXT, branch_id BIGINT, branch_name TEXT, avg_rating NUMERIC, total_responses INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fr.staff_id, MAX(fr.staff_name), fr.branch_id, MAX(fr.branch_name),
         ROUND(AVG(fr.rating), 2), COUNT(*)::INTEGER
  FROM feedback_requests fr
  WHERE fr.status = 'completed'
  GROUP BY fr.staff_id, fr.branch_id;
$$;

CREATE OR REPLACE FUNCTION get_all_branch_csat()
RETURNS TABLE (branch_id BIGINT, branch_name TEXT, avg_rating NUMERIC, total_responses INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fr.branch_id, MAX(fr.branch_name), ROUND(AVG(fr.rating), 2), COUNT(*)::INTEGER
  FROM feedback_requests fr
  WHERE fr.status = 'completed' AND fr.branch_id IS NOT NULL
  GROUP BY fr.branch_id;
$$;

GRANT EXECUTE ON FUNCTION get_all_staff_csat() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_branch_csat() TO authenticated;

CREATE OR REPLACE FUNCTION get_my_feedback_requests()
RETURNS TABLE (
  id BIGINT, token TEXT, interaction_type TEXT, interaction_note TEXT,
  client_name TEXT, status TEXT, rating SMALLINT, comment TEXT,
  sent_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT fr.id, fr.token, fr.interaction_type::TEXT, fr.interaction_note, fr.client_name,
    CASE WHEN fr.status = 'sent' AND fr.expires_at IS NOT NULL AND fr.expires_at < now() THEN 'expired' ELSE fr.status::TEXT END,
    fr.rating, fr.comment, fr.sent_at, fr.expires_at, fr.completed_at
  FROM feedback_requests fr
  WHERE fr.created_by = current_app_user_id()
  ORDER BY fr.sent_at DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_feedback_requests() TO authenticated;
