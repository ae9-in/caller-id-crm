const express = require('express');
const router = express.Router();
const { getAuditLogs, getSystemStats, getAISettings, updateAISettings } = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

router.use(authenticate, requireAdmin);
router.get('/audit-logs', getAuditLogs);
router.get('/stats', getSystemStats);
router.get('/ai-settings', getAISettings);
router.put('/ai-settings', updateAISettings);

module.exports = router;
