-- album support for Our Journey content entries
-- Every journey_content row (a team member, a community event, a
-- project, etc.) previously supported exactly one photo (image_url).
-- This adds extra_images, an array of additional photos belonging to
-- the same entry, e.g. several photos from the same community outreach
-- event, grouped together as one "album" rather than needing a separate
-- entry per photo. image_url remains the cover photo shown in the grid;
-- extra_images are the rest, revealed in a lightbox/carousel on click.
--
-- Backward compatible: existing entries just have an empty array,
-- which behaves exactly as a single-photo entry always has.

ALTER TABLE journey_content ADD COLUMN IF NOT EXISTS extra_images TEXT[] NOT NULL DEFAULT '{}';
