// server/middleware/rbac.middleware.js
import Role from '../models/Roles.js'; // ✅ Correct model name

/**
 * ✅ Utility: Check if a role has a specific permission
 */
export const hasPermission = async (roleName, category, action) => {
  if (roleName === 'super-admin') return true;
  try {
    const roleDoc = await Role.findOne({ name: roleName });
    if (!roleDoc) return false;
    return !!roleDoc.permissions?.[category]?.[action];
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

/**
 * ✅ Middleware: Enforce permission on a route
 */
export const requirePermission = (category, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: No user authenticated' });
    }

    const userRoleName = req.user.role;
    if (userRoleName === 'super-admin') {
      return next();
    }

    try {
      const roleDoc = await Role.findOne({ name: userRoleName });
      if (!roleDoc) {
        return res.status(403).json({ error: 'Forbidden: User role not found' });
      }

      const hasPerm = roleDoc.permissions?.[category]?.[action] === true;
      if (!hasPerm) {
        return res.status(403).json({ 
          error: `Forbidden: Requires ${category}.${action}` 
        });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};