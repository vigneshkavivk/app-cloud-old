import React, { useEffect, useState } from "react";
import axios from "axios";
import AccountComponent from "./AccountConsole";
import api from "../interceptor/api.interceptor";

const AWSAccountsList = () => {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fetchingCredentials, setFetchingCredentials] = useState(false);

  useEffect(() => {
    const fetchClusters = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/get-clusters");
        // const response = await axios.get("http://localhost:3000/api/get-clusters");
        setClusters(response.data);
      } catch (err) {
        setError("Failed to fetch AWS accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchClusters();
  }, []);

  const handleClusterClick = async (cluster) => {
    setSelectedCluster(cluster);
    setFetchingCredentials(true);
    setError(null);

    try {
      const response = await api.get(`/api/get-cluster-credentials/${cluster.clusterName}`);
      // const response = await axios.get(`http://localhost:3000/api/get-cluster-credentials/${cluster.clusterName}`);
      setCredentials(response.data);
    } catch (err) {
      setError("Failed to fetch AWS credentials");
    } finally {
      setFetchingCredentials(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-lg">
      {selectedCluster ? (
        fetchingCredentials ? (
          <p className="text-center text-gray-400">Fetching credentials...</p>
        ) : (
          <AccountComponent awsConfig={credentials} />
        )
      ) : (
        <>
          <h2 className="text-2xl font-semibold text-center mb-4" style={{ color: "#0ff" }}>Connected AWS account</h2>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search clusters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 mb-4 border border-gray-600 rounded-md bg-gray-800 text-white"
          />

          {loading && <p className="text-center text-gray-400">Loading...</p>}
          {error && <p className="text-red-500 text-center">{error}</p>}

          {/* Clusters List */}
          <ul className="divide-y divide-gray-700">
            {clusters
              .filter((cluster) => cluster.clusterName.includes(searchTerm))
              .map((cluster) => (
                <li
                  key={cluster._id}
                  onClick={() => handleClusterClick(cluster)}
                  className="p-4 cursor-pointer transition hover:bg-gray-800 rounded-md"
                >
                  <p className="text-lg font-medium">{cluster.clusterName}</p>
                  <p className="text-gray-400">Account: {cluster.awsAccountNumber}</p>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default AWSAccountsList;
