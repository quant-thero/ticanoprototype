-- Make sure users.branch_id can actually be NULL. schema.sql defines it
-- that way, but if the live table was ever created or altered by hand
-- before the migrations folder existed, it may still be carrying a NOT
-- NULL from that. Safe to run either way.
ALTER TABLE users ALTER COLUMN branch_id DROP NOT NULL;
