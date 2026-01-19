import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Cloud, ArrowLeftCircle, XCircle } from 'lucide-react';
import ClusterForm from './Clusterform';
import ClusterTable from './Clustertable';
import ClusterAdd from './AddCluster';
import AWSAccountsList from './AwsAccount';
import api from '../interceptor/api.interceptor';

const CreateClusterPage = ({ handleBackToMyClusters, openClusterFormInitially = false }) => {
  const [showNewAwsAccountForm, setShowNewAwsAccountForm] = useState(openClusterFormInitially);
  const [showAccountList, setAccountlist] = useState(false);

  return (
    <div className="bg-[#1E2633] min-h-screen p-6 text-white font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-[#F26A2E]">Create Cluster</h1>
        <button
          onClick={handleBackToMyClusters}
          className="bg-[#F26A2E] text-white px-4 py-2 rounded-md hover:bg-orange-600 transition"
        >
          <ArrowLeftCircle className="inline mr-2" size={18} />
          Back
        </button>
      </div>

      {showNewAwsAccountForm ? (
        <ClusterForm />
      ) : showAccountList ? (
        <AWSAccountsList />
      ) : (
        <div className="bg-[#2A4C83] p-8 mx-auto max-w-xl text-white shadow-lg rounded-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-medium">Choose an Option</h2>
            <button onClick={handleBackToMyClusters} className="text-gray-500 hover:text-red-500">
              <XCircle size={24} />
            </button>
          </div>
          <p className="text-gray-300 mb-4">Select how you want to proceed:</p>
          <div className="flex justify-between gap-4">
            <div
              onClick={() => setShowNewAwsAccountForm(true)}
              className="border-2 border-gray-200 rounded-xl p-6 w-1/2 text-center cursor-pointer hover:shadow-lg transition"
            >
              <Cloud className="text-blue-500 mx-auto mb-3" size={36} />
              <p className="font-medium">Add New AWS Account</p>
            </div>
            <div
              onClick={() => setAccountlist(true)}
              className="border-2 border-gray-200 rounded-xl p-6 w-1/2 text-center cursor-pointer hover:shadow-lg transition"
            >
              <PlusCircle className="text-green-500 mx-auto mb-3" size={36} />
              <p className="font-medium">Use Existing AWS Account</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MyClusters = () => {
  const [showAddClusterPopup, setShowAddClusterPopup] = useState(false);
  const [showCreateClusterPage, setShowCreateClusterPage] = useState(false);
  const [showAddExistingClusterPage, setShowAddExistingClusterPage] = useState(false);
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await api.get('/api/get-clusters');
        // const response = await axios.get('http://localhost:3000/api/get-clusters');
        setClusters(response.data);
      } catch (error) {
        console.error('Error fetching cluster data:', error);
      }
    };
    fetchClusters();
  }, []);

  const handleAddClusterClick = () => setShowAddClusterPopup(true);
  const handleCloseAddClusterPopup = () => setShowAddClusterPopup(false);
  const handleCreateClusterClick = () => {
    setShowCreateClusterPage(true);
    setShowAddClusterPopup(false);
  };
  const handleAddExistingClusterClick = () => {
    setShowAddExistingClusterPage(true);
    setShowAddClusterPopup(false);
  };
  const handleBackToMyClusters = () => {
    setShowCreateClusterPage(false);
    setShowAddExistingClusterPage(false);
  };

  return (
    <div className="bg-[#1E2633] min-h-screen p-6 text-white font-sans">
      {showCreateClusterPage ? (
        <CreateClusterPage
          handleBackToMyClusters={handleBackToMyClusters}
          openClusterFormInitially={true}
        />
      ) : showAddExistingClusterPage ? (
        <>
          <button
            onClick={handleBackToMyClusters}
            className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4 hover:bg-blue-700 transition"
          >
            <ArrowLeftCircle className="inline mr-2" size={18} />
            Back
          </button>
          <ClusterAdd />
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold text-[#F26A2E]">My Clusters</h1>
            <button
              onClick={handleAddClusterClick}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
            >
              <PlusCircle className="inline mr-2" size={18} />
              Add Cluster
            </button>
          </div>

          <p className="text-white">Manage your cloud infrastructure across different clusters.</p>
          <ClusterTable clusters={clusters} />

          {showAddClusterPopup && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#2A4C83] p-8 rounded-xl shadow-2xl w-full max-w-md z-50 text-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white-700">Add or Create Cluster</h2>
                <button
                  onClick={handleCloseAddClusterPopup}
                  className="text-white-500 hover:text-red-500 transition"
                >
                  <XCircle size={24} />
                </button>
              </div>
              <p className="text-white-500 mb-4">Select how you’d like to proceed:</p>
              <div className="flex gap-4">
                <div
                  onClick={handleAddExistingClusterClick}
                  className="border-2 border-gray-200 rounded-lg p-5 flex-1 text-center cursor-pointer hover:shadow-lg transition"
                >
                  <PlusCircle className="text-green-600 mx-auto mb-2" size={32} />
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
        </>
      )}
    </div>
  );
};

export default MyClusters;
