-- colleague's fixes batch (renumbered from their own
-- 051, which collided with an unrelated 051 already run on this
-- database, see also the author_id UUID->BIGINT fix below, a type
-- mismatch in their original file)
-- Two of their four items were skipped as redundant with existing,
-- already-working mechanisms rather than merged as parallel systems:
-- - complaint priority: already exists (complaint_priority enum,
-- low/medium/high/urgent) with a working update function
-- - complaint_internal_notes table: already exists as complaint_notes
-- (note_type='internal'), already wired into the UI
-- - return audit columns: already tracked via the existing timeline
-- entry + notification returnComplaintToPm() creates, and the
-- status change back to 'assigned' already removes the Return
-- button naturally (nothing left to disable)
-- Kept: the two genuinely new, non-conflicting fixes below.

-- ---- Let Marketing manage site_settings (homepage/login page content),
-- not just Director/Admin. Marketing already owns homepage_promos,
-- blog_posts, testimonials etc via is_marketing(), site_settings was
-- left on the stricter is_management() by mistake, which is what was
-- blocking Marketing from uploading a Director-quote photo directly
-- from the homepage widget without going through the Admin panel.
DROP POLICY IF EXISTS "site_settings_manage" ON site_settings;
CREATE POLICY "site_settings_manage" ON site_settings FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

-- ---- Review step for homepage promotions, Director/Admin can mark a
-- promotion reviewed before Marketing publishes it live.
ALTER TABLE homepage_promos ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE homepage_promos ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
