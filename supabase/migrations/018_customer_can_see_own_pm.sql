-- the actual root cause of "client can't see their PM"
-- users_select has, since migration 001, only ever allowed:
-- auth_user_id = auth.uid() OR is_staff()
-- A plain customer is neither, so they have ALWAYS had zero visibility
-- into any other user's row, including their own assigned Portfolio
-- Manager. This is why every previous fix kept not working: it was
-- never a query bug. assigned_pm_id (a plain column on client_profiles,
-- which the customer genuinely owns) was always visible. But the PM's
-- full_name lives on a DIFFERENT row, in `users`, and RLS silently
-- filtered that row out of every single query that tried to read it
-- an embedded join, a separate follow-up query, anything. PostgREST
-- doesn't error when RLS hides a joined/queried row; it just returns
-- null, which is exactly the "not yet assigned" symptom we kept seeing
-- even when assigned_pm_id was genuinely set.
--
-- Fix: extend users_select so a customer can also see the specific
-- user row that is THEIR OWN assigned PM, nothing broader than that.
-- They still can't see any other staff member, or any other customer.

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR is_staff()
    OR id IN (SELECT assigned_pm_id FROM client_profiles WHERE user_id = current_app_user_id() AND assigned_pm_id IS NOT NULL)
  );
