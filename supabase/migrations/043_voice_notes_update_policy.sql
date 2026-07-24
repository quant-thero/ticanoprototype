-- add missing UPDATE policy for voice-notes uploads
-- The actual upload call uses { upsert: true }, and Supabase Storage's
-- upsert path can require RLS to allow an UPDATE, not just an INSERT,
-- even when the object doesn't already exist yet. Every other piece of
-- this (the bucket, the INSERT policy, the SELECT policy, the grants,
-- the attach function) was independently re-verified as completely
-- correct, the one thing genuinely missing was an UPDATE policy on
-- this bucket, which upsert semantics can depend on.

DROP POLICY IF EXISTS "voice_notes_customer_upload_update" ON storage.objects;
CREATE POLICY "voice_notes_customer_upload_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'voice-notes')
  WITH CHECK (bucket_id = 'voice-notes');
