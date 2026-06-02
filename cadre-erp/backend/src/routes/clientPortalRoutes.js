const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getClientInvoices,
  getClientPayments, createClientPayment,
  getClientNotes, createClientNote, updateClientNote, deleteClientNote,
  getClientProjects, getClientProjectById, submitStepFields, uploadStepDocument, uploadFieldFile,
  getClientFiles, uploadClientFile, deleteClientFile, downloadClientFile, updateProfile, getProfile
} = require('../controllers/clientPortalController');

// ── File Upload Setup ────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads/client-files');
const stepsDir = path.join(__dirname, '../../uploads/steps');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(stepsDir)) fs.mkdirSync(stepsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const stepStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, stepsDir),
  filename: (req, file, cb) => {
    const unique = `step_${req.params.stepId}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

const stepUpload = multer({ storage: stepStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// All routes require client authentication
router.use(authenticateToken);
router.use(authorizeRoles('Client'));

const profilesDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilesDir),
  filename: (req, file, cb) => {
    const unique = `profile_client_${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const profileUpload = multer({ storage: profileStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Profile
router.get('/profile', getProfile);
router.put('/profile', profileUpload.single('profile_image'), updateProfile);

// ── Invoices ─────────────────────────────────────────────────────────────
router.get('/invoices', getClientInvoices);

// ── Payments ─────────────────────────────────────────────────────────────
router.get('/payments', getClientPayments);
router.post('/payments', createClientPayment);

// ── Notes ─────────────────────────────────────────────────────────────────
router.get('/notes', getClientNotes);
router.post('/notes', createClientNote);
router.put('/notes/:id', updateClientNote);
router.delete('/notes/:id', deleteClientNote);

// ── Projects ──────────────────────────────────────────────────────────────
router.get('/projects', getClientProjects);
router.get('/projects/:id', getClientProjectById);
router.post('/projects/steps/:stepId/fields', submitStepFields);
router.post('/projects/steps/:stepId/fields/upload', stepUpload.single('file'), uploadFieldFile);
router.post('/projects/steps/:stepId/documents', stepUpload.single('file'), uploadStepDocument);

// ── Files ─────────────────────────────────────────────────────────────────
router.get('/files', getClientFiles);
router.post('/files/upload', upload.single('file'), uploadClientFile);
router.delete('/files/:id', deleteClientFile);
router.get('/files/:id/download', downloadClientFile);

module.exports = router;
