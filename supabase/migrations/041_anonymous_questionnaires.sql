-- anonymous questionnaire/survey responses
-- Two real gaps closed here:
--
-- 1. submit_questionnaire_response() stored client_name as a snapshot
-- dropped entirely going forward. client_id is KEPT internally (not
-- shown to anyone but the client themselves) because it's what makes
-- "you've already answered this, don't show it again" and "one
-- response per client" actually work, removing it would break both
-- features, not just the identity attached to it.
--
-- 2. questionnaire_responses_select / questionnaire_answers_select gave
-- Marketing broad SELECT on the raw, identified rows, meaning even
-- though the app's own Analytics view only ever showed aggregates,
-- anyone with API access could query the raw tables directly and see
-- exactly who said what. Removed is_marketing() from both, Marketing
-- can now only reach this data through get_questionnaire_analytics()
-- below, a function that computes real aggregates server-side and
-- was never built to return an individual response or a client_id in
-- the first place, not just a view that happens not to display them.

CREATE OR REPLACE FUNCTION submit_questionnaire_response(
  p_questionnaire_id BIGINT,
  p_client_name TEXT,
  p_answers JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_response_id BIGINT;
  v_client_id BIGINT := current_app_user_id();
  k TEXT;
BEGIN
  -- client_name intentionally never stored, responses are anonymous by
  -- design, not just hidden in the UI. client_id is kept (never exposed
  -- to Marketing, see the policies below) purely so the app itself can
  -- still enforce "already answered" and "one response per client".
  INSERT INTO questionnaire_responses (questionnaire_id, client_id, client_name)
  VALUES (p_questionnaire_id, v_client_id, NULL)
  RETURNING id INTO v_response_id;

  FOR k IN SELECT jsonb_object_keys(p_answers) LOOP
    INSERT INTO questionnaire_answers (response_id, question_id, answer)
    VALUES (v_response_id, k::BIGINT, p_answers ->> k);
  END LOOP;
END;
$$;

-- ---- Lock down raw row access ----
DROP POLICY IF EXISTS "questionnaire_responses_select" ON questionnaire_responses;
CREATE POLICY "questionnaire_responses_select" ON questionnaire_responses FOR SELECT
  USING (client_id = current_app_user_id());

DROP POLICY IF EXISTS "questionnaire_answers_select" ON questionnaire_answers;
CREATE POLICY "questionnaire_answers_select" ON questionnaire_answers FOR SELECT
  USING (EXISTS (SELECT 1 FROM questionnaire_responses r WHERE r.id = questionnaire_answers.response_id AND r.client_id = current_app_user_id()));

-- ---- Real server-side aggregation, the only path Marketing has to
-- this data now. Computes response count, completion rate, and a
-- per-question breakdown (rating average, choice distribution, or
-- an anonymous list of free-text answers), never a client_id,
-- never a name, never a single identifiable response. ----
CREATE OR REPLACE FUNCTION get_questionnaire_analytics(p_questionnaire_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_response_count INTEGER;
  v_total_clients INTEGER;
  v_per_question JSONB := '[]'::jsonb;
  q RECORD;
  v_item JSONB;
BEGIN
  IF NOT is_marketing() THEN
    RAISE EXCEPTION 'Not authorized to view questionnaire analytics';
  END IF;

  SELECT COUNT(*) INTO v_response_count FROM questionnaire_responses WHERE questionnaire_id = p_questionnaire_id;
  SELECT COUNT(*) INTO v_total_clients FROM client_profiles;

  FOR q IN SELECT * FROM questionnaire_questions WHERE questionnaire_id = p_questionnaire_id ORDER BY sort_order LOOP
    IF q.type = 'rating' THEN
      SELECT jsonb_build_object(
        'question', q.text, 'type', q.type,
        'average', COALESCE(ROUND(AVG(NULLIF(answer, '')::numeric), 1), 0),
        'count', COUNT(*) FILTER (WHERE answer IS NOT NULL AND answer != '')
      ) INTO v_item
      FROM questionnaire_answers WHERE question_id = q.id;

    ELSIF q.type = 'choice' THEN
      SELECT jsonb_build_object(
        'question', q.text, 'type', q.type,
        'distribution', COALESCE(
          (SELECT jsonb_object_agg(opt, cnt) FROM (
            SELECT o AS opt, COUNT(qa.answer) AS cnt
            FROM unnest(q.options) AS o
            LEFT JOIN questionnaire_answers qa ON qa.question_id = q.id AND qa.answer = o
            GROUP BY o
          ) x), '{}'::jsonb
        ),
        'count', (SELECT COUNT(*) FROM questionnaire_answers WHERE question_id = q.id AND answer IS NOT NULL AND answer != '')
      ) INTO v_item;

    ELSE
      SELECT jsonb_build_object(
        'question', q.text, 'type', q.type,
        'answers', COALESCE(jsonb_agg(answer) FILTER (WHERE answer IS NOT NULL AND answer != ''), '[]'::jsonb),
        'count', COUNT(*) FILTER (WHERE answer IS NOT NULL AND answer != '')
      ) INTO v_item
      FROM questionnaire_answers WHERE question_id = q.id;
    END IF;

    v_per_question := v_per_question || jsonb_build_array(v_item);
  END LOOP;

  RETURN jsonb_build_object(
    'questionnaireId', p_questionnaire_id,
    'responseCount', v_response_count,
    'completionRate', CASE WHEN v_total_clients > 0 THEN ROUND((v_response_count::numeric / v_total_clients) * 100) ELSE 0 END,
    'perQuestion', v_per_question
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_questionnaire_analytics(BIGINT) TO authenticated;

-- Note on existing data: this migration doesn't retroactively scrub
-- client_name from responses submitted before it ran, that's a data
-- decision, not a code one. To clear historical names too:
-- UPDATE questionnaire_responses SET client_name = NULL;
