-- career post expiry needs a time, not just a date
-- closing_date was DATE-only, Marketing could set a day a posting
-- expires, but not a specific time within that day. Upgraded to
-- TIMESTAMPTZ. Existing values default to END of their original day
-- (23:59:59), not midnight, defaulting to midnight would make every
-- currently-active posting look instantly expired the moment this
-- migration runs (midnight is always earlier than "now" on the same
-- day), mass-unpublishing everything that was correctly still live.

ALTER TABLE careers
  ALTER COLUMN closing_date TYPE TIMESTAMPTZ
  USING (CASE WHEN closing_date IS NULL THEN NULL ELSE (closing_date::timestamp + interval '23:59:59') END);

CREATE OR REPLACE FUNCTION unpublish_expired_careers() RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE careers
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND closing_date IS NOT NULL
    AND closing_date < now();
$$;
