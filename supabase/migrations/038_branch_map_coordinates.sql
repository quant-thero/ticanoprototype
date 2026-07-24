-- branch coordinates for the map
-- getMapBranches() filters out any branch without latitude/longitude
-- set, and branches were originally seeded with only name/city/country,
-- never coordinates. So the live map query always returned nothing and
-- silently fell back to a hardcoded constant. This sets real
-- coordinates so the map actually reflects live branch data (address,
-- phone, updated in migration 036) rather than permanently running
-- off the fallback.

UPDATE branches SET latitude = -24.6545, longitude = 25.9086 WHERE name = 'Gaborone';
UPDATE branches SET latitude = -19.9833, longitude = 23.4167 WHERE name = 'Maun';
UPDATE branches SET latitude = -22.5500, longitude = 27.1333 WHERE name = 'Palapye';
UPDATE branches SET latitude = -21.1667, longitude = 27.5167 WHERE name = 'Francistown';
UPDATE branches SET latitude = -21.9833, longitude = 27.8333 WHERE name IN ('Phikwe', 'Selibe Phikwe', 'Selebi-Phikwe');

-- Re-assert address/phone here too (idempotent, safe even if migration
-- 036 was already run) so this migration is fully self-contained.
UPDATE branches SET address = 'CBD, Zambezi Building, 5th Floor', phone = '74 306 295 / 318 1888' WHERE name = 'Gaborone';
UPDATE branches SET address = 'Opposite Shell, above Lewis Building, upstairs on the right', phone = '73 053 343 / 686 0182' WHERE name = 'Maun';
UPDATE branches SET address = 'Riverview Mall, next to Choppies, Office 08', phone = '73 589 338 / 492 5077' WHERE name = 'Palapye';
UPDATE branches SET address = 'Behind Galo Mall, at the T-junction, Francistown Records Road', phone = '73 434 064 / 247 0685' WHERE name = 'Francistown';
UPDATE branches SET address = 'Lesedi Mall, Shop 20, next to Access Bank', phone = '73 475 757 / 265 0038' WHERE name IN ('Phikwe', 'Selibe Phikwe', 'Selebi-Phikwe');
