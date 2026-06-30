-- =====================================================================
--  SCHEDULING — run sla-check daily via pg_cron + pg_net
--  Run this once in the Supabase SQL editor AFTER deploying the function.
--  Replace <PROJECT-REF> and set the cron secret to match CRON_SECRET.
-- =====================================================================

-- Enable the scheduler + HTTP-from-Postgres extensions (Supabase ships both).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Daily at 06:00 UTC, POST to the sla-check Edge Function.
-- The Authorization header must match the CRON_SECRET you set with
--   supabase secrets set CRON_SECRET=...
select cron.schedule(
  'ticano-sla-check-daily',
  '0 6 * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT-REF>.supabase.co/functions/v1/sla-check',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer <YOUR_CRON_SECRET>'
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- To inspect or remove the job later:
--   select * from cron.job;
--   select cron.unschedule('ticano-sla-check-daily');

-- ---------------------------------------------------------------------
-- (Optional) A birthday-message job would follow the same shape, pointing
-- at a send-notification-driven function and reading profiles.birthday_optin.
-- ---------------------------------------------------------------------
