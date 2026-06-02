const pool = require('../config/db');
const { notifyUsersByRole } = require('./notificationController');

const updateInvoiceStatus = async (invoiceId, connectionOrPool) => {
  const db = connectionOrPool || pool;
  try {
    const [invoices] = await db.query('SELECT total_amount FROM invoices WHERE id = ?', [invoiceId]);
    if (invoices.length === 0) return;
    const totalAmount = parseFloat(invoices[0].total_amount);

    const [[{ clientPaid }]] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as clientPaid FROM client_payments WHERE invoice_id = ?',
      [invoiceId]
    );
    const [[{ invoicePaid }]] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as invoicePaid FROM invoice_payments WHERE invoice_id = ?',
      [invoiceId]
    );
    
    const totalPaid = parseFloat(clientPaid) + parseFloat(invoicePaid);
    let newStatus = 'unpaid';
    if (totalPaid >= totalAmount) newStatus = 'paid';
    else if (totalPaid > 0) newStatus = 'partial';

    await db.query('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, invoiceId]);
  } catch (error) {
    console.error('Error updating invoice status:', error);
  }
};

const getInvoices = async (req, res) => {
  try {
    let query = `
      SELECT i.*, c.full_name as client_name, u.name as agent_name,
             (COALESCE((SELECT SUM(amount) FROM client_payments WHERE invoice_id = i.id), 0) +
              COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE invoice_id = i.id), 0)) as amount_paid
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id 
      LEFT JOIN users u ON i.sales_user_id = u.id
    `;
    const params = [];
    
    if (req.user.role === 'Client') {
      query += ` WHERE i.client_id = ? `;
      params.push(req.user.id);
    } else if (req.user.role === 'Sales') {
      query += ` WHERE i.sales_user_id = ? OR c.sales_user_id = ? `;
      params.push(req.user.id, req.user.id);
    }
    
    query += ` ORDER BY i.created_at DESC`;

    const [invoices] = await pool.query(query, params);
    res.json(invoices);
  } catch (error) {
    console.error('Error in getInvoices:', error);
    res.status(500).json({ message: 'Error fetching invoices', error: error.message });
  }
};

const createInvoice = async (req, res) => {
  const { client_id, items, discount, gst_rate, tax_amount, due_date, total_amount, service_charges_total, other_charges_total, sales_user_id, bill_from_name, bill_from_address } = req.body;
  
  // 1. Validation
  if (!client_id) {
    return res.status(400).json({ message: 'Client ID is required' });
  }
  if (!due_date) {
    return res.status(400).json({ message: 'Due date is required' });
  }
  if (!sales_user_id) {
    return res.status(400).json({ message: 'Sales Agent is required' });
  }
  const finalBillFromName = (bill_from_name || 'Adwise Labs').trim();
  const finalBillFromAddress = (bill_from_address || 'A-205 / II Saba Ave, DHA Karachi Phase VIII Zone A Phase VIII\nDefence Housing Authority\nKarachi Sindh\n76500').trim();
  if (!finalBillFromName) {
    return res.status(400).json({ message: 'Bill From Name is required' });
  }
  if (!finalBillFromAddress) {
    return res.status(400).json({ message: 'Bill From Address is required' });
  }

  let parsedItems = items;
  if (typeof items === 'string') {
    try {
      parsedItems = JSON.parse(items);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid items format' });
    }
  }

  if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
    return res.status(400).json({ message: 'At least one invoice item is required' });
  }

  for (let i = 0; i < parsedItems.length; i++) {
    const item = parsedItems[i];
    if (!item.description || !item.description.trim()) {
      return res.status(400).json({ message: `Item #${i + 1} Description is required` });
    }
    if (item.quantity === undefined || item.quantity === null || parseFloat(item.quantity) <= 0) {
      return res.status(400).json({ message: `Item #${i + 1} Quantity must be greater than 0` });
    }
    if (item.price === undefined || item.price === null || parseFloat(item.price) <= 0) {
      return res.status(400).json({ message: `Item #${i + 1} Rate must be greater than 0` });
    }
  }

  let formattedDueDate = due_date;
  if (formattedDueDate && typeof formattedDueDate === 'string' && formattedDueDate.includes('T')) {
    formattedDueDate = formattedDueDate.split('T')[0];
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 2. Create the invoice
    const [invResult] = await connection.query(`
      INSERT INTO invoices (id, client_id, total_amount, service_charges_total, other_charges_total, items, discount, gst_rate, tax_amount, due_date, sales_user_id, bill_from_name, bill_from_address) 
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [client_id, total_amount, service_charges_total, other_charges_total, JSON.stringify(parsedItems), discount, gst_rate, tax_amount || 0, formattedDueDate, sales_user_id, finalBillFromName, finalBillFromAddress]);
    
    // Retrieve the UUID of the inserted invoice
    const [invRows] = await connection.query('SELECT id FROM invoices WHERE client_id = ? ORDER BY created_at DESC LIMIT 1', [client_id]);
    const invoice_id = invRows[0].id;

    // 3. Calculate Commission (only on service_charges_total)
    if (sales_user_id) {
      const [clients] = await connection.query('SELECT commission_rate FROM clients WHERE id = ?', [client_id]);
      if (clients.length > 0 && clients[0].commission_rate > 0) {
        const rate = clients[0].commission_rate;
        const commission_amount = (service_charges_total * rate) / 100;

        await connection.query(`
          INSERT INTO commissions (id, sales_user_id, invoice_id, base_amount, commission_rate, commission_amount) 
          VALUES (UUID(), ?, ?, ?, ?, ?)
        `, [sales_user_id, invoice_id, service_charges_total, rate, commission_amount]);
      }
    }

    await connection.commit();
    res.status(201).json({ id: invoice_id, message: 'Invoice generated successfully' });

    // Trigger notification
    try {
      const [clientResult] = await pool.query('SELECT full_name FROM clients WHERE id = ?', [client_id]);
      const clientName = clientResult.length > 0 ? clientResult[0].full_name : 'Unknown Client';
      const { notifyUsersByRole, createNotification } = require('./notificationController');
      notifyUsersByRole(['Super Admin', 'Accounts'], 'New Invoice Generated', `A new invoice has been generated for ${clientName} with a total amount of Rs. ${Number(total_amount).toLocaleString()}`);
      createNotification(client_id, 'New Invoice Generated', `An invoice for PKR ${Number(total_amount).toLocaleString()} has been generated.`);
    } catch (err) {
      console.error('Notification dispatch failed:', err);
    }
  } catch (error) {
    await connection.rollback();
    console.error('Invoice creation error:', error);
    res.status(500).json({ message: 'Error creating invoice' });
  } finally {
    connection.release();
  }
};

const updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { client_id, items, discount, gst_rate, tax_amount, due_date, total_amount, service_charges_total, other_charges_total, status, sales_user_id, bill_from_name, bill_from_address } = req.body;

  // 1. Validation
  if (!client_id) {
    return res.status(400).json({ message: 'Client ID is required' });
  }
  if (!due_date) {
    return res.status(400).json({ message: 'Due date is required' });
  }
  if (!sales_user_id) {
    return res.status(400).json({ message: 'Sales Agent is required' });
  }
  const finalBillFromName = (bill_from_name || 'Adwise Labs').trim();
  const finalBillFromAddress = (bill_from_address || 'A-205 / II Saba Ave, DHA Karachi Phase VIII Zone A Phase VIII\nDefence Housing Authority\nKarachi Sindh\n76500').trim();
  if (!finalBillFromName) {
    return res.status(400).json({ message: 'Bill From Name is required' });
  }
  if (!finalBillFromAddress) {
    return res.status(400).json({ message: 'Bill From Address is required' });
  }

  let parsedItems = items;
  if (typeof items === 'string') {
    try {
      parsedItems = JSON.parse(items);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid items format' });
    }
  }

  if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
    return res.status(400).json({ message: 'At least one invoice item is required' });
  }

  for (let i = 0; i < parsedItems.length; i++) {
    const item = parsedItems[i];
    if (!item.description || !item.description.trim()) {
      return res.status(400).json({ message: `Item #${i + 1} Description is required` });
    }
    if (item.quantity === undefined || item.quantity === null || parseFloat(item.quantity) <= 0) {
      return res.status(400).json({ message: `Item #${i + 1} Quantity must be greater than 0` });
    }
    if (item.price === undefined || item.price === null || parseFloat(item.price) <= 0) {
      return res.status(400).json({ message: `Item #${i + 1} Rate must be greater than 0` });
    }
  }

  let formattedDueDate = due_date;
  if (formattedDueDate && typeof formattedDueDate === 'string' && formattedDueDate.includes('T')) {
    formattedDueDate = formattedDueDate.split('T')[0];
  }

  try {
    // If client is updating, ensure they own the invoice
    if (req.user.role === 'Client') {
      const [check] = await pool.query('SELECT client_id FROM invoices WHERE id = ?', [id]);
      if (check.length === 0 || check[0].client_id !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized to edit this invoice' });
      }
    }

    await pool.query(`
      UPDATE invoices 
      SET client_id = ?, items = ?, discount = ?, gst_rate = ?, tax_amount = ?, due_date = ?, total_amount = ?, service_charges_total = ?, other_charges_total = ?, status = ?, sales_user_id = ?, bill_from_name = ?, bill_from_address = ?
      WHERE id = ?
    `, [client_id, JSON.stringify(parsedItems), discount, gst_rate, tax_amount || 0, formattedDueDate, total_amount, service_charges_total, other_charges_total, status || 'unpaid', sales_user_id, finalBillFromName, finalBillFromAddress, id]);

    await updateInvoiceStatus(id);

    res.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Invoice update error:', error);
    res.status(500).json({ message: 'Error updating invoice' });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, c.full_name as client_name, u.name as agent_name,
             (COALESCE((SELECT SUM(amount) FROM client_payments WHERE invoice_id = i.id), 0) +
              COALESCE((SELECT SUM(amount) FROM invoice_payments WHERE invoice_id = i.id), 0)) as amount_paid
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id 
      LEFT JOIN users u ON i.sales_user_id = u.id
      WHERE i.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error in getInvoiceById:', error);
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting invoice' });
  }
};

const getCommissions = async (req, res) => {
  try {
    let query = `
      SELECT cm.*, u.name as sales_name, c.full_name as client_name, i.total_amount 
      FROM commissions cm
      JOIN users u ON cm.sales_user_id = u.id
      JOIN invoices i ON cm.invoice_id = i.id
      JOIN clients c ON i.client_id = c.id
      ORDER BY cm.status ASC
    `;
    const [commissions] = await pool.query(query);
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching commissions' });
  }
};

const recordPayment = async (req, res) => {
  const { invoice_id, amount, payment_date, payment_mode, transaction_id, notes } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id = require('crypto').randomUUID();
    await connection.query(
      'INSERT INTO invoice_payments (id, invoice_id, amount, payment_date, payment_mode, transaction_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, invoice_id, amount, payment_date, payment_mode, transaction_id, notes]
    );

    await updateInvoiceStatus(invoice_id, connection);
    await connection.commit();

    res.status(201).json({ id, message: 'Payment recorded' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Error recording payment' });
  } finally {
    connection.release();
  }
};

const getPayments = async (req, res) => {
  try {
    const [payments] = await pool.query('SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC', [req.params.invoice_id]);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payments' });
  }
};

const deletePayment = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [payments] = await connection.query('SELECT invoice_id FROM invoice_payments WHERE id = ?', [id]);
    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Payment not found' });
    }
    const invoiceId = payments[0].invoice_id;

    await connection.query('DELETE FROM invoice_payments WHERE id = ?', [id]);

    await updateInvoiceStatus(invoiceId, connection);
    await connection.commit();

    res.json({ message: 'Payment deleted' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Error deleting payment' });
  } finally {
    connection.release();
  }
};

module.exports = { 
  getInvoices, 
  getInvoiceById, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
  getCommissions,
  recordPayment,
  getPayments,
  deletePayment
};
