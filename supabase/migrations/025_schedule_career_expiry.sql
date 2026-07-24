-- schedule the daily career-expiry job
-- Separated from migration 020 on purpose: pg_cron isn't available on
-- every Supabase plan/project, and when it's missing, a bare
-- `SELECT cron.schedule(...)` fails the entire pasted script as one
-- transaction, including unrelated statements earlier in the same
-- paste. This is self-contained and degrades gracefully: if pg_cron
-- genuinely can't be enabled here, you'll get a clear NOTICE instead
-- of an error, and everything else in the project is unaffected.
--
-- Note: getCareers() (the public-facing query) already filters out
-- expired postings at query time regardless of whether this succeeds
--, that's the fix that actually matters for the reported bug. This
-- migration only adds the extra polish of flipping is_active off in
-- Marketing's own admin view too, so an expired posting shows as
-- "Expired" there rather than still looking Active.

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron is not available on this project (%), skipping the scheduled career-expiry job. getCareers() already filters expired postings at query time regardless, so the public site is unaffected. To enable this later: Supabase Dashboard → Database → Extensions → search "pg_cron".', SQLERRM;
    RETURN;
  END;

  BEGIN
    PERFORM cron.schedule(
      'ticano-unpublish-expired-careers-daily',
      '5 0 * * *', -- 00:05 UTC daily
      $cron$SELECT unpublish_expired_careers();$cron$
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension is present but scheduling the job failed (%), try re-running this migration, or set it up manually via Supabase Dashboard → Database → Cron Jobs.', SQLERRM;
  END;
END $$;
