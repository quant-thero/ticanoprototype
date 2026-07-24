-- fix group chat creation RLS error
-- createGroupConversation() did two raw inserts: create the
-- conversation row (with .select() to read back its id), then insert
-- the member rows. But staff_conversations_member_access only lets you
-- SELECT a conversation you're already a member of, and at the moment
-- of that first .select(), no member row exists yet (that's the second
-- insert, which hadn't run). The creator's own read of the row they
-- just created failed RLS before membership even existed.
--
-- Fixed the same way get_or_create_direct_conversation() already
-- works: one SECURITY DEFINER function that creates the conversation
-- and adds every member (including the creator) in a single atomic
-- step, so there's never a moment where the row exists without its
-- creator already being a member of it.

CREATE OR REPLACE FUNCTION create_group_conversation(p_name TEXT, p_member_ids BIGINT[])
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_creator BIGINT := current_app_user_id();
  v_conversation_id BIGINT;
BEGIN
  IF NOT is_staff_messaging_user() THEN
    RAISE EXCEPTION 'Not authorized to create a group conversation';
  END IF;
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Group name is required';
  END IF;

  INSERT INTO staff_conversations (type, name, created_by)
  VALUES ('group', TRIM(p_name), v_creator)
  RETURNING id INTO v_conversation_id;

  -- Creator + every selected member, de-duplicated, in one shot, this
  -- is what makes the whole operation atomic: the conversation never
  -- exists, even momentarily, without its creator already a member.
  INSERT INTO staff_conversation_members (conversation_id, user_id)
  SELECT v_conversation_id, member_id
  FROM unnest(array_append(p_member_ids, v_creator)) AS member_id
  GROUP BY member_id;

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_group_conversation(TEXT, BIGINT[]) TO authenticated;
