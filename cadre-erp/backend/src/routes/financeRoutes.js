const express = require('express');
const router = express.Router();
const { 
  getInvoices, 
  getInvoiceById,
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
  getCommissions,
  recordPayment,
  getPayments,
  deletePayment
} = require('../controllers/financeController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

// Invoices
router.get('/invoices', authorizeRoles('Super Admin', 'Accounts', 'Client', 'Sales', 'Operations', 'CSR'), getInvoices);
router.get('/invoices/:id', authorizeRoles('Super Admin', 'Accounts', 'Client', 'Sales', 'Operations', 'CSR'), getInvoiceById);
router.post('/invoices', authorizeRoles('Super Admin', 'Accounts', 'Sales'), createInvoice);
router.put('/invoices/:id', authorizeRoles('Super Admin', 'Accounts', 'Sales', 'Client'), updateInvoice);
router.delete('/invoices/:id', authorizeRoles('Super Admin', 'Accounts'), deleteInvoice);

// Payments
router.get('/payments/:invoice_id', authorizeRoles('Super Admin', 'Accounts', 'Sales', 'Client'), getPayments);
router.post('/payments', authorizeRoles('Super Admin', 'Accounts', 'Sales'), recordPayment);
router.delete('/payments/:id', authorizeRoles('Super Admin', 'Accounts'), deletePayment);

// Commissions
router.get('/commissions', authorizeRoles('Super Admin', 'Accounts', 'Sales'), getCommissions);

module.exports = router;
