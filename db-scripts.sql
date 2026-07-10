CREATE SCHEMA `erp_madhawi_db`;

CREATE TABLE
  `erp_madhawi_db`.`quotations` (
    `quote_id` INT NOT NULL AUTO_INCREMENT,
    `customer_id` INT NOT NULL,
    `type_id` INT NOT NULL,
    `delivery_days` VARCHAR(45) NULL,
    `tax_type_id` INT NOT NULL,
    `currency` VARCHAR(45) NULL,
    `sub_total` VARCHAR(45) NULL,
    `no_of_items` VARCHAR(45) NULL,
    `total_without_tax` VARCHAR(45) NULL,
    `net_total` VARCHAR(45) NULL `contact_person` VARCHAR(45) NULL,
    `notes` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `created_by` VARCHAR(45) NULL,
    `updated_on` DATETIME NULL,
    `updated_by` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    PRIMARY KEY (`quote_id`),
    UNIQUE INDEX `quote_id_UNIQUE` (`quote _id` ASC) VISIBLE
  );

CREATE TABLE
  `erp_madhawi_db`.`quote_items` (
    `item_id` INT NOT NULL AUTO_INCREMENT,
    `quote_id` VARCHAR(45) NOT NULL,
    `item_category` VARCHAR(45) NULL,
    `item_description` VARCHAR(45) NULL,
    `item_qty` INT NULL,
    `item_unit_price` VARCHAR(45) NULL,
    `item_unit_discount` VARCHAR(45) NULL,
    `item_total_price` VARCHAR(45) NULL,
    PRIMARY KEY (`item_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`purchase_orders` (
    `po_id` INT NOT NULL AUTO_INCREMENT,
    `quote_id` INT NULL,
    `customer_id` VARCHAR(45) NULL,
    `po_type_id` INT NULL,
    `batch_ref` VARCHAR(45) NULL,
    `po_date` DATETIME NULL,
    `delivery_date` DATETIME NULL,
    `TC_E_PR_No` VARCHAR(45) NULL `approved_on` DATETIME NULL,
    `approved_by` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `created_by` VARCHAR(45) NULL,
    `updated_on` DATETIME NULL,
    `updated_by` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    `customer_po` VARCHAR(45) NULL,
    `po_items` VARCHAR(45) NULL,
    `sales_ref` VARCHAR(45) NULL,
    `currency` VARCHAR(45) NULL,
    PRIMARY KEY (`po_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`jobs` (
    `job_id` INT NOT NULL AUTO_INCREMENT,
    `po_id` INT NULL,
    `customer_id` VARCHAR(45) NULL,
    `job_item` VARCHAR(45) NULL,
    `job_name` VARCHAR(45) NULL,
    `job_open_date` DATETIME NULL,
    `product_type` VARCHAR(45) NULL,
    `paper_type_id` VARCHAR(45) NULL,
    `quantity` INT NULL,
    `coating` VARCHAR(45) NULL,
    `packing_date` DATETIME NULL,
    `expiry_date` DATETIME NULL,
    `description` VARCHAR(45) NULL,
    `artwork` VARCHAR(45) NULL,
    `remarks` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    `completed_qty` INT ZEROFILL NOT NULL,
    `wastage` VARCHAR(45) NULL,
    `job_number` VARCHAR(45) NULL,
    `job_ref_id` VARCHAR(45) NULL,
    `old_plate_quantity` INT NULL,
    `old_plate_status` VARCHAR(45) NULL,
    `old_plate_remarks` VARCHAR(45) NULL,
    `new_plate_quantity` INT NULL AFTER,
    `new_plate_status` VARCHAR(45) NULL,
    `new_plate_remarks` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `created_by` VARCHAR(45) NULL,
    `updated_on` DATETIME NULL,
    `updated_by` VARCHAR(45) NULL,
    PRIMARY KEY (`job_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`job_materials` (
    `job_material_id` INT NOT NULL AUTO_INCREMENT,
    `job_id` INT NOT NULL,
    `item_id` INT NULL,
    `material_type` VARCHAR(45) NULL,
    `material_name` VARCHAR(45) NULL,
    `material_description` VARCHAR(45) NULL,
    `size` VARCHAR(45) NULL,
    `quantity` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    `remarks` VARCHAR(45) NULL,
    PRIMARY KEY (`job_material_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`quote_types` (
    `type_id` INT NOT NULL AUTO_INCREMENT,
    `type_name` VARCHAR(45) NULL,
    PRIMARY KEY (`type_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`tax_types` (
    `tax_id` INT NOT NULL AUTO_INCREMENT,
    `tax_type_name` VARCHAR(45) NULL,
    PRIMARY KEY (`tax_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`paper_types` (
    `paper_id` INT NOT NULL AUTO_INCREMENT,
    `paper_type_name` VARCHAR(45) NULL,
    PRIMARY KEY (`paper_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`products_types` (
    `product_id` INT NOT NULL AUTO_INCREMENT,
    `product_name` VARCHAR(45) NULL,
    PRIMARY KEY (`product_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`main_inventory` (
    `item_id` INT NOT NULL AUTO_INCREMENT,
    `item_category` VARCHAR(45) NULL,
    `item_sub_category` VARCHAR(45) NULL,
    `item_name` VARCHAR(45) NULL,
    `size` VARCHAR(45) NULL,
    `height` VARCHAR(45) NULL,
    `width` VARCHAR(45) NULL,
    `quantity` VARCHAR(45) NULL,
    `unit_of_measure` VARCHAR(45) NULL,
    `reorder_level` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    `remarks` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `created_by` VARCHAR(45) NULL,
    `updated_on` DATETIME NULL,
    `updated_by` VARCHAR(45) NULL,
    PRIMARY KEY (`item_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`customers` (
    `customer_id` INT NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(255) NOT NULL,
    `customer_type` VARCHAR(45) NOT NULL,
    `address` VARCHAR(45) NULL,
    `phone` VARCHAR(45) NULL,
    `email` VARCHAR(45) NULL,
    `vat_type` VARCHAR(45) NULL,
    `vat_no` VARCHAR(45) NULL,
    `credit_period` VARCHAR(45) NULL,
    `logo_url` VARCHAR(45) NULL,
    `contact_person` VARCHAR(45) NULL,
    `contact_person_email` VARCHAR(45) NULL,
    `contact_person_phone` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `created_by` VARCHAR(45) NULL,
    `updated_on` DATETIME NULL,
    `updated_by` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    PRIMARY KEY (`customer_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`dispatch` (
    `dispatch_id` INT NOT NULL AUTO_INCREMENT,
    `customer_id` VARCHAR(45) NULL,
    `job_id` VARCHAR(45) NULL,
    `dispatch_note` VARCHAR(45) NULL,
    `dispatch_date` DATETIME NULL,
    `dispatch_qty` VARCHAR(45) NULL,
    `no_of_bundles` VARCHAR(45) NULL,
    `description` VARCHAR(45) NULL,
    `delivery_address` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    `created_by` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `updated_by` VARCHAR(45) NULL,
    `updated_on` DATETIME NULL,
    PRIMARY KEY (`dispatch_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`po_items_details` (
    `po_item_id` INT NOT NULL AUTO_INCREMENT,
    `po_id` VARCHAR(45) NULL,
    `item_code` VARCHAR(45) NULL,
    `description` VARCHAR(45) NULL,
    `quantity` VARCHAR(45) NULL,
    `uom` VARCHAR(45) NULL,
    `price` VARCHAR(45) NULL,
    PRIMARY KEY (`po_item_id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NULL,
    `password` VARCHAR(255) NULL,
    `user_role` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `updated_on` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE
  );

CREATE TABLE
  `erp_madhawi_db`.`paper_coating_data` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `job_id` INT NULL,
    `paper` VARCHAR(45) NULL,
    `coating` VARCHAR(45) NULL,
    `delivery_date` DATETIME NULL,
    PRIMARY KEY (`id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`job_ink_data` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `job_id` VARCHAR(45) NULL,
    `ink` VARCHAR(45) NULL,
    `quantity` VARCHAR(45) NULL,
    `status` VARCHAR(45) NULL,
    `remarks` VARCHAR(45) NULL,
    PRIMARY KEY (`id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`goods_receive_notes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `releated_po` VARCHAR(45) NULL,
    `received_date` DATETIME NULL,
    `supplier_name` VARCHAR(45) NULL,
    `stock_location` VARCHAR(45) NULL,
    `payee_name` VARCHAR(45) NULL,
    `payment_method` VARCHAR(45) NULL,
    `currency` VARCHAR(45) NULL,
    `supplier_invoice_no` VARCHAR(45) NULL,
    `remarks` VARCHAR(45) NULL,
    `created_on` DATETIME NULL,
    `created_by` VARCHAR(45) NULL,
    `updated_on` DATETIME NULL,
    `updated_by` VARCHAR(45) NULL,
    PRIMARY KEY (`id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`grn_items` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `grn_no` INT NOT NULL,
    `item_name` VARCHAR(45) NULL,
    `quantity` INT NULL,
    `rate` DECIMAL(10, 2) NULL,
    `amount` DECIMAL(10, 2) NULL,
    `created_on` DATETIME NULL AFTER `collector_name`,
    `created_by` VARCHAR(45) NULL AFTER `created_on`,
    `updated_on` DATETIME NULL AFTER `created_by`,
    `updated_by` VARCHAR(45) NULL AFTER `updated_on`,
    PRIMARY KEY (`id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`issue-notes` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `date` DATETIME NULL,
    `remarks` VARCHAR(45) NULL,
    `collector_name` VARCHAR(45) NULL,
    PRIMARY KEY (`id`)
  );

CREATE TABLE
  `erp_madhawi_db`.`issue_note-items` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `issue_note_id` INT NULL,
    `item_id` INT NULL,
    `item_name` VARCHAR(45) NULL,
    `quantity` DECIMAL(10, 2) NULL,
    PRIMARY KEY (`id`)
  );