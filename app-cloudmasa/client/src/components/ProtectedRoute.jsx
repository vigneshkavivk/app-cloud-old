import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth"; // ✅ RBAC hook (primary source)

/**
 * 🔐 ProtectedRoute Components
 *
 * This file provides multiple route protection strategies:
 *
 * 1. `ProtectedRoute`        → Basic authentication (default export)
 * 2. `PermissionProtectedRoute` → RBAC by permission (e.g., 'Job.Create')
 * 3. `RoleProtectedRoute`    → RBAC by exact role (e.g., 'super-admin')
 * 4. `CustomProtectedRoute`  → Dynamic custom logic
 *
 * All routes fall back to localStorage if `useAuth` is not available (e.g., during SSR or context issues).
 */

/**
 * 🔒 Fallback Auth Checker (uses localStorage if hook fails)
 * @returns {{ isAuthenticated: boolean, role: string | null, token: string | null }}
 */
const getAuthFallback = () => {
  try {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    // ✅ Google SSO case (token only)
    if (token && !userStr) {
      return {
        isAuthenticated: true,
        role: "guest",   // temporary until /profile loads
        token
      };
    }


    if (!userStr) {
      return { isAuthenticated: false, role: null, token: null };
    }

    const user = JSON.parse(userStr);
    return {
      isAuthenticated: !!user?.token,
      role: user?.role || null,
      token: user?.token || null
    };
  } catch (err) {
    return { isAuthenticated: false, role: null, token: null };
  }
};


/**
 * 🛡️ Option 1: Universal Protection (Authentication Only)
 *
 * Redirects unauthenticated users to login.
 * Used for pages that only require login (no RBAC).
 *
 * @param {React.ReactNode} children - Protected content
 * @returns {JSX.Element}
 */
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("user");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
/**
 * 🔑 Option 2: Permission-Based Protection (Recommended)
 *
 * Example usage:
 *   <PermissionProtectedRoute permission="Job.Create">
 *     <DeploymentPage />
 *   </PermissionProtectedRoute>
 *
 * @param {React.ReactNode} children - Protected content
 * @param {string} permission - Dot-separated permission (e.g., 'Job.Create')
 * @returns {JSX.Element}
 */
const PermissionProtectedRoute = ({ children, permission }) => {
  let isAuthenticated = false;
  let hasAccess = false;
  let fallbackUsed = false;

  try {
    const { isAuthenticated: authStatus, hasPermission } = useAuth();
    isAuthenticated = authStatus;
    if (isAuthenticated && permission) {
      const [resource, action] = permission.split('.');
      hasAccess = hasPermission(resource, action);
    } else if (isAuthenticated) {
      hasAccess = true; // No permission required → just auth
    }
  } catch (err) {
    // Fallback to localStorage + basic role check
    const fallback = getAuthFallback();
    isAuthenticated = fallback.isAuthenticated;
    fallbackUsed = true;
    if (isAuthenticated) {
      // Without RBAC engine, only super-admin gets access
      hasAccess = fallback.role === 'super-admin' || !permission;
    }
    if (process.env.NODE_ENV === 'development') {
      console.warn("PermissionProtectedRoute: useAuth() failed. Using fallback (super-admin only).");
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (permission && !hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * 👑 Option 3: Role-Based Protection (Legacy / Exact Match)
 *
 * Example usage:
 *   <RoleProtectedRoute requiredRole="super-admin">
 *     <PoliciesPage />
 *   </RoleProtectedRoute>
 *
 * @param {React.ReactNode} children - Protected content
 * @param {string} requiredRole - Exact role name (e.g., 'super-admin')
 * @returns {JSX.Element}
 */
const RoleProtectedRoute = ({ children, requiredRole }) => {
  let isAuthenticated = false;
  let userRole = null;
  let fallbackUsed = false;

  try {
    const { isAuthenticated: authStatus, role } = useAuth();
    isAuthenticated = authStatus;
    userRole = role;
  } catch (err) {
    const fallback = getAuthFallback();
    isAuthenticated = fallback.isAuthenticated;
    userRole = fallback.role;
    fallbackUsed = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn("RoleProtectedRoute: useAuth() failed. Using localStorage fallback.");
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * 🧩 Option 4: Custom Protection (Dynamic Logic)
 *
 * Example usage:
 *   <CustomProtectedRoute check={() => userOrg === 'CloudMasa-Tech'}>
 *     <InternalTools />
 *   </CustomProtectedRoute>
 *
 * @param {React.ReactNode} children - Protected content
 * @param {() => boolean} check - Custom access function
 * @returns {JSX.Element}
 */
const CustomProtectedRoute = ({ children, check }) => {
  let isAuthenticated = false;
  let fallbackUsed = false;

  try {
    const { isAuthenticated: authStatus } = useAuth();
    isAuthenticated = authStatus;
  } catch (err) {
    const fallback = getAuthFallback();
    isAuthenticated = fallback.isAuthenticated;
    fallbackUsed = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn("CustomProtectedRoute: useAuth() failed. Using localStorage fallback (auth only).");
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (check && typeof check === 'function' && !check()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * 🚨 No Access Inline Component (Optional)
 *
 * Use this if you prefer to show a message instead of redirecting.
 */
export const NoAccessComponent = ({ requiredPermission = "N/A" }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center p-6 max-w-md bg-gray-800 rounded-lg border border-gray-700">
        <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
        <p className="text-gray-300">
          You need the <span className="font-mono">{requiredPermission}</span> permission.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

/**
 * 📚 Usage Examples (for documentation)
 */
/*
// 1. Basic auth
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

// 2. Permission-based
<Route path="/deploy" element={
  <PermissionProtectedRoute permission="Job.Create">
    <DeployPage />
  </PermissionProtectedRoute>
} />

// 3. Role-based
<Route path="/policies" element={
  <RoleProtectedRoute requiredRole="super-admin">
    <Policies />
  </RoleProtectedRoute>
} />

// 4. Custom logic
<Route path="/internal" element={
  <CustomProtectedRoute check={() => org === 'CloudMasa'}>
    <InternalTools />
  </CustomProtectedRoute>
} />
*/

// 🔥 RECOMMENDATION: Use PermissionProtectedRoute as your main strategy
// But for backward compatibility, we keep ProtectedRoute as default

export default ProtectedRoute;
export {
  PermissionProtectedRoute,
  RoleProtectedRoute,
  CustomProtectedRoute,
};
