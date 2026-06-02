const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db'); // or however the db is exported

exports.getLeads = async (req, res) => {
    try {
        const [leads] = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        res.json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createLeadN8n = async (req, res) => {
    try {
        const { CustomerId, PhoneNumber, Summary, Score, IsPaused, LastMessageAt, Name } = req.body;
        const id = uuidv4();
        
        await pool.query(
            'INSERT INTO leads (Id, CustomerId, PhoneNumber, Summary, Score, IsPaused, LastMessageAt, Name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, CustomerId || null, PhoneNumber || null, Summary || null, Score || null, IsPaused || false, LastMessageAt ? new Date(LastMessageAt) : null, Name || null]
        );
        res.status(201).json({ message: 'Lead created successfully', id });
    } catch (error) {
        console.error('Error creating lead from n8n:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
