const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Bestfather@51',
    database: process.env.DB_NAME || 'cadre_erp'
  });

  try {
    console.log('Starting Advanced Project Workflow Migration...');

    // 1. Update project_steps table (making it more comprehensive)
    // First, let's backup/drop if necessary or just alter. 
    // Since we are moving to a fully dynamic system, let's ensure the table structure matches requirements.
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_steps_new (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status ENUM('Pending', 'In Progress', 'Completed', 'Rejected', 'On Hold', 'Cancelled') DEFAULT 'Pending',
        priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
        assigned_user_id VARCHAR(36),
        follow_up_date DATE,
        due_date DATE,
        reminder_time TIME,
        reminder_note TEXT,
        rejection_reason TEXT,
        order_index INT DEFAULT 0,
        dependency_step_id VARCHAR(36),
        lock_until_previous BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 2. Dynamic Form Fields Config
    await connection.query(`
      CREATE TABLE IF NOT EXISTS step_field_configs (
        id VARCHAR(36) PRIMARY KEY,
        step_id VARCHAR(36) NOT NULL,
        label VARCHAR(100) NOT NULL,
        field_type ENUM('text', 'textarea', 'number', 'dropdown', 'checkbox', 'radio', 'date', 'file', 'image') NOT NULL,
        options TEXT, -- JSON string for dropdown/radio options
        required BOOLEAN DEFAULT FALSE,
        order_index INT DEFAULT 0,
        FOREIGN KEY (step_id) REFERENCES project_steps_new(id) ON DELETE CASCADE
      )
    `);

    // 3. Dynamic Form Data
    await connection.query(`
      CREATE TABLE IF NOT EXISTS step_field_values (
        id VARCHAR(36) PRIMARY KEY,
        step_id VARCHAR(36) NOT NULL,
        field_config_id VARCHAR(36) NOT NULL,
        field_value TEXT,
        FOREIGN KEY (step_id) REFERENCES project_steps_new(id) ON DELETE CASCADE,
        FOREIGN KEY (field_config_id) REFERENCES step_field_configs(id) ON DELETE CASCADE
      )
    `);

    // 4. Step Documents
    await connection.query(`
      CREATE TABLE IF NOT EXISTS step_documents (
        id VARCHAR(36) PRIMARY KEY,
        step_id VARCHAR(36) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(100),
        uploaded_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (step_id) REFERENCES project_steps_new(id) ON DELETE CASCADE
      )
    `);

    // 5. Step Invoices (Linking)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS step_invoices (
        step_id VARCHAR(36) NOT NULL,
        invoice_id VARCHAR(36) NOT NULL,
        PRIMARY KEY (step_id, invoice_id),
        FOREIGN KEY (step_id) REFERENCES project_steps_new(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

    // 6. Step Comments
    await connection.query(`
      CREATE TABLE IF NOT EXISTS step_comments (
        id VARCHAR(36) PRIMARY KEY,
        step_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT TRUE,
        parent_id VARCHAR(36), -- For threads
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (step_id) REFERENCES project_steps_new(id) ON DELETE CASCADE
      )
    `);

    // 7. Step Activity Logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS step_activity_logs (
        id VARCHAR(36) PRIMARY KEY,
        step_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (step_id) REFERENCES project_steps_new(id) ON DELETE CASCADE
      )
    `);

    // 8. Workflow Templates
    await connection.query(`
      CREATE TABLE IF NOT EXISTS workflow_templates (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS workflow_template_steps (
        id VARCHAR(36) PRIMARY KEY,
        template_id VARCHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        order_index INT DEFAULT 0,
        FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE
      )
    `);

    console.log('Migration successful! All advanced workflow tables created.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
