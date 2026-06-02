const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper to generate a random password
const generatePassword = () => {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!";
};

const getClients = async (req, res) => {
  try {
    let query = 'SELECT id, full_name, cnic, whatsapp_number, commission_rate, portal_username, sales_user_id FROM clients ';
    const params = [];

    // Sales agents only see their own clients
    if (req.user.role === 'Sales') {
      query += ' WHERE sales_user_id = ? OR id IN (SELECT client_id FROM invoices WHERE sales_user_id = ?) ';
      params.push(req.user.id, req.user.id);
    }

    query += ' ORDER BY full_name ASC';

    const [clients] = await pool.query(query, params);
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients' });
  }
};

const createClient = async (req, res) => {
  const { full_name, cnic, whatsapp_number, commission_rate, portal_username, portal_password, sales_user_id } = req.body;

  try {
    if (!portal_username || !portal_password) {
      return res.status(400).json({ message: 'Portal username and password are required' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const portal_password_hash = await bcrypt.hash(portal_password, salt);

    // Auto-assign to current user if they are Sales
    const assigned_sales_id = req.user.role === 'Sales' ? req.user.id : sales_user_id;

    await pool.query(
      `INSERT INTO clients (id, full_name, cnic, whatsapp_number, commission_rate, portal_username, portal_password_hash, sales_user_id) 
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, cnic, whatsapp_number, commission_rate || 0, portal_username, portal_password_hash, assigned_sales_id || null]
    );

    res.status(201).json({
      message: 'Client created successfully',
      credentials: {
        username: portal_username,
        password: portal_password
      }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'A client with this CNIC or Username already exists' });
    }
    res.status(500).json({ message: 'Error creating client' });
  }
};

const getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    let query = 'SELECT id, full_name, cnic, whatsapp_number, commission_rate, portal_username, sales_user_id FROM clients WHERE id = ?';
    const params = [id];

    if (req.user.role === 'Sales') {
      query += ' AND (sales_user_id = ? OR id IN (SELECT client_id FROM invoices WHERE sales_user_id = ?))';
      params.push(req.user.id, req.user.id);
    }

    const [clients] = await pool.query(query, params);
    
    if (clients.length === 0) {
      return res.status(404).json({ message: 'Client not found or unauthorized' });
    }

    res.json(clients[0]);
  } catch (error) {
    console.error('Error fetching client by id:', error);
    res.status(500).json({ message: 'Error fetching client details' });
  }
};

const updateClient = async (req, res) => {
  const { id } = req.params;
  const { full_name, cnic, whatsapp_number, commission_rate, portal_username, portal_password, sales_user_id } = req.body;

  try {
    if (req.user.role === 'Sales') {
      const [check] = await pool.query('SELECT id FROM clients WHERE id = ? AND sales_user_id = ?', [id, req.user.id]);
      if (check.length === 0) return res.status(403).json({ message: 'Unauthorized' });
    }

    const assigned_sales_id = req.user.role === 'Sales' ? req.user.id : sales_user_id;

    if (portal_password && portal_password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const portal_password_hash = await bcrypt.hash(portal_password, salt);
      await pool.query(
        'UPDATE clients SET full_name = ?, cnic = ?, whatsapp_number = ?, commission_rate = ?, portal_username = ?, portal_password_hash = ?, sales_user_id = ? WHERE id = ?',
        [full_name, cnic, whatsapp_number, commission_rate || 0, portal_username, portal_password_hash, assigned_sales_id || null, id]
      );
    } else {
      await pool.query(
        'UPDATE clients SET full_name = ?, cnic = ?, whatsapp_number = ?, commission_rate = ?, portal_username = ?, sales_user_id = ? WHERE id = ?',
        [full_name, cnic, whatsapp_number, commission_rate || 0, portal_username, assigned_sales_id || null, id]
      );
    }

    res.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Error updating client:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'A client with this CNIC or Username already exists' });
    }
    res.status(500).json({ message: 'Error updating client' });
  }
};

const getClientNotes = async (req, res) => {
  const { id } = req.params;
  try {
    const [notes] = await pool.query('SELECT * FROM client_notes WHERE client_id = ? ORDER BY created_at DESC', [id]);
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Error fetching notes' });
  }
};

const createClientNote = async (req, res) => {
  const { id } = req.params;
  const { note_content } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO client_notes (id, client_id, title, content) VALUES (UUID(), ?, ?, ?)', [id, 'Note', note_content]);
    res.status(201).json({ id: result.insertId, client_id: id, content: note_content, created_at: new Date() });
  } catch (error) {
    res.status(500).json({ message: 'Error creating note' });
  }
};

const updateClientNote = async (req, res) => {
  const { id, noteId } = req.params;
  const { note_content } = req.body;
  try {
    await pool.query('UPDATE client_notes SET content = ? WHERE id = ? AND client_id = ?', [note_content, noteId, id]);
    res.json({ message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating note' });
  }
};

const deleteClientNote = async (req, res) => {
  const { id, noteId } = req.params;
  try {
    await pool.query('DELETE FROM client_notes WHERE id = ? AND client_id = ?', [noteId, id]);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting note' });
  }
};

const getClientPayments = async (req, res) => {
  const { id } = req.params;
  try {
    const [payments] = await pool.query(`
      SELECT 
        p.id, p.amount, p.payment_date, p.payment_method as payment_method, 
        p.reference_number, i.id as invoice_id
      FROM client_payments p 
      JOIN invoices i ON p.invoice_id = i.id 
      WHERE p.client_id = ? 
      
      UNION ALL
      
      SELECT 
        ip.id, ip.amount, ip.payment_date, ip.payment_mode as payment_method, 
        ip.transaction_id as reference_number, i.id as invoice_id
      FROM invoice_payments ip
      JOIN invoices i ON ip.invoice_id = i.id
      WHERE i.client_id = ?
      
      ORDER BY payment_date DESC
    `, [id, id]);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching client payments:', error);
    res.status(500).json({ message: 'Error fetching payments' });
  }
};

module.exports = { getClients, createClient, getClientById, updateClient, getClientNotes, createClientNote, updateClientNote, deleteClientNote, getClientPayments };
