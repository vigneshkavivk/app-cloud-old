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
  XCircle
} from "lucide-react";
import axios from "axios";
import api from "../interceptor/api.interceptor";
import ClusterForm from "./Clusterform";
import ClusterTable from "./Clustertable";
import ClusterAdd from "./AddCluster";
import AWSAccountsList from "./AwsAccount";

const ClustersPage = () => {
  const [clusters, setClusters] = useState([]);
  const [view, setView] = useState("list"); // list | manager | create | add-existing
  const [showAddClusterPopup, setShowAddClusterPopup] = useState(false);

  // fetch clusters from backend
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await api.get("/api/clusters/get-clusters");
        setClusters(response.data);
      } catch (error) {
        console.error("Error fetching cluster data:", error);
      }
    };
    fetchClusters();
  }, []);

  // handlers
  const handleAddClusterClick = () => setShowAddClusterPopup(true);
  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);
  const handleCreateClusterClick = () => {
    setView("create");
    setShowAddClusterPopup(false);
  };
  const handleAddExistingClusterClick = () => {
    setView("add-existing");
    setShowAddClusterPopup(false);
  };
  const handleBackToClusters = () => {
    setView("list");
  };

  // -------------------- RENDER -------------------- //
  if (view === "create") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-6 text-white font-sans">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-[#F26A2E]">
            Create Cluster
          </h1>
          <button
            onClick={handleBackToClusters}
            className="bg-[#F26A2E] text-white px-4 py-2 rounded-md hover:bg-orange-600 transition"
          >
            <ArrowLeftCircle className="inline mr-2" size={18} />
            Back
          </button>
        </div>
        <ClusterForm />
      </div>
    );
  }

  if (view === "add-existing") {
    return (
      <div className="bg-[#1E2633] min-h-screen p-6 text-white font-sans">
        <button
          onClick={handleBackToClusters}
          className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-700 transition"
        >
          <ArrowLeftCircle className="inline mr-2" size={18} />
          Back
        </button>
        <ClusterAdd />
      </div>
    );
  }

  // ----------------- MAIN CLUSTERS UI ----------------- //
  return (
    <div className="p-6 space-y-6 bg-[#1E2633] min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">Clusters</h1>
            <p className="text-gray-400">
              Manage your Kubernetes clusters
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView("manager")}>
            <Settings className="w-4 h-4 mr-2" />
            Cluster Manager
          </Button>
          <Button onClick={handleAddClusterClick}>
            <Plus className="w-4 h-4 mr-2" />
            Add Cluster
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input placeholder="Search clusters..." className="max-w-sm" />
        <Select>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="stopped">Stopped</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-40">
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
          clusters.map((cluster) => (
            <Card key={cluster.id || cluster.name} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    {cluster.name}
                  </CardTitle>
                  <Badge
                    variant={cluster.status === "running" ? "default" : "secondary"}
                  >
                    {cluster.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Region:</span>
                    <div className="font-medium">{cluster.region}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Nodes:</span>
                    <div className="font-medium">{cluster.nodes}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Version:</span>
                    <div className="font-medium">v{cluster.version}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Account:</span>
                    <div className="font-mono text-xs">{cluster.account}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={cluster.status !== "running"}
                  >
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p>No clusters found.</p>
        )}
      </div>

      {/* Popup: Add Cluster Options */}
      {showAddClusterPopup && (
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
              className="border-2 border-gray-200 rounded-lg p-5 flex-1 text-center cursor-pointer hover:shadow-lg transition"
            >
              <Plus className="text-green-600 mx-auto mb-2" size={32} />
              <p>Add Existing Cluster</p>
            </div>
            <div
              onClick={handleCreateClusterClick}
              className="border-2 border-gray-200 rounded-lg p-5 flex-1 text-center cursor-pointer hover:shadow-lg transition"
            >
              <Cloud className="text-blue-600 mx-auto mb-2" size={32} />
              <p>Create New Cluster</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClustersPage;

