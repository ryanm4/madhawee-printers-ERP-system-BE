-- Production schedule: machines, the job stages booked on them, and machine downtime.
-- Safe to run more than once: tables are created only if missing and seed rows are skipped when present.

CREATE TABLE IF NOT EXISTS `machines` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `process` VARCHAR(150) NOT NULL,
  `shift_start` TIME NOT NULL DEFAULT '08:00:00',
  `shift_end` TIME NOT NULL DEFAULT '17:00:00',
  `notes` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `schedule_slots` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `job_id` INT NOT NULL,
  `machine_id` INT NOT NULL,
  `stage` VARCHAR(150) NOT NULL,
  `start_at` DATETIME NOT NULL,
  `end_at` DATETIME NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
  `operator` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `created_by` VARCHAR(255) NULL,
  `updated_by` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedule_slots_machine_time` (`machine_id`, `start_at`, `end_at`),
  KEY `idx_schedule_slots_job` (`job_id`)
);

CREATE TABLE IF NOT EXISTS `machine_downtime` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `machine_id` INT NOT NULL,
  `reason` VARCHAR(30) NOT NULL DEFAULT 'MAINTENANCE',
  `start_at` DATETIME NOT NULL,
  `end_at` DATETIME NOT NULL,
  `notes` TEXT NULL,
  `created_by` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_machine_downtime_machine_time` (`machine_id`, `start_at`, `end_at`)
);

-- Production processes, in the order a job moves through the floor. Editable in Settings.
INSERT IGNORE INTO `option_values` (`list_key`, `value`, `label`, `sort_order`) VALUES
  ('machine_process', 'PRE-PRESS', 'PRE-PRESS', 1),
  ('machine_process', 'PRINTING', 'PRINTING', 2),
  ('machine_process', 'COATING', 'COATING', 3),
  ('machine_process', 'CUTTING', 'CUTTING', 4),
  ('machine_process', 'DIE CUTTING', 'DIE CUTTING', 5),
  ('machine_process', 'FOLDING & GLUING', 'FOLDING & GLUING', 6),
  ('machine_process', 'PACKING', 'PACKING', 7);

-- Sample machines so the board is not empty on first use; only added when there are none yet
INSERT INTO `machines` (`name`, `process`, `sort_order`)
SELECT * FROM (
  SELECT 'CTP plate setter' AS name, 'PRE-PRESS' AS process, 1 AS sort_order UNION ALL
  SELECT 'Offset press 1', 'PRINTING', 2 UNION ALL
  SELECT 'Offset press 2', 'PRINTING', 3 UNION ALL
  SELECT 'Laminator', 'COATING', 4 UNION ALL
  SELECT 'Guillotine', 'CUTTING', 5 UNION ALL
  SELECT 'Die cutter', 'DIE CUTTING', 6 UNION ALL
  SELECT 'Folder gluer', 'FOLDING & GLUING', 7 UNION ALL
  SELECT 'Packing line', 'PACKING', 8
) seed
WHERE NOT EXISTS (SELECT 1 FROM `machines`);
