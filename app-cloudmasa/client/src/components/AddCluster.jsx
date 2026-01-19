// AddCluster.jsx
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

function AddCluster({ onClusterAdded = () => {} }) {
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

  const isClusterAdded = (clusterName) => addedClusters.has(clusterName);

  // 🔹 Fetch saved AWS accounts
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

  // 🔹 Fetch already-saved clusters in DB
  const fetchAddedClusters = async () => {
    if (!selectedAccount?.accountId) return;
    try {
      const response = await api.get('/api/clusters/get-clusters', {
        params: { awsAccountId: selectedAccount.accountId }
      });
      const clusterNames = new Set(response.data.map(c => c.name));
      setAddedClusters(clusterNames);
    } catch (err) {
      console.warn('⚠️ DB cluster fetch failed — using empty set', err.message);
      setAddedClusters(new Set());
    }
  };

  // 🔹 Fetch LIVE EKS clusters from AWS
  const fetchClusters = async () => {
    if (!selectedAccount?._id) return;

    setLoading(true);
    setError(null);
    setSelectedCluster(null);

    try {
      const { data } = await api.post('/api/aws/eks-clusters', {
        accountId: selectedAccount._id
      });

      setClusters(data || []);
      setLastUpdated(new Date());
      await fetchAddedClusters();
    } catch (err) {
      console.error('Fetch clusters error:', err);
      let errorMessage = 'Failed to fetch EKS clusters.';
      if (err.response?.status === 500) {
        errorMessage = 'Server error. Check AWS permissions & region.';
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

  // 🔹 Refetch when account changes
  useEffect(() => {
    if (selectedAccount) {
      fetchClusters();
    } else {
      setClusters([]);
      setAddedClusters(new Set());
      setSelectedCluster(null);
    }
  }, [selectedAccount]);

  // 🔹 Manual refresh
  const handleRefresh = () => {
    if (selectedAccount) {
      fetchClusters();
    }
  };

  // 🔹 Add cluster to DB
  const handleAddCluster = async () => {
    if (!selectedCluster || !selectedAccount) {
      setError('Please select a cluster and AWS account.');
      return;
    }

    const name = String(selectedCluster.name || '').trim();
    const accountId = String(selectedAccount.accountId || '').trim();
    const region =
      String(selectedCluster.region || '').trim() ||
      String(selectedAccount.awsRegion || '').trim() ||
      'us-east-1';
    const kubeContext = name;

    if (!name) return setError('Cluster name is required.');
    if (!accountId || !/^\d{12}$/.test(accountId)) {
      return setError('Invalid AWS Account ID (must be exactly 12 digits).');
    }
    if (!region || region === 'undefined') {
      return setError('Region is missing. Ensure AWS account has a region set.');
    }
    if (!kubeContext) return setError('kubeContext is required.');

    setIsAddingCluster(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.post('/api/clusters/save-data', {
        name,
        region,
        accountId,
        kubeContext,
        outputFormat: 'json'
      });

      const newAdded = new Set(addedClusters);
      newAdded.add(name);
      setAddedClusters(newAdded);
      setSuccessMessage(`✅ Cluster "${name}" added successfully!`);
      setSelectedCluster(null);
      onClusterAdded();
    } catch (err) {
      console.error('❌ Add cluster error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.details ||
        err.response?.data?.error ||
        err.message ||
        'Failed to add cluster. Check server logs.';
      setError(msg);
    } finally {
      setIsAddingCluster(false);
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
   {/* Header Card — Red & White Theme */}
<div className="p-5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-900 shadow-lg border border-blue-800">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div className="flex items-center gap-3">
      <Layers className="h-7 w-7 text-white" />
      <h1 className="text-2xl font-bold text-white">AWS EKS Cluster Manager</h1>
    </div>
    {lastUpdated && (
      <div className="flex items-center gap-2 text-white text-sm">
        <Clock className="h-4 w-4 opacity-80" />
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <button
          onClick={handleRefresh}
          className="text-white hover:text-gray-200 p-1"
          disabled={loading}
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    )}
  </div>
</div>
        {/* AWS Account Selection — Orange headings, Grey-White gradient cards */}
        <div className="p-5 rounded-xl bg-gray-800 border border-gray-700">
          <h2 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-orange-400" />
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
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'border-orange-400 shadow-lg bg-gradient-to-br from-gray-700 to-gray-800 ring-2 ring-orange-500/30'
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600 hover:bg-gradient-to-br hover:from-gray-600 hover:to-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-orange-300 flex items-center gap-2">
                          <User className="h-4 w-4 text-orange-300" />
                          {account.accountName || account.accountId || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-300 flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {account.awsRegion || 'Not set'}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs mt-2 text-gray-400">
                      ID: {account.accountId?.substring(0, 8)}...
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-gray-600 rounded-lg text-center text-gray-300 bg-gray-850">
              No AWS accounts found.
              <a href="/cloud-connector" className="text-orange-400 hover:underline ml-2 font-medium">
                Connect an AWS account
              </a>
            </div>
          )}
        </div>

        {selectedAccount && (
          <div className="space-y-6">
            {/* Account Info Box — Clean, borderless, aligned */}
            <div className="p-4 rounded-xl bg-gray-800 border border-gray-700">
              <h3 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-400" />
                Account Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-orange-300 font-medium">Account Name</p>
                  <p className="text-white font-mono">{selectedAccount.accountName || '—'}</p>
                </div>
                <div>
                  <p className="text-orange-300 font-medium">Account ID</p>
                  <p className="text-white font-mono">{selectedAccount.accountId || '—'}</p>
                </div>
                <div>
                  <p className="text-orange-300 font-medium">Region</p>
                  <p className="text-white font-mono">{selectedAccount.awsRegion || 'us-east-1'}</p>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-900/50 border-l-4 border-red-500 rounded-lg text-red-200">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 bg-green-900/50 border-l-4 border-green-500 rounded-lg text-green-200">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{successMessage}</span>
              </div>
            )}

            {/* Clusters Table */}
            <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
              {loading ? (
                <div className="flex justify-center items-center p-8 text-gray-300">
                  <Loader2 className="h-6 w-6 animate-spin mr-2 text-orange-400" />
                  <span>Loading clusters from AWS...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-850 text-gray-200 uppercase text-xs">
                        <tr>
                          <th className="p-4 w-12">#</th>
                          <th className="p-4 flex items-center gap-2">
                            <Cloud className="h-4 w-4 text-orange-400" /> Cluster Name
                          </th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Version</th>
                          <th className="p-4">Nodes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {clusters.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-6 text-center text-gray-400">
                              No EKS clusters found.
                            </td>
                          </tr>
                        ) : (
                          clusters.map((cluster, idx) => (
                            <tr key={cluster._id || cluster.name} className="hover:bg-gray-850">
                              <td className="p-4">
                                <input
                                  type="radio"
                                  name="cluster"
                                  checked={selectedCluster?.name === cluster.name}
                                  onChange={() => !isClusterAdded(cluster.name) && setSelectedCluster(cluster)}
                                  className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                                  disabled={isClusterAdded(cluster.name)}
                                />
                              </td>
                              <td className="p-4 font-mono text-white">{cluster.name}</td>
                              <td className="p-4">
                                <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                                  cluster.status === 'running' ? 'bg-green-900 text-green-300' :
                                  cluster.status === 'creating' ? 'bg-blue-900 text-blue-300' :
                                  cluster.status === 'deleting' ? 'bg-yellow-900 text-yellow-300' :
                                  'bg-red-900 text-red-300'
                                }`}>
                                  {cluster.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm text-gray-300">v{cluster.version}</td>
                              <td className="p-4 text-sm text-gray-300">{cluster.liveNodeCount || 0}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Button — White-Yellow Gradient */}
                  {selectedCluster && !isClusterAdded(selectedCluster.name) && (
                    <div className="p-4 bg-gray-850 border-t border-gray-700">
                     <button
                      onClick={handleAddCluster}
                      disabled={isAddingCluster}
                      className={`w-full py-3 px-4 font-semibold rounded-lg text-white ${
                        isAddingCluster
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md transition-all duration-200'
                      }`}
                    >
                        {isAddingCluster ? (
                          <>
                            <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                            Adding Cluster...
                          </>
                        ) : (
                          ' Add Cluster '
                        )}
                      </button>
                    </div>
                  )}

                  {selectedCluster && isClusterAdded(selectedCluster.name) && (
                    <div className="p-4 bg-gray-850 border-t border-gray-700 text-center">
                      <span className="text-green-400 font-medium flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        This cluster is already added to CloudMasa.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddCluster;
