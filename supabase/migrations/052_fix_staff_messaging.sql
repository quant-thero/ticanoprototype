-- fix staff messaging (marketing RLS gap) + group
-- member management
-- The real bug: users_select's RLS uses is_staff(), which only covers
-- portfolio_manager/service_manager/director/admin, marketing was
-- never included. But staff messaging explicitly treats marketing as
-- a valid participant (is_staff_messaging_user() does include it).
-- The result: a marketing user calling getStaffDirectoryForMessaging()
-- got RLS-filtered down to zero rows (they could only ever see their
-- own row), so the "choose who to message" list was silently empty
-- and even in an existing conversation, the other participant's name
-- would be missing for the same reason (the users JOIN got filtered).
--
-- Fixed narrowly: marketing can now additionally see other STAFF rows
-- (for messaging/directory purposes only), not customer rows, which
-- stay exactly as restricted as before.

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR is_staff()
    OR (current_app_role() = 'marketing' AND role IN ('portfolio_manager','service_manager','director','marketing','admin'))
    OR id IN (SELECT assigned_pm_id FROM client_profiles WHERE user_id = current_app_user_id() AND assigned_pm_id IS NOT NULL)
  );

-- Group member management, add/remove members from an existing
-- group. Direct conversations can't have members added/removed (that
-- would just make it a group); only 'group' type conversations here.
CREATE OR REPLACE FUNCTION add_group_member(p_conversation_id BIGINT, p_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_staff_messaging_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM staff_conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = current_app_user_id()
  ) THEN
    RAISE EXCEPTION 'You are not a member of this conversation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM staff_conversations WHERE id = p_conversation_id AND type = 'group') THEN
    RAISE EXCEPTION 'Members can only be added to a group conversation';
  END IF;

  INSERT INTO staff_conversation_members (conversation_id, user_id)
  VALUES (p_conversation_id, p_user_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION remove_group_member(p_conversation_id BIGINT, p_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_staff_messaging_user() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- Anyone in the group can remove a member (including themselves, to
  -- leave), matches a typical group chat's permission model rather
  -- than requiring a single "owner" role that doesn't exist here.
  IF NOT EXISTS (
    SELECT 1 FROM staff_conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = current_app_user_id()
  ) THEN
    RAISE EXCEPTION 'You are not a member of this conversation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM staff_conversations WHERE id = p_conversation_id AND type = 'group') THEN
    RAISE EXCEPTION 'Members can only be removed from a group conversation';
  END IF;

  DELETE FROM staff_conversation_members WHERE conversation_id = p_conversation_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_group_member(BIGINT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member(BIGINT, BIGINT) TO authenticated;

-- staff_conversation_members_insert (migration 050) already allows any
-- is_staff_messaging_user() to insert a row, which the RPC above relies
-- on for the actual add, kept as-is, just adding these narrower,
-- validated entry points instead of requiring direct table access from
-- the client for this specific action.
