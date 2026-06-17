const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const getDashboardStats = async (req, res, next) => {
  try {
    let userFilter = '';
    const params = [];

    if (req.user.role === 'agent') {
      userFilter = `AND c.user_id = '${req.user.id}'`;
    }

    const [callStats, businessStats, followupStats, recentActivity] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE c.is_pitched = true) as pitched_calls,
          COUNT(*) FILTER (WHERE c.call_outcome = 'meeting_scheduled') as meetings_scheduled,
          ROUND(AVG(c.duration_seconds)::numeric, 0) as avg_duration,
          ROUND(
            COALESCE(
              SUM(
                CASE 
                  WHEN c.is_pitched = true AND c.call_outcome IN ('interested','converted','meeting_scheduled') THEN 1.0 
                  WHEN c.is_pitched = true AND c.call_outcome = 'follow_up_needed' THEN 0.5 
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

    sendSuccess(res, {
      calls: callStats.rows[0],
      businesses: businessStats.rows[0],
      followups: followupStats.rows[0],
      recentActivity: recentActivity.rows,
    });
  } catch (err) {
    next(err);
  }
};

const getCallsPerDay = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    let userFilter = req.user.role === 'agent' ? `AND user_id = '${req.user.id}'` : '';

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

    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const getCallsPerUser = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        u.id, u.first_name || ' ' || u.last_name as name,
        COUNT(c.id) as total_calls,
        COUNT(c.id) FILTER (WHERE c.is_pitched = true) as pitched_calls,
        ROUND(AVG(c.duration_seconds)::numeric, 0) as avg_duration,
        COUNT(c.id) FILTER (WHERE c.call_outcome = 'meeting_scheduled') as meetings
      FROM users u
      LEFT JOIN calls c ON u.id = c.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_calls DESC
    `);
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const getCallOutcomes = async (req, res, next) => {
  try {
    let userFilter = req.user.role === 'agent' ? `WHERE user_id = '${req.user.id}'` : '';
    const result = await query(`
      SELECT call_outcome, COUNT(*) as count
      FROM calls ${userFilter}
      GROUP BY call_outcome ORDER BY count DESC
    `);
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const period = req.query.period || 'weekly';
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
                WHEN c.is_pitched = true AND c.call_outcome IN ('interested','converted','meeting_scheduled') THEN 1.0 
                WHEN c.is_pitched = true AND c.call_outcome = 'follow_up_needed' THEN 0.5 
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
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const getUserAnalytics = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user.id;
    const days = parseInt(req.query.days) || 30;

    const [summary, callsPerDay, outcomes] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE is_pitched = true) as pitched_calls,
          ROUND(AVG(duration_seconds)::numeric, 0) as avg_duration,
          COUNT(*) FILTER (WHERE call_outcome = 'meeting_scheduled') as meetings,
          COUNT(DISTINCT business_id) as businesses_contacted,
          ROUND(
            COALESCE(
              SUM(
                CASE 
                  WHEN is_pitched = true AND call_outcome IN ('interested','converted','meeting_scheduled') THEN 1.0 
                  WHEN is_pitched = true AND call_outcome = 'follow_up_needed' THEN 0.5 
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

    sendSuccess(res, { summary: summary.rows[0], callsPerDay: callsPerDay.rows, outcomes: outcomes.rows });
  } catch (err) {
    next(err);
  }
};

const getMonthlyGrowth = async (req, res, next) => {
  try {
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
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats, getCallsPerDay, getCallsPerUser, getCallOutcomes, getLeaderboard, getUserAnalytics, getMonthlyGrowth };
