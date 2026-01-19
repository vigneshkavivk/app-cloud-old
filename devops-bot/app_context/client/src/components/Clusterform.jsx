import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  User,
  MapPin,
  Layers,
  Server,
  TerminalSquare
} from 'lucide-react';
import axios from 'axios';
import TerminalComponent from './Console'; // Import the terminal
import api from '../interceptor/api.interceptor';

function ClusterForm() {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    const fetchSavedAccounts = async () => {
      try {
        const { data } = await api.get('/get-aws-accounts');
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

  const fetchClusters = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/get-eks-clusters', {
        accountId: selectedAccount.accountId
      });
      // const { data } = await axios.post('http://localhost:3000/api/get-eks-clusters', {
      //   accountId: selectedAccount.accountId
      // });
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
    if (selectedAccount) fetchClusters();
  }, [selectedAccount]);

  const handleRefresh = () => {
    fetchClusters();
  };

  const handleInteract = () => {
    if (!selectedAccount) {
      setError('Please select an account to interact with');
      return;
    }
    setShowTerminal(true);
  };

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: '#1E2633' }}>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-[#F26A2E]" />
            AWS EKS Cluster Manager
          </h1>
          {lastUpdated && (
            <div className="text-sm text-white flex items-center gap-3">
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              <button
                onClick={handleRefresh}
                className="text-[#F26A2E] hover:text-orange-400"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-600 text-white p-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-600 text-white p-3 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Account Selection */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-[#F26A2E]" />
            Select AWS Account
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedAccounts.map(account => {
              const isSelected = selectedAccount?.accountId === account.accountId;
              return (
                <div
                  key={account.accountId}
                  onClick={() => setSelectedAccount(account)}
                  className={`p-4 rounded-xl cursor-pointer transition duration-200 transform hover:scale-[1.01] border text-white ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#F26A2E] to-[#2A4C83] border-orange-300 shadow-md'
                      : 'bg-[#1E2633] border-gray-600 hover:bg-[#2A4C83]'
                  }`}
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
        </div>

        {/* Interact Button */}
        {selectedAccount && (
          <div className="mt-6">
            <button
              onClick={handleInteract}
              className="bg-gradient-to-r from-[#F26A2E] to-[#2A4C83] text-white px-6 py-2 rounded-lg shadow-md hover:opacity-90 flex items-center gap-2"
            >
              <TerminalSquare className="w-5 h-5" />
              Interact
            </button>
          </div>
        )}

        {/* Terminal Console */}
        {showTerminal && selectedAccount && (
          <div className="mt-8">
            <TerminalComponent account={selectedAccount} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ClusterForm;
