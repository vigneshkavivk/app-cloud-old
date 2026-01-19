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
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Loader2,
  ArrowUpCircle,
} from "lucide-react";
import api from "../interceptor/api.interceptor";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../hooks/useAuth';
import AddCluster from "./AddCluster";
import { useLocation } from 'react-router-dom';
import UpgradeClusterModal from './UpgradeClusterModal';
import ClusterConfigPage from './ClusterConfigPage.jsx';

// ======================
// ✅ CLUSTER CARD
// ======================
const ClusterCard = ({ 
  title, 
  status, 
  region, 
  version, 
  account,           
  accountName,       
  onClick,
  onRemove,
  onUpgrade,
  onConfigure,
  canManage = false,
  canUpgrade = false,
  canConfigure = false,
  liveNodeCount       
}) => (
  <div
    className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full w-full min-w-[300px]"
  >
    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Server className="text-[#0ea5e9]" size={20} />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
{status === "not-found" ? (
  <div className="group relative">
    <span 
      className="px-2 py-1 text-xs font-semibold rounded-full bg-red-600 text-white flex items-center gap-1 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        const modal = document.createElement('div');
        modal.innerHTML = `
          <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-[#1e2633] border border-white/10 rounded-xl p-5 max-w-sm w-full shadow-xl">
              <div class="flex justify-between items-start mb-3">
                <h3 class="text-base font-bold text-red-400 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Cluster Unavailable
                </h3>
                <button class="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-red-900/10 close-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <p class="text-gray-300 text-sm mb-3">
                This cluster is no longer available because this cluster has been removed.
              </p>
              <div class="text-xs text-gray-400 space-y-1">
                <div><span class="font-medium">Cluster:</span> ${title}</div>
                <div><span class="font-medium">Account:</span> ${accountName || account || '—'}</div>
                <div><span class="font-medium">Region:</span> ${region || '—'}</div>
              </div>
              <div class="mt-4 flex justify-end">
                <button class="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-md hover:opacity-90 ok-btn">
                  OK
                </button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        // Close on X or OK
        const closeBtns = modal.querySelectorAll('.close-btn, .ok-btn');
        closeBtns.forEach(btn => {
          btn.onclick = () => {
            document.body.removeChild(modal);
          };
        });
      }}
    >
      <AlertCircle size={12} />
      Not Found
    </span>
  </div>
) : (
  <span
    className={`px-2 py-1 text-xs font-semibold rounded-full ${
      status === "running"
        ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
        : status === "stopped"
        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
        : "bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900"
    }`}
  >
    {status}
  </span>
)}
    </div>
    <div className="space-y-2 text-xs flex-1">
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Region:</span>
        <span className="text-white">{region || 'N/A'}</span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Nodes:</span>
        <span className="text-white">
          {liveNodeCount !== undefined ? liveNodeCount : '—'}
        </span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Version:</span>
        <span className="text-white">v{version || 'N/A'}</span>
      </div>
      <div className="flex justify-between py-1.5 px-3 bg-white bg-opacity-5 rounded-md">
        <span className="text-gray-300 font-medium">Account:</span>
        <span className="text-white truncate max-w-[160px]">
          {accountName || account || '—'}
        </span>
      </div>
    </div>
    <div className="mt-4 pt-3 flex gap-1.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfigure();
        }}
        disabled={!canConfigure || status === "not-found"}
        className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 rounded transition-colors ${
          canConfigure
            ? "text-gray-300 hover:text-white bg-white bg-opacity-5 hover:bg-white hover:bg-opacity-10"
            : "text-gray-500 bg-white/5 cursor-not-allowed"
        }`}
      >
        <Settings size={12} />
        Config
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        disabled={!canManage || status !== "running" || status === "not-found"}
        className={`flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 rounded transition-colors ${
          canManage && status === "running"
            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
            : "bg-white/5 text-gray-400 cursor-not-allowed"
        }`}
      >
        Connect
      </button>
      {canUpgrade && status === "running" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpgrade();
          }}
          className="px-2.5 py-1.5 text-blue-300 hover:text-blue-200 flex items-center justify-center bg-blue-500 bg-opacity-10 hover:bg-blue-500 hover:bg-opacity-20 rounded transition-colors"
          title="Upgrade Kubernetes Version"
        >
          <ArrowUpCircle size={14} />
        </button>
      )}
      {canManage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(); // ✅ Opens modal in parent
          }}
          className="px-2.5 py-1.5 text-red-400 hover:text-red-300 flex items-center justify-center bg-red-500 bg-opacity-10 hover:bg-red-500 hover:bg-opacity-20 rounded transition-colors"
          title="Remove Cluster"
        >
          <XCircle size={14} />
        </button>
      )}
    </div>
  </div>
);

// ========================
// CREATE CLUSTER FORM
// ========================
const CreateClusterForm = ({ onBack }) => {
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [vpcs, setVpcs] = useState([]);
  const [selectedVpc, setSelectedVpc] = useState('');
  const [subnets, setSubnets] = useState([]);
  const [selectedSubnetIds, setSelectedSubnetIds] = useState(new Set());
  const [clusterName, setClusterName] = useState('');
  const [nodeCount, setNodeCount] = useState(2);
  const [instanceType, setInstanceType] = useState("t3.medium");
  const [loadingVpcs, setLoadingVpcs] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/api/aws/get-aws-accounts');
        setSavedAccounts(res.data);
        if (res.data.length === 1) {
          setSelectedAccount(res.data[0]);
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
        toast.error('Failed to load AWS accounts');
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    const fetchVpcs = async () => {
      setLoadingVpcs(true);
      setError('');
      try {
        const res = await api.post('/api/aws/get-vpcs', {
          accountId: selectedAccount._id,
        });
        setVpcs(res.data.vpcs || []);
        if (res.data.vpcs?.length > 0) {
          setSelectedVpc(res.data.vpcs[0].id);
        } else {
          setSelectedVpc('');
          setSubnets([]);
          setSelectedSubnetIds(new Set());
        }
      } catch (err) {
        setError('Failed to fetch VPCs: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoadingVpcs(false);
      }
    };
    fetchVpcs();
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedAccount || !selectedVpc) {
      setSubnets([]);
      setSelectedSubnetIds(new Set());
      return;
    }
    const vpc = vpcs.find(v => v.id === selectedVpc);
    if (!vpc) {
      setSubnets([]);
      setSelectedSubnetIds(new Set());
      return;
    }
    const enrichedSubnets = vpc.subnets.map(subnet => {
      const hasPrivateTag = subnet.name?.toLowerCase().includes('private') ||
                            subnet.Tags?.some(tag =>
                              tag.Key === 'kubernetes.io/role/internal-elb' ||
                              (tag.Key === 'Name' && tag.Value?.toLowerCase().includes('private'))
                            );
      const type = hasPrivateTag || !subnet.isPublic ? 'Private' : 'Public';
      return {
        SubnetId: subnet.id,
        AvailabilityZone: subnet.availabilityZone,
        CidrBlock: subnet.cidrBlock,
        Tags: subnet.name ? [{ Key: 'Name', Value: subnet.name }] : [],
        type
      };
    });
    setSubnets(enrichedSubnets);
    const allIds = new Set(enrichedSubnets.map(s => s.SubnetId));
    setSelectedSubnetIds(allIds);
  }, [selectedAccount, selectedVpc, vpcs]);

  const toggleSubnet = (subnetId) => {
    const newSet = new Set(selectedSubnetIds);
    if (newSet.has(subnetId)) {
      newSet.delete(subnetId);
    } else {
      newSet.add(subnetId);
    }
    setSelectedSubnetIds(newSet);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedAccount) return setError('Please select an AWS account');
    if (!clusterName.trim()) return setError('Cluster name is required');
    if (!selectedVpc) return setError('Please select a VPC');
    if (selectedSubnetIds.size < 2) {
      return setError('At least 2 subnets must be selected');
    }

    setCreating(true);
    try {
      const payload = {
        clusterName: clusterName.trim(),
        vpcId: selectedVpc,
        subnetIds: Array.from(selectedSubnetIds),
        nodeCount: parseInt(nodeCount),
        instanceType: instanceType,
        awsAccountId: selectedAccount.accountId
      };
      const res = await api.post('/api/clusters/create', payload);
      if (res.data?.success) {
        setSuccess(`✅ Cluster "${clusterName}" creation initiated!`);
        setTimeout(onBack, 1500);
      } else {
        throw new Error(res.data?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create cluster');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
        <Layers className="text-[#0ea5e9]" size={20} />
        Configure EKS
      </h2>
      {error && (
        <div className="bg-red-900/30 border border-red-800/40 text-red-200 p-3 rounded-md flex items-center gap-2 mb-4 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-800/40 text-green-200 p-3 rounded-md flex items-center gap-2 mb-4 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">AWS Account</label>
          <select
            value={selectedAccount?._id || ''}
            onChange={(e) => {
              const acc = savedAccounts.find(a => a._id === e.target.value);
              setSelectedAccount(acc);
            }}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            required
          >
            <option value="">Select Account</option>
            {savedAccounts.map(acc => (
              <option key={acc._id} value={acc._id}>
                {acc.accountName || acc.accountId} ({acc.awsRegion})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Cluster Name</label>
          <input
            type="text"
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="my-eks-cluster"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">VPC</label>
          {loadingVpcs ? (
            <div className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-md text-sm text-gray-300">
              <Loader2 className="animate-spin h-4 w-4 text-[#0ea5e9]" />
              Loading VPCs...
            </div>
          ) : (
            <select
              value={selectedVpc}
              onChange={(e) => setSelectedVpc(e.target.value)}
              className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={!selectedAccount}
              required
            >
              <option value="">Select VPC</option>
              {vpcs.map(vpc => (
                <option key={vpc.id} value={vpc.id}>
                  {vpc.name} ({vpc.cidrBlock})
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">Subnets</label>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-xs">
            {subnets.length > 0 ? (
              subnets.map((subnet) => (
                <div key={subnet.SubnetId} className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded">
                  <input
                    type="checkbox"
                    id={`subnet-${subnet.SubnetId}`}
                    checked={selectedSubnetIds.has(subnet.SubnetId)}
                    onChange={() => toggleSubnet(subnet.SubnetId)}
                    className="accent-[#0ea5e9]"
                  />
                  <label htmlFor={`subnet-${subnet.SubnetId}`} className="flex-1 truncate">
                    {subnet.SubnetId} ({subnet.type}, {subnet.AvailabilityZone})
                  </label>
                </div>
              ))
            ) : (
              <div className="p-2 bg-white/5 border border-white/10 rounded text-gray-400 text-sm">
                {loadingVpcs ? 'Loading...' : 'No subnets in this VPC'}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Select ≥2 subnets (public + private recommended)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Node Count</label>
            <select
              value={nodeCount}
              onChange={(e) => setNodeCount(parseInt(e.target.value))}
              className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Instance Type</label>
            <select
              value={instanceType}
              onChange={(e) => setInstanceType(e.target.value)}
              className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="t3.medium">t3.medium</option>
              <option value="t3.large">t3.large</option>
              <option value="m5.large">m5.large</option>
              <option value="m5.xlarge">m5.xlarge</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-md font-medium flex items-center gap-1.5 text-sm"
          >
            <ArrowLeftCircle size={14} /> Cancel
          </button>
          <button
            type="submit"
            disabled={creating || loadingVpcs || selectedSubnetIds.size < 2}
            className={`px-4 py-2.5 rounded-md font-medium flex items-center gap-1.5 text-sm ${
              creating || loadingVpcs || selectedSubnetIds.size < 2
                ? 'bg-white/10 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 hover:from-orange-600 hover:to-orange-700'
            }`}
          >
            {creating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              'Create Cluster'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ========================
// MAIN PAGE
// ========================
const ClustersPage = () => {
  const location = useLocation();
  const [clusters, setClusters] = useState([]);
  const [view, setView] = useState("list");
  const [showAddClusterPopup, setShowAddClusterPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('Credentials', 'Create');
  const canDelete = hasPermission('Credentials', 'Delete');
  const canManage = canCreate || canDelete;
  const canUpgrade = hasPermission('Agent', 'Configure');
  const canConfigure = hasPermission('Agent', 'Read') || hasPermission('Agent', 'Configure');

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [clusterToUpgrade, setClusterToUpgrade] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clusterToConfigure, setClusterToConfigure] = useState(null);

  // ✅ ADDED: Remove modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [clusterToRemove, setClusterToRemove] = useState(null);

  useEffect(() => {
    if (location.pathname === '/clusters/create') {
      setView('create');
    }
  }, [location.pathname]);

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
        <style>{`
          .dashboard-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 30px 30px; }
          .animated-gradient-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; opacity: 0.1; background: conic-gradient(from 0deg, #0ea5e9, #0f172a, #60a5fa, #0f172a, #0ea5e9); background-size: 400% 400%; animation: gradientShift 20s ease infinite; filter: blur(60px); }
          @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        `}</style>
        <div className="dashboard-bg"></div>
        <div className="animated-gradient-bg"></div>
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-8 max-w-md text-center z-10">
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need Credentials Create/Delete permission to manage clusters.
          </p>
        </div>
      </div>
    );
  }

const fetchClusters = async () => {
  setLoading(true);
  setIsRefetching(false);
  try {
    // 1. Get all AWS accounts
    const accountsRes = await api.get('/api/aws/get-aws-accounts');
    const accounts = accountsRes.data || [];

    // 2. Get all clusters from your DB (to preserve _id, etc.)
    const dbClustersRes = await api.get("/api/clusters/get-clusters");
    const dbClusters = dbClustersRes.data || [];

    // 3. Get LIVE EKS clusters from AWS for each account
    const liveClusters = [];
    for (const acc of accounts) {
      try {
        const eksRes = await api.post('/api/aws/eks-clusters', {
          accountId: acc._id
        });
        const awsClusters = (eksRes.data || []).map(c => ({
          ...c,
          account: acc.accountId,
          accountName: acc.accountName,
          cloudConnectionId: acc._id
        }));
        liveClusters.push(...awsClusters);
      } catch (err) {
        console.warn(`⚠️ Skip account: ${acc.accountName}`);
      }
    }

    

    // 4. Merge: Keep DB metadata, but mark missing ones as "Not Found"
    const mergedClusters = dbClusters.map(db => {
      const live = liveClusters.find(live => 
        live.name === db.name && 
        live.account === db.account
      );
      return {
        ...db,
        status: live ? db.status : "not-found", // ✅ Critical: "not-found"
        liveNodeCount: live ? live.liveNodeCount : db.liveNodeCount
      };
    });

    // ✅ AUTO-SYNC: DB la "not-found" nu update pannum (if changed)
const clustersToSync = mergedClusters.filter(cluster => {
  const original = dbClusters.find(d => d._id === cluster._id);
  return (
    cluster.status === "not-found" &&
    original?.status !== "not-found" && // only if status changed
    original?.status !== "deleted"
  );
});

// Fire-and-forget: DB ku PATCH request podum
clustersToSync.forEach(async (cluster) => {
  try {
    await api.patch(`/api/clusters/${cluster._id}`, { status: "not-found" });
    console.log(`✅ DB updated → 'not-found' for ${cluster.name}`);
  } catch (err) {
    console.warn(`⚠️ DB sync failed for ${cluster.name}:`, err.message);
  }
});
    setClusters(mergedClusters);
  } catch (error) {
    console.error("Sync failed:", error);
    toast.error("Failed to sync clusters");
    setClusters([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleClusterSelect = async (cluster) => {
    if (!canManage) return toast.warn("You don't have permission to connect.");
    if (cluster.status !== "running") return toast.warn("Only running clusters can be connected.");
    try {
      const response = await api.post("/api/clusters/connect-cluster", {
        clusterId: cluster._id,
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
      toast.error("⚠️ Failed to connect.");
    }
  };

  const handleRemoveCluster = async (clusterId) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete clusters.");
      return;
    }
    const cluster = clusters.find(c => c._id === clusterId);
    if (!cluster) return;
    setClusterToRemove(cluster);
    setShowRemoveModal(true); // ✅ Open modal
  };

  const handleUpgradeCluster = (cluster) => {
    if (!canUpgrade) {
      toast.error("You don’t have permission to upgrade clusters.");
      return;
    }
    if (cluster.status !== 'running') {
      toast.warn("Only running clusters can be upgraded.");
      return;
    }
    setClusterToUpgrade({
      _id: cluster._id,
      name: cluster.name,
      region: cluster.region,
      currentVersion: cluster.version,
    });
    setShowUpgradeModal(true);
  };

  const handleConfigureCluster = (cluster) => {
    if (!canConfigure) {
      toast.error("You don’t have permission to configure clusters.");
      return;
    }
    setClusterToConfigure(cluster);
    setShowConfigModal(true);
  };

  const handleAddClusterClick = () => {
    if (!canCreate) {
      toast.error("You don't have permission to add clusters.");
      return;
    }
    setShowAddClusterPopup(true);
  };

  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);

  const handleCreateClusterClick = () => {
    if (!canCreate) return toast.error("No permission to create");
    setView("create");
    setShowAddClusterPopup(false);
  };

  const handleAddExistingClusterClick = () => {
    if (!canCreate) return toast.error("No permission to add");
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

  const specificRegions = [
    { value: "us-east-1", label: "us-east-1" },
    { value: "us-west-1", label: "us-west-1" },
    { value: "us-west-2", label: "us-west-2" },
    { value: "eu-west-1", label: "eu-west-1" },
    { value: "ap-south-1", label: "ap-south-1" },
    { value: "ap-southeast-1", label: "ap-southeast-1" },
  ];

  // ✅ MODAL COMPONENT (inside ClustersPage)
  const ConfirmRemoveClusterModal = ({ isOpen, onClose, onConfirm, clusterName }) => {
    const [inputValue, setInputValue] = useState("");

    if (!isOpen) return null;

    const handleConfirm = () => {
      if (inputValue === "REMOVE") {
        onConfirm();
        onClose();
      } else {
        toast.warn("Please type 'REMOVE' to confirm.");
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-center justify-center z-50 p-4">
        <div className="bg-[#1e2633] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
               Remove Cluster
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-gray-300 mb-4">
            Are you sure? This action <span className="font-semibold text-red-400">cannot be undone</span>.
          </p>

          <p className="text-sm text-gray-400 mb-4">
            All resources associated with <strong>{clusterName}</strong> will be removed.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-200 mb-1.5">
              Type <span className="text-red-400">REMOVE</span> to confirm:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full p-2.5 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              placeholder="Type REMOVE here..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-md font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={inputValue !== "REMOVE"}
              className={`flex-1 px-4 py-2.5 rounded-md font-medium text-sm ${
                inputValue === "REMOVE"
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-gray-900 hover:from-red-600 hover:to-red-700"
                  : "bg-white/10 cursor-not-allowed text-gray-400"
              }`}
            >
              <X size={14} className="inline mr-1" />
              Remove Cluster
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 text-white relative overflow-hidden">
      <style>{`
        body { 
          font-family: 'Inter', system-ui, sans-serif; 
          background: #0f172a; 
          color: #e2e8f0; 
          margin: 0; 
          overflow-x: hidden;
        }
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
        select option {
          background-color: #0c1b33 !important;
          color: #ffffff !important;
        }
      `}</style>
      <div className="dashboard-bg"></div>
      <div className="animated-gradient-bg"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {view === "create" ? (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Create Cluster
                </span>
              </h1>
              <button
                onClick={handleBackToClusters}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 text-sm"
              >
                <ArrowLeftCircle size={16} />
                Back
              </button>
            </div>
            <CreateClusterForm onBack={handleBackToClusters} />
          </div>
        ) : view === "add-existing" ? (
          <div>
            <button
              onClick={handleBackToClusters}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 mb-6 text-sm"
            >
              <ArrowLeftCircle size={16} />
              Back
            </button>
            <AddCluster onClusterAdded={fetchClusters} />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold">
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Clusters
                  </span>
                </h1>
                <p className="text-gray-300">Manage your Kubernetes clusters</p>
              </div>
              {canManage && status !== "not-found" && (
                <button
                  onClick={handleAddClusterClick}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold px-4 py-2.5 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Add Cluster
                </button>
              )}
            </div>

            <div className="flex gap-4 mb-6 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clusters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="not-found">Not Found</option>
              </select>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Regions</option>
                {specificRegions.map(region => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>

            {isRefetching || loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0ea5e9] mb-4"></div>
                <p className="text-gray-300">
                  {isRefetching ? "Refreshing clusters..." : "Loading your clusters..."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredClusters.length > 0 ? (
                  filteredClusters
                    .filter(cluster => cluster.name)
                    .map((cluster) => (
                      <ClusterCard
                        key={cluster._id || `${cluster.name}-${cluster.region}`}
                        title={cluster.name}
                        status={cluster.status || "unknown"}
                        region={cluster.region || "N/A"}
                        version={cluster.version || "N/A"}
                        account={cluster.account || "N/A"}
                        accountName={cluster.accountName}
                        onClick={() => handleClusterSelect(cluster)}
                        onRemove={() => handleRemoveCluster(cluster._id)}
                        onUpgrade={() => handleUpgradeCluster(cluster)}
                        onConfigure={() => handleConfigureCluster(cluster)}
                        canManage={canManage}
                        canUpgrade={canUpgrade}
                        canConfigure={canConfigure}
                        liveNodeCount={cluster.liveNodeCount}
                      />
                    ))
                ) : (
                  <div className="col-span-full text-center py-12 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl">
                    <XCircle size={48} className="mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-semibold text-gray-300">No clusters found</h3>
                    <p className="text-gray-400 text-sm">Try changing your filters or add a new cluster.</p>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setRegionFilter("all");
                      }}
                      className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-md hover:from-blue-600 hover:to-cyan-600 text-sm flex items-center gap-1.5 mx-auto"
                    >
                      <RefreshCw size={14} />
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Add Cluster Popup */}
            {showAddClusterPopup && canManage && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-center justify-center z-50 p-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-bold text-white">Add or Create Cluster</h2>
                    <button
                      onClick={handleCloseAddClusterPopup}
                      className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <p className="text-gray-300 mb-5 text-sm">Select how you’d like to proceed:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={handleAddExistingClusterClick}
                      className="bg-white/5 border border-green-600/40 rounded-lg p-4 text-center cursor-pointer hover:shadow-lg transition hover:scale-103"
                    >
                      <Plus className="text-green-400 mx-auto mb-2" size={28} />
                      <p className="text-white text-sm font-medium">Add Existing</p>
                    </div>
                    <div
                      onClick={handleCreateClusterClick}
                      className="bg-white/5 border border-orange-500/40 rounded-lg p-4 text-center cursor-pointer hover:shadow-lg transition hover:scale-103"
                    >
                      <Cloud className="text-[#0ea5e9] mx-auto mb-2" size={28} />
                      <p className="text-white text-sm font-medium">Create New</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upgrade Modal */}
            <UpgradeClusterModal
              isOpen={showUpgradeModal}
              onClose={() => {
                setShowUpgradeModal(false);
                setClusterToUpgrade(null);
              }}
              cluster={clusterToUpgrade}
              onUpgradeSuccess={fetchClusters}
            />

            {/* Config Modal */}
            {showConfigModal && clusterToConfigure && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-start justify-center z-50 p-4 overflow-auto"
                onClick={() => setShowConfigModal(false)}
              >
                <div 
                  className="bg-[#0f172a] rounded-xl border border-white/10 w-full max-w-7xl max-h-[90vh] overflow-auto mt-8 shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <ClusterConfigPage
                    clusterId={clusterToConfigure._id}
                    onBack={() => {
                      setShowConfigModal(false);
                      setClusterToConfigure(null);
                    }}
                  />
                </div>
              </div>
            )}

            {/* ✅ REMOVE CLUSTER MODAL */}
            <ConfirmRemoveClusterModal
              isOpen={showRemoveModal}
              onClose={() => {
                setShowRemoveModal(false);
                setClusterToRemove(null);
              }}
              onConfirm={async () => {
                try {
                  await api.delete(`/api/clusters/${clusterToRemove._id}`);
                  toast.success(`✅ Cluster "${clusterToRemove.name}" removed successfully!`);
                  fetchClusters();
                } catch (error) {
                  console.error("Error deleting cluster:", error);
                  toast.error("❌ Failed to remove cluster");
                } finally {
                  setShowRemoveModal(false);
                  setClusterToRemove(null);
                }
              }}
              clusterName={clusterToRemove?.name || ""}
            />
          </>
        )}
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default ClustersPage;
