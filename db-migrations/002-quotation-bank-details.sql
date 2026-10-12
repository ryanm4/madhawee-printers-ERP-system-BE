-- Which bank account a quotation prints, and how much of it.
--   bank_details: NONE (not printed), FULL (all details), HIDE_NUMBER (everything except the account number)
--   bank_account_id: the account to print; NULL or a removed account falls back to the default one
-- Safe to run more than once: each column is added only if it is missing.

SET @add_bank_details = (
  SELECT IF(COUNT(*) = 0,
    "ALTER TABLE `quotations` ADD COLUMN `bank_details` VARCHAR(20) NOT NULL DEFAULT 'NONE'",
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotations' AND COLUMN_NAME = 'bank_details'
);
PREPARE add_bank_details FROM @add_bank_details;
EXECUTE add_bank_details;
DEALLOCATE PREPARE add_bank_details;

SET @add_bank_account = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `quotations` ADD COLUMN `bank_account_id` INT NULL',
    'DO 0')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotations' AND COLUMN_NAME = 'bank_account_id'
);
PREPARE add_bank_account FROM @add_bank_account;
EXECUTE add_bank_account;
DEALLOCATE PREPARE add_bank_account;
