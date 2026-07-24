-- "Our Journey" page
-- One generic content table (journey_content) serves six of the page's
-- sections, timeline, projects, team, community impact, milestones,
-- and the bottom gallery, rather than six near-identical tables and
-- six near-identical admin screens. Each section uses only the columns
-- that make sense for it (see comments below); unused columns stay
-- null. Customer Success Stories reuses the EXISTING testimonials
-- system per the explicit "do not duplicate testimonial logic"
-- instruction, extended with a few extra columns rather than forked.
-- Branch Journey extends the real, existing branches table (photo,
-- opening year, description) instead of a separate presentational copy.

CREATE TABLE IF NOT EXISTS journey_content (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  section TEXT NOT NULL CHECK (section IN ('timeline', 'project', 'team', 'community', 'milestone', 'gallery')),
  image_url TEXT,
  title TEXT, -- timeline: event title / project: project title / team: name / community: title / milestone: big number e.g. "500+" / gallery: (unused, use caption)
  subtitle TEXT, -- team: position / project: industry / community: category / gallery: category (Projects/Team/Community/Branches/Events)
  description TEXT, -- timeline: description / project: description / team: quote / community: description / milestone: label e.g. "Businesses Supported"
  meta TEXT, -- timeline: date label / team: years at Ticano / project: financing impact
  link_url TEXT, -- project/community: optional "read full story" / external link
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journey_content_section ON journey_content(section, display_order);
CREATE TRIGGER trg_journey_content_updated BEFORE UPDATE ON journey_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE journey_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journey_content_public_read" ON journey_content;
CREATE POLICY "journey_content_public_read" ON journey_content FOR SELECT
  USING (enabled = true OR is_marketing());

DROP POLICY IF EXISTS "journey_content_marketing_write" ON journey_content;
CREATE POLICY "journey_content_marketing_write" ON journey_content FOR ALL
  USING (is_marketing()) WITH CHECK (is_marketing());

GRANT SELECT ON journey_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON journey_content TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Extend testimonials for Customer Success Stories, photo, industry, and
-- an optional longer "read full story" version. Existing rows/behavior
-- (Reviews tab, homepage carousel, 5-star auto-queue) are unaffected;
-- these columns are simply unused (null) for anything that isn't shown
-- on the Our Journey page specifically.
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS full_story TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS show_on_journey BOOLEAN NOT NULL DEFAULT FALSE;

-- Extend branches for Branch Journey, real branch data (address, phone)
-- already lives here; this just adds the presentational fields the page
-- needs on top of it.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS opening_year TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS journey_description TEXT;

-- Storage for all Our Journey images (timeline, projects, team, community,
-- gallery, branch photos), one shared bucket, public read (all shown on
-- the public page), Marketing-only write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('journey-images', 'journey-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "journey_images_public_view" ON storage.objects;
CREATE POLICY "journey_images_public_view" ON storage.objects FOR SELECT
  USING (bucket_id = 'journey-images');

DROP POLICY IF EXISTS "journey_images_marketing_upload" ON storage.objects;
CREATE POLICY "journey_images_marketing_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'journey-images' AND is_marketing());

DROP POLICY IF EXISTS "journey_images_marketing_delete" ON storage.objects;
CREATE POLICY "journey_images_marketing_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'journey-images' AND is_marketing());

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE journey_content;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
