CREATE SCHEMA `erp-madhawi-db` ;

CREATE TABLE `erp-madhawi-db`.`quotations` (
  `quote_id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `type_id` INT NOT NULL,
  `delivery_days` VARCHAR(45) NULL,
  `tax_type_id` INT NOT NULL,
  `currency` VARCHAR(45) NULL,
  `contact_person` VARCHAR(45) NULL,
  `notes` VARCHAR(45) NULL,
  `created_on` DATETIME NULL,
  `created_by` VARCHAR(45) NULL,
  `updated_on` DATETIME NULL,
  `updated_by` VARCHAR(45) NULL,
  PRIMARY KEY (`quote_id`),
  UNIQUE INDEX `quote_id_UNIQUE` (`quote_id` ASC) VISIBLE);

CREATE TABLE `erp-madhawi-db`.`quote_items` (
  `item_id` INT NOT NULL AUTO_INCREMENT,
  `quote_id` INT NOT NULL,
  `item_category` VARCHAR(45) NULL,
  `item_description` VARCHAR(45) NULL,
  `item_qty` INT NULL,
  `item_unit_price` VARCHAR(45) NULL,
  `item_unit_discount` VARCHAR(45) NULL,
  `item_total_price` VARCHAR(45) NULL,
  PRIMARY KEY (`item_id`));

CREATE TABLE `erp-madhawi-db`.`purchase_orders` (
  `po_id` INT NOT NULL AUTO_INCREMENT,
  `quote_id` INT NOT NULL,
  `po_type_id` INT NULL,
  `batch_ref` VARCHAR(45) NULL,
  `po_date` DATETIME NULL,
  `delivery_date` DATETIME NULL,
  `approved_on` DATETIME NULL,
  `approved_by` VARCHAR(45) NULL,
  `created_on` DATETIME NULL,
  `created_by` VARCHAR(45) NULL,
  `updated_on` DATETIME NULL,
  `updated_by` VARCHAR(45) NULL,
  PRIMARY KEY (`po_id`));

CREATE TABLE `erp-madhawi-db`.`jobs` (
  `job_id` INT NOT NULL AUTO_INCREMENT,
  `po_id` INT NOT NULL,
  `job_open_date` DATETIME NULL,
  `product_type` VARCHAR(45) NULL,
  `paper_type_id` INT NULL,
  `quantity` VARCHAR(45) NULL,
  `coating` VARCHAR(45) NULL,
  `packing_date` DATETIME NULL,
  `expiry_date` DATETIME NULL,
  `description` VARCHAR(45) NULL,
  `artwork` VARCHAR(45) NULL,
  `remarks` VARCHAR(45) NULL,
  PRIMARY KEY (`job_id`));

CREATE TABLE `erp-madhawi-db`.`job_materials` (
  `job_id` INT NOT NULL AUTO_INCREMENT,
  `material_type` VARCHAR(45) NULL,
  `material_name` VARCHAR(45) NULL,
  `material_description` VARCHAR(45) NULL,
  `quantity` VARCHAR(45) NULL,
  `status` VARCHAR(45) NULL,
  `remarks` VARCHAR(45) NULL,
  PRIMARY KEY (`job_id`));

CREATE TABLE `erp-madhawi-db`.`quote_types` (
  `type_id` INT NOT NULL AUTO_INCREMENT,
  `type_name` VARCHAR(45) NULL,
  PRIMARY KEY (`type_id`));

CREATE TABLE `erp-madhawi-db`.`tax_types` (
  `tax_id` INT NOT NULL AUTO_INCREMENT,
  `tax_type_name` VARCHAR(45) NULL,
  PRIMARY KEY (`tax_id`));

CREATE TABLE `erp-madhawi-db`.`paper_types` (
  `paper_id` INT NOT NULL AUTO_INCREMENT,
  `paper_type_name` VARCHAR(45) NULL,
  PRIMARY KEY (`paper_id`));

CREATE TABLE `erp-madhawi-db`.`products_types` (
  `product_id` INT NOT NULL AUTO_INCREMENT,
  `product_name` VARCHAR(45) NULL,
  PRIMARY KEY (`product_id`));

CREATE TABLE `erp-madhawi-db`.`main_inventory` (
  `item_id` INT NOT NULL AUTO_INCREMENT,
  `item_name` VARCHAR(45) NOT NULL,
  `item_description` VARCHAR(45) NULL,
  `quantity` INT NOT NULL,
  PRIMARY KEY (`item_id`));


CREATE TABLE `erp-madhawi-db`.`customers` (
  `customer_id` INT NOT NULL AUTO_INCREMENT,
  `company_name` VARCHAR(45) NOT NULL,
  `address` VARCHAR(45) NULL,
  `phone` VARCHAR(45) NULL,
  `email` VARCHAR(45) NULL,
  `vat_type` VARCHAR(45) NULL,
  `vat_no` VARCHAR(45) NULL,
  `logo_url` VARCHAR(45) NULL,
  `contact_person` VARCHAR(45) NULL,
  `contact_person_email` VARCHAR(45) NULL,
  `contact_person_phone` VARCHAR(45) NULL,
  `created_on` DATETIME NULL,
  `created_by` VARCHAR(45) NULL,
  `updated_on` DATETIME NULL,
  `updated_by` VARCHAR(45) NULL,
  PRIMARY KEY (`customer_id`));