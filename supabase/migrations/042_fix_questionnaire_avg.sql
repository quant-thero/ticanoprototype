-- fix "function avg(text) does not exist"
-- get_questionnaire_analytics() (migration 041) wrote
-- AVG(NULLIF(answer, ''))::numeric, casting the RESULT of AVG() to
-- numeric, after the fact. But answer is a TEXT column, and AVG()
-- needs numeric input to run at all, the cast needed to be on the
-- values going IN, not the result coming out:
-- AVG(NULLIF(answer, '')::numeric).

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
