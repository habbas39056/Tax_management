CREATE DATABASE IF NOT EXISTS cadre_erp;
USE cadre_erp;

-- Users table (5 roles: Super Admin, Sales, CSR, Operations, Accounts)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    cnic VARCHAR(20) UNIQUE,
    whatsapp_number VARCHAR(20),
    commission_rate DECIMAL(5,2) DEFAULT 0,
    portal_username VARCHAR(100) UNIQUE,
    portal_password_hash VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    service_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    status ENUM('active', 'on_hold', 'completed') DEFAULT 'active',
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

CREATE TABLE IF NOT EXISTS project_steps (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    doc_form_fields JSON,
    duration_days INT DEFAULT 0,
    charge_amount DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    service_charges_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    other_charges_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS commissions (
    id VARCHAR(36) PRIMARY KEY,
    sales_user_id VARCHAR(36) NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid') DEFAULT 'pending',
    FOREIGN KEY (sales_user_id) REFERENCES users(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Insert initial roles
INSERT INTO roles (id, name) VALUES 
(UUID(), 'Super Admin'),
(UUID(), 'Sales'),
(UUID(), 'CSR'),
(UUID(), 'Operations'),
(UUID(), 'Accounts')
ON DUPLICATE KEY UPDATE name=name;

-- Client Notes (self-managed by client)
CREATE TABLE IF NOT EXISTS client_notes (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    color VARCHAR(20) DEFAULT '#ffffff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Client Payments (payments made against invoices)
CREATE TABLE IF NOT EXISTS client_payments (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    invoice_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('bank_transfer', 'cash', 'cheque', 'online') DEFAULT 'bank_transfer',
    reference_number VARCHAR(100),
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Client Files (file storage per client)
CREATE TABLE IF NOT EXISTS client_files (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    file_path VARCHAR(500) NOT NULL,
    uploaded_by ENUM('client', 'staff') DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
