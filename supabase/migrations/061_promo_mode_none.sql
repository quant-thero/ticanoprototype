-- optional flyer mode for homepage promos
-- promo_mode was a strict enum of only 'banner'/'popup', every
-- uploaded flyer was forced into one of those two automatic homepage
-- displays, with no way to just store a flyer for later/other use
-- (e.g. linking to it from a blog post) without it going live.
-- Adds 'none' as a third valid value; getHomepagePromo() (the public
-- homepage fetch) already excludes it even if marked enabled.

ALTER TYPE promo_mode ADD VALUE IF NOT EXISTS 'none';
