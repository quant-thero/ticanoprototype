-- fix: voice notes never actually attached to complaints
-- Root cause of "the recording still doesn't show up on the PM's
-- side": submitComplaint() uploads the audio file successfully (storage
-- INSERT is open to any authenticated user), but then tries to UPDATE
-- the complaint row to record voice_note_path, and complaints_update
-- (migration 022) only allows management or branch-matched staff to
-- update a complaint, not the customer who owns it. That update was
-- silently rejected by RLS every time, and the error was caught and
-- swallowed (deliberately, so a voice-note hiccup wouldn't block
-- complaint submission), so the complaint saved fine, the audio file
-- really did land in storage, but nothing on the complaint row ever
-- pointed to it. Orphaned file, no visible recording, no error either.
--
-- Fix: rather than widen complaints_update to let customers modify
-- their own complaint (which would also let them tamper with status,
-- assigned_pm_id, severity, etc. far more than intended), this adds a
-- narrowly-scoped function that can ONLY ever set the three voice-note
-- columns, only on a complaint the caller actually owns.

CREATE OR REPLACE FUNCTION attach_voice_note(p_complaint_id BIGINT, p_path TEXT, p_duration_seconds INTEGER)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE complaints
  SET voice_note_path = p_path,
      voice_note_duration_seconds = p_duration_seconds,
      voice_note_uploaded_at = now()
  WHERE id = p_complaint_id
    AND (customer_id = current_app_user_id() OR (anonymous = TRUE AND customer_id IS NULL));
  -- Anonymous complaints have no customer_id to check ownership against
  -- the id itself (returned only to the submitting browser at the moment
  -- of creation) is the only thing tying this call back to the right
  -- complaint, same trust boundary the anonymous flow already relies on.
END;
$$;

GRANT EXECUTE ON FUNCTION attach_voice_note(BIGINT, TEXT, INTEGER) TO authenticated, anon;
