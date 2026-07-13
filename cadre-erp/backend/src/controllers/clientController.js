const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

// Helper to generate a random password
const generatePassword = () => {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + "!";
};

const getClients = async (req, res) => {
  try {
    let query = 'SELECT id, full_name, cnic, whatsapp_number, email, pin, commission_rate, portal_username, portal_password_plain, sales_user_id, customer_type FROM clients ';
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
  const { full_name, cnic, whatsapp_number, email, pin, commission_rate, portal_username, portal_password, sales_user_id, customer_type } = req.body;

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
      `INSERT INTO clients (id, full_name, cnic, whatsapp_number, email, pin, commission_rate, portal_username, portal_password_hash, portal_password_plain, sales_user_id, customer_type) 
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, cnic, whatsapp_number, email || null, pin || null, commission_rate || 0, portal_username, portal_password_hash, portal_password, assigned_sales_id || null, customer_type || null]
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
    let query = 'SELECT id, full_name, cnic, whatsapp_number, email, pin, commission_rate, portal_username, portal_password_plain, sales_user_id, customer_type FROM clients WHERE id = ?';
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
  const { full_name, cnic, whatsapp_number, email, pin, commission_rate, portal_username, portal_password, sales_user_id, customer_type } = req.body;

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
        'UPDATE clients SET full_name = ?, cnic = ?, whatsapp_number = ?, email = ?, pin = ?, commission_rate = ?, portal_username = ?, portal_password_hash = ?, portal_password_plain = ?, sales_user_id = ?, customer_type = ? WHERE id = ?',
        [full_name, cnic, whatsapp_number, email || null, pin || null, commission_rate || 0, portal_username, portal_password_hash, portal_password, assigned_sales_id || null, customer_type || null, id]
      );
    } else {
      await pool.query(
        'UPDATE clients SET full_name = ?, cnic = ?, whatsapp_number = ?, email = ?, pin = ?, commission_rate = ?, portal_username = ?, sales_user_id = ?, customer_type = ? WHERE id = ?',
        [full_name, cnic, whatsapp_number, email || null, pin || null, commission_rate || 0, portal_username, assigned_sales_id || null, customer_type || null, id]
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

const generateUsername = (fullName) => {
  const base = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${base}${random}`;
};

const importClients = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fs = require('fs');
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Uploaded sheet is empty' });
    }

    let successCount = 0;
    let skipCount = 0;
    const errors = [];

    // Auto-assign to current user if they are Sales
    const assigned_sales_id = req.user.role === 'Sales' ? req.user.id : null;

    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      
      // Find keys case-insensitively
      const getVal = (possibleKeys) => {
        const key = Object.keys(row).find(k => possibleKeys.includes(k.toLowerCase().trim().replace(/[\s_-]+/g, '')));
        return key ? String(row[key]).trim() : '';
      };

      const full_name = getVal(['fullname', 'name', 'clientname']);
      const cnic = getVal(['cnic', 'cnicnumber', 'cnicno']);
      const whatsapp_number = getVal(['whatsapp', 'whatsappnumber', 'whatsappno', 'phone', 'contact']);
      const email = getVal(['email', 'emailaddress', 'mail']);
      const customer_type = getVal(['customertype', 'type', 'clienttype']);
      let portal_username = getVal(['portalusername', 'username', 'portaluser']);
      let portal_password = getVal(['portalpassword', 'password', 'portalpass']);
      const pin = getVal(['portalpin', 'pin', 'pincode']);

      if (!full_name) {
        errors.push(`Row ${index + 2}: Full Name is missing.`);
        skipCount++;
        continue;
      }

      // If portal username/password are empty, generate them
      if (!portal_username) {
        portal_username = generateUsername(full_name);
      }
      if (!portal_password) {
        portal_password = generatePassword();
      }

      // Check if CNIC already exists in DB
      if (cnic) {
        const [existingCnic] = await pool.query('SELECT id FROM clients WHERE cnic = ?', [cnic]);
        if (existingCnic.length > 0) {
          errors.push(`Row ${index + 2} (${full_name}): CNIC ${cnic} already exists in database.`);
          skipCount++;
          continue;
        }
      }

      // Check if username already exists in DB
      const [existingUser] = await pool.query('SELECT id FROM clients WHERE portal_username = ?', [portal_username]);
      if (existingUser.length > 0) {
        portal_username = generateUsername(full_name);
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const portal_password_hash = await bcrypt.hash(portal_password, salt);

      try {
        await pool.query(
          `INSERT INTO clients (id, full_name, cnic, whatsapp_number, email, pin, commission_rate, portal_username, portal_password_hash, portal_password_plain, sales_user_id, customer_type) 
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [full_name, cnic || null, whatsapp_number || null, email || null, pin || null, 0, portal_username, portal_password_hash, portal_password, assigned_sales_id, customer_type || null]
        );
        successCount++;
      } catch (insertError) {
        console.error('Error inserting row:', insertError);
        errors.push(`Row ${index + 2} (${full_name}): ${insertError.message}`);
        skipCount++;
      }
    }

    res.json({
      message: 'Import process finished',
      summary: {
        totalRows: data.length,
        successCount,
        skipCount,
        errors
      }
    });

  } catch (error) {
    console.error('Excel Import Error:', error);
    res.status(500).json({ message: 'Error processing Excel file: ' + error.message });
  } finally {
    // Delete file after processing
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }
    }
  }
};

module.exports = { getClients, createClient, getClientById, updateClient, getClientNotes, createClientNote, updateClientNote, deleteClientNote, getClientPayments, importClients };
