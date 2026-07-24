-- fix "column reference id is ambiguous" in
-- create_feedback_request()
-- create_feedback_request() declares RETURNS TABLE(token TEXT, id
-- BIGINT), in PL/pgSQL, the columns named in a RETURNS TABLE clause
-- become implicit variables available anywhere in the function body.
-- That silently created a second thing named `id` alongside the real
-- `users.id` / `branches.id` columns referenced by two unqualified
-- `WHERE id = ...` clauses, which is exactly what "column reference
-- id is ambiguous" means: Postgres genuinely can't tell which `id`
-- is meant. Fixed by qualifying both with their actual table names.

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

  SELECT u.full_name, u.role, u.branch_id INTO v_staff_name, v_staff_role, v_branch_id FROM users u WHERE u.id = v_staff_id;
  SELECT b.name INTO v_branch_name FROM branches b WHERE b.id = v_branch_id;

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
