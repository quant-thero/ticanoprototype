-- real system health checks
-- Admin's System Health page showed six cards that were all hardcoded
-- to "Operational"/"Healthy" regardless of anything actually being
-- true, including a made-up "99.8%" uptime figure with no monitoring
-- behind it at all. This adds one function that performs genuine
-- checks: real database connectivity, and real pg_cron scheduler
-- status (is the extension even enabled here, is the career-expiry job
-- actually scheduled, when did it last run). WhatsApp and Email are
-- deliberately not included as "checks", there's no automated API for
-- either to check the status of; both open the staff member's own
-- WhatsApp/email client with a pre-filled message for them to send
-- manually. Reporting a fake "Operational" for something that was
-- never automated in the first place isn't a status, it's a guess.

CREATE OR REPLACE FUNCTION get_system_health()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_db_ok BOOLEAN;
  v_cron_enabled BOOLEAN;
  v_job_scheduled BOOLEAN := false;
  v_job_schedule TEXT;
  v_last_run TIMESTAMPTZ;
  v_last_status TEXT;
  v_user_count INTEGER;
BEGIN
  IF NOT is_management() AND NOT (SELECT current_app_role() = 'admin') THEN
    RAISE EXCEPTION 'Not authorized to view system health';
  END IF;

  -- Real DB check: an actual query against a real table, not a ping.
  BEGIN
    SELECT COUNT(*) INTO v_user_count FROM users;
    v_db_ok := true;
  EXCEPTION WHEN OTHERS THEN
    v_db_ok := false;
  END;

  -- Real scheduler check: is pg_cron actually enabled here, and is the
  -- career-expiry job (migration 025) actually registered, not assumed.
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_enabled;

  IF v_cron_enabled THEN
    BEGIN
      SELECT true, schedule INTO v_job_scheduled, v_job_schedule
      FROM cron.job WHERE jobname = 'ticano-unpublish-expired-careers-daily';

      SELECT status, end_time INTO v_last_status, v_last_run
      FROM cron.job_run_details jrd
      JOIN cron.job j ON j.jobid = jrd.jobid
      WHERE j.jobname = 'ticano-unpublish-expired-careers-daily'
      ORDER BY jrd.end_time DESC LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_job_scheduled := false;
    END;
  END IF;

  RETURN jsonb_build_object(
    'database', jsonb_build_object('ok', v_db_ok, 'userCount', v_user_count),
    'scheduler', jsonb_build_object(
      'cronEnabled', v_cron_enabled,
      'jobScheduled', COALESCE(v_job_scheduled, false),
      'schedule', v_job_schedule,
      'lastRunStatus', v_last_status,
      'lastRunAt', v_last_run
    ),
    'checkedAt', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_system_health() TO authenticated;
