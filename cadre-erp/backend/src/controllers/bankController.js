const pool = require('../config/db');

const getBanks = async (req, res) => {
  try {
    const [banks] = await pool.query('SELECT * FROM banks ORDER BY created_at DESC');
    res.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    res.status(500).json({ message: 'Error fetching banks', error: error.message });
  }
};

const createBank = async (req, res) => {
  const { name, account_number, branch } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Bank name is required' });
  }

  const id = require('crypto').randomUUID();

  try {
    await pool.query(`
      INSERT INTO banks (id, name, account_number, branch)
      VALUES (?, ?, ?, ?)
    `, [id, name, account_number || null, branch || null]);

    res.status(201).json({ id, message: 'Bank created successfully' });
  } catch (error) {
    console.error('Error creating bank:', error);
    res.status(500).json({ message: 'Error creating bank', error: error.message });
  }
};

const updateBank = async (req, res) => {
  const { id } = req.params;
  const { name, account_number, branch } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Bank name is required' });
  }

  try {
    const [result] = await pool.query(`
      UPDATE banks 
      SET name = ?, account_number = ?, branch = ?
      WHERE id = ?
    `, [name, account_number || null, branch || null, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bank not found' });
    }

    res.json({ message: 'Bank updated successfully' });
  } catch (error) {
    console.error('Error updating bank:', error);
    res.status(500).json({ message: 'Error updating bank', error: error.message });
  }
};

const deleteBank = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM banks WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bank not found' });
    }

    res.json({ message: 'Bank deleted successfully' });
  } catch (error) {
    console.error('Error deleting bank:', error);
    res.status(500).json({ message: 'Error deleting bank', error: error.message });
  }
};

module.exports = {
  getBanks,
  createBank,
  updateBank,
  deleteBank
};
