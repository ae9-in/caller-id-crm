const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { sendError } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'callcrm_super_secret_key_change_in_production');


    const result = await query(
      `SELECT u.*, r.name as role_name, r.permissions
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 401, 'User not found or inactive');
    }

    req.user = result.rows[0];
    req.user.role = result.rows[0].role_name;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid token');
    }
    next(err);
  }
};

module.exports = { authenticate };
