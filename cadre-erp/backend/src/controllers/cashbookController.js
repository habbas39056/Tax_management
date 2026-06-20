const pool = require('../config/db');

const getEntries = async (req, res) => {
  try {
    const query = `
      SELECT id, entry_date, party_client, description, payment_mode, bank, reference_number, receipt, payment, balance, created_at, 'cashbook' as source
      FROM cashbook_entries
      
      UNION ALL
      
      SELECT ip.id, ip.payment_date as entry_date, c.full_name as party_client, 
             CONCAT('Invoice Payment', IF(ip.notes IS NOT NULL AND ip.notes != '', CONCAT(' - ', ip.notes), '')) as description, 
             ip.payment_mode, ip.bank as bank, ip.transaction_id as reference_number, 
             ip.amount as receipt, 0 as payment, 0 as balance, ip.payment_date as created_at, 'invoice_payment' as source
      FROM invoice_payments ip
      JOIN invoices i ON ip.invoice_id = i.id
      JOIN clients c ON i.client_id = c.id

      UNION ALL
      
      SELECT cp.id, cp.payment_date as entry_date, c.full_name as party_client, 
             'Client Payment' as description, 
             cp.payment_method as payment_mode, NULL as bank, cp.reference_number as reference_number, 
             cp.amount as receipt, 0 as payment, 0 as balance, cp.payment_date as created_at, 'client_payment' as source
      FROM client_payments cp
      JOIN invoices i ON cp.invoice_id = i.id
      JOIN clients c ON i.client_id = c.id
      
      ORDER BY entry_date DESC, created_at DESC
    `;
    const [entries] = await pool.query(query);
    res.json(entries);
  } catch (error) {
    console.error('Error fetching cashbook entries:', error);
    res.status(500).json({ message: 'Error fetching cashbook entries', error: error.message });
  }
};

const createEntry = async (req, res) => {
  const { entry_date, party_client, description, payment_mode, bank, reference_number, receipt, payment, balance } = req.body;
  
  if (!entry_date || !payment_mode) {
    return res.status(400).json({ message: 'Entry date and Mode are required' });
  }

  const id = require('crypto').randomUUID();

  try {
    await pool.query(`
      INSERT INTO cashbook_entries (id, entry_date, party_client, description, payment_mode, bank, reference_number, receipt, payment, balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, entry_date, party_client, description, payment_mode, bank || null, reference_number || null, receipt || 0, payment || 0, balance || 0]);

    res.status(201).json({ id, message: 'Cashbook entry created successfully' });
  } catch (error) {
    console.error('Error creating cashbook entry:', error);
    res.status(500).json({ message: 'Error creating cashbook entry', error: error.message });
  }
};

const updateEntry = async (req, res) => {
  const { id } = req.params;
  const { entry_date, party_client, description, payment_mode, bank, reference_number, receipt, payment, balance, source } = req.body;

  if (!entry_date || !payment_mode) {
    return res.status(400).json({ message: 'Entry date and Mode are required' });
  }

  try {
    let result;
    if (source === 'invoice_payment') {
      [result] = await pool.query(`
        UPDATE invoice_payments 
        SET payment_date = ?, payment_mode = ?, bank = ?, transaction_id = ?, amount = ?
        WHERE id = ?
      `, [entry_date, payment_mode, bank || null, reference_number || null, receipt || payment || 0, id]);
    } else if (source === 'client_payment') {
      [result] = await pool.query(`
        UPDATE client_payments 
        SET payment_date = ?, payment_method = ?, reference_number = ?, amount = ?
        WHERE id = ?
      `, [entry_date, payment_mode, reference_number || null, receipt || payment || 0, id]);
    } else {
      [result] = await pool.query(`
        UPDATE cashbook_entries 
        SET entry_date = ?, party_client = ?, description = ?, payment_mode = ?, bank = ?, reference_number = ?, receipt = ?, payment = ?, balance = ?
        WHERE id = ?
      `, [entry_date, party_client, description, payment_mode, bank || null, reference_number || null, receipt || 0, payment || 0, balance || 0, id]);
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json({ message: 'Cashbook entry updated successfully' });
  } catch (error) {
    console.error('Error updating cashbook entry:', error);
    res.status(500).json({ message: 'Error updating cashbook entry', error: error.message });
  }
};

const deleteEntry = async (req, res) => {
  const { id } = req.params;
  const { source } = req.query;
  try {
    let result;
    if (source === 'invoice_payment') {
      [result] = await pool.query('DELETE FROM invoice_payments WHERE id = ?', [id]);
    } else if (source === 'client_payment') {
      [result] = await pool.query('DELETE FROM client_payments WHERE id = ?', [id]);
    } else {
      [result] = await pool.query('DELETE FROM cashbook_entries WHERE id = ?', [id]);
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json({ message: 'Cashbook entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting cashbook entry:', error);
    res.status(500).json({ message: 'Error deleting cashbook entry', error: error.message });
  }
};

module.exports = {
  getEntries,
  createEntry,
  updateEntry,
  deleteEntry
};
