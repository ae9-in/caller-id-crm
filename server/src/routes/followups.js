const express = require('express');
const router = express.Router();
const { getFollowups, getFollowupById, createFollowup, updateFollowup, deleteFollowup, getFollowupStats } = require('../controllers/followupController');
const { authenticate } = require('../middleware/auth');
const { requireAgent } = require('../middleware/rbac');
const { auditLogger } = require('../middleware/auditLogger');

router.use(authenticate);
router.get('/stats', getFollowupStats);
router.get('/', getFollowups);
router.post('/', requireAgent, auditLogger('create', 'followup'), createFollowup);
router.get('/:id', getFollowupById);
router.put('/:id', requireAgent, auditLogger('update', 'followup'), updateFollowup);
router.delete('/:id', requireAgent, auditLogger('delete', 'followup'), deleteFollowup);

module.exports = router;
