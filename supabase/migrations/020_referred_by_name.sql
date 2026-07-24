-- "Who referred you?" for Family/Friend referrals
-- When a client selects "Friend or Family Referral" at signup, this
-- stores the optional name they give for who referred them, enabling
-- the "named referrers" analytics Marketing asked for, which was
-- previously impossible (the schema only ever tracked the CHANNEL a
-- client heard about Ticano through, never a specific referring person).

ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

-- Career post auto-expiry, a job posting past its closing_date should
-- automatically unpublish and stop appearing on the public careers page,
-- not stay live until someone remembers to disable it by hand.
-- getCareers() (the public query) is already fixed to filter these out
-- at query time regardless, this additionally flips is_active off via
-- a daily scheduled job, so Marketing's own admin list also reflects
-- the true state ("Expired") rather than still showing as Active.

CREATE OR REPLACE FUNCTION unpublish_expired_careers() RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE careers
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND closing_date IS NOT NULL
    AND closing_date < CURRENT_DATE;
$$;

-- The actual daily schedule for this function is set up separately in
-- pg_cron needs its own extension check first, and
-- that shouldn't be able to roll back the column/function above if it's
-- not available on this project's plan.
