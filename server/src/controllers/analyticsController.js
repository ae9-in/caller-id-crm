const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

// 5-second TTL in-memory cache for analytical queries under concurrent load
const analyticsCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

const getCachedOrFetch = async (cacheKey, fetchFn) => {
  const now = Date.now();
  const cached = analyticsCache.get(cacheKey);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }
  const data = await fetchFn();
  analyticsCache.set(cacheKey, { timestamp: now, data });
  return data;
};

const getDashboardStats = async (req, res, next) => {
  try {
    let userFilter = '';
    const params = [];

    if (req.user.role === 'agent') {
      userFilter = `AND c.user_id = '${req.user.id}'`;
    }

    // Auto-mark overdue follow-ups so dashboard metrics are up-to-date
    await query(`UPDATE followups SET status = 'overdue' WHERE status = 'pending' AND due_date < NOW()`);

    const cacheKey = `dashboard:${req.user.role}:${req.user.id}`;
    const data = await getCachedOrFetch(cacheKey, async () => {
      const [callStats, businessStats, followupStats, recentActivity] = await Promise.all([
        query(`
          SELECT
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE c.is_pitched = true) as pitched_calls,
            COUNT(*) FILTER (WHERE c.call_outcome = 'meeting_scheduled') as meetings_scheduled,
            ROUND(AVG(c.duration_seconds) FILTER (WHERE c.duration_seconds > 0)::numeric, 0) as avg_duration,
            ROUND(
              COALESCE(
                SUM(
                  CASE 
                    WHEN c.is_pitched = true AND c.call_outcome = 'interested' THEN 1.0 
                    ELSE 0.0 
                  END
                ), 
                0
              )::numeric / NULLIF(COUNT(*) FILTER (WHERE c.is_pitched = true), 0) * 100, 
              1
            ) as conversion_rate
          FROM calls c WHERE 1=1 ${userFilter}
        `),
        query(`SELECT COUNT(*) as total_businesses FROM businesses`),
        query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'overdue') as overdue
          FROM followups ${req.user.role === 'agent' ? `WHERE assigned_user_id = '${req.user.id}'` : ''}
        `),
        query(`
          SELECT a.*, u.first_name || ' ' || u.last_name as user_name, b.name as business_name
          FROM activities a
          LEFT JOIN users u ON a.user_id = u.id
          LEFT JOIN businesses b ON a.business_id = b.id
          ORDER BY a.created_at DESC LIMIT 10
        `),
      ]);

      return {
        calls: callStats.rows[0],
        businesses: businessStats.rows[0],
        followups: followupStats.rows[0],
        recentActivity: recentActivity.rows,
      };
    });

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getCallsPerDay = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    let userFilter = req.user.role === 'agent' ? `AND user_id = '${req.user.id}'` : '';
    const cacheKey = `calls-per-day:${req.user.role}:${req.user.id}:${days}`;

    const data = await getCachedOrFetch(cacheKey, async () => {
      const result = await query(`
        SELECT
          DATE(call_date) as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_pitched = true) as pitched
        FROM calls
        WHERE call_date >= NOW() - INTERVAL '${days} days' ${userFilter}
        GROUP BY DATE(call_date)
        ORDER BY date ASC
      `);
      return result.rows;
    });

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getCallsPerUser = async (req, res, next) => {
  try {
    const cacheKey = 'calls-per-user';
    const data = await getCachedOrFetch(cacheKey, async () => {
      const result = await query(`
        SELECT
          u.id, u.first_name || ' ' || u.last_name as name,
          COUNT(c.id) as total_calls,
          COUNT(c.id) FILTER (WHERE c.is_pitched = true) as pitched_calls,
          ROUND(AVG(c.duration_seconds) FILTER (WHERE c.duration_seconds > 0)::numeric, 0) as avg_duration,
          COUNT(c.id) FILTER (WHERE c.call_outcome = 'meeting_scheduled') as meetings
        FROM users u
        LEFT JOIN calls c ON u.id = c.user_id
        WHERE u.is_active = true
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY total_calls DESC
      `);
      return result.rows;
    });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getCallOutcomes = async (req, res, next) => {
  try {
    let userFilter = req.user.role === 'agent' ? `WHERE user_id = '${req.user.id}'` : '';
    const cacheKey = `call-outcomes:${req.user.role}:${req.user.id}`;

    const data = await getCachedOrFetch(cacheKey, async () => {
      const result = await query(`
        SELECT call_outcome, COUNT(*) as count
        FROM calls ${userFilter}
        GROUP BY call_outcome ORDER BY count DESC
      `);
      return result.rows;
    });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const period = req.query.period || 'weekly';
    const cacheKey = `leaderboard:${period}`;

    const data = await getCachedOrFetch(cacheKey, async () => {
      const interval = period === 'monthly' ? '30 days' : '7 days';
      const result = await query(`
        SELECT
          u.id, u.first_name || ' ' || u.last_name as name, u.avatar_url,
          COUNT(c.id) as total_calls,
          COUNT(c.id) FILTER (WHERE c.is_pitched = true) as pitched_calls,
          COUNT(c.id) FILTER (WHERE c.call_outcome = 'meeting_scheduled') as meetings,
          ROUND(
            COALESCE(
              SUM(
                CASE 
                  WHEN c.is_pitched = true AND c.call_outcome = 'interested' THEN 1.0 
                  ELSE 0.0 
                END
              ), 
              0
            )::numeric / NULLIF(COUNT(c.id) FILTER (WHERE c.is_pitched = true), 0) * 100, 
            1
          ) as conversion_rate
        FROM users u
        LEFT JOIN calls c ON u.id = c.user_id AND c.call_date >= NOW() - INTERVAL '${interval}'
        WHERE u.is_active = true
        GROUP BY u.id, u.first_name, u.last_name, u.avatar_url
        ORDER BY total_calls DESC
        LIMIT 20
      `);
      return result.rows;
    });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getUserAnalytics = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user.id;
    const days = parseInt(req.query.days) || 30;
    const cacheKey = `user-analytics:${userId}:${days}`;

    const data = await getCachedOrFetch(cacheKey, async () => {
      const [summary, callsPerDay, outcomes] = await Promise.all([
        query(`
          SELECT
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE is_pitched = true) as pitched_calls,
            ROUND(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0)::numeric, 0) as avg_duration,
            COUNT(*) FILTER (WHERE call_outcome = 'meeting_scheduled') as meetings,
            COUNT(DISTINCT business_id) as businesses_contacted,
            ROUND(
              COALESCE(
                SUM(
                  CASE 
                    WHEN is_pitched = true AND call_outcome = 'interested' THEN 1.0 
                    ELSE 0.0 
                  END
                ), 
                0
              )::numeric / NULLIF(COUNT(*) FILTER (WHERE is_pitched = true), 0) * 100, 
              1
            ) as conversion_rate
          FROM calls WHERE user_id = $1 AND call_date >= NOW() - INTERVAL '${days} days'
        `, [userId]),
        query(`
          SELECT DATE(call_date) as date, COUNT(*) as count
          FROM calls WHERE user_id = $1 AND call_date >= NOW() - INTERVAL '${days} days'
          GROUP BY DATE(call_date) ORDER BY date ASC
        `, [userId]),
        query(`
          SELECT call_outcome, COUNT(*) as count
          FROM calls WHERE user_id = $1
          GROUP BY call_outcome ORDER BY count DESC
        `, [userId]),
      ]);
      return { summary: summary.rows[0], callsPerDay: callsPerDay.rows, outcomes: outcomes.rows };
    });

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getMonthlyGrowth = async (req, res, next) => {
  try {
    const cacheKey = 'monthly-growth';
    const data = await getCachedOrFetch(cacheKey, async () => {
      const result = await query(`
        SELECT
          TO_CHAR(call_date, 'YYYY-MM') as month,
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE is_pitched = true) as pitched_calls,
          COUNT(*) FILTER (WHERE call_outcome = 'meeting_scheduled') as meetings
        FROM calls
        WHERE call_date >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(call_date, 'YYYY-MM')
        ORDER BY month ASC
      `);
      return result.rows;
    });
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const getBusinessWiseStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return sendError(res, 403, 'Insufficient permissions');
    }

    const cacheKey = 'business-wise-stats';
    const data = await getCachedOrFetch(cacheKey, async () => {
      const businessesResult = await query(`
        SELECT 
          b.id AS business_id,
          b.name AS business_name,
          u.first_name || ' ' || u.last_name AS assigned_user_name,
          b.assigned_user_id,
          COUNT(c.id) AS total_calls,
          COUNT(c.id) FILTER (WHERE c.is_pitched = true) as pitched_calls,
          COUNT(c.id) FILTER (WHERE c.call_outcome = 'meeting_scheduled') as meetings_scheduled,
          COUNT(c.id) FILTER (WHERE c.call_date >= CURRENT_DATE) as today_calls
        FROM businesses b
        LEFT JOIN users u ON b.assigned_user_id = u.id
        LEFT JOIN calls c ON b.id = c.business_id
        GROUP BY b.id, u.first_name, u.last_name
        ORDER BY total_calls DESC, b.name ASC
      `);

      const userBreakdownResult = await query(`
        SELECT 
          c.business_id,
          c.user_id,
          u.first_name || ' ' || u.last_name AS user_name,
          COUNT(c.id) AS total_calls,
          COUNT(c.id) FILTER (WHERE c.is_pitched = true) as pitched_calls,
          COUNT(c.id) FILTER (WHERE c.call_date >= CURRENT_DATE) as today_calls
        FROM calls c
        JOIN users u ON c.user_id = u.id
        GROUP BY c.business_id, c.user_id, u.first_name, u.last_name
        ORDER BY total_calls DESC
      `);

      const breakdownMap = {};
      userBreakdownResult.rows.forEach(row => {
        if (!breakdownMap[row.business_id]) {
          breakdownMap[row.business_id] = [];
        }
        breakdownMap[row.business_id].push({
          user_id: row.user_id,
          user_name: row.user_name,
          total_calls: parseInt(row.total_calls || '0'),
          pitched_calls: parseInt(row.pitched_calls || '0'),
          today_calls: parseInt(row.today_calls || '0'),
        });
      });

      return businessesResult.rows.map(b => ({
        business_id: b.business_id,
        business_name: b.business_name,
        assigned_user_name: b.assigned_user_name || 'Unassigned',
        assigned_user_id: b.assigned_user_id,
        total_calls: parseInt(b.total_calls || '0'),
        pitched_calls: parseInt(b.pitched_calls || '0'),
        meetings_scheduled: parseInt(b.meetings_scheduled || '0'),
        today_calls: parseInt(b.today_calls || '0'),
        users: breakdownMap[b.business_id] || []
      }));
    });

    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getCallsPerDay,
  getCallsPerUser,
  getCallOutcomes,
  getLeaderboard,
  getUserAnalytics,
  getMonthlyGrowth,
  getBusinessWiseStats,
};
