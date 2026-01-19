import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

const ClusterTable = ({ clusters }) => {
  const [clusterData, setClusterData] = useState(clusters);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    setClusterData(clusters);
  }, [clusters]);

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/delete-cluster/${id}`);
      // const response = await axios.delete(`http://localhost:3000/api/delete-cluster/${id}`);
      if (response.status === 100) {
        setClusterData(clusterData.filter((cluster) => cluster._id !== id));
      }
    } catch (error) {
      console.error('Error deleting cluster:', error);
    }
  };

  const handleOpenTerminal = (cluster) => {
    setSelectedCluster(cluster);
    setIsTerminalOpen(true);
  };

  const handleCloseTerminal = () => {
    setIsTerminalOpen(false);
    setSelectedCluster(null);
  };

  const handleEdit = (cluster) => {
    setIsEditing(true);
    setEditData({ ...cluster });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await api.put(
        `/update-cluster/${editData._id}`,
        editData
      );
      // const response = await axios.put(
      //   `http://localhost:3000/api/update-cluster/${editData._id}`,
      //   editData
      // );
      if (response.status === 100) {
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

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: '#1E2633', color: '#FFFFFF' }}>
      <div className="max-w-6xl mx-auto rounded-2xl border border-[#2A4C83] shadow-lg bg-[#2A4C83] p-6">
        {isTerminalOpen ? (
          <div className="relative border border-[#2A4C83] rounded-2xl p-6 bg-[#1E2633] shadow-md">
            <button
              className="absolute top-4 right-4 bg-[#F26A2E] text-white px-4 py-2 rounded-md hover:bg-orange-700 transition flex items-center gap-2"
              onClick={handleCloseTerminal}
            >
              <FontAwesomeIcon icon={faTimes} />
              Close Terminal
            </button>
            {selectedCluster && <AccountComponent awsConfig={selectedCluster} />}
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-semibold text-center mb-10 text-white">
              Manage EKS Clusters
            </h2>

            {isEditing && editData ? (
              <div className="mb-6 p-6 bg-[#1E2633] rounded-xl border border-[#2A4C83] shadow-inner">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[#F26A2E]">
                  <FontAwesomeIcon icon={faEdit} /> edit Cluster
                </h3>
                <input
                  type="text"
                  name="clusterName"
                  value={editData.clusterName}
                  onChange={handleEditChange}
                  className="w-full p-3 mb-4 bg-[#2A4C83] border border-[#F26A2E] rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm text-white"
                />
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-[#F26A2E] text-white rounded-md hover:bg-orange-700 transition flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faSave} /> Save
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {clusterData.map((cluster) => (
                  <div
                    key={cluster._id}
                    className="bg-[#1E2633] p-5 rounded-xl border border-[#2A4C83] shadow-md hover:shadow-lg transition-all"
                  >
                    <h3 className="text-xl font-semibold mb-3 text-white">
                      {cluster.clusterName}
                    </h3>

                    <div className="text-sm text-gray-300 space-y-2 mb-4">
                      <p>
                        <FontAwesomeIcon icon={faCircleInfo} className="mr-2 text-[#F26A2E]" />
                        <span className="font-medium">Region:</span> {cluster.awsRegion}
                      </p>
                      <p>
                        <FontAwesomeIcon icon={faCircleCheck} className="mr-2 text-[#F26A2E]" />
                        <span className="font-medium">Output:</span> {cluster.outputFormat}
                      </p>
                    </div>

                    <button
                      className="w-full px-4 py-2 bg-[#2A4C83] text-white border border-[#F26A2E] rounded-md hover:bg-[#F26A2E] hover:text-white transition flex items-center justify-center gap-2 text-sm"
                      onClick={() => handleOpenTerminal(cluster)}
                    >
                      <FontAwesomeIcon icon={faTerminal} />
                      Open Terminal
                    </button>

                    <div className="flex gap-2 mt-4">
                      <button
                        className="w-1/2 px-3 py-2 bg-[#2A4C83] text-white border border-white rounded-md hover:bg-[#3b5687] transition text-sm flex items-center justify-center gap-2"
                        onClick={() => handleEdit(cluster)}
                      >
                        <FontAwesomeIcon icon={faEdit} /> Edit
                      </button>
                      <button
                        className="w-1/2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm flex items-center justify-center gap-2"
                        onClick={() => handleDelete(cluster._id)}
                      >
                        <FontAwesomeIcon icon={faTrashCan} /> Delete
                      </button>
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
