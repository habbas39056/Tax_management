const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticateToken);

// Services
router.get('/services', authorizeRoles('Super Admin', 'Sales', 'Operations', 'CSR', 'Accounts'), projectController.getServices);
router.post('/services', authorizeRoles('Super Admin', 'Sales'), projectController.createService);

// Projects
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', authorizeRoles('Super Admin', 'Sales'), projectController.createProject);

// Steps
router.post('/:project_id/steps', authorizeRoles('Super Admin', 'Sales', 'Operations', 'CSR', 'Accounts'), projectController.createStep);
router.put('/steps/:step_id', authorizeRoles('Super Admin', 'Sales', 'Operations', 'CSR', 'Accounts'), projectController.updateStep);
router.delete('/steps/:step_id', authorizeRoles('Super Admin', 'Sales', 'Operations', 'CSR', 'Accounts'), projectController.deleteStep);

// Dynamic Fields
router.post('/steps/:step_id/fields', authorizeRoles('Super Admin', 'Sales', 'Operations', 'CSR', 'Accounts'), projectController.addFieldConfig);
router.post('/steps/:step_id/fields/sync', authorizeRoles('Super Admin', 'Sales', 'Operations', 'CSR', 'Accounts'), projectController.syncFieldConfigs);
router.post('/steps/:step_id/values', projectController.saveFieldValues);

// Documents
router.post('/steps/:step_id/documents', upload.single('file'), projectController.uploadDocument);

// Invoices
router.post('/steps/:step_id/invoices', authorizeRoles('Super Admin', 'Accounts'), projectController.linkInvoice);

// Comments
router.post('/steps/:step_id/comments', projectController.addComment);

// Templates
router.get('/templates/list', authorizeRoles('Super Admin', 'Sales', 'Operations', 'CSR', 'Accounts'), projectController.getTemplates);
router.post('/templates', projectController.createTemplate);
router.delete('/templates/:id', projectController.deleteTemplate);

module.exports = router;
