// src/components/ClustersPage.jsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Plus,
  RefreshCw,
  Settings,
  ArrowLeftCircle,
  Cloud,
  XCircle,
  Search,
} from "lucide-react";
import api from "../interceptor/api.interceptor";
import AddCluster from "./AddCluster";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../hooks/useAuth';

// ✅ Cluster Card — identical size & style to CloudConnector card + live node count
const ClusterCard = ({ 
  title, 
  status, 
  region, 
  nodes, 
  version, 
  account,           
  accountName,       
  onClick,
  onRemove,
  canManage = false,
  liveNodeCount       // 👈 NEW PROP
}) => (
  <div
    className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full border border-[#3a5b9b] w-full min-w-[300px]"
  >
    {/* Header */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Server className="text-[#F26A2E]" size={20} />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          status === "running"
            ? "bg-green-600 text-white"
            : status === "stopped"
            ? "bg-red-600 text-white"
            : "bg-yellow-600 text-white"
        }`}
      >
        {status}
      </span>
    </div>

    {/* Details */}
    <div className="space-y-3 text-sm flex-1">
      <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Region:</span>
        <span className="text-white">{region || 'N/A'}</span>
      </div>
      <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Nodes:</span>
        <span className="text-white">
          {liveNodeCount !== undefined ? liveNodeCount : nodes || 0}
        </span>
      </div>
      <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Version:</span>
        <span className="text-white">v{version || 'N/A'}</span>
      </div>
      <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Account:</span>
        <span className="text-white truncate max-w-[180px] block">
          {accountName || account || '—'}
        </span>
      </div>
    </div>

    {/* Actions */}
    <div className="mt-5 pt-3 border-t border-white border-opacity-10 flex gap-2">
      <button
        className="flex-1 py-2 text-gray-300 hover:text-white text-sm font-medium flex items-center justify-center gap-1 transition-colors bg-gray-700 bg-opacity-30 rounded-md"
      >
        <Settings size={14} />
        Config
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        disabled={!canManage || status !== "running"}
        className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1 rounded-md transition-colors ${
          canManage && status === "running"
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-gray-600 text-gray-400 cursor-not-allowed"
        }`}
      >
        Connect
      </button>

      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
              onRemove();
            }
          }}
          className="px-3 py-2 text-red-400 hover:text-red-300 flex items-center justify-center bg-red-500 bg-opacity-10 hover:bg-red-500 hover:bg-opacity-20 rounded-md"
          title="Remove Cluster"
        >
          <XCircle size={14} />
        </button>
      )}
    </div>

    {/* Animated Diagonal Overlay */}
    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
  </div>
);

const ClustersPage = () => {
  const [clusters, setClusters] = useState([]);
  const [view, setView] = useState("list");
  const [showAddClusterPopup, setShowAddClusterPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [liveNodeCounts, setLiveNodeCounts] = useState({}); // 👈 For live node data

  // ✅ Use fine-grained permissions
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('Credentials', 'Create');
  const canDelete = hasPermission('Credentials', 'Delete');
  const canManage = canCreate || canDelete;

  // 🔒 Access Control
  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2633] text-white">
        <div className="text-center p-8 bg-[#2A4C83] rounded-xl">
          <h2 className="text-2xl font-bold text-red-400">🔒 Access Denied</h2>
          <p>You need Credentials Create/Delete permission to manage clusters.</p>
        </div>
      </div>
    );
  }

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/clusters/get-clusters");
      setClusters(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching clusters:", error);
      setClusters([]);
      toast.error("Failed to load clusters");
    } finally {
      setLoading(false);
    }
  };

  // 👇 Fetch live node counts when clusters change
  useEffect(() => {
    if (clusters.length === 0) return;
    const fetchLiveCounts = async () => {
      const counts = {};
      for (const c of clusters) {
        try {
          const res = await api.get(`/api/clusters/get-live-node-count/${c._id}`);
          if (res.data?.success) {
            counts[c._id] = res.data.nodeCount;
          }
        } catch (err) {
          console.warn("Live node count failed for cluster:", c._id);
        }
      }
      setLiveNodeCounts(counts);
    };
    fetchLiveCounts();
  }, [clusters]);

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleClusterSelect = async (cluster) => {
    if (!canManage) {
      toast.warn("You don't have permission to connect to clusters.");
      return;
    }
    if (cluster.status !== "running") {
      toast.warn("Only running clusters can be connected.");
      return;
    }

    try {
      const response = await api.post("/api/clusters/connect-cluster", {
        clusterId: cluster._id || cluster.id,
        name: cluster.name,
        region: cluster.region,
        account: cluster.account,
      });

      if (response.data.success) {
        toast.success(`✅ Connected to: ${cluster.name}`);
      } else {
        toast.error("❌ Connection failed: " + (response.data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("⚠️ Failed to connect. Check console for details.");
    }
  };

  const handleRemoveCluster = async (clusterId) => {
    // ✅ Check delete permission
    if (!canDelete) {
      toast.error("You don't have permission to delete clusters.");
      return;
    }

    try {
      await api.delete(`/api/clusters/${clusterId}`);
      toast.success("Cluster removed successfully!");
      fetchClusters();
    } catch (error) {
      console.error("Error deleting cluster:", error);
      toast.error("Failed to remove cluster");
    }
  };

  const handleAddClusterClick = () => {
    // ✅ Check create permission
    if (!canCreate) {
      toast.error("You don't have permission to add clusters.");
      return;
    }
    setShowAddClusterPopup(true);
  };

  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);

  const handleCreateClusterClick = () => {
    // ✅ Check create permission
    if (!canCreate) {
      toast.error("You don't have permission to create clusters.");
      return;
    }
    setView("create");
    setShowAddClusterPopup(false);
  };

  const handleAddExistingClusterClick = () => {
    // ✅ Check create permission
    if (!canCreate) {
      toast.error("You don't have permission to add clusters.");
      return;
    }
    setView("add-existing");
    setShowAddClusterPopup(false);
  };

  const handleBackToClusters = async () => {
    setIsRefetching(true);
    await fetchClusters();
    setIsRefetching(false);
    setView("list");
  };

  const filteredClusters = clusters.filter((cluster) => {
    const name = typeof cluster.name === "string" ? cluster.name : "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || cluster.status === statusFilter;
    const matchesRegion = regionFilter === "all" || cluster.region === regionFilter;
    return matchesSearch && matchesStatus && matchesRegion;
  });

  if (view === "create") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-10 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-[#F26A2E]">Create Cluster</h1>
            <button
              onClick={handleBackToClusters}
              className="bg-[#F26A2E] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition"
            >
              <ArrowLeftCircle size={18} />
              Back
            </button>
          </div>
          <div className="bg-[#2A3B4F] p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Create New Cluster Form (Coming Soon)</h2>
          </div>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    );
  }

  if (view === "add-existing") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-10 text-white">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleBackToClusters}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <ArrowLeftCircle size={18} />
            Back
          </button>
          <AddCluster onClusterAdded={fetchClusters} />
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    );
  }

  if (view === "manager") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-10 text-white">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={handleBackToClusters}
            className="mb-4 flex items-center text-blue-400 hover:text-blue-300"
          >
            <ArrowLeftCircle size={18} className="mr-2" />
            Back to Clusters
          </button>
          <div className="bg-[#2A3B4F] p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">AWS Accounts Manager (Coming Soon)</h2>
          </div>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    );
  }

  // ✅ Main View — with matching grid layout
  return (
    <div className="min-h-screen p-10 bg-[#1E2633] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#F26A2E]">Clusters</h1>
            <p className="text-gray-400">Manage your Kubernetes clusters</p>
          </div>
          {canManage && (
            <button
              onClick={handleAddClusterClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={16} />
              Add Cluster
            </button>
          )}
        </div>

        <div className="flex gap-4 mb-8 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clusters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2A3B4F] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#2A3B4F] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2 bg-[#2A3B4F] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Regions</option>
            <option value="us-east-1">US East 1</option>
            <option value="us-west-2">US West 2</option>
            <option value="eu-west-1">EU West 1</option>
          </select>
        </div>

        {isRefetching && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-white">Refreshing clusters...</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-white">Loading clusters...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredClusters.length > 0 ? (
              filteredClusters
                .filter(cluster => cluster.name)
                .map((cluster) => (
                  <ClusterCard
                    key={cluster._id || cluster.id || `${cluster.name}-${cluster.region}`}
                    title={cluster.name}
                    status={cluster.status || "unknown"}
                    region={cluster.region || "N/A"}
                    nodes={cluster.nodes || 0}
                    version={cluster.version || "N/A"}
                    account={cluster.account || "N/A"}
                    accountName={cluster.accountName || undefined}
                    onClick={() => handleClusterSelect(cluster)}
                    onRemove={() => handleRemoveCluster(cluster._id || cluster.id)}
                    canManage={canManage}
                    liveNodeCount={liveNodeCounts[cluster._id]}
                  />
                ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                <XCircle size={48} className="mx-auto mb-4" />
                <h3 className="text-xl font-semibold">No clusters found</h3>
                <p className="text-sm">Try changing your filters or add a new cluster.</p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setRegionFilter("all");
                  }}
                  className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
                >
                  <RefreshCw size={16} />
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Cluster Popup */}
        {showAddClusterPopup && canManage && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleCloseAddClusterPopup}
            />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#2A4C83] p-8 rounded-xl shadow-2xl w-full max-w-md z-50 text-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add or Create Cluster</h2>
                <button
                  onClick={handleCloseAddClusterPopup}
                  className="text-white hover:text-red-500 transition"
                >
                  <XCircle size={24} />
                </button>
              </div>
              <p className="text-gray-300 mb-4">Select how you’d like to proceed:</p>
              <div className="flex gap-4">
                <div
                  onClick={handleAddExistingClusterClick}
                  className="border-2 border-gray-200 rounded-lg p-5 flex-1 text-center cursor-pointer hover:shadow-lg transition bg-gray-800 hover:bg-gray-700"
                >
                  <Plus className="text-green-600 mx-auto mb-2" size={32} />
                  <p className="text-white">Add Existing</p>
                </div>
                <div
                  onClick={handleCreateClusterClick}
                  className="border-2 border-gray-200 rounded-lg p-5 flex-1 text-center cursor-pointer hover:shadow-lg transition bg-gray-800 hover:bg-gray-700"
                >
                  <Cloud className="text-blue-600 mx-auto mb-2" size={32} />
                  <p className="text-white">Create New</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ClustersPage;