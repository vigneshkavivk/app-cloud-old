import React, { useState, useEffect, useCallback } from "react";
import ConnectSourceCode from "./ConnectSourceCode";  // Your ConnectSourceCode component
import ControlCenter from "./ControlCenter";          // Your ControlCenter component
import { Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";           // ✅ RBAC hook
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ParentComponent
 * 
 * Orchestrates the main SCM & Deployment workspace.
 * Features:
 * - RBAC-based conditional rendering
 * - Shared repository state between child components
 * - Graceful fallbacks for restricted users
 * - Accessibility & UX enhancements
 */
const ParentComponent = () => {
  // 🔐 RBAC Permission Checks
  const { hasPermission } = useAuth();
  const canView = hasPermission('Overall', 'Read');       // View page
  const canConnect = hasPermission('Credentials', 'Create'); // Connect repos
  const canControl = hasPermission('Job', 'Create');      // Run deployments

  // 🔒 Block access if user lacks basic view permission
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center p-6 max-w-md bg-gray-800/70 backdrop-blur-lg rounded-xl border border-red-900/30 shadow-2xl">
          <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Overall.Read</span> permission to view this page.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Contact your administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  // 🧠 State
  const [repositories, setRepositories] = useState([]);
  const [selectedRepository, setSelectedRepository] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔄 Sync repositories safely
  const safeSetRepositories = useCallback((newRepos) => {
    if (Array.isArray(newRepos)) {
      setRepositories(newRepos);
      if (newRepos.length > 0 && !selectedRepository) {
        setSelectedRepository(newRepos[0].name || newRepos[0]);
      }
    } else {
      console.warn("Received invalid repositories data:", newRepos);
      setRepositories([]);
    }
  }, [selectedRepository]);

  // 🎯 Handle repository selection with validation
  const handleSelectRepository = useCallback((repo) => {
    if (typeof repo === 'string' || (repo && typeof repo.name === 'string')) {
      setSelectedRepository(repo.name || repo);
    } else {
      console.warn("Invalid repository selection:", repo);
    }
  }, []);

  // 📡 Optional: Fetch repos on mount (if needed beyond child components)
  useEffect(() => {
    // Placeholder: could fetch from API if global repo context is needed
    // setIsLoading(true);
    // try { ... } finally { setIsLoading(false); }
  }, []);

  // 🧪 Debug helper (optional in dev)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ParentComponent permissions:', {
        canView,
        canConnect,
        canControl
      });
    }
  }, [canView, canConnect, canControl]);

  // 🎨 UI Rendering
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Source Control & Deployment</h1>
        <p className="text-gray-400 mt-1">
          Manage repositories and deploy infrastructure securely.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {canConnect && (
            <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
              Repository Access
            </span>
          )}
          {canControl && (
            <span className="px-3 py-1 bg-orange-900/30 text-orange-300 rounded-full text-xs">
              Deployment Access
            </span>
          )}
          {!canConnect && !canControl && (
            <span className="px-3 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">
              View Only
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col gap-6">
        {/* Connect Source Code Section */}
        <AnimatePresence mode="wait">
          {canConnect ? (
            <motion.section
              key="connect"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-xl font-semibold mb-3 text-white flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Connect Source Code
              </h2>
              <ConnectSourceCode setRepositories={safeSetRepositories} />
            </motion.section>
          ) : null}
        </AnimatePresence>

        {/* Control Center Section */}
        <AnimatePresence mode="wait">
          {canControl ? (
            <motion.section
              key="control"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <h2 className="text-xl font-semibold mb-3 text-white flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Deployment Control Center
              </h2>
              <ControlCenter
                repositories={repositories}
                selectedRepository={selectedRepository}
                setSelectedRepository={handleSelectRepository}
              />
            </motion.section>
          ) : null}
        </AnimatePresence>

        {/* No Permission Fallback */}
        <AnimatePresence>
          {!canConnect && !canControl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700"
            >
              <div className="inline-block p-4 bg-gray-900/50 rounded-full mb-4">
                <Lock className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Limited Access
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Your role does not permit connecting repositories or initiating deployments.
                You can view this page but cannot perform actions.
              </p>
              <div className="mt-4 text-sm text-gray-600">
                Required permissions:
                <ul className="mt-1 text-gray-500">
                  <li>• <span className="font-mono">Credentials.Create</span> → Connect repos</li>
                  <li>• <span className="font-mono">Job.Create</span> → Run deployments</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-6 text-center text-xs text-gray-600 border-t border-gray-800">
        <p>
          CloudMaSa SCM & Deployment Workspace • Permissions enforced by RBAC policy engine
        </p>
      </footer>
    </div>
  );
};

// 🔒 Optional: Wrap with error boundary in production
// export default withErrorBoundary(ParentComponent);

export default ParentComponent;