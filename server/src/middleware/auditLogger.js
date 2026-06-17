const { query } = require('../config/database');

const auditLogger = (action, resourceType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode < 400 && req.user) {
        query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
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
