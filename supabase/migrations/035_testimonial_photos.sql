-- image-based Testimonials (separate from text Reviews)
-- New feature: Marketing uploads photos of customers/employees sharing
-- their Ticano journey, displayed on the homepage as their own sliding
-- carousel (same pause/drag behavior as the existing text reviews
-- carousel, which this migration doesn't touch). Distinct from
-- "testimonials" (the existing text-review table, now labeled "Reviews"
-- in the UI), kept as separate tables since they're genuinely
-- different content types (photo + caption vs. star rating + quote).

CREATE TABLE IF NOT EXISTS testimonial_photos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  image_url TEXT NOT NULL,
  name TEXT,
  role_label TEXT, -- e.g. "Client since 2022", "Portfolio Manager, Gaborone"
  caption TEXT, -- optional short quote/story
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE testimonial_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "testimonial_photos_public_read" ON testimonial_photos;
CREATE POLICY "testimonial_photos_public_read" ON testimonial_photos FOR SELECT
  USING (enabled = true OR is_marketing());

DROP POLICY IF EXISTS "testimonial_photos_marketing_write" ON testimonial_photos;
CREATE POLICY "testimonial_photos_marketing_write" ON testimonial_photos FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

GRANT SELECT ON testimonial_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON testimonial_photos TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Storage, public read (these are meant to be shown on the public
-- homepage), Marketing-only write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('testimonial-photos', 'testimonial-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "testimonial_photos_public_view" ON storage.objects;
CREATE POLICY "testimonial_photos_public_view" ON storage.objects FOR SELECT
  USING (bucket_id = 'testimonial-photos');

DROP POLICY IF EXISTS "testimonial_photos_marketing_upload" ON storage.objects;
CREATE POLICY "testimonial_photos_marketing_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'testimonial-photos' AND is_marketing());

DROP POLICY IF EXISTS "testimonial_photos_marketing_delete" ON storage.objects;
CREATE POLICY "testimonial_photos_marketing_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'testimonial-photos' AND is_marketing());

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE testimonial_photos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
