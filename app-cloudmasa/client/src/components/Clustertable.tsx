// src/components/Clustertable.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrashCan,
  faEdit,
  faTimes,
  faSave,
  faTerminal,
  faCircleInfo,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import AccountComponent from './AccountConsole';
import api from '../interceptor/api.interceptor';
import { useAuth } from '../hooks/useAuth'; // ✅ RBAC hook

// ✅ Props Interface
interface ClusterTableProps {
  clusters: any[];
  loading?: boolean;
}

const ClusterTable: React.FC<ClusterTableProps> = ({ clusters, loading = false }) => {
  const { hasPermission } = useAuth();

  // ✅ Use FINE-GRAINED PERMISSIONS (not roles)
  const canConfigure = hasPermission('Agent', 'Configure'); // For terminal/edit
  const canDelete = hasPermission('Agent', 'Delete');      // For delete
  const canManage = canConfigure || canDelete;             // For UI visibility

  const [clusterData, setClusterData] = useState<any[]>(clusters);
  const [selectedCluster, setSelectedCluster] = useState<any | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);

  useEffect(() => {
    setClusterData(clusters);
  }, [clusters]);

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      const response = await api.delete(`/delete-cluster/${id}`);
      if (response.status === 200 || response.status === 204) {
        setClusterData(clusterData.filter((cluster) => cluster._id !== id));
      }
    } catch (error) {
      console.error('Error deleting cluster:', error);
    }
  };

  const handleOpenTerminal = (cluster: any) => {
    if (!canConfigure) return;
    setSelectedCluster(cluster);
    setIsTerminalOpen(true);
  };

  const handleCloseTerminal = () => {
    setIsTerminalOpen(false);
    setSelectedCluster(null);
  };

  const handleEdit = (cluster: any) => {
    if (!canConfigure) return;
    setIsEditing(true);
    setEditData({ ...cluster });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editData?._id || !canConfigure) return;
    try {
      const response = await api.put(`/update-cluster/${editData._id}`, editData);
      if (response.status === 200) {
        setClusterData(
          clusterData.map((cluster) =>
            cluster._id === editData._id ? editData : cluster
          )
        );
        setIsEditing(false);
        setEditData(null);
      }
    } catch (error) {
      console.error('Error updating cluster:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-6 py-10" style={{ backgroundColor: '#1E2633', color: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto rounded-2xl border border-[#2A4C83] shadow-lg bg-[#2A4C83] p-6">
          <h2 className="text-3xl font-semibold text-center mb-10 text-white">Manage EKS Clusters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1E2633] p-5 rounded-xl border border-[#2A4C83] shadow-md animate-pulse">
                <div className="h-6 bg-gray-500 rounded mb-4"></div>
                <div className="space-y-3 mb-4">
                  <div className="h-4 bg-gray-500 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-500 rounded w-1/2"></div>
                </div>
                <div className="h-10 bg-gray-500 rounded mb-3"></div>
                <div className="flex gap-2">
                  <div className="w-1/2 h-10 bg-gray-500 rounded"></div>
                  <div className="w-1/2 h-10 bg-gray-500 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (clusterData.length === 0 && !isEditing && !isTerminalOpen) {
    return (
      <div className="min-h-screen px-6 py-10" style={{ backgroundColor: '#1E2633', color: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto rounded-2xl border border-[#2A4C83] shadow-lg bg-[#2A4C83] p-6">
          <h2 className="text-3xl font-semibold text-center mb-10 text-white">Manage EKS Clusters</h2>
          <div className="text-center py-12 bg-[#1E2633] rounded-xl border border-[#2A4C83]">
            <p className="text-gray-300 text-lg">No clusters found. Connect your AWS account to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: '#1E2633', color: '#FFFFFF' }}>
      <div className="max-w-6xl mx-auto rounded-2xl border border-[#2A4C83] shadow-lg bg-[#2A4C83] p-6">
        {isTerminalOpen ? (
          <div className="relative border border-[#2A4C83] rounded-2xl p-6 bg-[#1E2633] shadow-md">
            <button
              className="absolute top-4 right-4 bg-[#F26A2E] text-white px-4 py-2 rounded-md hover:bg-orange-700 transition flex items-center gap-2"
              onClick={handleCloseTerminal}
            >
              <FontAwesomeIcon icon={faTimes} /> Close Terminal
            </button>
            {selectedCluster && <AccountComponent awsConfig={selectedCluster} />}
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-semibold text-center mb-10 text-white">Manage EKS Clusters</h2>

            {isEditing && editData ? (
              <div className="mb-6 p-6 bg-[#1E2633] rounded-xl border border-[#2A4C83] shadow-inner">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[#F26A2E]">
                  <FontAwesomeIcon icon={faEdit} /> Edit Cluster
                </h3>
                <input
                  type="text"
                  name="clusterName"
                  value={editData.clusterName || ''}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-4 bg-[#2A4C83] border border-[#F26A2E] rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm text-white"
                  placeholder="Cluster Name"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-[#F26A2E] text-white rounded-md hover:bg-orange-700 transition flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faSave} /> Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditData(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {clusterData.map((cluster) => (
                  <div
                    key={cluster._id}
                    className="bg-[#1E2633] p-5 rounded-xl border border-[#2A4C83] shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <h3 className="text-xl font-semibold mb-3 text-white truncate">
                      {cluster.clusterName || 'Unnamed Cluster'}
                    </h3>

                    <div className="text-sm text-gray-300 space-y-2 mb-4">
                      <p>
                        <FontAwesomeIcon icon={faCircleInfo} className="mr-2 text-[#F26A2E]" />
                        <span className="font-medium">Region:</span> {cluster.awsRegion || 'N/A'}
                      </p>
                      <p>
                        <FontAwesomeIcon icon={faCircleCheck} className="mr-2 text-[#F26A2E]" />
                        <span className="font-medium">Output:</span> {cluster.outputFormat || 'N/A'}
                      </p>
                    </div>

                    <button
                      className="w-full px-4 py-2 bg-[#2A4C83] text-white border border-[#F26A2E] rounded-md hover:bg-[#F26A2E] hover:text-white transition flex items-center justify-center gap-2 text-sm mb-3"
                      onClick={() => handleOpenTerminal(cluster)}
                      disabled={!canConfigure}
                    >
                      <FontAwesomeIcon icon={faTerminal} /> Open Terminal
                    </button>

                    <div className="flex gap-2">
                      {canManage ? (
                        <>
                          <button
                            className="w-1/2 px-3 py-2 bg-[#2A4C83] text-white border border-white rounded-md hover:bg-[#3b5687] transition text-sm flex items-center justify-center gap-2"
                            onClick={() => handleEdit(cluster)}
                            disabled={!canConfigure}
                          >
                            <FontAwesomeIcon icon={faEdit} /> Edit
                          </button>
                          <button
                            className="w-1/2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm flex items-center justify-center gap-2"
                            onClick={() => handleDelete(cluster._id)}
                            disabled={!canDelete}
                          >
                            <FontAwesomeIcon icon={faTrashCan} /> Delete
                          </button>
                        </>
                      ) : (
                        <span className="w-full text-center text-gray-500 text-sm py-2">No management access</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ClusterTable;