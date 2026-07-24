-- update branch addresses and phone numbers

UPDATE branches SET address = 'CBD, Zambezi Building, 5th Floor', phone = '74 306 295 / 318 1888' WHERE name = 'Gaborone';
UPDATE branches SET address = 'Opposite Shell, above Lewis Building, upstairs on the right', phone = '73 053 343 / 686 0182' WHERE name = 'Maun';
UPDATE branches SET address = 'Riverview Mall, next to Choppies, Office 08', phone = '73 589 338 / 492 5077' WHERE name = 'Palapye';
UPDATE branches SET address = 'Behind Galo Mall, at the T-junction, Francistown Records Road', phone = '73 434 064 / 247 0685' WHERE name = 'Francistown';
UPDATE branches SET address = 'Lesedi Mall, Shop 20, next to Access Bank', phone = '73 475 757 / 265 0038' WHERE name IN ('Selibe Phikwe', 'Selebi-Phikwe', 'Phikwe');
