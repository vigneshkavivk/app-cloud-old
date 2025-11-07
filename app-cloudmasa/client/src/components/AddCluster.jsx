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
import api from '../interceptor/api.interceptor';

function ClusterAdd({ onClusterAdded = () => {} }) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isAddingCluster, setIsAddingCluster] = useState(false);
  const [addedClusters, setAddedClusters] = useState(new Set());

  const isClusterAdded = (clusterName) => {
    return addedClusters.has(clusterName);
  };

  // Fetch saved AWS accounts
  useEffect(() => {
    const fetchSavedAccounts = async () => {
      try {
        const { data } = await api.get('/api/aws/get-aws-accounts');
        setSavedAccounts(data);
        if (data.length === 1) {
          setSelectedAccount(data[0]);
        }
      } catch (err) {
        setError('Failed to load AWS accounts. Please try again.');
        console.error('Fetch accounts error:', err);
      }
    };
    fetchSavedAccounts();
  }, []);

  // Fetch already-added clusters for selected account
  const fetchAddedClusters = async () => {
    if (!selectedAccount?.accountId) return;
    try {
      const response = await api.get('/api/clusters/get-clusters', {
        params: { awsAccountNumber: selectedAccount.accountId }
      });
      const clusterNames = new Set(response.data.map(c => c.name));
      setAddedClusters(clusterNames);
    } catch (err) {
      console.error('Failed to fetch added clusters:', err);
    }
  };

  // Fetch live EKS clusters
  const fetchClusters = async () => {
    if (!selectedAccount?._id) return;

    setLoading(true);
    setError(null);
    setSelectedCluster(null);

    try {
      const { data } = await api.post('/api/aws/get-eks-clusters', {
        accountId: selectedAccount._id
      });

      setClusters(data.clusters || []);
      setLastUpdated(new Date());
      await fetchAddedClusters();
    } catch (err) {
      console.error('Fetch clusters error:', err);
      let errorMessage = 'Failed to fetch EKS clusters.';
      if (err.response?.status === 500) {
        errorMessage = 'Server error. Check backend logs for AWS permission or region issues.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      fetchClusters();
    } else {
      setClusters([]);
      setAddedClusters(new Set());
      setSelectedCluster(null);
    }
  }, [selectedAccount]);

  const handleRefresh = () => {
    if (selectedAccount) {
      fetchClusters();
    }
  };

  // Validate and add cluster
  const handleAddCluster = async () => {
    if (!selectedCluster || !selectedAccount) {
      setError('Please select a cluster to add.');
      return;
    }

    if (!selectedAccount._id || !selectedAccount.accountId || !selectedAccount.awsRegion) {
      setError('Incomplete AWS account data. Please reconnect the account.');
      return;
    }

    setIsAddingCluster(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.post('/api/clusters/save-data', {
        name: selectedCluster,
        region: selectedAccount.awsRegion,
        accountId: selectedAccount.accountId,
        kubeContext: selectedCluster
      });

      const newAdded = new Set(addedClusters);
      newAdded.add(selectedCluster);
      setAddedClusters(newAdded);

      setSuccessMessage(`Cluster "${selectedCluster}" added successfully!`);
      setSelectedCluster(null);
      onClusterAdded();
    } catch (err) {
      console.error('❌ Add cluster error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to add cluster. Check credentials and permissions.';
      setError(msg);
    } finally {
      setIsAddingCluster(false);
    }
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
                {savedAccounts.map((account) => {
                  const isSelected = selectedAccount?._id === account._id;
                  return (
                    <div
                      key={account._id}
                      onClick={() => setSelectedAccount(account)}
                      className={`p-4 rounded-xl cursor-pointer transition duration-200 transform hover:scale-[1.01] border ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#F26A2E] to-[#2A4C83] border-orange-300 shadow-md'
                          : 'bg-[#1E2633] border-gray-600 hover:bg-[#2A4C83]'
                      } text-white`}
                    >
                      <div className="flex justify-between">
                        <div>
                          {/* ✅ Show accountName if available, fallback to accountId */}
                          <p className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-[#F26A2E]" />
                            {account.accountName || account.accountId || 'Unknown'}
                          </p>
                          <p className="text-sm flex items-center gap-1 mt-1">
                            <MapPin className="h-4 w-4 text-white" />
                            {account.awsRegion || 'Not set'}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                      </div>
                      <p className="text-xs mt-2 text-gray-300">ID: {account._id?.substring(0, 8)}...</p>
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
              <div className="p-4 rounded-lg border border-gray-500 bg-[#1E2633] text-white shadow-sm">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#F26A2E]" />
                  Account Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ✅ Show accountName prominently */}
                  <div>
                    <p className="text-sm text-orange-300">Account Name</p>
                    <p className="font-mono text-white">{selectedAccount.accountName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-300">Account ID</p>
                    <p className="font-mono text-white">{selectedAccount.accountId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-orange-300">Region</p>
                    <p className="font-mono text-white">{selectedAccount.awsRegion || 'us-east-1'}</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center p-6 text-white">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading clusters from AWS...
                </div>
              ) : (
                <>
                  {error && (
                    <div className="flex items-start bg-red-600 text-white text-sm p-3 rounded-md">
                      <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
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
                              {loading ? 'Loading...' : 'No EKS clusters found in this region.'}
                            </td>
                          </tr>
                        ) : (
                          clusters.map((cluster) => (
                            <tr key={cluster} className="hover:bg-[#2A4C83]">
                              <td className="p-3">
                                <input
                                  type="radio"
                                  name="cluster"
                                  checked={selectedCluster === cluster}
                                  onChange={() => !isClusterAdded(cluster) && setSelectedCluster(cluster)}
                                  className="h-4 w-4 text-orange-500"
                                  disabled={isClusterAdded(cluster)}
                                />
                              </td>
                              <td className="p-3 font-mono">{cluster}</td>
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
                          'Add Cluster'
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
