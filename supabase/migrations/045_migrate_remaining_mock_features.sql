-- migrate remaining mock-only features to real data
-- Closes out the mock-API sweep: every one of these existed only as
-- in-memory fake data before this. announcements and birthday_
-- preferences tables already existed in the schema but never had RLS
-- or real functions built against them, everything else here is new.

-- ---- Internal staff announcements (distinct from homepage_announcements,
-- which is the public-facing one) ----
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select" ON announcements;
CREATE POLICY "announcements_select" ON announcements FOR SELECT
  USING (
    status = 'published'
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    AND (
      NOT EXISTS (SELECT 1 FROM announcement_targets t WHERE t.announcement_id = announcements.id)
      OR EXISTS (SELECT 1 FROM announcement_targets t WHERE t.announcement_id = announcements.id AND t.role = current_app_role())
    )
    OR is_management()
  );

DROP POLICY IF EXISTS "announcements_manage" ON announcements;
CREATE POLICY "announcements_manage" ON announcements FOR ALL
  USING (is_management()) WITH CHECK (is_management());

ALTER TABLE announcement_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcement_targets_select" ON announcement_targets;
CREATE POLICY "announcement_targets_select" ON announcement_targets FOR SELECT USING (true);
DROP POLICY IF EXISTS "announcement_targets_manage" ON announcement_targets;
CREATE POLICY "announcement_targets_manage" ON announcement_targets FOR ALL
  USING (is_management()) WITH CHECK (is_management());

GRANT SELECT ON announcements, announcement_targets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON announcements, announcement_targets TO authenticated;

-- ---- Birthday preferences (already existed, never had RLS) ----
ALTER TABLE birthday_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "birthday_preferences_own" ON birthday_preferences;
CREATE POLICY "birthday_preferences_own" ON birthday_preferences FOR ALL
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());
GRANT SELECT, INSERT, UPDATE ON birthday_preferences TO authenticated;

-- ---- AI conversation history (new, the AI Inbox has always shown mock
-- data because nothing ever actually saved a transcript anywhere) ----
CREATE TABLE IF NOT EXISTS ai_conversations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL, -- null for an anonymous public visitor
  user_name TEXT,
  role TEXT, -- the role of the person chatting, at the time (customer/none/staff role)
  branch TEXT,
  channel TEXT DEFAULT 'web',
  language TEXT DEFAULT 'en',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{role, content, at}...]
  summary TEXT,
  intent TEXT,
  category TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  extracted_name TEXT, extracted_phone TEXT, extracted_email TEXT, extracted_location TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'flagged')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(updated_at DESC);
CREATE TRIGGER trg_ai_conversations_updated BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_conversations_staff_read" ON ai_conversations;
CREATE POLICY "ai_conversations_staff_read" ON ai_conversations FOR SELECT USING (is_staff() OR is_management() OR is_marketing());
DROP POLICY IF EXISTS "ai_conversations_staff_write" ON ai_conversations;
CREATE POLICY "ai_conversations_staff_write" ON ai_conversations FOR UPDATE USING (is_staff() OR is_management() OR is_marketing());
DROP POLICY IF EXISTS "ai_conversations_insert" ON ai_conversations;
CREATE POLICY "ai_conversations_insert" ON ai_conversations FOR INSERT WITH CHECK (true); -- includes anonymous public visitors

GRANT SELECT ON ai_conversations TO authenticated;
GRANT INSERT ON ai_conversations TO authenticated, anon;
GRANT UPDATE ON ai_conversations TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ---- WhatsApp opt-out ----
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
