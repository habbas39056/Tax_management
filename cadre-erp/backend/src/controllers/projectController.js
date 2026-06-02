const pool = require('../config/db');
const { sendWhatsAppMessage } = require('../services/notificationService');
const n8nWebhookService = require('../services/n8nWebhookService');

// --- Helpers ---
const logActivity = async (connection, step_id, user_id, action, details) => {
  await connection.query(
    'INSERT INTO step_activity_logs (id, step_id, user_id, action, details) VALUES (UUID(), ?, ?, ?, ?)',
    [step_id, user_id, action, details]
  );
};

// --- Services ---
const getServices = async (req, res) => {
  try {
    const [services] = await pool.query('SELECT * FROM services');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services' });
  }
};

const createService = async (req, res) => {
  try {
    const { name } = req.body;
    await pool.query('INSERT INTO services (id, name) VALUES (UUID(), ?)', [name]);
    res.status(201).json({ message: 'Service created' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating service' });
  }
};

// --- Projects ---
const getProjects = async (req, res) => {
  try {
    let query = `
      SELECT 
        p.id, p.title, p.status, p.client_id, c.full_name as client_name, s.name as service_name,
        (SELECT COUNT(*) FROM project_steps_new WHERE project_id = p.id) as total_steps,
        (SELECT COUNT(*) FROM project_steps_new WHERE project_id = p.id AND status = 'Completed') as completed_steps,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('title', title, 'status', status, 'order_index', order_index)) FROM project_steps_new WHERE project_id = p.id) as steps_breakdown
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      JOIN services s ON p.service_id = s.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
    `;
    const params = [];

    if (req.user.role === 'Client') {
      query += ` WHERE p.client_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === 'Sales') {
      query += ` WHERE c.sales_user_id = ? OR i.sales_user_id = ?`;
      params.push(req.user.id, req.user.id);
    }
    
    query += ` ORDER BY p.created_at DESC`;

    const [projects] = await pool.query(query, params);
    
    const formattedProjects = projects.map(p => {
      let stepsList = [];
      if (p.steps_breakdown) {
        try {
          stepsList = typeof p.steps_breakdown === 'string' ? JSON.parse(p.steps_breakdown) : p.steps_breakdown;
          stepsList.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        } catch (e) {
          console.error('Error parsing steps_breakdown', e);
        }
      }
      return {
        ...p,
        steps: stepsList,
        completion_percentage: p.total_steps > 0 ? Math.round((p.completed_steps / p.total_steps) * 100) : 0
      };
    });

    res.json(formattedProjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
};

const getProjectById = async (req, res) => {
  try {
    const [projects] = await pool.query(`
      SELECT p.*, c.full_name as client_name, s.name as service_name 
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      JOIN services s ON p.service_id = s.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (projects.length === 0) return res.status(404).json({ message: 'Project not found' });

    // Fetch Steps
    const [steps] = await pool.query(`
      SELECT psn.*, u.name as assigned_user_name 
      FROM project_steps_new psn
      LEFT JOIN users u ON psn.assigned_user_id = u.id
      WHERE psn.project_id = ? ORDER BY psn.order_index ASC
    `, [req.params.id]);
    
    // For each step, fetch associated data
    const stepsWithDetails = await Promise.all(steps.map(async (step) => {
      const [fields] = await pool.query(`
        SELECT fc.*, fv.field_value 
        FROM step_field_configs fc
        LEFT JOIN step_field_values fv ON fc.id = fv.field_config_id AND fv.step_id = ?
        WHERE fc.step_id = ?
        ORDER BY fc.order_index ASC
      `, [step.id, step.id]);

      const [documents] = await pool.query('SELECT * FROM step_documents WHERE step_id = ?', [step.id]);

      const [invoices] = await pool.query(`
        SELECT i.* FROM invoices i
        JOIN step_invoices si ON i.id = si.invoice_id
        WHERE si.step_id = ?
      `, [step.id]);

      const [comments] = await pool.query(`
        SELECT sc.*, u.name as user_name 
        FROM step_comments sc
        LEFT JOIN users u ON sc.user_id = u.id
        WHERE sc.step_id = ?
        ORDER BY sc.created_at ASC
      `, [step.id]);

      const [activity_logs] = await pool.query(`
        SELECT sal.*, u.name as user_name
        FROM step_activity_logs sal
        LEFT JOIN users u ON sal.user_id = u.id
        WHERE sal.step_id = ?
        ORDER BY sal.created_at DESC
      `, [step.id]);

      return { ...step, fields, documents, invoices, comments, activity_logs };
    }));

    res.json({ ...projects[0], steps: stepsWithDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching project details' });
  }
};

const createProject = async (req, res) => {
  const { client_id, service_id, title, template_id, invoice_id } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const project_id = require('crypto').randomUUID();
    await connection.query(
      'INSERT INTO projects (id, client_id, service_id, title, invoice_id) VALUES (?, ?, ?, ?, ?)',
      [project_id, client_id, service_id, title, invoice_id || null]
    );

    // If template is provided, copy steps
    if (template_id) {
      const [templateSteps] = await connection.query('SELECT * FROM workflow_template_steps WHERE template_id = ? ORDER BY order_index ASC', [template_id]);
      for (const tStep of templateSteps) {
        const step_id = require('crypto').randomUUID();
        await connection.query(
          'INSERT INTO project_steps_new (id, project_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)',
          [step_id, project_id, tStep.title, tStep.description, tStep.order_index]
        );
        // Link the project's invoice to this step automatically
        if (invoice_id) {
          await connection.query(
            'INSERT INTO step_invoices (step_id, invoice_id) VALUES (?, ?)',
            [step_id, invoice_id]
          );
        }
      }
    }

    // Trigger n8n Webhook Notification for Project Creation
    const [clientInfo] = await connection.query(`
      SELECT c.full_name, c.whatsapp_number, s.name as service_name 
      FROM clients c 
      LEFT JOIN services s ON s.id = ? 
      WHERE c.id = ?`, [service_id, client_id]);

    if (clientInfo.length > 0 && clientInfo[0].whatsapp_number) {
      n8nWebhookService.sendWebhook(clientInfo[0].whatsapp_number, 'project_created', {
        client_name: clientInfo[0].full_name,
        project_title: title,
        service_name: clientInfo[0].service_name,
        notification_message: `Hello ${clientInfo[0].full_name}, your new project "${title}" has been successfully initiated in our system.`
      });
    }

    await connection.commit();
    res.status(201).json({ id: project_id, message: 'Project created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Error creating project' });
  } finally {
    connection.release();
  }
};

// --- Step Management ---
const createStep = async (req, res) => {
  const { project_id } = req.params;
  const { title, description, priority, assigned_user_id, due_date, follow_up_date, reminder_note, rejection_reason, order_index, needs_payment, needs_fields } = req.body;
  try {
    const id = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO project_steps_new (id, project_id, title, description, priority, assigned_user_id, due_date, follow_up_date, reminder_note, rejection_reason, order_index, needs_payment, needs_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, project_id, title, description, priority || 'Medium', assigned_user_id || null, due_date || null, follow_up_date || null, reminder_note || null, rejection_reason || null, order_index || 0, needs_payment ? 1 : 0, needs_fields ? 1 : 0]
    );

    // Auto-link project invoice if it exists
    const [invProjectInfo] = await pool.query('SELECT invoice_id, title as project_title FROM projects WHERE id = ?', [project_id]);
    if (invProjectInfo.length > 0 && invProjectInfo[0].invoice_id) {
      await pool.query('INSERT IGNORE INTO step_invoices (step_id, invoice_id) VALUES (?, ?)', [id, invProjectInfo[0].invoice_id]);
    }

    // Staff notification logic removed as 'phone' column doesn't exist in 'users' table

    // Notify Client
    const [projectInfo] = await pool.query(`
      SELECT p.title as project_title, c.whatsapp_number as client_phone, c.full_name as client_name
      FROM projects p
      JOIN clients c ON p.client_id = c.id
      WHERE p.id = ?
    `, [project_id]);

    if (projectInfo.length > 0 && projectInfo[0].client_phone) {
      // Use the new n8n Webhook Service
      n8nWebhookService.sendWebhook(projectInfo[0].client_phone, 'step_added', {
        client_name: projectInfo[0].client_name,
        project_title: projectInfo[0].project_title,
        step_title: title,
        step_description: description,
        due_date: due_date || 'None',
        priority: priority || 'Medium',
        notification_message: `Hello ${projectInfo[0].client_name}, a new step: "${title}" has been added to your project "${projectInfo[0].project_title}".`
      });
      
      // Also keep the old notification service if it does in-app notifications
      try {
        await sendWhatsAppMessage(projectInfo[0].client_phone, 'new_project_step', [
          projectInfo[0].client_name,
          title,
          projectInfo[0].project_title
        ]);
      } catch(e) { console.error('Old notification service failed:', e); }
    }

    res.status(201).json({ id, message: 'Step created' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating step' });
  }
};

const updateStep = async (req, res) => {
  const { step_id } = req.params;
  const updates = { ...req.body };
  
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  // Convert empty strings to null for dates and foreign keys
  for (const key in updates) {
    if (updates[key] === '' && (key.endsWith('_date') || key.endsWith('_id'))) {
      updates[key] = null;
    }
  }

  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);

  try {
    await pool.query(`UPDATE project_steps_new SET ${fields} WHERE id = ?`, [...values, step_id]);
    
    // Log Activity
    await logActivity(pool, step_id, req.user.id, 'Updated Step', `Updated fields: ${Object.keys(updates).join(', ')}`);

    // Notify on status change
    if (updates.status) {
      const [stepInfo] = await pool.query(`
        SELECT s.title, p.title as project_title, c.whatsapp_number as client_phone, c.full_name as client_name,
               u.name as staff_name
        FROM project_steps_new s
        JOIN projects p ON s.project_id = p.id
        JOIN clients c ON p.client_id = c.id
        LEFT JOIN users u ON s.assigned_user_id = u.id
        WHERE s.id = ?
      `, [step_id]);

      if (stepInfo.length > 0) {
        // Notify Client
        if (stepInfo[0].client_phone) {
          await sendWhatsAppMessage(stepInfo[0].client_phone, 'project_step_update', [
            stepInfo[0].client_name,
            stepInfo[0].title,
            updates.status,
            stepInfo[0].project_title
          ]);
        }
        
        // Staff notification logic removed
      }
    }

    res.json({ message: 'Step updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating step' });
  }
};

const deleteStep = async (req, res) => {
  try {
    await pool.query('DELETE FROM project_steps_new WHERE id = ?', [req.params.step_id]);
    res.json({ message: 'Step deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting step' });
  }
};

// --- Field Config & Values ---
const addFieldConfig = async (req, res) => {
  const { step_id } = req.params;
  const { label, field_type, options, required, order_index } = req.body;
  try {
    await pool.query(
      'INSERT INTO step_field_configs (id, step_id, label, field_type, options, required, order_index) VALUES (UUID(), ?, ?, ?, ?, ?, ?)',
      [step_id, label, field_type, JSON.stringify(options), required, order_index || 0]
    );
    res.status(201).json({ message: 'Field config added' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding field config' });
  }
};

const syncFieldConfigs = async (req, res) => {
  const { step_id } = req.params;
  const { fields } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Delete existing configs
    await connection.query('DELETE FROM step_field_configs WHERE step_id = ?', [step_id]);
    
    for (const [idx, f] of fields.entries()) {
      await connection.query(
        'INSERT INTO step_field_configs (id, step_id, label, field_type, options, required, order_index) VALUES (UUID(), ?, ?, ?, ?, ?, ?)',
        [step_id, f.label, f.field_type, f.options ? (typeof f.options === 'string' ? f.options : JSON.stringify(f.options)) : '[]', f.required ? 1 : 0, idx]
      );
    }
    
    await connection.commit();
    res.json({ message: 'Fields synced' });
  } catch (error) {
    console.error(error);
    await connection.rollback();
    res.status(500).json({ message: 'Error syncing fields' });
  } finally {
    connection.release();
  }
};

const saveFieldValues = async (req, res) => {
  const { step_id } = req.params;
  const { values } = req.body; // Array of { field_config_id, field_value }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let parsedValues = values;
    if (typeof values === 'object' && !Array.isArray(values)) {
      parsedValues = Object.entries(values).map(([field_config_id, field_value]) => ({
        field_config_id,
        field_value
      }));
    }
    
    if (!Array.isArray(parsedValues)) {
      throw new Error('Values must be an array or an object');
    }
    
    for (const val of parsedValues) {
      const [existing] = await connection.query(
        'SELECT id FROM step_field_values WHERE step_id = ? AND field_config_id = ?',
        [step_id, val.field_config_id]
      );

      if (existing.length > 0) {
        await connection.query(
          'UPDATE step_field_values SET field_value = ? WHERE id = ?',
          [val.field_value, existing[0].id]
        );
      } else {
        await connection.query(
          'INSERT INTO step_field_values (id, step_id, field_config_id, field_value) VALUES (UUID(), ?, ?, ?)',
          [step_id, val.field_config_id, val.field_value]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'Values saved' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error saving values' });
  } finally {
    connection.release();
  }
};

// --- Documents ---
const uploadDocument = async (req, res) => {
  const { step_id } = req.params;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    await pool.query(
      'INSERT INTO step_documents (id, step_id, file_name, original_name, file_path, file_type, uploaded_by) VALUES (UUID(), ?, ?, ?, ?, ?, ?)',
      [step_id, req.file.filename, req.file.originalname, req.file.path, req.file.mimetype, req.user.id]
    );
    res.status(201).json({ message: 'Document uploaded' });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document' });
  }
};

// --- Invoices ---
const linkInvoice = async (req, res) => {
  const { step_id } = req.params;
  const { invoice_id } = req.body;
  try {
    await pool.query('INSERT INTO step_invoices (step_id, invoice_id) VALUES (?, ?)', [step_id, invoice_id]);
    res.status(201).json({ message: 'Invoice linked' });
  } catch (error) {
    res.status(500).json({ message: 'Error linking invoice' });
  }
};

// --- Templates ---
const getTemplates = async (req, res) => {
  try {
    const [templates] = await pool.query(`
      SELECT t.*, (SELECT COUNT(*) FROM workflow_template_steps WHERE template_id = t.id) as step_count
      FROM workflow_templates t
      ORDER BY t.name ASC
    `);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates' });
  }
};

const createTemplate = async (req, res) => {
  console.log('CREATE TEMPLATE PAYLOAD:', req.body);
  const { name, description, steps } = req.body;
  if (!name || !Array.isArray(steps)) {
    return res.status(400).json({ message: 'Name and steps (array) are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const template_id = require('crypto').randomUUID();
    await connection.query('INSERT INTO workflow_templates (id, name, description) VALUES (?, ?, ?)', [template_id, name, description || null]);

    for (const step of steps) {
      await connection.query(
        'INSERT INTO workflow_template_steps (id, template_id, title, description, order_index) VALUES (UUID(), ?, ?, ?, ?)',
        [template_id, step.title, step.description, step.order_index]
      );
    }

    await connection.commit();
    res.status(201).json({ id: template_id, message: 'Template created' });
  } catch (error) {
    console.error('Create Template Error:', error);
    await connection.rollback();
    res.status(500).json({ message: 'Error creating template', error: error.message });
  } finally {
    connection.release();
  }
};

const addComment = async (req, res) => {
  const { step_id } = req.params;
  const { content, is_internal } = req.body;
  try {
    await pool.query(
      'INSERT INTO step_comments (id, step_id, user_id, content, is_internal) VALUES (UUID(), ?, ?, ?, ?)',
      [step_id, req.user.id, content, is_internal ? 1 : 0]
    );
    res.status(201).json({ message: 'Comment added' });
  } catch (error) {
    console.error('Add Comment Error:', error);
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    await pool.query('DELETE FROM workflow_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting template' });
  }
};

module.exports = {
  getServices, createService,
  getProjects, getProjectById, createProject,
  createStep, updateStep, deleteStep,
  addFieldConfig, syncFieldConfigs, saveFieldValues,
  uploadDocument, linkInvoice, addComment,
  getTemplates, createTemplate, deleteTemplate
};
