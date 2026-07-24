-- internal staff messaging
-- One-to-one and group chats between staff members (portfolio_manager,
-- service_manager, director, marketing, admin), with document
-- attachments. Customers have no access to this at all, it's purely
-- internal, separate from the customer-facing complaint messaging.

CREATE TABLE IF NOT EXISTS staff_conversations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  name TEXT, -- group chats only; direct chats are named from the other member client-side
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now() -- bumped whenever a new message arrives, for sorting
);
CREATE TRIGGER trg_staff_conversations_updated BEFORE UPDATE ON staff_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS staff_conversation_members (
  conversation_id BIGINT NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS staff_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES staff_conversations(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_messages_conversation ON staff_messages(conversation_id, created_at);

-- Bumps the parent conversation's updated_at whenever a message lands,
-- so the conversation list can sort by "most recently active" with a
-- plain ORDER BY rather than a join + aggregate on every load.
CREATE OR REPLACE FUNCTION touch_staff_conversation() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE staff_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_touch_staff_conversation ON staff_messages;
CREATE TRIGGER trg_touch_staff_conversation
  AFTER INSERT ON staff_messages
  FOR EACH ROW EXECUTE FUNCTION touch_staff_conversation();

-- ---- RLS, staff only, members-only per conversation ----
CREATE OR REPLACE FUNCTION is_staff_messaging_user() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT current_app_role() IN ('portfolio_manager', 'service_manager', 'director', 'marketing', 'admin');
$$;

ALTER TABLE staff_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_conversations_member_access" ON staff_conversations;
CREATE POLICY "staff_conversations_member_access" ON staff_conversations FOR SELECT
  USING (is_staff_messaging_user() AND EXISTS (SELECT 1 FROM staff_conversation_members m WHERE m.conversation_id = staff_conversations.id AND m.user_id = current_app_user_id()));
DROP POLICY IF EXISTS "staff_conversations_create" ON staff_conversations;
CREATE POLICY "staff_conversations_create" ON staff_conversations FOR INSERT
  WITH CHECK (is_staff_messaging_user() AND created_by = current_app_user_id());

ALTER TABLE staff_conversation_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_conversation_members_access" ON staff_conversation_members;
CREATE POLICY "staff_conversation_members_access" ON staff_conversation_members FOR SELECT
  USING (is_staff_messaging_user() AND EXISTS (SELECT 1 FROM staff_conversation_members m2 WHERE m2.conversation_id = staff_conversation_members.conversation_id AND m2.user_id = current_app_user_id()));
DROP POLICY IF EXISTS "staff_conversation_members_insert" ON staff_conversation_members;
CREATE POLICY "staff_conversation_members_insert" ON staff_conversation_members FOR INSERT
  WITH CHECK (is_staff_messaging_user());
DROP POLICY IF EXISTS "staff_conversation_members_update_own" ON staff_conversation_members;
CREATE POLICY "staff_conversation_members_update_own" ON staff_conversation_members FOR UPDATE
  USING (user_id = current_app_user_id()) WITH CHECK (user_id = current_app_user_id());

ALTER TABLE staff_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_messages_member_access" ON staff_messages;
CREATE POLICY "staff_messages_member_access" ON staff_messages FOR SELECT
  USING (is_staff_messaging_user() AND EXISTS (SELECT 1 FROM staff_conversation_members m WHERE m.conversation_id = staff_messages.conversation_id AND m.user_id = current_app_user_id()));
DROP POLICY IF EXISTS "staff_messages_send" ON staff_messages;
CREATE POLICY "staff_messages_send" ON staff_messages FOR INSERT
  WITH CHECK (
    is_staff_messaging_user() AND sender_id = current_app_user_id()
    AND EXISTS (SELECT 1 FROM staff_conversation_members m WHERE m.conversation_id = staff_messages.conversation_id AND m.user_id = current_app_user_id())
  );

GRANT SELECT, INSERT ON staff_conversations, staff_conversation_members, staff_messages TO authenticated;
GRANT UPDATE ON staff_conversation_members TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ---- Storage for document attachments, staff-only, private ----
INSERT INTO storage.buckets (id, name, public)
VALUES ('staff-attachments', 'staff-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "staff_attachments_upload" ON storage.objects;
CREATE POLICY "staff_attachments_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'staff-attachments' AND is_staff_messaging_user());

DROP POLICY IF EXISTS "staff_attachments_read" ON storage.objects;
CREATE POLICY "staff_attachments_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'staff-attachments' AND is_staff_messaging_user()
    AND EXISTS (
      SELECT 1 FROM staff_messages sm
      JOIN staff_conversation_members m ON m.conversation_id = sm.conversation_id
      WHERE sm.attachment_url = storage.objects.name AND m.user_id = current_app_user_id()
    )
  );

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ---- One RPC to atomically start (or reuse) a direct conversation
-- between two people, avoiding duplicate 1-1 threads ----
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(p_other_user_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me BIGINT := current_app_user_id();
  v_conversation_id BIGINT;
BEGIN
  IF NOT is_staff_messaging_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself';
  END IF;

  SELECT m1.conversation_id INTO v_conversation_id
  FROM staff_conversation_members m1
  JOIN staff_conversation_members m2 ON m2.conversation_id = m1.conversation_id AND m2.user_id = p_other_user_id
  JOIN staff_conversations c ON c.id = m1.conversation_id AND c.type = 'direct'
  WHERE m1.user_id = v_me
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO staff_conversations (type, created_by) VALUES ('direct', v_me) RETURNING id INTO v_conversation_id;
  INSERT INTO staff_conversation_members (conversation_id, user_id) VALUES (v_conversation_id, v_me), (v_conversation_id, p_other_user_id);
  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_direct_conversation(BIGINT) TO authenticated;
