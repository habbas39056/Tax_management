const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// ─── HELPER ─────────────────────────────────────────────────────────────────
const clientId = (req) => req.user.id; // JWT payload has client id

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════════════════
const getClientInvoices = async (req, res) => {
  try {
    const [invoices] = await pool.query(
      `SELECT i.id, i.total_amount, i.service_charges_total, i.other_charges_total,
              i.status, i.created_at, i.due_date,
              (
                SELECT COALESCE(SUM(amount), 0) FROM client_payments WHERE invoice_id = i.id
              ) + (
                SELECT COALESCE(SUM(amount), 0) FROM invoice_payments WHERE invoice_id = i.id
              ) AS amount_paid
       FROM invoices i
       WHERE i.client_id = ?
       ORDER BY i.created_at DESC`,
      [clientId(req)]
    );
    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching invoices' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════
const getClientPayments = async (req, res) => {
  try {
    const [payments] = await pool.query(
      `SELECT p.id, p.invoice_id, p.amount, p.payment_date, p.payment_method, p.reference_number, p.notes
       FROM client_payments p
       WHERE p.client_id = ?
       UNION ALL
       SELECT ip.id, ip.invoice_id, ip.amount, ip.payment_date, ip.payment_mode as payment_method, ip.transaction_id as reference_number, ip.notes
       FROM invoice_payments ip
       JOIN invoices i ON ip.invoice_id = i.id
       WHERE i.client_id = ?
       ORDER BY payment_date DESC`,
      [clientId(req), clientId(req)]
    );
    res.json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
};

const createClientPayment = async (req, res) => {
  const { invoice_id, amount, payment_method, reference_number, payment_date, notes } = req.body;
  const cid = clientId(req);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify invoice belongs to this client
    const [inv] = await connection.query(
      'SELECT id, total_amount, status FROM invoices WHERE id = ? AND client_id = ?',
      [invoice_id, cid]
    );
    if (inv.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Insert payment
    await connection.query(
      `INSERT INTO client_payments (id, client_id, invoice_id, amount, payment_method, reference_number, payment_date, notes)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [cid, invoice_id, amount, payment_method || 'bank_transfer', reference_number || null, payment_date, notes || null]
    );

    // Recalculate invoice status (summing both client_payments and invoice_payments)
    const [[{ clientPaid }]] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) as clientPaid FROM client_payments WHERE invoice_id = ?',
      [invoice_id]
    );
    const [[{ invoicePaid }]] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) as invoicePaid FROM invoice_payments WHERE invoice_id = ?',
      [invoice_id]
    );
    
    const totalPaid = parseFloat(clientPaid) + parseFloat(invoicePaid);
    const invoiceTotal = parseFloat(inv[0].total_amount);
    
    let newStatus = 'unpaid';
    if (totalPaid >= invoiceTotal) newStatus = 'paid';
    else if (totalPaid > 0) newStatus = 'partial';

    await connection.query('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, invoice_id]);

    await connection.commit();
    res.status(201).json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Error recording payment' });
  } finally {
    connection.release();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════════════════
const getClientNotes = async (req, res) => {
  try {
    const [notes] = await pool.query(
      'SELECT * FROM client_notes WHERE client_id = ? ORDER BY updated_at DESC',
      [clientId(req)]
    );
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notes' });
  }
};

const createClientNote = async (req, res) => {
  const { title, content, color } = req.body;
  try {
    await pool.query(
      'INSERT INTO client_notes (id, client_id, title, content, color) VALUES (UUID(), ?, ?, ?, ?)',
      [clientId(req), title, content || '', color || '#ffffff']
    );
    res.status(201).json({ message: 'Note created' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating note' });
  }
};

const updateClientNote = async (req, res) => {
  const { id } = req.params;
  const { title, content, color } = req.body;
  try {
    await pool.query(
      'UPDATE client_notes SET title = ?, content = ?, color = ? WHERE id = ? AND client_id = ?',
      [title, content || '', color || '#ffffff', id, clientId(req)]
    );
    res.json({ message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating note' });
  }
};

const deleteClientNote = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM client_notes WHERE id = ? AND client_id = ?', [id, clientId(req)]);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting note' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS (client view)
// ═══════════════════════════════════════════════════════════════════════════
const getClientProjects = async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.id, p.title, p.status, s.name as service_name,
              (SELECT COUNT(*) FROM project_steps_new WHERE project_id = p.id) as total_steps,
              (SELECT COUNT(*) FROM project_steps_new WHERE project_id = p.id AND status = 'Completed') as completed_steps
       FROM projects p
       JOIN services s ON p.service_id = s.id
       WHERE p.client_id = ?
       ORDER BY p.created_at DESC`,
      [clientId(req)]
    );
    
    const formatted = projects.map(p => ({
      ...p,
      completion_percentage: p.total_steps > 0 ? Math.round((p.completed_steps / p.total_steps) * 100) : 0
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
};

const getClientProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const [projects] = await pool.query(
      `SELECT p.*, s.name as service_name
       FROM projects p
       JOIN services s ON p.service_id = s.id
       WHERE p.id = ? AND p.client_id = ?`,
      [id, clientId(req)]
    );
    if (projects.length === 0) return res.status(404).json({ message: 'Project not found' });

    const [steps] = await pool.query(
      `SELECT psn.*, u.name as assigned_user_name 
       FROM project_steps_new psn
       LEFT JOIN users u ON psn.assigned_user_id = u.id
       WHERE psn.project_id = ? ORDER BY psn.order_index ASC`,
      [id]
    );

    const stepsWithDetails = await Promise.all(steps.map(async (step) => {
      const [fields] = await pool.query(`
        SELECT fc.id as config_id, fc.label, fc.field_type, fc.options, fv.field_value 
        FROM step_field_configs fc
        LEFT JOIN step_field_values fv ON fc.id = fv.field_config_id AND fv.step_id = ?
        WHERE fc.step_id = ?
        ORDER BY fc.order_index ASC
      `, [step.id, step.id]);

      const [documents] = await pool.query('SELECT original_name, file_name, file_type FROM step_documents WHERE step_id = ?', [step.id]);

      const [comments] = await pool.query(`
        SELECT sc.content, sc.created_at, u.name as user_name 
        FROM step_comments sc
        LEFT JOIN users u ON sc.user_id = u.id
        WHERE sc.step_id = ? AND sc.is_internal = 0
        ORDER BY sc.created_at ASC
      `, [step.id]);

      const [activity_logs] = await pool.query(`
        SELECT sal.*, u.name as user_name
        FROM step_activity_logs sal
        LEFT JOIN users u ON sal.user_id = u.id
        WHERE sal.step_id = ?
        ORDER BY sal.created_at DESC
      `, [step.id]);

      return { ...step, fields, documents, comments, activity_logs };
    }));

    res.json({ ...projects[0], steps: stepsWithDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching project detail' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// FILES
// ═══════════════════════════════════════════════════════════════════════════
const getClientFiles = async (req, res) => {
  try {
    const [files] = await pool.query(
      `SELECT id, file_name, original_name, file_type, file_size, file_path, uploaded_by, created_at, 'general' as source
       FROM client_files
       WHERE client_id = ?
       
       UNION ALL
       
       SELECT sd.id, sd.file_name, sd.original_name, sd.file_type, 0 as file_size, sd.file_path, 'admin' as uploaded_by, sd.created_at, 'project' as source
       FROM step_documents sd
       JOIN project_steps_new ps ON sd.step_id = ps.id
       JOIN projects p ON ps.project_id = p.id
       WHERE p.client_id = ?
       
       ORDER BY created_at DESC`,
      [clientId(req), clientId(req)]
    );
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching files' });
  }
};

const uploadClientFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const cid = clientId(req);
  try {
    await pool.query(
      `INSERT INTO client_files (id, client_id, file_name, original_name, file_type, file_size, file_path, uploaded_by)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'client')`,
      [
        cid,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.file.path
      ]
    );
    res.status(201).json({ message: 'File uploaded successfully', file: req.file });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving file record' });
  }
};

const deleteClientFile = async (req, res) => {
  const { id } = req.params;
  const cid = clientId(req);
  try {
    const [files] = await pool.query(
      'SELECT * FROM client_files WHERE id = ? AND client_id = ?',
      [id, cid]
    );
    if (files.length === 0) return res.status(404).json({ message: 'File not found or cannot be deleted from here' });

    // Delete from disk
    const filePath = files[0].file_path;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM client_files WHERE id = ?', [id]);
    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting file' });
  }
};

const downloadClientFile = async (req, res) => {
  const { id } = req.params;
  const cid = clientId(req);
  try {
    let [files] = await pool.query(
      'SELECT * FROM client_files WHERE id = ? AND client_id = ?',
      [id, cid]
    );
    
    if (files.length === 0) {
      [files] = await pool.query(`
        SELECT sd.* FROM step_documents sd
        JOIN project_steps_new ps ON sd.step_id = ps.id
        JOIN projects p ON ps.project_id = p.id
        WHERE sd.id = ? AND p.client_id = ?
      `, [id, cid]);
    }

    if (files.length === 0) return res.status(404).json({ message: 'File not found' });
    res.download(files[0].file_path, files[0].original_name);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error downloading file' });
  }
};

const submitStepFields = async (req, res) => {
  const { stepId } = req.params;
  const { values } = req.body; // { fieldConfigId: value }
  const cid = clientId(req);

  // Validate: reject empty submissions
  if (!values || typeof values !== 'object' || Object.keys(values).length === 0) {
    return res.status(400).json({ message: 'No field values provided. Please fill in the required details.' });
  }

  // Check for empty values
  const emptyKeys = Object.entries(values).filter(([, v]) => v === '' || v === null || v === undefined);
  if (emptyKeys.length > 0) {
    return res.status(400).json({ message: 'All fields must be filled in before submitting.' });
  }

  try {
    // Verify step belongs to this client's project
    const [stepCheck] = await pool.query(
      `SELECT ps.id FROM project_steps_new ps
       JOIN projects p ON ps.project_id = p.id
       WHERE ps.id = ? AND p.client_id = ?`,
      [stepId, cid]
    );

    if (stepCheck.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const [configId, value] of Object.entries(values)) {
        // Delete any existing value first to prevent duplication
        await connection.query(
          'DELETE FROM step_field_values WHERE step_id = ? AND field_config_id = ?',
          [stepId, configId]
        );
        // Insert the new value
        await connection.query(
          `INSERT INTO step_field_values (id, step_id, field_config_id, field_value)
           VALUES (UUID(), ?, ?, ?)`,
          [stepId, configId, value]
        );
      }

      await connection.query(
        `INSERT INTO step_activity_logs (id, step_id, user_id, action, details)
         VALUES (UUID(), ?, ?, ?, ?)`,
        [stepId, null, 'Client submitted requested information', 'Client updated form fields']
      );

      await connection.commit();
      res.json({ message: 'Information submitted successfully' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error submitting information' });
  }
};

const uploadStepDocument = async (req, res) => {
  const { stepId } = req.params;
  const cid = clientId(req);
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    // Verify step belongs to this client's project
    const [stepCheck] = await pool.query(
      `SELECT ps.id FROM project_steps_new ps
       JOIN projects p ON ps.project_id = p.id
       WHERE ps.id = ? AND p.client_id = ?`,
      [stepId, cid]
    );

    if (stepCheck.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    await pool.query(
      `INSERT INTO step_documents (id, step_id, original_name, file_name, file_path, file_type)
       VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [stepId, req.file.originalname, req.file.filename, req.file.path, req.file.mimetype]
    );

    await pool.query(
      `INSERT INTO step_activity_logs (id, step_id, user_id, action, details)
       VALUES (UUID(), ?, ?, ?, ?)`,
      [stepId, null, 'Client uploaded document', `Uploaded: ${req.file.originalname}`]
    );

    res.status(201).json({ message: 'Document uploaded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error uploading document' });
  }
};

const uploadFieldFile = async (req, res) => {
  const { stepId } = req.params;
  const { field_id } = req.body;
  const cid = clientId(req);
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    // Verify step belongs to client
    const [stepCheck] = await pool.query(
      `SELECT ps.id FROM project_steps_new ps
       JOIN projects p ON ps.project_id = p.id
       WHERE ps.id = ? AND p.client_id = ?`,
      [stepId, cid]
    );

    if (stepCheck.length === 0) return res.status(403).json({ message: 'Unauthorized' });

    // Update field value with filename
    await pool.query(
      `INSERT INTO step_field_values (id, step_id, field_config_id, field_value)
       VALUES (UUID(), ?, ?, ?)
       ON DUPLICATE KEY UPDATE field_value = ?`,
      [stepId, field_id, req.file.filename, req.file.filename]
    );

    // Also add to documents table so it shows up in files tab
    await pool.query(
      `INSERT INTO step_documents (id, step_id, original_name, file_name, file_path, file_type)
       VALUES (UUID(), ?, ?, ?, ?, ?)`,
      [stepId, req.file.originalname, req.file.filename, req.file.path, req.file.mimetype]
    );

    await pool.query(
      `INSERT INTO step_activity_logs (id, step_id, user_id, action, details)
       VALUES (UUID(), ?, ?, ?, ?)`,
      [stepId, null, 'Client uploaded requested file', `Field ID: ${field_id}, File: ${req.file.originalname}`]
    );

    res.json({ message: 'File uploaded successfully', filename: req.file.filename });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error uploading field file' });
  }
};

const bcrypt = require('bcryptjs');

const updateProfile = async (req, res) => {
  const { full_name, cnic, whatsapp_number, portal_username, portal_password, address } = req.body;
  const cid = clientId(req);
  const profile_image = req.file ? req.file.filename : undefined;

  try {
    const fields = ['full_name = ?', 'cnic = ?', 'whatsapp_number = ?', 'portal_username = ?', 'address = ?'];
    const values = [full_name, cnic || null, whatsapp_number || null, portal_username || null, address || null];

    if (profile_image) {
      fields.push('profile_image = ?');
      values.push(profile_image);
    }

    if (portal_password && portal_password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(portal_password, salt);
      fields.push('portal_password_hash = ?');
      values.push(password_hash);
    }

    values.push(cid);
    
    await pool.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Profile updated successfully', profile_image });
  } catch (error) {
    console.error('Error updating client profile:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'CNIC or Username already exists' });
    }
    res.status(500).json({ message: 'Error updating profile' });
  }
};

const getProfile = async (req, res) => {
  try {
    const [clients] = await pool.query(
      'SELECT id, full_name, cnic, whatsapp_number, portal_username, address, profile_image FROM clients WHERE id = ?',
      [clientId(req)]
    );
    if (clients.length === 0) return res.status(404).json({ message: 'Profile not found' });
    res.json(clients[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

module.exports = {
  getClientInvoices,
  getClientPayments, createClientPayment,
  getClientNotes, createClientNote, updateClientNote, deleteClientNote,
  getClientProjects, getClientProjectById, submitStepFields, uploadStepDocument, uploadFieldFile,
  getClientFiles, uploadClientFile, deleteClientFile, downloadClientFile, updateProfile, getProfile
};
