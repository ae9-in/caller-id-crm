const express = require('express');
const router = express.Router();
const { getAuditLogs, getSystemStats, getAISettings, updateAISettings, getPitchPdfDetails, uploadPitchPdf } = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireManager } = require('../middleware/rbac');
const { auditLogger } = require('../middleware/auditLogger');
const { uploadPdf, handleMulterError } = require('../middleware/upload');

router.use(authenticate);

// Admin-only routes
router.get('/audit-logs', requireAdmin, getAuditLogs);
router.get('/stats', requireAdmin, getSystemStats);

// Admin & Manager routes
router.get('/ai-settings', requireManager, getAISettings);
router.put('/ai-settings', requireManager, auditLogger('update', 'ai_settings'), updateAISettings);

router.post('/pitch-pdf', requireManager, uploadPdf.single('file'), handleMulterError, uploadPitchPdf);
router.get('/pitch-pdf', requireManager, getPitchPdfDetails);

module.exports = router;
