// src/components/ClusterCard.jsx
"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Server,
  Plus,
  RefreshCw,
  Settings,
  ArrowLeftCircle,
  Cloud,
  XCircle,
  Lock,
  X
} from "lucide-react";
import api from "../interceptor/api.interceptor";
import { useAuth } from "../hooks/useAuth";
// ✅ Import components
import ClusterForm from "./Clusterform";
import ClusterAdd from "./AddCluster";
import AWSAccountsList from "./AwsAccount";
import ClusterConfigPage from "./ClusterConfigPage.jsx"; // ✅ NEW IMPORT
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ClustersPage = () => {
  const { hasPermission } = useAuth();

  // ✅ Permission logic
  const canProvision = hasPermission('Agent', 'Provision');
  const canViewCredentials = hasPermission('Credentials', 'View');
  const canAddCluster = canProvision && canViewCredentials;
  const canView = hasPermission('Agent', 'Read') || canAddCluster;
  const canConfigure = hasPermission('Agent', 'Configure') || hasPermission('Agent', 'Read');

  // 🔒 Block access if user can't view clusters
  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2633] text-white">
        <div className="text-center p-8 bg-[#2A4C83] rounded-xl max-w-md">
          <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Agent.Read</span> or cluster management permissions.
          </p>
        </div>
      </div>
    );
  }

  const [clusters, setClusters] = useState([]);
  const [view, setView] = useState("list");
  const [showAddClusterPopup, setShowAddClusterPopup] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [clusterToConfigure, setClusterToConfigure] = useState(null);

  // Fetch clusters
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await api.get("/api/clusters/get-clusters");
        setClusters(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching cluster data:", error);
        toast.error("Failed to load clusters");
      }
    };
    fetchClusters();
  }, []);

  // Handlers
  const handleAddClusterClick = () => {
    if (!canAddCluster) return;
    setShowAddClusterPopup(true);
  };
  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);
  const handleCreateClusterClick = () => {
    if (!canAddCluster) return;
    setView("create");
    setShowAddClusterPopup(false);
  };
  const handleAddExistingClusterClick = () => {
    if (!canAddCluster) return;
    setView("add-existing");
    setShowAddClusterPopup(false);
  };
  const handleBackToClusters = () => setView("list");

  // ✅ NEW: Configure handler
  const handleConfigureCluster = (cluster) => {
    if (!canConfigure) {
      toast.error("You don’t have permission to configure clusters.");
      return;
    }
    setClusterToConfigure(cluster);
    setShowConfigModal(true);
  };

  // ================== VIEWS ================== //

  if (view === "create") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-6 text-white font-sans">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-[#F26A2E]">Create Cluster</h1>
          <button
            onClick={handleBackToClusters}
            className="bg-[#F26A2E] text-white px-4 py-2 rounded-md hover:bg-orange-600 transition flex items-center gap-2"
          >
            <ArrowLeftCircle size={18} />
            Back
          </button>
        </div>
        {canAddCluster ? <ClusterForm /> : (
          <div className="text-center py-8 text-gray-400">
            🔒 You don’t have permission to create clusters.
          </div>
        )}
      </div>
    );
  }

  if (view === "add-existing") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-6 text-white font-sans">
        <button
          onClick={handleBackToClusters}
          className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-700 transition flex items-center gap-2"
        >
          <ArrowLeftCircle size={18} />
          Back
        </button>
        {canAddCluster ? <ClusterAdd /> : (
          <div className="text-center py-8 text-gray-400">
            🔒 You don’t have permission to add existing clusters.
          </div>
        )}
      </div>
    );
  }

  if (view === "manager") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-6 text-white font-sans">
        <button
          onClick={handleBackToClusters}
          className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-700 transition flex items-center gap-2"
        >
          <ArrowLeftCircle size={18} />
          Back to Clusters
        </button>
        <AWSAccountsList />
      </div>
    );
  }

  // ✅ ClusterCard as inline component (to pass onConfigure easily)
  const ClusterCard = ({ cluster }) => (
    <Card
      key={cluster._id || cluster.id || cluster.name}
      className="bg-[#2A3B4F] border-gray-700 hover:shadow-lg transition-shadow text-white"
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="w-5 h-5 text-[#F26A2E]" />
            {cluster.name}
          </CardTitle>
          <Badge
            variant={cluster.status === "running" ? "default" : "secondary"}
            className={cluster.status === "running" ? "bg-green-600" : "bg-yellow-600"}
          >
            {cluster.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Region:</span>
            <div className="font-medium">{cluster.region || '—'}</div>
          </div>
          <div>
            <span className="text-gray-400">Nodes:</span>
            <div className="font-medium">{cluster.nodes || '—'}</div>
          </div>
          <div>
            <span className="text-gray-400">Version:</span>
            <div className="font-medium">v{cluster.version || '—'}</div>
          </div>
          <div>
            <span className="text-gray-400">Account:</span>
            <div className="font-mono text-xs">{cluster.account || '—'}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-gray-600 text-gray-300 bg-transparent hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              handleConfigureCluster(cluster);
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={cluster.status !== "running"}
          >
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // ================== MAIN VIEW ================== //
  return (
    <div className="p-6 space-y-6 bg-[#1E2633] min-h-screen text-white relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Clusters</h1>
            <p className="text-gray-400">Manage your Kubernetes clusters</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canViewCredentials && (
            <Button variant="outline" onClick={() => setView("manager")}>
              <Settings className="w-4 h-4 mr-2" />
              Cluster Manager
            </Button>
          )}
          {canAddCluster && (
            <Button onClick={handleAddClusterClick}>
              <Plus className="w-4 h-4 mr-2" />
              Add Cluster
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Input placeholder="Search clusters..." className="max-w-sm bg-[#2A3B4F] border-gray-600 text-white" />
        <Select>
          <SelectTrigger className="w-40 bg-[#2A3B4F] border-gray-600 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="stopped">Stopped</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-40 bg-[#2A3B4F] border-gray-600 text-white">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem value="us-east-1">US East 1</SelectItem>
            <SelectItem value="us-west-2">US West 2</SelectItem>
            <SelectItem value="eu-west-1">EU West 1</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {clusters.length > 0 ? (
          clusters
            .filter(c => c.name)
            .map((cluster) => <ClusterCard cluster={cluster} key={cluster._id || cluster.name} />)
        ) : (
          <p className="text-gray-400 col-span-full">No clusters found.</p>
        )}
      </div>

      {/* Add Cluster Popup */}
      {showAddClusterPopup && canAddCluster && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
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
                className="border-2 border-gray-600 rounded-lg p-5 flex-1 text-center cursor-pointer hover:shadow-lg transition bg-gray-800 hover:bg-gray-700"
              >
                <Plus className="text-green-600 mx-auto mb-2" size={32} />
                <p className="text-white">Add Existing</p>
              </div>
              <div
                onClick={handleCreateClusterClick}
                className="border-2 border-gray-600 rounded-lg p-5 flex-1 text-center cursor-pointer hover:shadow-lg transition bg-gray-800 hover:bg-gray-700"
              >
                <Cloud className="text-blue-600 mx-auto mb-2" size={32} />
                <p className="text-white">Create New</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ✅ CONFIGURE MODAL — INTEGRATED */}
      {showConfigModal && clusterToConfigure && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg z-50 flex items-start justify-center p-4 overflow-auto"
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
        </>
      )}

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
