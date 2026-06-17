const express = require('express');
const router = express.Router();
const { getFollowups, getFollowupById, createFollowup, updateFollowup, deleteFollowup, getFollowupStats } = require('../controllers/followupController');
const { authenticate } = require('../middleware/auth');
const { requireAgent } = require('../middleware/rbac');

router.use(authenticate);
router.get('/stats', getFollowupStats);
router.get('/', getFollowups);
router.post('/', requireAgent, createFollowup);
router.get('/:id', getFollowupById);
router.put('/:id', requireAgent, updateFollowup);
router.delete('/:id', requireAgent, deleteFollowup);

module.exports = router;
