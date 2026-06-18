const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination } = require('../utils/helpers');

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const search = req.query.search || '';

    const searchCondition = search ? `AND (u.first_name ILIKE $3 OR u.last_name ILIKE $3 OR u.email ILIKE $3)` : '';
    const params = [limit, offset];
    if (search) params.push(`%${search}%`);

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.last_login, u.created_at, r.name as role
         FROM users u JOIN roles r ON u.role_id = r.id
         WHERE 1=1 ${searchCondition}
         ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        `SELECT COUNT(*) FROM users u WHERE 1=1 ${searchCondition}`,
        search ? [`%${search}%`] : []
      ),
    ]);

    sendPaginated(res, dataResult.rows, parseInt(countResult.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.is_active, u.last_login, u.created_at, r.name as role
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return sendError(res, 404, 'User not found');
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone, role } = req.body;
    if (!email || !password || !first_name || !last_name || !role) {
      return sendError(res, 400, 'Email, password, first name, last name, and role are required');
    }

    if (req.user.role !== 'admin' && role !== 'agent') {
      return sendError(res, 403, 'Only admins can assign non-agent roles');
    }

    const roleResult = await query(`SELECT id FROM roles WHERE name = $1`, [role]);
    if (!roleResult.rows[0]) return sendError(res, 400, 'Invalid role');

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rows[0]) return sendError(res, 409, 'Email already registered');

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, phone, is_active, created_at`,
      [email.toLowerCase(), hash, first_name, last_name, phone || null, roleResult.rows[0].id]
    );

    sendSuccess(res, { ...result.rows[0], role }, 'User created', 201);
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, is_active, role } = req.body;

    if (req.user.role !== 'admin') {
      const userResult = await query(
        `SELECT r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
        [req.params.id]
      );
      if (!userResult.rows[0]) return sendError(res, 404, 'User not found');
      if (userResult.rows[0].role !== 'agent') {
        return sendError(res, 403, 'Managers can only edit agents');
      }
      if (role !== undefined && role !== 'agent') {
        return sendError(res, 403, 'Only admins can change user roles');
      }
    }

    const updates = [];
    const params = [];
    let i = 1;

    if (first_name !== undefined) { updates.push(`first_name = $${i++}`); params.push(first_name); }
    if (last_name !== undefined) { updates.push(`last_name = $${i++}`); params.push(last_name); }
    if (phone !== undefined) { updates.push(`phone = $${i++}`); params.push(phone); }
    if (is_active !== undefined) { updates.push(`is_active = $${i++}`); params.push(is_active); }

    if (role) {
      const roleResult = await query(`SELECT id FROM roles WHERE name = $1`, [role]);
      if (!roleResult.rows[0]) return sendError(res, 400, 'Invalid role');
      updates.push(`role_id = $${i++}`);
      params.push(roleResult.rows[0].id);
    }

    if (updates.length === 0) return sendError(res, 400, 'No fields to update');

    params.push(req.params.id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${i} RETURNING id, email, first_name, last_name, phone, is_active`,
      params
    );

    if (!result.rows[0]) return sendError(res, 404, 'User not found');
    sendSuccess(res, result.rows[0], 'User updated');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return sendError(res, 400, 'Cannot delete your own account');

    if (req.user.role !== 'admin') {
      const userResult = await query(
        `SELECT r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
        [req.params.id]
      );
      if (!userResult.rows[0]) return sendError(res, 404, 'User not found');
      if (userResult.rows[0].role !== 'agent') {
        return sendError(res, 403, 'Managers can only deactivate agents');
      }
    }

    const result = await query(`UPDATE users SET is_active = false WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return sendError(res, 404, 'User not found');
    sendSuccess(res, null, 'User deactivated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
