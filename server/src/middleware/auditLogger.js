const { query } = require('../config/database');

/**
 * Middleware to intercept JSON responses and log successful actions to the audit_logs table.
 * Supports logged-in user actions as well as login/register actions where user_id is in response body.
 * 
 * @param {string} action - The action name (e.g. 'login', 'create', 'update', 'delete')
 * @param {string} resourceType - The resource category (e.g. 'user', 'call', 'business', 'followup')
 */
const auditLogger = (action, resourceType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const userId = req.user?.id || body?.data?.user?.id || (resourceType === 'user' ? body?.data?.id : null);
      if (res.statusCode < 400 && userId) {
        query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            action,
            resourceType,
            body?.data?.id || req.params?.id || null,
            req.ip,
            req.headers['user-agent'],
          ]
        ).catch((err) => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { auditLogger };
