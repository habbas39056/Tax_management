SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `client_files`;
CREATE TABLE `client_files` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `file_path` varchar(500) NOT NULL,
  `uploaded_by` enum('client','staff') DEFAULT 'client',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `client_files_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `client_files` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `client_notes`;
CREATE TABLE `client_notes` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text,
  `color` varchar(20) DEFAULT '#ffffff',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `client_notes_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `client_notes` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `client_payments`;
CREATE TABLE `client_payments` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('bank_transfer','cash','cheque','online') DEFAULT 'bank_transfer',
  `reference_number` varchar(100) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `client_payments_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_payments_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `client_payments` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `clients`;
CREATE TABLE `clients` (
  `id` varchar(36) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `cnic` varchar(20) DEFAULT NULL,
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `commission_rate` decimal(5,2) DEFAULT '0.00',
  `portal_username` varchar(100) DEFAULT NULL,
  `portal_password_hash` varchar(255) DEFAULT NULL,
  `sales_user_id` char(36) DEFAULT NULL,
  `address` text,
  `profile_image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cnic` (`cnic`),
  UNIQUE KEY `portal_username` (`portal_username`)
) ENGINE=InnoDB ;
LOCK TABLES `clients` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `commissions`;
CREATE TABLE `commissions` (
  `id` varchar(36) NOT NULL,
  `sales_user_id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `base_amount` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','paid') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `sales_user_id` (`sales_user_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `commissions_ibfk_1` FOREIGN KEY (`sales_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `commissions_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
) ENGINE=InnoDB ;
LOCK TABLES `commissions` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `invoice_payments`;
CREATE TABLE `invoice_payments` (
  `id` char(36) NOT NULL,
  `invoice_id` char(36) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_mode` varchar(100) NOT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `invoice_payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `invoice_payments` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `service_charges_total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `other_charges_total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('unpaid','partial','paid') DEFAULT 'unpaid',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `items` json DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `gst_rate` decimal(10,2) DEFAULT '18.00',
  `due_date` date DEFAULT NULL,
  `sales_user_id` char(36) DEFAULT NULL,
  `bill_from_name` varchar(255) DEFAULT NULL,
  `bill_from_address` text,
  `tax_amount` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
) ENGINE=InnoDB ;
LOCK TABLES `invoices` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `knowledge_base`;
CREATE TABLE `knowledge_base` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `topic` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 ;
LOCK TABLES `knowledge_base` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `leads`;
CREATE TABLE `leads` (
  `Id` varchar(36) NOT NULL,
  `CustomerId` varchar(36) DEFAULT NULL,
  `PhoneNumber` varchar(50) DEFAULT NULL,
  `Summary` text,
  `Score` float DEFAULT NULL,
  `IsPaused` tinyint(1) DEFAULT '0',
  `LastMessageAt` datetime DEFAULT NULL,
  `Name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB ;
LOCK TABLES `leads` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `notifications` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `project_steps`;
CREATE TABLE `project_steps` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `doc_form_fields` json DEFAULT NULL,
  `duration_days` int(11) DEFAULT '0',
  `charge_amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('pending','in_progress','completed') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `project_steps_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB ;
LOCK TABLES `project_steps` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `project_steps_new`;
CREATE TABLE `project_steps_new` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `status` enum('Pending','In Progress','Completed','Rejected','On Hold','Cancelled') DEFAULT 'Pending',
  `priority` enum('Low','Medium','High','Urgent') DEFAULT 'Medium',
  `assigned_user_id` varchar(36) DEFAULT NULL,
  `follow_up_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `reminder_time` time DEFAULT NULL,
  `reminder_note` text,
  `rejection_reason` text,
  `order_index` int(11) DEFAULT '0',
  `dependency_step_id` varchar(36) DEFAULT NULL,
  `lock_until_previous` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `needs_payment` tinyint(1) DEFAULT '0',
  `needs_fields` tinyint(1) DEFAULT '0',
  `follow_up_sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `project_steps_new_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `project_steps_new` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects` (
  `id` varchar(36) NOT NULL,
  `client_id` varchar(36) NOT NULL,
  `service_id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `status` enum('active','on_hold','completed') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `invoice_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `service_id` (`service_id`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`),
  CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
) ENGINE=InnoDB ;
LOCK TABLES `projects` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB ;
LOCK TABLES `roles` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB ;
LOCK TABLES `services` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `step_activity_logs`;
CREATE TABLE `step_activity_logs` (
  `id` varchar(36) NOT NULL,
  `step_id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `step_id` (`step_id`),
  CONSTRAINT `step_activity_logs_ibfk_1` FOREIGN KEY (`step_id`) REFERENCES `project_steps_new` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `step_activity_logs` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `step_comments`;
CREATE TABLE `step_comments` (
  `id` varchar(36) NOT NULL,
  `step_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `content` text NOT NULL,
  `is_internal` tinyint(1) DEFAULT '1',
  `parent_id` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `step_id` (`step_id`),
  CONSTRAINT `step_comments_ibfk_1` FOREIGN KEY (`step_id`) REFERENCES `project_steps_new` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `step_comments` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `step_documents`;
CREATE TABLE `step_documents` (
  `id` varchar(36) NOT NULL,
  `step_id` varchar(36) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_type` varchar(100) DEFAULT NULL,
  `uploaded_by` varchar(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `step_id` (`step_id`),
  CONSTRAINT `step_documents_ibfk_1` FOREIGN KEY (`step_id`) REFERENCES `project_steps_new` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `step_documents` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `step_field_configs`;
CREATE TABLE `step_field_configs` (
  `id` varchar(36) NOT NULL,
  `step_id` varchar(36) NOT NULL,
  `label` varchar(100) NOT NULL,
  `field_type` enum('text','textarea','number','dropdown','checkbox','radio','date','file','image') NOT NULL,
  `options` text,
  `required` tinyint(1) DEFAULT '0',
  `order_index` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `step_id` (`step_id`),
  CONSTRAINT `step_field_configs_ibfk_1` FOREIGN KEY (`step_id`) REFERENCES `project_steps_new` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `step_field_configs` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `step_field_values`;
CREATE TABLE `step_field_values` (
  `id` varchar(36) NOT NULL,
  `step_id` varchar(36) NOT NULL,
  `field_config_id` varchar(36) NOT NULL,
  `field_value` text,
  PRIMARY KEY (`id`),
  KEY `step_id` (`step_id`),
  KEY `field_config_id` (`field_config_id`),
  CONSTRAINT `step_field_values_ibfk_1` FOREIGN KEY (`step_id`) REFERENCES `project_steps_new` (`id`) ON DELETE CASCADE,
  CONSTRAINT `step_field_values_ibfk_2` FOREIGN KEY (`field_config_id`) REFERENCES `step_field_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `step_field_values` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `step_invoices`;
CREATE TABLE `step_invoices` (
  `step_id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  PRIMARY KEY (`step_id`,`invoice_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `step_invoices_ibfk_1` FOREIGN KEY (`step_id`) REFERENCES `project_steps_new` (`id`) ON DELETE CASCADE,
  CONSTRAINT `step_invoices_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `step_invoices` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` varchar(36) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `commission_percentage` decimal(5,2) DEFAULT '0.00',
  `username` varchar(255) DEFAULT NULL,
  `module_access` json DEFAULT NULL,
  `address` text,
  `profile_image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB ;
LOCK TABLES `users` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `workflow_template_steps`;
CREATE TABLE `workflow_template_steps` (
  `id` varchar(36) NOT NULL,
  `template_id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `order_index` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `workflow_template_steps_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `workflow_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB ;
LOCK TABLES `workflow_template_steps` WRITE;
UNLOCK TABLES;
DROP TABLE IF EXISTS `workflow_templates`;
CREATE TABLE `workflow_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB ;
LOCK TABLES `workflow_templates` WRITE;
UNLOCK TABLES;

SET FOREIGN_KEY_CHECKS=1;
