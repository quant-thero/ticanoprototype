-- configurable PO Calculator ranges
-- Redesigned Quote Calculator: a client enters the PO amount and the
-- amount they're charging the tender issuer, and sees total repayment,
-- interest only, and remaining profit, computed from an actual
-- configured rate bracket rather than a manual slider. Admins manage
-- those brackets here: each range can use either a fixed fee (a flat
-- Pula amount) or a percentage of the PO amount.

CREATE TABLE IF NOT EXISTS calculator_ranges (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  min_amount NUMERIC(14,2) NOT NULL,
  max_amount NUMERIC(14,2), -- null = no upper bound (open-ended top bracket)
  calc_type TEXT NOT NULL CHECK (calc_type IN ('fixed', 'percentage')),
  value NUMERIC(10,2) NOT NULL, -- a Pula amount if calc_type='fixed', a percent (e.g. 7.5) if 'percentage'
  label TEXT, -- optional short internal note, e.g. "Standard bracket"
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calculator_ranges_min ON calculator_ranges(min_amount);
CREATE TRIGGER trg_calculator_ranges_updated BEFORE UPDATE ON calculator_ranges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE calculator_ranges ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated), the calculator is used on the
-- public homepage before anyone logs in, so it needs to read live rates
-- without needing an account.
DROP POLICY IF EXISTS "calculator_ranges_public_read" ON calculator_ranges;
CREATE POLICY "calculator_ranges_public_read" ON calculator_ranges FOR SELECT
  USING (enabled = true OR (SELECT current_app_role() = 'admin'));

DROP POLICY IF EXISTS "calculator_ranges_admin_write" ON calculator_ranges;
CREATE POLICY "calculator_ranges_admin_write" ON calculator_ranges FOR ALL
  USING ((SELECT current_app_role() = 'admin')) WITH CHECK ((SELECT current_app_role() = 'admin'));

GRANT SELECT ON calculator_ranges TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON calculator_ranges TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Seed with the rates already quoted on the public site (6.5%, 8.5%,
-- per the FAQ) so the calculator has real data immediately rather than
-- being empty until an admin configures it.
INSERT INTO calculator_ranges (min_amount, max_amount, calc_type, value, label, display_order)
SELECT * FROM (VALUES
  (0::numeric, 50000::numeric, 'percentage', 8.5::numeric, 'Small orders', 1),
  (50000::numeric, 250000::numeric, 'percentage', 7.5::numeric, 'Mid-size orders', 2),
  (250000::numeric, NULL::numeric, 'percentage', 6.5::numeric, 'Large orders', 3)
) AS seed(min_amount, max_amount, calc_type, value, label, display_order)
WHERE NOT EXISTS (SELECT 1 FROM calculator_ranges);
