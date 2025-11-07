// src/hooks/useAuth.js

// Define roles that have ALL permissions by default
const FULL_ACCESS_ROLES = ['super-admin', 'admin'];

export const useAuth = () => {
  const getUser = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const user = getUser();
  const role = user?.role || 'viewer';
  const permissions = user?.permissions || {}; // Get permissions from stored user object

  // Keep your existing roleLevels for backward compatibility if needed
  const roleLevels = {
    viewer: 1,
    guest: 2,
    developer: 3,
    devops: 4,
    admin: 5,
    'super-admin': 6,
  };

  const hasRole = (requiredRole) => {
    return roleLevels[role] >= (roleLevels[requiredRole] || 0);
  };

  // 🔥 NEW: Dynamic permission check using fetched permissions
  // If the user's role is in FULL_ACCESS_ROLES, grant all permissions
  const hasPermission = (category, action) => {
    if (FULL_ACCESS_ROLES.includes(role)) {
      return true; // Grant access if role is admin or super-admin
    }
    // Otherwise, check the specific permission in the user's permission object
    return !!permissions?.[category]?.[action];
  };

  // 🔥 NEW: Specific helpers using dynamic permissions (or full access)
  const canWrite = () => {
    if (FULL_ACCESS_ROLES.includes(role)) return true;
    // Example: Check specific permissions for write actions
    return hasPermission('Credentials', 'Create') || hasPermission('Job', 'Create') || hasPermission('Agent', 'Configure');
  };

  const canDelete = () => {
    if (FULL_ACCESS_ROLES.includes(role)) return true;
    // Example: Check specific permissions for delete actions
    return hasPermission('Credentials', 'Delete') || hasPermission('Job', 'Delete') || hasPermission('Agent', 'Delete');
  };

  const canManageWorkspace = () => {
    if (FULL_ACCESS_ROLES.includes(role)) return true;
    // Example: Check specific permissions for workspace management
    return hasPermission('Overall', 'Administer');
  };

  // 🔥 NEW: Helper to check if user has full access
  const hasFullAccess = () => FULL_ACCESS_ROLES.includes(role);

  return {
    user,
    role,
    permissions,
    isAuthenticated: !!user,
    hasRole,
    hasPermission, // ✅ Use dynamic check with full access override
    canWrite,      // ✅ Use dynamic check with full access override
    canDelete,     // ✅ Use dynamic check with full access override
    canManageWorkspace, // ✅ Use dynamic check with full access override
    hasFullAccess, // ✅ New helper to check if user has all permissions
  };
};