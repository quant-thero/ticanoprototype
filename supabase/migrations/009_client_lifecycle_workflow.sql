-- customer → PM → potential client → portfolio workflow
-- portfolio_clients previously had no link back to the registered
-- customer (users/client_profiles) who signed up, it was purely a
-- manually-maintained CRM table. This adds that link so the full
-- lifecycle works: customer signs up (unassigned) → Service Manager or
-- auto-assign gives them a PM (now a "potential client" to that PM,
-- visible before being converted) → PM converts them → a real
-- portfolio_clients row is created, linked back to the original
-- customer, starting at zero assists until the PM logs their first one.

ALTER TABLE portfolio_clients ADD COLUMN IF NOT EXISTS customer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_portfolio_clients_customer ON portfolio_clients(customer_user_id);
-- A registered customer should only ever be converted into ONE portfolio
-- client record, prevents duplicate conversions.
CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolio_clients_customer ON portfolio_clients(customer_user_id) WHERE customer_user_id IS NOT NULL;

-- Onboarding checklist permanent-dismiss state, once a client ticks (or
-- explicitly dismisses) every step, it should never reappear, regardless
-- of whether the underlying conditions still technically read as
-- "incomplete" later (e.g. they later change their WhatsApp number).
CREATE TABLE IF NOT EXISTS client_onboarding_state (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE client_onboarding_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_onboarding_state_select" ON client_onboarding_state;
CREATE POLICY "client_onboarding_state_select" ON client_onboarding_state FOR SELECT
  USING (user_id = current_app_user_id());

DROP POLICY IF EXISTS "client_onboarding_state_insert" ON client_onboarding_state;
CREATE POLICY "client_onboarding_state_insert" ON client_onboarding_state FOR INSERT
  WITH CHECK (user_id = current_app_user_id());

GRANT SELECT, INSERT ON client_onboarding_state TO authenticated;

-- Review links (WhatsApp "please rate us" links a PM sends) need to
-- record which PM sent them, so the resulting review attributes back to
-- that specific person, not just the branch.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS sent_by_pm_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Enable realtime on client_profiles, needed so a client's own
-- dashboard picks up a new PM assignment (or other profile changes made
-- by staff elsewhere) live, instead of only on their next manual refresh.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
