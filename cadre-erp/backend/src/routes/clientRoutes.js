const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getClients, createClient, getClientById, updateClient, getClientNotes, createClientNote, updateClientNote, deleteClientNote, getClientPayments, importClients } = require('../controllers/clientController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Configure multer for Excel/CSV uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed'));
    }
  }
});

// Protect all client routes
router.use(authenticateToken);

// Only Admin, Sales, CSR, Operations, and Accounts can view clients
router.get('/', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClients);
router.get('/:id', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClientById);
router.get('/:id/notes', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClientNotes);
router.get('/:id/payments', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), getClientPayments);

// Only Admin and Sales can create or update clients and notes
router.post('/', authorizeRoles('Super Admin', 'Sales'), createClient);
router.post('/import', authorizeRoles('Super Admin', 'Sales'), upload.single('file'), importClients);
router.put('/:id', authorizeRoles('Super Admin', 'Sales'), updateClient);
router.post('/:id/notes', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), createClientNote);
router.put('/:id/notes/:noteId', authorizeRoles('Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts'), updateClientNote);
router.delete('/:id/notes/:noteId', authorizeRoles('Super Admin', 'Sales'), deleteClientNote);

module.exports = router;
