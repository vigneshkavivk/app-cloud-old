// src/components/ClusterConfigPage.jsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// ✅ FIXED: Added BarChart3 + all icons from reference version
import {
  Box,
  Database,
  Cloud,
  Server,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Layers,
  Grid,
  Terminal,
  Globe,
  Shield,
  Clock,
  Users,
  BarChart3, // ✅ Critical fix
  Cpu,
  HardDrive,
  Zap,
  ArrowLeft,
  Trash2,
  AlertTriangle,
} from "lucide-react";

// Charts
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ==============================
// 🔐 ROLE-BASED ACCESS CONTROL
// ==============================
const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  DEVOPS: "devops",
  DEVELOPER: "developer",
  USER: "user",
  GUEST: "guest",
  VIEWER: "viewer",
};

const hasPermission = (userRole, requiredRoles) => {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
};

const PERMISSIONS = {
  VIEW_EVENTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DEVOPS],
  VIEW_INGRESSES: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DEVOPS, ROLES.DEVELOPER],
  VIEW_KUBE_SYSTEM: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DEVOPS],
  VIEW_METRICS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DEVOPS, ROLES.DEVELOPER],
  VIEW_NODE_DETAILS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DEVOPS],
  REFRESH_DATA: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DEVOPS, ROLES.DEVELOPER],
  NAVIGATE_BACK: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.DEVOPS, ROLES.DEVELOPER, ROLES.USER, ROLES.VIEWER],
  DESTROY_CLUSTER: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
};

// ==============================
// 🧩 REUSABLE COMPONENTS — ClustersPage UI STYLE
// ==============================
const StatusBadge = ({ status, size = "md", userRole }) => {
  const statusConfig = {
    Running: { bg: "bg-emerald-500/20", text: "text-emerald-300", icon: CheckCircle },
    Ready: { bg: "bg-emerald-500/20", text: "text-emerald-300", icon: CheckCircle },
    healthy: { bg: "bg-emerald-500/20", text: "text-emerald-300", icon: CheckCircle },
    Pending: { bg: "bg-amber-500/20", text: "text-amber-300", icon: Activity },
    Failed: { bg: "bg-red-500/20", text: "text-red-300", icon: XCircle },
    "Not Ready": { bg: "bg-red-500/20", text: "text-red-300", icon: XCircle },
    degraded: { bg: "bg-red-500/20", text: "text-red-300", icon: XCircle },
    Unknown: { bg: "bg-slate-500/20", text: "text-slate-300", icon: AlertCircle },
    Active: { bg: "bg-emerald-500/20", text: "text-emerald-300", icon: CheckCircle },
  };

  const isVisible =
    !["guest", "viewer"].includes(userRole) ||
    !["Not Ready", "Failed", "degraded"].includes(status);

  if (!isVisible) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  const config = statusConfig[status] || { bg: "bg-slate-500/20", text: "text-slate-300", icon: AlertCircle };
  const Icon = config.icon;
  const sizeClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className={sizeClass} />
      {status}
    </span>
  );
};

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-xl p-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
      <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-white hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-[#0ea5e9]" />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <svg
          className={`h-5 w-5 text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="p-5 border-t border-white/10">{children}</div>}
    </div>
  );
};

const MetricCard = ({ label, value, subtext, icon: Icon, color = "blue" }) => {
  const colorMap = {
    blue: { from: "#3b82f6", to: "#0ea5e9" },
    green: { from: "#10b981", to: "#0ea5e9" },
    red: { from: "#ef4444", to: "#f97316" },
    purple: { from: "#8b5cf6", to: "#60a5fa" },
    orange: { from: "#f97316", to: "#f59e0b" },
    cyan: { from: "#0ea5e9", to: "#22d3ee" },
  };
  const { from, to } = colorMap[color] || colorMap.blue;

  return (
    <div className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
      <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 0 12px ${from}40` }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const DataTable = ({ columns, data = [], rowKey }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Database className="h-10 w-10 mx-auto text-gray-600 mb-2" />
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="min-w-full text-sm text-gray-200">
        <thead>
          <tr className="border-b border-white/20">
            {columns.map((col, i) => (
              <th key={i} className="py-3 px-4 text-left font-medium text-gray-400 uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {data.map((row, idx) => (
            <tr key={rowKey ? rowKey(row, idx) : idx} className="hover:bg-white/5 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="py-3 px-4">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==============================
// 📊 MAIN COMPONENT
// ==============================
const ClusterConfigPage = ({ clusterId: propClusterId, onBack }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routeClusterId } = useParams();

  const [cluster, setCluster] = useState(null);
  const [clusterMeta, setClusterMeta] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [services, setServices] = useState([]);
  const [ingresses, setIngresses] = useState([]);
  const [events, setEvents] = useState([]);
  const [kubeSystemStatus, setKubeSystemStatus] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNodeDetails, setShowNodeDetails] = useState(false);
  const [showDestroyModal, setShowDestroyModal] = useState(false);

  const clusterId = propClusterId || routeClusterId;

  // 🔐 Role-based visibility
  const canViewEvents = useMemo(() => hasPermission(user?.role, PERMISSIONS.VIEW_EVENTS), [user?.role]);
  const canViewIngresses = useMemo(() => hasPermission(user?.role, PERMISSIONS.VIEW_INGRESSES), [user?.role]);
  const canViewKubeSystem = useMemo(() => hasPermission(user?.role, PERMISSIONS.VIEW_KUBE_SYSTEM), [user?.role]);
  const canViewMetrics = useMemo(() => hasPermission(user?.role, PERMISSIONS.VIEW_METRICS), [user?.role]);
  const canViewNodeDetails = useMemo(() => hasPermission(user?.role, PERMISSIONS.VIEW_NODE_DETAILS), [user?.role]);
  const canRefresh = useMemo(() => hasPermission(user?.role, PERMISSIONS.REFRESH_DATA), [user?.role]);
  const canNavigateBack = useMemo(() => hasPermission(user?.role, PERMISSIONS.NAVIGATE_BACK), [user?.role]);
  const canDestroyCluster = useMemo(() => hasPermission(user?.role, PERMISSIONS.DESTROY_CLUSTER), [user?.role]);

  // ✅ Fetch cluster config — matches reference logic
  const fetchClusterConfig = useCallback(async () => {
    if (!clusterId) return;
    try {
      const response = await fetch(`http://localhost:3000/api/clusters/${clusterId}/config`, {
        headers: { 'Authorization': `Bearer ${user?.token || ''}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setCluster(data.cluster);
      setClusterMeta(data.liveData?.resourceSummary || {});
      if (data.liveData?.nodes?.items) {
        setNodes(data.liveData.nodes.items);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [clusterId, user?.token]);

  // ✅ Fetch all data — matches reference logic
  const fetchData = useCallback(async () => {
    if (!clusterId) return;

    const endpoints = [
      { key: "namespaces", setter: setNamespaces, endpoint: `http://localhost:3000/api/clusters/${clusterId}/namespaces` },
      { key: "workloads", setter: setWorkloads, endpoint: `http://localhost:3000/api/clusters/${clusterId}/workloads` },
      { key: "services", setter: setServices, endpoint: `http://localhost:3000/api/clusters/${clusterId}/services` },
      ...(canViewIngresses
        ? [{ key: "ingresses", setter: setIngresses, endpoint: `http://localhost:3000/api/clusters/${clusterId}/ingresses` }]
        : []),
      ...(canViewEvents
        ? [{ key: "events", setter: setEvents, endpoint: `http://localhost:3000/api/clusters/${clusterId}/events` }]
        : []),
      ...(canViewKubeSystem
        ? [{ key: "kubeSystem", setter: setKubeSystemStatus, endpoint: `http://localhost:3000/api/clusters/${clusterId}/kube-system` }]
        : []),
      ...(canViewMetrics
        ? [{ key: "metrics", setter: setMetrics, endpoint: `http://localhost:3000/api/clusters/${clusterId}/metrics` }]
        : []),
      ...(canViewNodeDetails
        ? [{ key: "nodes", setter: setNodes, endpoint: `http://localhost:3000/api/clusters/${clusterId}/nodes` }]
        : []),
      { key: "pods", setter: setPods, endpoint: `http://localhost:3000/api/clusters/${clusterId}/pods` },
    ];

    for (const { key, setter, endpoint } of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${user?.token || ''}` },
        });
        if (response.ok) {
          const data = await response.json();
          setter(data);
        } else {
          console.warn(`⚠️ Failed to fetch ${key}: ${response.status}`);
          setter([]);
        }
      } catch (err) {
        console.error(`❌ Error fetching ${key}:`, err);
        setter([]);
      }
    }
  }, [clusterId, canViewIngresses, canViewEvents, canViewKubeSystem, canViewMetrics, canViewNodeDetails, user?.token]);

  const refreshData = async () => {
    if (!canRefresh) return;
    setRefreshing(true);
    await Promise.all([fetchClusterConfig(), fetchData()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchClusterConfig(), fetchData()]);
      setLoading(false);
    };
    loadData();
  }, [fetchClusterConfig, fetchData]);
useEffect(() => {
  console.log('[DEBUG] routeClusterId:', routeClusterId);
  console.log('[DEBUG] propClusterId:', propClusterId);
  console.log('[DEBUG] resolved clusterId:', clusterId);
  console.log('[DEBUG] cluster from API:', cluster);
}, [routeClusterId, propClusterId, clusterId, cluster]);
  // ==============================
  // 🗑️ CONFIRMATION MODAL — FULL ClustersPage STYLE + user access
  // ==============================
  const ConfirmationModal = ({ isOpen, onClose, clusterName, clusterId }) => {
    const [confirmInput, setConfirmInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (confirmInput !== clusterName) return;

      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:3000/api/clusters/${clusterId}/destroy`, {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${user?.token || ''}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          alert("✅ Cluster destroyed successfully!");
          window.location.reload();
        } else {
          const error = await response.json();
          alert(`❌ Failed to destroy cluster: ${error.message || response.statusText}`);
        }
      } catch (err) {
        alert(`❌ Error destroying cluster: ${err.message}`);
      } finally {
        setIsLoading(false);
        onClose();
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div
          className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-xl border border-white/20 w-full max-w-md p-6 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-white opacity-5 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] transition-all duration-700 pointer-events-none" />
          
          <div className="flex items-start gap-3 relative z-10">
            <AlertTriangle className="h-6 w-6 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Destroy Cluster</h3>
              <p className="text-gray-300 mt-1">
                This action cannot be undone. This will permanently delete the cluster{" "}
                <span className="font-mono bg-gray-800/50 px-1 rounded">{clusterName}</span> and all its resources.
              </p>
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <p className="text-sm text-gray-400">
                  Type the cluster name to confirm:
                </p>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-white focus:ring-1 focus:ring-[#0ea5e9] outline-none text-sm placeholder-gray-400"
                  placeholder={`Type "${clusterName}"`}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 py-2 text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/20 rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirmInput !== clusterName || isLoading}
                    className="flex-1 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-orange-600 rounded transition shadow"
                  >
                    {isLoading ? "Destroying..." : "Destroy"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==============================
  // 🖼️ RENDERING
  // ==============================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-6 relative overflow-hidden">
        <style>{`
          .dashboard-bg { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            z-index: -2; pointer-events: none; 
            background-image: 
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 30px 30px; 
          }
          .animated-gradient-bg { 
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            z-index: -1; opacity: 0.1; 
            background: conic-gradient(from 0deg, #0ea5e9, #0f172a, #60a5fa, #0f172a, #0ea5e9); 
            background-size: 400% 400%; 
            animation: gradientShift 20s ease infinite; 
            filter: blur(60px); 
          }
          @keyframes gradientShift { 
            0% { background-position: 0% 50%; } 
            50% { background-position: 100% 50%; } 
            100% { background-position: 0% 50%; } 
          }
        `}</style>
        <div className="dashboard-bg"></div>
        <div className="animated-gradient-bg"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/10 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-xl p-4 overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-5 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] transition-all duration-700 pointer-events-none" />
                  <div className="h-4 bg-white/20 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-white/20 rounded w-1/4"></div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-xl p-4 overflow-hidden">
                  <div className="absolute inset-0 bg-white opacity-5 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] transition-all duration-700 pointer-events-none" />
                  <div className="h-6 bg-white/20 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-4 bg-white/20 rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-6 relative overflow-hidden">
        <style>{`
          .dashboard-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 30px 30px; }
          .animated-gradient-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; opacity: 0.1; background: conic-gradient(from 0deg, #0ea5e9, #0f172a, #60a5fa, #0f172a, #0ea5e9); background-size: 400% 400%; animation: gradientShift 20s ease infinite; filter: blur(60px); }
          @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        `}</style>
        <div className="dashboard-bg"></div>
        <div className="animated-gradient-bg"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="relative bg-red-900/20 border border-red-800/40 rounded-xl p-4 flex items-center overflow-hidden">
            <div className="absolute inset-0 bg-red-500 opacity-5 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] transition-all duration-700 pointer-events-none" />
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 relative z-10" />
            <span className="text-red-300 relative z-10">Error loading cluster data: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 text-gray-200 relative overflow-hidden">
      <style>{`
        .dashboard-bg { 
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          z-index: -2; pointer-events: none; 
          background-image: 
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 30px 30px; 
        }
        .animated-gradient-bg { 
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          z-index: -1; opacity: 0.1; 
          background: conic-gradient(from 0deg, #0ea5e9, #0f172a, #60a5fa, #0f172a, #0ea5e9); 
          background-size: 400% 400%; 
          animation: gradientShift 20s ease infinite; 
          filter: blur(60px); 
        }
        @keyframes gradientShift { 
          0% { background-position: 0% 50%; } 
          50% { background-position: 100% 50%; } 
          100% { background-position: 0% 50%; } 
        }
      `}</style>
      <div className="dashboard-bg"></div>
      <div className="animated-gradient-bg"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <h1 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {cluster?.name || "Cluster Configuration"}
                </span>
              </h1>
            </div>
            <p className="text-gray-400 mt-1">
              {cluster?.region && `Region: ${cluster.region} • `}
              {cluster?.version && `Kubernetes ${cluster.version} • `}
              {cluster?.status && <StatusBadge status={cluster.status} userRole={user?.role} />}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canNavigateBack && onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-white/10 rounded-lg hover:from-gray-600/50 hover:to-gray-700/50 transition shadow"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {canRefresh && (
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg hover:from-blue-700 hover:to-cyan-600 transition shadow disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            )}
            {canDestroyCluster && cluster && (
              <button
                onClick={() => setShowDestroyModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-orange-600 rounded-lg hover:from-red-700 hover:to-orange-700 transition shadow"
              >
                <Trash2 className="h-4 w-4" />
                Destroy Cluster
              </button>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-8">
          <MetricCard
            label="Nodes"
            value={clusterMeta?.nodes?.ready ?? 0}
            subtext={`${clusterMeta?.nodes?.total ?? 0} total`}
            icon={Server}
            color="blue"
          />
          <MetricCard
            label="Pods"
            value={clusterMeta?.pods?.running ?? 0}
            subtext={`${clusterMeta?.pods?.total ?? 0} total`}
            icon={Box}
            color="green"
          />
          <MetricCard label="Deployments" value={clusterMeta?.deployments ?? 0} icon={Grid} color="purple" />
          <MetricCard label="Services" value={clusterMeta?.services ?? 0} icon={Globe} color="orange" />
          <MetricCard label="Namespaces" value={clusterMeta?.namespaces ?? 0} icon={Layers} color="cyan" />
        </div>

        {/* Sections */}
        <div className="space-y-5">
          {/* Nodes */}
          <div className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-xl p-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
            
            <button
              onClick={() => setShowNodeDetails(!showNodeDetails)}
              className="w-full px-5 py-4 flex items-center justify-between text-white hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-[#0ea5e9]" />
                <h3 className="text-base font-semibold">Nodes</h3>
              </div>
              <svg
                className={`h-5 w-5 text-slate-300 transition-transform ${showNodeDetails ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showNodeDetails && (
              <div className="p-5 border-t border-white/10 space-y-5">
                {nodes.map((node) => (
                  <div key={node.name} className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-lg p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-white opacity-5 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] transition-all duration-700 pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-gray-400" />
                        <h4 className="font-medium text-white">{node.name}</h4>
                      </div>
                      <StatusBadge status={node.status} userRole={user?.role} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 text-sm">
                      <div className="bg-white/5 p-2 rounded">
                        <p className="text-gray-400">Role</p>
                        <p className="text-white">{node.role}</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded">
                        <p className="text-gray-400">Instance</p>
                        <p className="text-white font-mono">{node.instanceType}</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded">
                        <p className="text-gray-400">OS</p>
                        <p className="text-white">{node.os}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      Age: <span className="text-white">{node.age ? `${Math.floor(node.age / 86400000)}d` : "—"}</span>
                    </p>

                    <div>
                      <h5 className="text-sm font-medium text-gray-200 mb-2 flex items-center gap-1">
                        <Box className="h-3.5 w-3.5" /> Pods on this node
                      </h5>
                      <DataTable
                        columns={[
                          { key: "name", header: "Name", render: (val) => <span className="font-mono">{val}</span> },
                          { key: "namespace", header: "Namespace" },
                          { key: "status", header: "Status", render: (val) => <StatusBadge status={val} userRole={user?.role} /> },
                          { key: "restarts", header: "Restarts" },
                          { key: "age", header: "Age", render: (val) => `${Math.floor(val / 86400000)}d` },
                        ]}
                        data={pods.filter(pod => pod.node === node.name)}
                        rowKey={(row) => `${row.namespace}/${row.name}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Namespaces */}
          <CollapsibleSection title="Namespaces" icon={Layers}>
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (val) => <span className="font-mono">{val}</span> },
                { key: "status", header: "Status", render: (val) => <StatusBadge status={val} userRole={user?.role} /> },
                { key: "age", header: "Age", render: (val) => `${Math.floor(val / 86400000)}d` },
              ]}
              data={namespaces}
              rowKey={(row) => row.name}
            />
          </CollapsibleSection>

          {/* Workloads */}
          <CollapsibleSection title="Workloads" icon={Box}>
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (val) => <span className="font-mono">{val}</span> },
                { key: "namespace", header: "Namespace" },
                { key: "type", header: "Type" },
                { key: "ready", header: "Ready", render: (val, row) => `${val}/${row.replicas ?? "?"}` },
                { key: "status", header: "Status", render: (val) => <StatusBadge status={val} userRole={user?.role} /> },
                { key: "age", header: "Age", render: (val) => `${Math.floor(val / 86400000)}d` },
              ]}
              data={workloads}
              rowKey={(row) => `${row.namespace}/${row.name}`}
            />
          </CollapsibleSection>

          {/* Services */}
          <CollapsibleSection title="Services" icon={Globe}>
            <DataTable
              columns={[
                { key: "name", header: "Name", render: (val) => <span className="font-mono">{val}</span> },
                { key: "namespace", header: "Namespace" },
                { key: "type", header: "Type" },
                { key: "clusterIP", header: "Cluster IP" },
                { key: "ports", header: "Ports", render: (val) => (Array.isArray(val) ? val.join(", ") : val) },
                { key: "age", header: "Age", render: (val) => `${Math.floor(val / 86400000)}d` },
              ]}
              data={services}
              rowKey={(row) => `${row.namespace}/${row.name}`}
            />
          </CollapsibleSection>

          {canViewIngresses && (
            <CollapsibleSection title="Ingresses" icon={Cloud}>
              <DataTable
                columns={[
                  { key: "name", header: "Name", render: (val) => <span className="font-mono">{val}</span> },
                  { key: "namespace", header: "Namespace" },
                  { key: "hosts", header: "Hosts", render: (val) => (Array.isArray(val) ? val.join(", ") : val) },
                  { key: "paths", header: "Paths", render: (val) => (Array.isArray(val) ? val.join(", ") : val) },
                  { key: "age", header: "Age", render: (val) => `${Math.floor(val / 86400000)}d` },
                ]}
                data={ingresses}
                rowKey={(row) => `${row.namespace}/${row.name}`}
              />
            </CollapsibleSection>
          )}

          {canViewEvents && (
            <CollapsibleSection title="Events" icon={Activity}>
              <DataTable
                columns={[
                  { key: "type", header: "Type", render: (val) => <StatusBadge status={val} userRole={user?.role} /> },
                  { key: "reason", header: "Reason" },
                  { key: "message", header: "Message", render: (val) => <span className="text-sm line-clamp-2 max-w-xs">{val}</span> },
                  { key: "namespace", header: "Namespace" },
                  { key: "timestamp", header: "Time", render: (val) => new Date(val).toLocaleTimeString() },
                ]}
                data={events}
                rowKey={(row, i) => `${row.namespace}-${i}`}
              />
            </CollapsibleSection>
          )}

          {canViewMetrics && metrics.length > 0 && (
            <CollapsibleSection title="Resource Metrics (24h)" icon={BarChart3}> {/* ✅ Now safe */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0c1b33",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} name="CPU %" dot={false} />
                    <Line type="monotone" dataKey="memory" stroke="#10b981" strokeWidth={2} name="Memory %" dot={false} />
                    <Line type="monotone" dataKey="network" stroke="#f59e0b" strokeWidth={2} name="Network %" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>

      {/* Modal */}
      <ConfirmationModal
        isOpen={showDestroyModal}
        onClose={() => setShowDestroyModal(false)}
        clusterName={cluster?.name}
        clusterId={cluster?.id}
      />
    </div>
  );
};

export default ClusterConfigPage;
