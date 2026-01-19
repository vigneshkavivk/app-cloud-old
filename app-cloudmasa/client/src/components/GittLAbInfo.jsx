import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth"; // ✅ RBAC hook

const GitLabInfo = () => {
  // 🔐 RBAC Permission Check
  const { hasPermission } = useAuth();
  const canViewDetails = hasPermission('Overall', 'Read');

  // 🔒 Block access if user lacks permission
  if (!canViewDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center p-6 max-w-md bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
          <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Overall.Read</span> permission to view this data.
          </p>
        </div>
      </div>
    );
  }

  // ✅ State Management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔄 Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from CloudMasa API endpoint
        const response = await fetch("http://api.cloudmasa.com/fetch-details");

        // Handle non-OK HTTP responses
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse JSON response
        const result = await response.json();

        // Validate data presence
        if (!result || Object.keys(result).length === 0) {
          throw new Error("No data available");
        }

        // Set data on success
        setData(result);
      } catch (err) {
        // Capture and display error message
        setError(err.message);
      } finally {
        // End loading state regardless of outcome
        setLoading(false);
      }
    };

    // Trigger data fetch
    fetchData();
  }, []); // Empty dependency → runs once on mount

  // 🕒 Loading State (with dark UI)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-lg">Loading GitLab details...</p>
      </div>
    );
  }

  // ❌ Error State (with red text for visibility)
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-red-400">
        <p className="text-lg">Error: {error}</p>
      </div>
    );
  }

  // ✅ Success State — Display formatted JSON
  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-800 rounded-lg text-white shadow-lg border border-gray-700">
      <h2 className="text-2xl font-bold mb-4">GitLab Configuration Details:</h2>
      <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm whitespace-pre-wrap break-words font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default GitLabInfo;