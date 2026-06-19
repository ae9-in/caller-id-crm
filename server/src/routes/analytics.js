const express = require('express');
const router = express.Router();
const { getDashboardStats, getCallsPerDay, getCallsPerUser, getCallOutcomes, getLeaderboard, getUserAnalytics, getMonthlyGrowth, getBusinessWiseStats } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard', getDashboardStats);
router.get('/business-stats', getBusinessWiseStats);
router.get('/calls-per-day', getCallsPerDay);
router.get('/calls-per-user', getCallsPerUser);
router.get('/outcomes', getCallOutcomes);
router.get('/leaderboard', getLeaderboard);
router.get('/monthly-growth', getMonthlyGrowth);
router.get('/user/:id', getUserAnalytics);

module.exports = router;
