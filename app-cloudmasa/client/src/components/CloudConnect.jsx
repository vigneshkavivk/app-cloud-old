// src/components/CloudConnector.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Cloud, XCircle } from 'lucide-react';
import api from '../interceptor/api.interceptor';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AWSForm from './AWSForm';
import GCPForm from './GCPForm';
import AzureForm from './AzureForm';

// ✅ Fixed AccountCard Component
const AccountCard = React.memo(({ account, onRemove, canDelete }) => {
  const provider = account.cloudProvider || 'Unknown';
  const region = account.region || account.awsRegion || 'N/A';

  // Safely get the account ID
  const accountId = account.accountId || account.projectId || account.subscriptionId || 'N/A';

  // Use accountName if available, otherwise fallback
  const accountName = account.accountName || (
    provider === 'AWS' ? `AWS-${accountId.slice(-6)}` :
    provider === 'Azure' ? `Azure-${accountId.slice(-6)}` :
    provider === 'GCP' ? `GCP-${accountId.slice(-6)}` :
    accountId
  );

  return (
    <div className="relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col h-full w-full backdrop-blur-sm">
      <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2.5] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud className="text-[#F26A2E]" size={20} />
          <h3 className="text-lg font-semibold">{provider} Cloud</h3>
        </div>
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-600 text-white">
          Connected
        </span>
      </div>
      <div className="space-y-3 text-sm flex-1">
        {/* Display the Account Name prominently */}
        <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
          <span className="text-gray-300 font-medium">Account:</span>
          <span className="text-white truncate max-w-[180px] block font-medium">
            {accountName}
          </span>
        </div>
        <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
          <span className="text-gray-300 font-medium">Region:</span>
          <span className="text-white">{region}</span>
        </div>

        {/* ✅ For Azure: Show full Subscription ID and Tenant ID */}
        {provider === 'Azure' && (
          <>
            {/* ✅ Full Subscription ID */}
            <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
              <span className="text-gray-300 font-medium">Subscription ID:</span>
              <span className="text-white font-mono text-xs break-all">
                ...{account.subscriptionId.slice(-8)}
              </span>
            </div>

            {/* ✅ Full Tenant ID */}
            <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
              <span className="text-gray-300 font-medium">Tenant ID:</span>
              <span className="text-white font-mono text-xs break-all">
                ...{account.tenantId.slice(-8)}
              </span>
            </div>
          </>
        )}

        {/* ✅ For other providers, show the generic ID */}
        {provider !== 'Azure' && (
          <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
            <span className="text-gray-300 font-medium">ID:</span>
            <span className="text-white font-mono">
              {accountId ? `...${accountId.slice(-6)}` : '—'}
            </span>
          </div>
        )}

        {account.roleArn && provider === 'AWS' && (
          <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
            <span className="text-gray-300 font-medium">Role:</span>
            <span className="text-white text-xs font-mono truncate max-w-[180px]">
              ...{account.roleArn.split('/').pop()}
            </span>
          </div>
        )}
        {account.email && provider === 'GCP' && (
          <div className="flex justify-between py-2 px-3 bg-white bg-opacity-5 rounded-md">
            <span className="text-gray-300 font-medium">Service Account:</span>
            <span className="text-white text-xs truncate max-w-[180px]">
              {account.email}
            </span>
          </div>
        )}
      </div>
      {canDelete && (
        <div className="mt-auto pt-3 flex justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(account);
            }}
            className="p-2 text-red-400 hover:text-red-300 flex items-center justify-center bg-red-500 bg-opacity-10 hover:bg-red-500 hover:bg-opacity-20 rounded-md transition-all duration-200"
            title="Remove Account"
            aria-label="Remove Account"
          >
            <XCircle size={16} />
          </button>
        </div>
      )}
    </div>
  );
});

const CloudConnector = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('Credentials', 'Create');
  const canView = hasPermission('Credentials', 'View');
  const canDelete = hasPermission('Credentials', 'Delete');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  // Fetch accounts
  const fetchConnectedAccounts = useCallback(async () => {
    if (!canView) return;
    try {
      const [awsRes, gcpRes, azureRes] = await Promise.all([
        api.get('/api/aws/get-aws-accounts').catch(() => ({ data: [] })),
        api.get('/api/gcp/accounts').catch(() => ({ data: [] })),
        api.get('/api/azure/accounts').catch(() => ({ data: [] })),
      ]);

      const awsAccounts = Array.isArray(awsRes.data)
        ? awsRes.data.map((acc) => ({
            ...acc,
            cloudProvider: 'AWS',
            region: acc.awsRegion || 'N/A',
          }))
        : [];

      const gcpAccounts = Array.isArray(gcpRes.data)
        ? gcpRes.data.map((acc) => ({
            ...acc,
            cloudProvider: 'GCP',
            region: acc.region || 'global',
          }))
        : [];

      // ✅ FIXED: Correctly map Azure account fields
      const azureAccounts = Array.isArray(azureRes.data)
        ? azureRes.data.map((acc) => ({
            ...acc,
            cloudProvider: 'Azure',
            region: acc.region || 'global',            
            subscriptionId: acc.subscriptionId, 
            tenantId: acc.tenantId,          
            accountName: acc.accountName,            
            accountId: acc.subscriptionId || acc.accountId, 
          }))
        : [];

      setConnectedAccounts([...awsAccounts, ...gcpAccounts, ...azureAccounts]);
    } catch (err) {
      console.error('❌ Failed to fetch accounts:', err);
      toast.error('Failed to load cloud accounts.');
    }
  }, [canView]);

  useEffect(() => {
    fetchConnectedAccounts();
  }, [fetchConnectedAccounts]);

  // Handle connect
  const handleConnect = async (data, provider) => {
    if (!canWrite) {
      toast.error("You don't have permission to connect cloud accounts.");
      return;
    }
    setLoading(true);
    try {
      let response;
      if (provider === 'AWS') {
        response = await api.post('/api/aws/connect', {
          accessKeyId: data.accessKey,
          secretAccessKey: data.secretKey,
          region: data.region,
          accountName: data.accountName,
          roleArn: data.roleArn,
        });
      } else if (provider === 'GCP') {
        response = await api.post('/api/gcp/connect', {
          projectId: data.projectId,
          clientEmail: data.clientEmail,
          privateKey: data.privateKey,
          accountName: data.accountName || data.projectId,
        });
      } else if (provider === 'Azure') {
        response = await api.post('/api/azure/connect', {
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          tenantId: data.tenantId,
          subscriptionId: data.subscriptionId,
          region: data.region,
          accountName: data.accountName,
        });
      } else {
        throw new Error('Unsupported provider');
      }
      toast.success(response.data.message || 'Account connected successfully!');
      await fetchConnectedAccounts();
      setSelectedProvider('');
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to connect ${provider} account.`;
      toast.error(msg);
      console.error(`${provider} connect error:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = useCallback(
    (account) => {
      if (!canDelete) {
        toast.error("You don't have permission to remove accounts.");
        return;
      }
      setAccountToDelete(account);
      setShowDeleteModal(true);
      setDeleteConfirmationText('');
    },
    [canDelete]
  );

  const confirmDelete = async () => {
    if (deleteConfirmationText.trim() !== 'DELETE') {
      toast.error('⚠️ You must type DELETE in ALL CAPS — no lowercase!');
      return;
    }
    try {
      if (accountToDelete.cloudProvider === 'AWS') {
        await api.delete(`/api/aws/account/${accountToDelete._id}`);
      } else if (accountToDelete.cloudProvider === 'GCP') {
        await api.delete(`/api/gcp/account/${accountToDelete._id}`);
      } else if (accountToDelete.cloudProvider === 'Azure') {
        await api.delete(`/api/azure/account/${accountToDelete._id}`);
      } else {
        throw new Error('Unknown provider');
      }
      toast.success('✅ Account removed successfully!');
      setConnectedAccounts((prev) =>
        prev.filter((acc) => acc._id !== accountToDelete._id)
      );
      setShowDeleteModal(false);
      setAccountToDelete(null);
      setDeleteConfirmationText('');
    } catch (err) {
      console.error('❌ Delete failed:', err);
      toast.error(err.response?.data?.error || 'Failed to delete account.');
    }
  };

  // ✅ Updated with official colors & logo-ready structure
  const providers = [
  { 
    id: 'AWS', 
    label: 'Amazon Web Services', 
    color: 'from-[#B85C00] to-[#CC7722]' // Deep amber → burnt orange
  },
  { 
    id: 'GCP', 
    label: 'Google Cloud Platform', 
    color: 'from-[#2E5EAA] to-[#2E7D32]' // Navy blue → forest green
  },
  { 
    id: 'Azure', 
    label: 'Microsoft Azure', 
    color: 'from-[#004E8C] to-[#0062A3]' // Deep azure → royal blue
  },
];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white relative overflow-hidden">
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .dashboard-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 30px 30px; }
        .animated-gradient-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; opacity: 0.1; background: conic-gradient(from 0deg, #0ea5e9, #0f172a, #60a5fa, #0f172a, #0ea5e9); background-size: 400% 400%; animation: gradientShift 20s ease infinite; filter: blur(60px); }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .red-orange-gradient-text { background: linear-gradient(to right, #ef4444, #f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 600; }
      `}</style>
      <div className="dashboard-bg"></div>
      <div className="animated-gradient-bg"></div>
      <div className="w-full max-w-[1600px] mx-auto relative z-10 px-4 sm:px-6 py-10">
        <h1 className="text-4xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Cloud Connector
          </span>
        </h1>
        {canWrite ? (
          <div className="bg-[#1e293b]/80 backdrop-blur-none shadow-none p-6 w-full max-w-xl mx-auto">
            {!selectedProvider ? (
              <div className="space-y-4">
                <div className="bg-[#1a202c] p-6 rounded-xl border border-gray-700">
                  {/* ✅ Grid: 3-column on medium+, logos included */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProvider(p.id)}
                        className={`p-4 rounded-xl text-white font-semibold shadow-md transition-all hover:scale-[1.02] bg-gradient-to-r ${p.color} focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer hover:shadow-lg flex flex-col items-center justify-center gap-2 min-h-[110px]`}
                        aria-label={`Connect to ${p.label}`}
                      >
                        {/* ✅ Official SVG Logos */}
                        <div className="w-10 h-10 flex items-center justify-center">
                          {p.id === 'AWS' && (
                            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                              <path d="M12 2L2 7v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7l-10-5zm0 2.14L18.43 7 12 9.43 5.57 7 12 4.14zM4 19V9.43l6.57 2.43L12 12.3l1.43-.43L20 9.43V19H4z" />
                            </svg>
                          )}
                          {p.id === 'GCP' && (
                            <svg viewBox="0 0 24 24" className="w-7 h-7">
                              <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                            </svg>
                          )}
                          {p.id === 'Azure' && (
                            <svg viewBox="0 0 24 24" className="w-7 h-7">
                              <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-center text-sm md:text-base mt-1">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setSelectedProvider('')}
                  className="text-sm text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-1"
                >
                  ← Back to Providers
                </button>
                {selectedProvider === 'AWS' && (
                  <AWSForm
                    onSubmit={(data) => handleConnect(data, 'AWS')}
                    loading={loading}
                    onCancel={() => setSelectedProvider('')}
                  />
                )}
                {selectedProvider === 'GCP' && (
                  <GCPForm
                    onSubmit={(data) => handleConnect(data, 'GCP')}
                    loading={loading}
                    onCancel={() => setSelectedProvider('')}
                  />
                )}
                {selectedProvider === 'Azure' && (
                  <AzureForm
                    onSubmit={(data) => handleConnect(data, 'Azure')}
                    loading={loading}
                    onCancel={() => setSelectedProvider('')}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm bg-[#1e293b]/80 backdrop-blur rounded-lg">
            🔒 You don't have permission to connect cloud accounts.
          </div>
        )}
        {connectedAccounts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-6 px-2">
              <span className="red-orange-gradient-text">Connected Cloud Accounts</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {connectedAccounts.map((account) => (
                <div key={account._id} className="w-full">
                  <AccountCard
                    account={account}
                    onRemove={handleRemoveAccount}
                    canDelete={canDelete}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {connectedAccounts.length === 0 && canView && (
          <div className="mt-10 text-center text-gray-500">
            <Cloud className="mx-auto mb-2 text-gray-600" size={48} />
            <p>No cloud accounts connected yet.</p>
            <p className="text-sm mt-1">Connect one above to get started.</p>
          </div>
        )}
      </div>
      {/* Delete Modal */}
      {showDeleteModal && accountToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1a202c] rounded-xl p-8 max-w-lg w-full shadow-2xl border border-gray-800 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-200 text-xl p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex flex-col items-center mb-6">
              <div className="flex items-center gap-3 mb-2">
                <XCircle size={24} className="text-red-500" />
                <h3 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                  Delete {accountToDelete.cloudProvider} Account
                </h3>
              </div>
              <span className="text-sm text-gray-500">
                {accountToDelete.accountName || accountToDelete.accountId}
              </span>
            </div>
            <p className="text-gray-300 mb-6 text-base leading-relaxed text-center">
              Are you sure? This action <span className="text-red-400 font-bold">cannot be undone</span>.
              <br />
              <span className="text-sm text-gray-500 mt-1 block">
                All connected resources will be deregistered.
              </span>
            </p>
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-400 mb-2 text-center">
                Type <span className="text-red-400 font-extrabold">DELETE</span> (in ALL CAPS) to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#0f172a] border border-red-500/30 text-white placeholder-gray-500 rounded-md p-3 text-base focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all duration-200"
                autoFocus
              />
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white text-base font-semibold rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmationText.trim() !== 'DELETE'}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                <XCircle size={18} />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={4000} theme="colored" className="z-[70]" />
    </div>
  );
};

export default CloudConnector;

