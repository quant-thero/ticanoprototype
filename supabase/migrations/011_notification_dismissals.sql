-- per-user notification read/dismiss state
-- Two real bugs, same root cause:
--
-- 1. "Clear" in the notification dropdown only cleared local React
-- state, it never told the database anything, so the exact same
-- notifications came right back on the next page load or reload.
--
-- 2. Role-wide notifications (audience_role = 'director', etc.) are a
-- single shared row visible to everyone in that role. The old
-- "mark read" just flipped notifications.is_read directly on that
-- shared row, meaning one person reading it marked it read for
-- every other person in that role too, and there was no way to
-- truly dismiss it "just for me" without affecting everyone else.
--
-- Fix: read/dismiss state now lives in a separate per-user table.
-- Marking read or clearing inserts a row here for the CURRENT user
-- only, the shared notification itself is untouched, so everyone's
-- read state is genuinely their own.

CREATE TABLE IF NOT EXISTS notification_dismissals (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_only BOOLEAN NOT NULL DEFAULT FALSE, -- true = marked read but still shown; false = cleared/hidden
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);

ALTER TABLE notification_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_dismissals_select" ON notification_dismissals;
CREATE POLICY "notification_dismissals_select" ON notification_dismissals FOR SELECT
  USING (user_id = current_app_user_id());

DROP POLICY IF EXISTS "notification_dismissals_upsert" ON notification_dismissals;
CREATE POLICY "notification_dismissals_upsert" ON notification_dismissals FOR INSERT
  WITH CHECK (user_id = current_app_user_id());

DROP POLICY IF EXISTS "notification_dismissals_update" ON notification_dismissals;
CREATE POLICY "notification_dismissals_update" ON notification_dismissals FOR UPDATE
  USING (user_id = current_app_user_id())
  WITH CHECK (user_id = current_app_user_id());

GRANT SELECT, INSERT, UPDATE ON notification_dismissals TO authenticated;
