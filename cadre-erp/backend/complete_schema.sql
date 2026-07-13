-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: cadre_erp
-- ------------------------------------------------------
-- Server version	5.7.44-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `client_files`
--

DROP TABLE IF EXISTS `client_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_files`
--

LOCK TABLES `client_files` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `client_notes`
--

DROP TABLE IF EXISTS `client_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_notes`
--

LOCK TABLES `client_notes` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `client_payments`
--

DROP TABLE IF EXISTS `client_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_payments`
--

LOCK TABLES `client_payments` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `commissions`
--

DROP TABLE IF EXISTS `commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commissions`
--

LOCK TABLES `commissions` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `invoice_payments`
--

DROP TABLE IF EXISTS `invoice_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_payments`
--

LOCK TABLES `invoice_payments` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `knowledge_base`
--

DROP TABLE IF EXISTS `knowledge_base`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `knowledge_base` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `topic` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `knowledge_base`
--

LOCK TABLES `knowledge_base` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `project_steps`
--

DROP TABLE IF EXISTS `project_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_steps`
--

LOCK TABLES `project_steps` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `project_steps_new`
--

DROP TABLE IF EXISTS `project_steps_new`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_steps_new`
--

LOCK TABLES `project_steps_new` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` varchar(36) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `services` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `step_activity_logs`
--

DROP TABLE IF EXISTS `step_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `step_activity_logs`
--

LOCK TABLES `step_activity_logs` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `step_comments`
--

DROP TABLE IF EXISTS `step_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `step_comments`
--

LOCK TABLES `step_comments` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `step_documents`
--

DROP TABLE IF EXISTS `step_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `step_documents`
--

LOCK TABLES `step_documents` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `step_field_configs`
--

DROP TABLE IF EXISTS `step_field_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `step_field_configs`
--

LOCK TABLES `step_field_configs` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `step_field_values`
--

DROP TABLE IF EXISTS `step_field_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `step_field_values`
--

LOCK TABLES `step_field_values` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `step_invoices`
--

DROP TABLE IF EXISTS `step_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `step_invoices` (
  `step_id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  PRIMARY KEY (`step_id`,`invoice_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `step_invoices_ibfk_1` FOREIGN KEY (`step_id`) REFERENCES `project_steps_new` (`id`) ON DELETE CASCADE,
  CONSTRAINT `step_invoices_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `step_invoices`
--

LOCK TABLES `step_invoices` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `workflow_template_steps`
--

DROP TABLE IF EXISTS `workflow_template_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workflow_template_steps` (
  `id` varchar(36) NOT NULL,
  `template_id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `order_index` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `workflow_template_steps_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `workflow_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflow_template_steps`
--

LOCK TABLES `workflow_template_steps` WRITE;
UNLOCK TABLES;

--
-- Table structure for table `workflow_templates`
--

DROP TABLE IF EXISTS `workflow_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workflow_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflow_templates`
--

LOCK TABLES `workflow_templates` WRITE;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-02 17:06:08
