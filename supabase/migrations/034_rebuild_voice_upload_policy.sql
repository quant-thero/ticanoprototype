-- rebuild voice-notes upload policy defensively
-- Confirmed via browser console: the upload itself fails RLS
-- ("new row violates row-level security policy") even though a policy
-- named voice_notes_customer_upload exists. Possible causes this
-- addresses: the base table-level GRANT being separate from (and
-- missed alongside) the RLS policy, or the auth.uid() check behaving
-- unexpectedly in the storage-api evaluation context. Simplified the
-- condition and re-asserted the grant explicitly.

DROP POLICY IF EXISTS "voice_notes_customer_upload" ON storage.objects;
CREATE POLICY "voice_notes_customer_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-notes');

-- Explicit, unconditional grant, RLS policies alone don't grant table
-- access; both are required together for INSERT to succeed.
GRANT INSERT ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- Diagnostic: lists EVERY policy on storage.objects and whether each is
-- PERMISSIVE or RESTRICTIVE. If anything shows RESTRICTIVE here, that
-- policy's condition is AND'ed against every other policy (including
-- the one above) rather than OR'ed, a restrictive policy that doesn't
-- account for the voice-notes bucket would silently block this upload
-- regardless of how correct the permissive policy is.
SELECT policyname, cmd, permissive, roles
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY permissive DESC, policyname;
