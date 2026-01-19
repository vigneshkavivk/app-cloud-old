import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth"; // ✅ RBAC hook

const FetchDetails = () => {
  const { hasPermission } = useAuth();
  const canViewDetails = hasPermission('Overall', 'Read'); // Required permission

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

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://api.cloudmasa.com/fetch-details");

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        // Check if data is empty or invalid
        if (!result || Object.keys(result).length === 0) {
          throw new Error("No data available");
        }

        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-red-400">
        <p className="text-lg">Error: {error}</p>
      </div>
    );
  }

  // Success state — display data
  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-800 rounded-lg text-white shadow-lg border border-gray-700">
      <h2 className="text-2xl font-bold mb-4">Fetched Data:</h2>
      <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default FetchDetails;