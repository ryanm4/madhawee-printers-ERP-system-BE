CREATE TABLE "currency_conversion" (
  "id" int NOT NULL AUTO_INCREMENT,
  "currency_from" varchar(10) NOT NULL,
  "currency_to" varchar(10) NOT NULL,
  "rate" decimal(10,4) NOT NULL,
  "updated_at" datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
)

CREATE TABLE "customer_contacts" (
  "contact_id" int NOT NULL AUTO_INCREMENT,
  "customer_id" int NOT NULL,
  "name" varchar(255) DEFAULT NULL,
  "email" varchar(255) DEFAULT NULL,
  "phone" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("contact_id"),
  KEY "customer_id" ("customer_id"),
  CONSTRAINT "customer_contacts_ibfk_1" FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id") ON DELETE CASCADE
)

CREATE TABLE "customers" (
  "customer_id" int NOT NULL AUTO_INCREMENT,
  "company_name" text NOT NULL,
  "customer_type" varchar(45) NOT NULL,
  "address" varchar(255) DEFAULT NULL,
  "phone" varchar(45) DEFAULT NULL,
  "credit_period" varchar(45) DEFAULT NULL,
  "email" varchar(45) DEFAULT NULL,
  "vat_type" varchar(45) DEFAULT NULL,
  "vat_no" varchar(45) DEFAULT NULL,
  "logo_url" varchar(45) DEFAULT NULL,
  "contact_person" json DEFAULT NULL,
  "contact_person_email" varchar(45) DEFAULT NULL,
  "contact_person_phone" varchar(45) DEFAULT NULL,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  "status" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("customer_id")
)

CREATE TABLE "dispatch" (
  "dispatch_id" int NOT NULL AUTO_INCREMENT,
  "customer_id" varchar(45) DEFAULT NULL,
  "job_id" varchar(45) DEFAULT NULL,
  "dispatch_note" text,
  "dispatch_date" datetime DEFAULT NULL,
  "dispatch_qty" varchar(45) DEFAULT NULL,
  "no_of_bundles" varchar(45) DEFAULT NULL,
  "description" text,
  "delivery_address" varchar(45) DEFAULT NULL,
  "status" varchar(45) DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "created_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  PRIMARY KEY ("dispatch_id")
)

CREATE TABLE "goods_receive_notes" (
  "id" int NOT NULL AUTO_INCREMENT,
  "related_po" varchar(45) DEFAULT NULL,
  "received_date" datetime DEFAULT NULL,
  "supplier_name" varchar(45) DEFAULT NULL,
  "stock_location" varchar(45) DEFAULT NULL,
  "payee_name" varchar(45) DEFAULT NULL,
  "payment_method" varchar(45) DEFAULT NULL,
  "currency" varchar(45) DEFAULT NULL,
  "supplier_invoice_no" varchar(45) DEFAULT NULL,
  "remarks" text,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("id")
)

CREATE TABLE "grn_items" (
  "id" int NOT NULL AUTO_INCREMENT,
  "grn_no" int NOT NULL,
  "item_id" int DEFAULT NULL,
  "item_name" varchar(45) DEFAULT NULL,
  "quantity" int DEFAULT NULL,
  "rate" decimal(10,2) DEFAULT NULL,
  "amount" decimal(10,2) DEFAULT NULL,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("id")
)

CREATE TABLE "issue_note-items" (
  "id" int NOT NULL AUTO_INCREMENT,
  "issue_note_id" int DEFAULT NULL,
  "item_name" text,
  "quantity" decimal(10,2) DEFAULT NULL,
  "item_id" int DEFAULT NULL,
  PRIMARY KEY ("id")
)

CREATE TABLE "issue-notes" (
  "id" int NOT NULL AUTO_INCREMENT,
  "job_id" varchar(45) DEFAULT NULL,
  "date" datetime DEFAULT NULL,
  "remarks" text,
  "collector_name" varchar(45) DEFAULT NULL,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("id")
)

CREATE TABLE "job_ink_data" (
  "id" int NOT NULL AUTO_INCREMENT,
  "job_id" varchar(45) DEFAULT NULL,
  "ink" varchar(45) DEFAULT NULL,
  "quantity" varchar(45) DEFAULT NULL,
  "status" varchar(45) DEFAULT NULL,
  "remarks" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("id")
)

CREATE TABLE "job_materials" (
  "job_material_id" int NOT NULL AUTO_INCREMENT,
  "job_id" int NOT NULL,
  "item_id" int DEFAULT NULL,
  "material_type" varchar(45) DEFAULT NULL,
  "material_name" varchar(45) DEFAULT NULL,
  "material_description" varchar(45) DEFAULT NULL,
  "size" varchar(45) DEFAULT NULL,
  "quantity" varchar(45) DEFAULT NULL,
  "status" varchar(45) DEFAULT NULL,
  "remarks" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("job_material_id")
)

CREATE TABLE "jobs" (
  "job_id" int NOT NULL AUTO_INCREMENT,
  "po_id" int DEFAULT NULL,
  "customer_id" varchar(45) DEFAULT NULL,
  "job_item" text,
  "job_name" text,
  "job_open_date" datetime DEFAULT NULL,
  "product_type" varchar(45) DEFAULT NULL,
  "paper_type_id" varchar(45) DEFAULT NULL,
  "quantity" int DEFAULT NULL,
  "completed_qty" int DEFAULT NULL,
  "coating" varchar(45) DEFAULT NULL,
  "packing_date" text,
  "expiry_date" text,
  "description" text,
  "artwork" varchar(45) DEFAULT NULL,
  "remarks" text,
  "status" varchar(45) DEFAULT NULL,
  "wastage" varchar(45) DEFAULT NULL,
  "job_number" varchar(45) DEFAULT NULL,
  "job_ref_id" varchar(45) DEFAULT NULL,
  "old_plate_quantity" int DEFAULT NULL,
  "old_plate_status" varchar(45) DEFAULT NULL,
  "old_plate_remarks" varchar(45) DEFAULT NULL,
  "new_plate_quantity" int DEFAULT NULL,
  "new_plate_status" varchar(45) DEFAULT NULL,
  "new_plate_remarks" varchar(45) DEFAULT NULL,
  "order_received_date" datetime DEFAULT NULL,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("job_id")
)

CREATE TABLE "main_inventory" (
  "item_id" int NOT NULL AUTO_INCREMENT,
  "item_category" varchar(45) DEFAULT NULL,
  "item_sub_category" varchar(45) DEFAULT NULL,
  "item_name" varchar(45) DEFAULT NULL,
  "unit_price" varchar(45) DEFAULT NULL,
  "size" varchar(45) DEFAULT NULL,
  "quantity" decimal(15,2) DEFAULT NULL,
  "unit_of_measure" varchar(45) DEFAULT NULL,
  "reorder_level" int DEFAULT NULL,
  "status" varchar(45) DEFAULT NULL,
  "remarks" text,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  "width" varchar(45) DEFAULT NULL,
  "height" varchar(45) DEFAULT NULL,
  "rate" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("item_id")
)

CREATE TABLE "paper_coating_data" (
  "id" int NOT NULL AUTO_INCREMENT,
  "job_id" int DEFAULT NULL,
  "paper" varchar(45) DEFAULT NULL,
  "coating" varchar(45) DEFAULT NULL,
  "delivery_date" datetime DEFAULT NULL,
  PRIMARY KEY ("id")
)

CREATE TABLE "paper_types" (
  "paper_id" int NOT NULL AUTO_INCREMENT,
  "paper_type_name" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("paper_id")
)
CREATE TABLE "po_items_details" (
  "po_item_id" int NOT NULL AUTO_INCREMENT,
  "po_id" varchar(45) DEFAULT NULL,
  "item_code" varchar(45) DEFAULT NULL,
  "description" text,
  "quantity" varchar(45) DEFAULT NULL,
  "uom" varchar(45) DEFAULT NULL,
  "price" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("po_item_id")
)

CREATE TABLE "products_types" (
  "product_id" int NOT NULL AUTO_INCREMENT,
  "product_name" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("product_id")
)

CREATE TABLE "purchase_orders" (
  "po_id" int NOT NULL AUTO_INCREMENT,
  "quote_id" int DEFAULT NULL,
  "customer_id" varchar(45) DEFAULT NULL,
  "po_type_id" int DEFAULT NULL,
  "batch_ref" text,
  "po_date" datetime DEFAULT NULL,
  "delivery_date" datetime DEFAULT NULL,
  "TC_E_PR_No" varchar(45) DEFAULT NULL,
  "approved_on" datetime DEFAULT NULL,
  "approved_by" varchar(45) DEFAULT NULL,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  "status" varchar(45) DEFAULT NULL,
  "customer_po" varchar(45) DEFAULT NULL,
  "po_items" varchar(45) DEFAULT NULL,
  "sales_ref" varchar(45) DEFAULT NULL,
  "currency" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("po_id")
)


CREATE TABLE "quotations" (
  "quote_id" int NOT NULL AUTO_INCREMENT,
  "customer_id" int NOT NULL,
  "type_id" int NOT NULL,
  "delivery_days" varchar(45) DEFAULT NULL,
  "tax_type_id" int NOT NULL,
  "currency" varchar(45) DEFAULT NULL,
  "sub_total" decimal(15,2) DEFAULT NULL,
  "no_of_items" varchar(45) DEFAULT NULL,
  "total_without_tax" decimal(15,2) DEFAULT NULL,
  "net_total" decimal(15,2) DEFAULT NULL,
  "contact_person" varchar(45) DEFAULT NULL,
  "notes" text,
  "created_on" datetime DEFAULT NULL,
  "created_by" varchar(45) DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  "updated_by" varchar(45) DEFAULT NULL,
  "status" varchar(45) DEFAULT NULL,
  "marketing_person" varchar(45) DEFAULT NULL,
  "validity_period" int DEFAULT NULL,
  PRIMARY KEY ("quote_id"),
  UNIQUE KEY "quote_id_UNIQUE" ("quote_id")
)

CREATE TABLE "quote_items" (
  "item_id" int NOT NULL AUTO_INCREMENT,
  "quote_id" varchar(45) NOT NULL,
  "item_category" varchar(45) DEFAULT NULL,
  "item_description" text,
  "item_qty" decimal(15,2) DEFAULT NULL,
  "item_unit_price" decimal(15,6) DEFAULT NULL,
  "item_unit_discount" varchar(45) DEFAULT NULL,
  "item_total_price" decimal(15,2) DEFAULT NULL,
  PRIMARY KEY ("item_id")
)


CREATE TABLE "quote_types" (
  "type_id" int NOT NULL AUTO_INCREMENT,
  "type_name" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("type_id")
)
CREATE TABLE "tax_types" (
  "tax_id" int NOT NULL AUTO_INCREMENT,
  "tax_type_name" varchar(45) DEFAULT NULL,
  PRIMARY KEY ("tax_id")
)


CREATE TABLE "users" (
  "id" int NOT NULL AUTO_INCREMENT,
  "name" varchar(100) DEFAULT NULL,
  "email" varchar(100) DEFAULT NULL,
  "password" varchar(255) DEFAULT NULL,
  "user_role" varchar(45) DEFAULT NULL,
  "created_on" datetime DEFAULT NULL,
  "updated_on" datetime DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE KEY "email_UNIQUE" ("email")
)