const { query } = require('../config/database');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination } = require('../utils/helpers');

const getFollowups = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { status, assigned_user_id } = req.query;

    const conditions = ['1=1'];
    const params = [];
    let i = 1;

    if (status) { conditions.push(`f.status = $${i++}`); params.push(status); }

    if (req.user.role === 'agent') {
      conditions.push(`f.assigned_user_id = $${i++}`);
      params.push(req.user.id);
    } else if (assigned_user_id) {
      conditions.push(`f.assigned_user_id = $${i++}`);
      params.push(assigned_user_id);
    }

    // Auto-mark overdue
    await query(
      `UPDATE followups SET status = 'overdue' WHERE status = 'pending' AND due_date < NOW()`
    );

    const whereClause = conditions.join(' AND ');
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT f.*, 
                b.name as business_name,
                u.first_name || ' ' || u.last_name as assigned_user_name
         FROM followups f
         LEFT JOIN businesses b ON f.business_id = b.id
         LEFT JOIN users u ON f.assigned_user_id = u.id
         WHERE ${whereClause}
         ORDER BY f.due_date ASC
         LIMIT $${i++} OFFSET $${i++}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM followups f WHERE ${whereClause}`, params),
    ]);

    sendPaginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getFollowupById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT f.*, b.name as business_name, u.first_name || ' ' || u.last_name as assigned_user_name
       FROM followups f
       LEFT JOIN businesses b ON f.business_id = b.id
       LEFT JOIN users u ON f.assigned_user_id = u.id
       WHERE f.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'Follow-up not found');
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const createFollowup = async (req, res, next) => {
  try {
    const { business_id, call_id, assigned_user_id, title, notes, due_date } = req.body;
    if (!business_id || !title || !due_date) {
      return sendError(res, 400, 'Business, title, and due date are required');
    }

    const result = await query(
      `INSERT INTO followups (business_id, call_id, assigned_user_id, created_by, title, notes, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [business_id, call_id || null, assigned_user_id || req.user.id, req.user.id, title, notes, due_date]
    );

    await query(
      `INSERT INTO activities (business_id, user_id, type, title)
       VALUES ($1, $2, 'follow_up_created', 'Follow-up created: ' || $3)`,
      [business_id, req.user.id, title]
    );

    sendSuccess(res, result.rows[0], 'Follow-up created', 201);
  } catch (err) {
    next(err);
  }
};

const updateFollowup = async (req, res, next) => {
  try {
    const { title, notes, due_date, status, assigned_user_id } = req.body;
    const completedAt = status === 'completed' ? 'NOW()' : 'completed_at';

    const result = await query(
      `UPDATE followups SET
        title = COALESCE($1, title),
        notes = COALESCE($2, notes),
        due_date = COALESCE($3, due_date),
        status = COALESCE($4, status),
        assigned_user_id = COALESCE($5, assigned_user_id),
        completed_at = CASE WHEN $4 = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [title, notes, due_date, status, assigned_user_id, req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'Follow-up not found');

    if (status === 'completed') {
      await query(
        `INSERT INTO activities (business_id, user_id, type, title)
         VALUES ($1, $2, 'follow_up_completed', 'Follow-up completed')`,
        [result.rows[0].business_id, req.user.id]
      );
    }

    sendSuccess(res, result.rows[0], 'Follow-up updated');
  } catch (err) {
    next(err);
  }
};

const deleteFollowup = async (req, res, next) => {
  try {
    const result = await query(`DELETE FROM followups WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return sendError(res, 404, 'Follow-up not found');
    sendSuccess(res, null, 'Follow-up deleted');
  } catch (err) {
    next(err);
  }
};

const getFollowupStats = async (req, res, next) => {
  try {
    let userFilter = '';
    const params = [];
    if (req.user.role === 'agent') {
      userFilter = `WHERE f.assigned_user_id = $1`;
      params.push(req.user.id);
    }

    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE f.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE f.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE f.status = 'overdue') as overdue,
        COUNT(*) FILTER (WHERE f.due_date::date = CURRENT_DATE AND f.status = 'pending') as due_today
       FROM followups f ${userFilter}`,
      params
    );
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { getFollowups, getFollowupById, createFollowup, updateFollowup, deleteFollowup, getFollowupStats };
