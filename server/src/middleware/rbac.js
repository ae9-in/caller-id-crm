const { sendError } = require('../utils/response');

/**
 * Role-based access control middleware factory
 * @param {...string} allowedRoles - roles permitted to access the route
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, 'Insufficient permissions');
    }
    next();
  };
};

const requireAdmin = requireRole('admin');
const requireManager = requireRole('admin', 'manager');
const requireAgent = requireRole('admin', 'manager', 'agent');

module.exports = { requireRole, requireAdmin, requireManager, requireAgent };
