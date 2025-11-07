import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  User,
  MapPin,
  Cloud,
  Layers,
  Server,
  Clock
} from 'lucide-react';
import axios from 'axios';
import api from '../interceptor/api.interceptor';

function ClusterAdd() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAddingCluster, setIsAddingCluster] = useState(false);
  const [addedClusters, setAddedClusters] = useState([]);

  useEffect(() => {
    const fetchSavedAccounts = async () => {
      try {
        const { data } = await api.get('/api/get-aws-accounts');
        // const { data } = await axios.get('http://localhost:3000/api/get-aws-accounts');
        setSavedAccounts(data);
        if (data.length === 1) {
          setSelectedAccount(data[0]);
        }
      } catch (err) {
        setError('Failed to load AWS accounts. Please try again.');
        console.error(err);
      }
    };
    fetchSavedAccounts();
  }, []);

  const fetchAddedClusters = async () => {
    if (!selectedAccount) return;
    try {
      const response = await api.get('/api/get-clusters', {
        params: { awsAccountNumber: selectedAccount.accountId }
      });
      // const response = await axios.get('http://localhost:3000/api/get-clusters', {
      //   params: { awsAccountNumber: selectedAccount.accountId }
      // });
      setAddedClusters(response.data.map(cluster => cluster.clusterName));
    } catch (err) {
      console.error('Failed to fetch added clusters:', err);
    }
  };

  const fetchClusters = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    setClusters([]);
    setSelectedCluster(null);
    try {
      const { data } = await api.post('/api/get-eks-clusters', {
        accountId: selectedAccount.accountId
      });
      // const { data } = await axios.post('http://localhost:3000/api/get-eks-clusters', {
      //   accountId: selectedAccount.accountId
      // });
      await fetchAddedClusters();
      setClusters(data.clusters);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch clusters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      fetchClusters();
    }
  }, [selectedAccount]);

  const handleRefresh = () => {
    fetchClusters();
  };

  const handleAddCluster = async () => {
    if (!selectedCluster || !selectedAccount) {
      setError('Please select a cluster to add.');
      return;
    }

    setIsAddingCluster(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.post('/api/save-data', {
        awsAccessKey: selectedAccount.awsAccessKey,
        awsSecretKey: selectedAccount.awsSecretKey,
        clusterName: selectedCluster,
        awsRegion: selectedAccount.awsRegion,
        outputFormat: 'json'
      });
      // await axios.post('http://localhost:3000/api/save-data', {
      //   awsAccessKey: selectedAccount.awsAccessKey,
      //   awsSecretKey: selectedAccount.awsSecretKey,
      //   clusterName: selectedCluster,
      //   awsRegion: selectedAccount.awsRegion,
      //   outputFormat: 'json'
      // });

      setSuccessMessage(`Cluster "${selectedCluster}" added successfully!`);
      setSelectedCluster(null);
      await fetchAddedClusters();
      fetchClusters();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add cluster');
      console.error(err);
    } finally {
      setIsAddingCluster(false);
    }
  };

  const isClusterAdded = (clusterName) => {
    return addedClusters.includes(clusterName);
  };

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#1E2633' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="p-6 rounded-xl shadow-md border border-gray-700" style={{ backgroundColor: '#2A4C83' }}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="h-6 w-6 text-[#F26A2E]" />
              AWS EKS Cluster Manager
            </h1>
            {lastUpdated && (
              <div className="text-sm text-white flex items-center gap-2">
                Last updated: {lastUpdated.toLocaleTimeString()}
                <button
                  onClick={handleRefresh}
                  className="text-[#F26A2E] hover:text-orange-500"
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* AWS Account Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Server className="h-5 w-5 text-[#F26A2E]" />
              Select AWS Account
            </h2>
            {savedAccounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedAccounts.map((account, index) => {
                  const isSelected = selectedAccount?.accountId === account.accountId;
                  return (
                    <div
                      key={account.accountId}
                      onClick={() => setSelectedAccount(account)}
                      className={`p-4 rounded-xl cursor-pointer transition duration-200 transform hover:scale-[1.01] border ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#F26A2E] to-[#2A4C83] border-orange-300 shadow-md'
                          : 'bg-[#1E2633] border-gray-600 hover:bg-[#2A4C83]'
                      } text-white`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-[#F26A2E]" />
                            {account.accountId}
                          </p>
                          <p className="text-sm flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4 text-white" />
                            {account.awsRegion}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                      </div>
                      <p className="text-xs mt-2 text-gray-300">User: {account.userId}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-gray-500 rounded-lg text-center text-white">
                No AWS accounts found.
                <a href="/cloud-connector" className="text-[#F26A2E] hover:underline ml-2">
                  Connect an AWS account
                </a>
              </div>
            )}
          </div>

          {selectedAccount && (
            <div className="space-y-6">
              {/* Account Details */}
              <div className="p-4 rounded-lg border border-gray-500 bg-[#1E2633] text-white shadow-sm">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#F26A2E]" />
                  Account Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-orange-300">Account ID</p>
                    <p className="font-mono text-white">{selectedAccount.accountId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-300">Region</p>
                    <p className="font-mono text-white">{selectedAccount.awsRegion}</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center p-6 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading clusters...</span>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="flex items-center bg-red-600 text-white text-sm p-3 rounded-md">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>{error}</span>
                    </div>
                  )}
                  {successMessage && (
                    <div className="flex items-center bg-green-600 text-white text-sm p-3 rounded-md">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      <span>{successMessage}</span>
                    </div>
                  )}
                  <div className="overflow-x-auto border border-gray-600 rounded-lg">
                    <table className="w-full text-sm table-auto" style={{ backgroundColor: '#1E2633', color: '#FFFFFF' }}>
                      <thead className="text-xs font-semibold bg-[#2A4C83] text-white">
                        <tr>
                          <th className="p-3 text-left">Select</th>
                          <th className="p-3 text-left flex items-center gap-2">
                            <Cloud className="h-4 w-4 text-[#F26A2E]" /> Cluster Name
                          </th>
                          <th className="p-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clusters.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-4 text-center text-gray-400">
                              No clusters found.
                            </td>
                          </tr>
                        ) : (
                          clusters.map((cluster, index) => (
                            <tr key={index} className="hover:bg-[#2A4C83]">
                              <td className="p-3">
                                <input
                                  type="radio"
                                  name="cluster"
                                  value={cluster}
                                  checked={selectedCluster === cluster}
                                  onChange={() => !isClusterAdded(cluster) && setSelectedCluster(cluster)}
                                  className="h-4 w-4 text-orange-500"
                                  disabled={isClusterAdded(cluster)}
                                />
                              </td>
                              <td className="p-3">{cluster}</td>
                              <td className="p-3">
                                {isClusterAdded(cluster) ? (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-full">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Added
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-500 text-white rounded-full">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Not Added
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {selectedCluster && !isClusterAdded(selectedCluster) && (
                    <div className="mt-4">
                      <button
                        onClick={handleAddCluster}
                        disabled={isAddingCluster}
                        className={`w-full py-2 px-4 rounded-xl font-medium shadow-sm transition duration-200 ease-in-out transform hover:scale-[1.01] ${
                          isAddingCluster
                            ? 'bg-orange-300 cursor-not-allowed text-white'
                            : 'bg-[#F26A2E] hover:bg-orange-600 text-white'
                        }`}
                      >
                        {isAddingCluster ? (
                          <>
                            <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                            Adding Cluster...
                          </>
                        ) : (
                          'Add Cluster to Database'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClusterAdd;
