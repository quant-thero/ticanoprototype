-- atomic questionnaire submission (anonymous-safe)
-- submitQuestionnaireResponse() inserted the response, then chained
-- .select().single() to get its id back (needed to insert the answer
-- rows against it), relying on RLS to allow reading back the row it
-- just created. That works for a logged-in client (client_id matches
-- their own id), but an anonymous submission has client_id = NULL,
-- and "NULL = current_app_user_id()" is never true in SQL, so the
-- select-back would fail, and since the code needs that id to insert
-- the actual answers, the whole submission would silently fail for
-- anonymous respondents. This does both inserts atomically, server-side,
-- with no RLS select-back dependency at all.

CREATE OR REPLACE FUNCTION submit_questionnaire_response(
  p_questionnaire_id BIGINT,
  p_client_name TEXT,
  p_answers JSONB -- {"<question_id>": "<answer text>"...}
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_response_id BIGINT;
  v_client_id BIGINT := current_app_user_id(); -- NULL for a genuinely anonymous visitor
  k TEXT;
BEGIN
  INSERT INTO questionnaire_responses (questionnaire_id, client_id, client_name)
  VALUES (p_questionnaire_id, v_client_id, COALESCE(p_client_name, 'Anonymous'))
  RETURNING id INTO v_response_id;

  FOR k IN SELECT jsonb_object_keys(p_answers) LOOP
    INSERT INTO questionnaire_answers (response_id, question_id, answer)
    VALUES (v_response_id, k::BIGINT, p_answers ->> k);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_questionnaire_response(BIGINT, TEXT, JSONB) TO authenticated, anon;
