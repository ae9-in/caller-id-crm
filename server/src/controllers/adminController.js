const { query } = require('../config/database');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination } = require('../utils/helpers');

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { user_id, action, resource_type, date, search } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let i = 1;

    if (user_id) { conditions.push(`al.user_id = $${i++}`); params.push(user_id); }
    if (action) { conditions.push(`al.action ILIKE $${i++}`); params.push(`%${action}%`); }
    if (resource_type) { conditions.push(`al.resource_type = $${i++}`); params.push(resource_type); }
    if (date) { conditions.push(`al.created_at::date = $${i++}`); params.push(date); }
    if (search) {
      conditions.push(`(u.first_name ILIKE $${i} OR u.last_name ILIKE $${i} OR u.email ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = conditions.join(' AND ');
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT al.*, 
                COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), 'Unknown User') as user_name,
                COALESCE(u.email, 'N/A') as email
         FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
         WHERE ${whereClause} ORDER BY al.created_at DESC LIMIT $${i++} OFFSET $${i++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE ${whereClause}`, params),
    ]);

    sendPaginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getSystemStats = async (req, res, next) => {
  try {
    const [userStats, callStats, businessStats, storageStats] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM users`),
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'transcribed') as transcribed, SUM(duration_seconds) as total_duration FROM calls`),
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'converted') as converted FROM businesses`),
      query(`SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM calls`),
    ]);

    sendSuccess(res, {
      users: userStats.rows[0],
      calls: callStats.rows[0],
      businesses: businessStats.rows[0],
      storage: storageStats.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

const getAISettings = async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM ai_settings ORDER BY key`);
    sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const updateAISettings = async (req, res, next) => {
  try {
    const { settings } = req.body; // [{ key, value }]
    if (!Array.isArray(settings)) return sendError(res, 400, 'Settings must be an array');

    for (const { key, value } of settings) {
      await query(
        `UPDATE ai_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3`,
        [value, req.user.id, key]
      );
    }
    sendSuccess(res, null, 'AI settings updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs, getSystemStats, getAISettings, updateAISettings };
