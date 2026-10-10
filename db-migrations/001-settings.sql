-- Settings: company details, bank accounts, editable dropdown lists and job number formats.
-- Safe to run more than once: tables are created only if missing and seed rows are skipped when present.

CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` TEXT NULL,
  `updated_by` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
);

CREATE TABLE IF NOT EXISTS `option_values` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `list_key` VARCHAR(50) NOT NULL,
  `value` VARCHAR(150) NOT NULL,
  `label` VARCHAR(150) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_option_values_list_value` (`list_key`, `value`)
);

CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bank_name` VARCHAR(150) NOT NULL,
  `branch_name` VARCHAR(150) NULL,
  `account_name` VARCHAR(150) NOT NULL,
  `account_number` VARCHAR(60) NOT NULL,
  `swift_code` VARCHAR(20) NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'LKR',
  `notes` TEXT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `document_number_formats` (
  `doc_type` VARCHAR(30) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `template` VARCHAR(60) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`doc_type`)
);

-- Company details as the quotation PDF prints them today
INSERT IGNORE INTO `app_settings` (`setting_key`, `setting_value`) VALUES
  ('company_name', 'MADHAWEE PRINTERS (PVT) LTD'),
  ('company_address', 'No: 624 Kandy Road, Bulugaha Junction, Kelaniya, Sri Lanka.'),
  ('company_phone', '+94 11-2905229, 2905264'),
  ('company_email', 'madhaweeprinters@gmail.com'),
  ('company_website', 'www.madhaweeprinters.lk'),
  ('company_registration_number', ''),
  ('vat_registration_number', ''),
  ('quotation_terms', '1. Prices are based on the specifications, quantities, materials, and finishes provided at the time of quotation. Any variation in artwork, material, size, quantity, or finishing will result in a price revision.\n2. Production will commence only after written order confirmation or receipt of the agreed advance payment.\n3. Delivery timelines are estimated and shall commence from the date of order confirmation and advance payment. Final artwork, layouts, or samples must be approved by the client prior to production.');

-- The account the quotation PDF prints today; only added when there are no accounts yet
INSERT INTO `bank_accounts` (`bank_name`, `branch_name`, `account_name`, `account_number`, `currency`, `is_default`)
SELECT 'Commercial Bank of Ceylon PLC', 'Nugegoda', 'Madhawee Printers (Pvt) Ltd', '110-100-1234', 'LKR', 1
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `bank_accounts`);

-- Job number formats the jobs controller used to hardcode
INSERT IGNORE INTO `document_number_formats` (`doc_type`, `label`, `template`, `sort_order`) VALUES
  ('TIEP', 'TIEP job tickets', 'MPL/####/YY/TIEP', 1),
  ('NON_TIEP', 'Non-TIEP job tickets', 'MPL/####/YY/NON_TIEP', 2),
  ('MP', 'MP job tickets', 'MP/####/YY/PETHUM', 3);

-- Dropdown lists, seeded from the values the frontend used to hardcode
INSERT IGNORE INTO `option_values` (`list_key`, `value`, `label`, `sort_order`) VALUES
  ('item_category', 'PAPER', 'PAPER', 1),
  ('item_category', 'BOARD', 'BOARD', 2),
  ('item_category', 'CHEMICALS', 'CHEMICALS', 3),
  ('item_category', 'GLUE', 'GLUE', 4),
  ('item_category', 'INK', 'INK', 5),
  ('item_category', 'LAMINATING FILM', 'LAMINATING FILM', 6),
  ('item_category', 'MISCELLANEOUS', 'MISCELLANEOUS', 7),
  ('item_category', 'PRE-PRESS', 'PRE-PRESS', 8),
  ('item_category', 'SPIRAL', 'SPIRAL', 9),

  ('item_sub_category', 'BLANKS', 'BLANKS', 1),
  ('item_sub_category', 'ART BOARD', 'ART BOARD', 2),
  ('item_sub_category', 'ART PAPER', 'ART PAPER', 3),
  ('item_sub_category', 'BANK PAPER', 'BANK PAPER', 4),
  ('item_sub_category', 'BOX BOARD', 'BOX BOARD', 5),
  ('item_sub_category', 'CLEANING', 'CLEANING', 6),
  ('item_sub_category', 'COUTED PAPER BOARD', 'COUTED PAPER BOARD', 7),
  ('item_sub_category', 'GLUE', 'GLUE', 8),
  ('item_sub_category', 'INK', 'INK', 9),
  ('item_sub_category', 'IVORY BOARD', 'IVORY BOARD', 10),
  ('item_sub_category', 'LAMINATING FILM', 'LAMINATING FILM', 11),
  ('item_sub_category', 'LINEN PAPER', 'LINEN PAPER', 12),
  ('item_sub_category', 'NCR', 'NCR', 13),
  ('item_sub_category', 'NEWS PRINT PAPER', 'NEWS PRINT PAPER', 14),
  ('item_sub_category', 'OP', 'OP', 15),
  ('item_sub_category', 'OTHER', 'OTHER', 16),
  ('item_sub_category', 'SPIRAL', 'SPIRAL', 17),

  ('unit_of_measure', 'NOS', 'NOS', 1),
  ('unit_of_measure', 'REEL', 'REEL', 2),
  ('unit_of_measure', 'SHEET', 'SHEET', 3),
  ('unit_of_measure', 'LTR', 'LTR', 4),
  ('unit_of_measure', 'KG', 'KG', 5),

  ('product_type', 'MASTER CARTON', 'MASTER CARTON', 1),
  ('product_type', 'INNER CARTON', 'INNER CARTON', 2),
  ('product_type', 'STICKER', 'STICKER', 3),
  ('product_type', 'LEAFLET', 'LEAFLET', 4),
  ('product_type', 'BOOK COVER', 'BOOK COVER', 5),
  ('product_type', 'IMPRESSION', 'IMPRESSION', 6),
  ('product_type', 'MAGAZINE', 'MAGAZINE', 7),
  ('product_type', 'LABEL', 'LABEL', 8),
  ('product_type', 'OTHERS', 'OTHERS', 9),

  ('coating_type', 'UV VARNISHED', 'UV VARNISHED', 1),
  ('coating_type', 'OP VARNISHED', 'OP VARNISHED', 2),
  ('coating_type', 'COLD LAMINATED', 'COLD LAMINATED', 3),
  ('coating_type', 'MATT LAMINATED', 'MATT LAMINATED', 4),
  ('coating_type', 'SPOT UV VARNISHED', 'SPOT UV VARNISHED', 5),
  ('coating_type', 'FOILED', 'FOILED', 6),
  ('coating_type', 'EMBOSING', 'EMBOSING', 7),
  ('coating_type', 'SAND UV VARNISHED', 'SAND UV VARNISHED', 8),
  ('coating_type', 'NONE', 'NONE', 9),

  ('plate_status', 'PLATES REQUESTED', 'PLATES REQUESTED', 1),
  ('plate_status', 'PLATES RECEIVED', 'PLATES RECEIVED', 2),

  ('ink_status', 'AVAILABLE', 'AVAILABLE', 1),
  ('ink_status', 'NOT AVAILABLE', 'NOT AVAILABLE', 2);
