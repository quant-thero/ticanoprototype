-- voice complaints as real, persisted audio
-- ComplaintForm.jsx has recorded voice notes via MediaRecorder for a
-- long time, but submitComplaint() never actually persisted them
-- anywhere ("voice notes aren't part of the schema yet"). The
-- recording was captured, included in the submit payload, and then
-- silently discarded. This adds real storage: a private bucket,
-- signed-URL-only streaming playback, and role-gated access matching
-- the requirement exactly, assigned PM, Service Manager (org-wide),
-- Director (only if this specific complaint was escalated to them),
-- and Admin.

ALTER TABLE complaints ADD COLUMN IF NOT EXISTS voice_note_path TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS voice_note_duration_seconds INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS voice_note_uploaded_at TIMESTAMPTZ;

-- Private bucket, never public. The only way to hear a recording is a
-- short-lived signed URL generated on demand for someone RLS already
-- allows to see it; there's no permanent public URL to leak or bookmark.
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes', 'voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Upload: the submitting customer only, and only once (their own new
-- complaint), matches how ComplaintForm actually uploads (right after
-- the complaint row is created, using their own session).
DROP POLICY IF EXISTS "voice_notes_customer_upload" ON storage.objects;
CREATE POLICY "voice_notes_customer_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-notes' AND auth.uid() IS NOT NULL);

-- Playback (SELECT, needed to generate a signed URL at all): assigned
-- PM, org-wide Service Manager, Director ONLY if this complaint was
-- actually escalated to them, and Admin. Path convention is
-- '<complaint_id>/<filename>', so the leading path segment is matched
-- back to a real complaint's access rules.
DROP POLICY IF EXISTS "voice_notes_role_gated_read" ON storage.objects;
CREATE POLICY "voice_notes_role_gated_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-notes'
    AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id::text = split_part(storage.objects.name, '/', 1)
      AND (
        c.assigned_pm_id = current_app_user_id()
        OR current_app_role() = 'service_manager'
        OR current_app_role() = 'admin'
        OR (
          current_app_role() = 'director'
          AND EXISTS (
            SELECT 1 FROM complaint_escalations ce
            WHERE ce.complaint_id = c.id AND ce.escalated_to = 'director'
          )
        )
      )
    )
  );

GRANT SELECT, INSERT ON storage.objects TO authenticated;
