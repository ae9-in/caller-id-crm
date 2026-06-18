const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const crypto = require('crypto');
const { sendResetEmail } = require('../services/emailService');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const result = await query(
      `SELECT u.*, r.name as role_name FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    // If email not found, allow any Gmail address to log in using a demo agent account
    if (!user) {
      const gmailRegex = /^[A-Z0-9._%+-]+@gmail\.com$/i;
      if (gmailRegex.test(email)) {
        // Fetch a demo agent (any active agent) to use for Gmail login
        const agentResult = await query(`SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'agent' AND u.is_active = true LIMIT 1`);
        if (agentResult.rows.length > 0) {
          const demoAgent = agentResult.rows[0];
          // Proceed with demoAgent as the logged-in user
          const isValid = await bcrypt.compare(password, demoAgent.password_hash);
          if (!isValid) return sendError(res, 401, 'Invalid email or password');
          // Update last login for demo agent
          await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [demoAgent.id]);
          const token = generateToken(demoAgent.id);
          const { password_hash, reset_token, reset_token_expiry, ...safeUser } = demoAgent;
          return sendSuccess(res, { token, user: { ...safeUser, role: demoAgent.role_name } }, 'Login successful');
        }
      }
      return sendError(res, 401, 'Invalid email or password');
    }
    if (!user.is_active) return sendError(res, 401, 'Account is deactivated');

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return sendError(res, 401, 'Invalid email or password');

    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id]);

    const token = generateToken(user.id);
    const { password_hash, reset_token, reset_token_expiry, ...safeUser } = user;

    sendSuccess(res, { token, user: { ...safeUser, role: user.role_name } }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.is_active, u.last_login, u.created_at, r.name as role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    sendSuccess(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current and new password required');
    }
    if (newPassword.length < 8) {
      return sendError(res, 400, 'New password must be at least 8 characters');
    }

    const result = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) return sendError(res, 400, 'Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, req.user.id]);

    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 400, 'Email is required');

    let result = await query(`SELECT id FROM users WHERE email = $1 AND is_active = true`, [email.toLowerCase()]);
    let userId;

    if (result.rows.length === 0) {
      const gmailRegex = /^[A-Z0-9._%+-]+@gmail\.com$/i;
      if (gmailRegex.test(email)) {
        // Register the Gmail address automatically as an agent
        const roleResult = await query(`SELECT id FROM roles WHERE name = 'agent'`);
        if (!roleResult.rows[0]) {
          return sendError(res, 500, 'Default role agent not found');
        }
        
        // Generate a random temporary password hash since they will reset it immediately
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 10);
        
        // Split email prefix for first/last name fallback
        const emailPrefix = email.split('@')[0];
        const firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        const lastName = 'User';
        
        const insertResult = await query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING id`,
          [email.toLowerCase().trim(), hash, firstName, lastName, roleResult.rows[0].id]
        );
        userId = insertResult.rows[0].id;
      } else {
        // Always respond 200 to prevent email enumeration
        return sendSuccess(res, null, 'If that email exists, a reset link has been sent');
      }
    } else {
      userId = result.rows[0].id;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3`,
      [token, expiry, userId]
    );

    // Send the password reset email / log to console
    await sendResetEmail(email.toLowerCase(), token);

    sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return sendError(res, 400, 'Token and new password required');

    const result = await query(
      `SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()`,
      [token]
    );
    if (result.rows.length === 0) return sendError(res, 400, 'Invalid or expired reset token');

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2`,
      [hash, result.rows[0].id]
    );

    sendSuccess(res, { id: result.rows[0].id }, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;
    if (!email || !password || !first_name || !last_name) {
      return sendError(res, 400, 'Email, password, first name, and last name are required');
    }

    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows[0]) {
      return sendError(res, 409, 'Email already registered');
    }

    const roleResult = await query(`SELECT id FROM roles WHERE name = 'agent'`);
    if (!roleResult.rows[0]) {
      return sendError(res, 500, 'Default role agent not found');
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, phone, is_active, created_at`,
      [email.toLowerCase().trim(), hash, first_name, last_name, phone || null, roleResult.rows[0].id]
    );

    sendSuccess(res, result.rows[0], 'User registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, changePassword, forgotPassword, resetPassword, register };
