// src/components/CloudConnect.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Cloud,
  Lock,
  KeyRound,
  Globe,
  Link,
  Loader2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import { __API_URL__ as API_URL } from '../config/env.config';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CloudConnector = () => {
  const { hasPermission } = useAuth();

  const canWrite = () => hasPermission('Credentials', 'Create');
  const canDelete = () => hasPermission('Credentials', 'Delete');

  const [formData, setFormData] = useState({
    cloudProvider: '',
    secretKey: '',
    accessKey: '',
    region: '',
    accountName: '',
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [showSecret, setShowSecret] = useState(false);
  const [showAccess, setShowAccess] = useState(false);

  const API_BASE = API_URL || '';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/aws/get-aws-accounts`);
      const result = await response.json();

      if (response.ok) {
        const uniqueAccounts = result.filter(
          (value, index, self) =>
            index === self.findIndex((t) => t.accountId === value.accountId)
        );
        setConnectedAccounts(uniqueAccounts);
      } else {
        setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
        toast.error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
      setResponseMessage('Failed to fetch connected accounts.');
      toast.error('Failed to fetch connected accounts.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canWrite()) {
      toast.error("You don't have permission to connect cloud accounts.");
      return;
    }

    setLoading(true);
    setResponseMessage('');

    try {
      const payload = {
        accessKeyId: formData.accessKey,
        secretAccessKey: formData.secretKey,
        region: formData.region,
        cloudProvider: formData.cloudProvider,
        accountName: formData.accountName,
      };

      const response = await fetch(`${API_BASE}/api/aws/connect-to-aws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message);
        setResponseMessage(result.message);
        await fetchConnectedAccounts();
        setFormData({
          cloudProvider: '',
          secretKey: '',
          accessKey: '',
          region: '',
          accountName: '',
        });
      } else {
        toast.error(result.error || 'Unknown error');
        setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setResponseMessage('Failed to connect.');
      toast.error('Failed to connect.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (_id) => {
    if (!_id || !canDelete()) {
      toast.error("You don't have permission to remove cloud accounts.");
      return;
    }

    if (!window.confirm('Are you sure you want to remove this account?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/aws/remove-aws-account/${_id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (response.ok) {
        toast.success(result.message);
        setResponseMessage(result.message);
        const updated = connectedAccounts.filter((acc) => acc._id !== _id);
        setConnectedAccounts(updated);
      } else {
        toast.error(result.error || 'Unknown error');
        setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing account:', error);
      setResponseMessage('Failed to remove account.');
      toast.error('Failed to remove account.');
    }
  };

  const regions = {
    AWS: ['us-east-1', 'us-west-1', 'us-west-2'],
    Azure: ['East US', 'West US', 'West Europe'],
    GCP: ['us-central1', 'us-east1', 'us-west1'],
  };

  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  // ✅ Smaller Account Card with Gap
  const AccountCard = ({ account }) => (
    <div
      className={`relative bg-gradient-to-br from-[#2A4C83] via-[#1E2633] to-[#2A4C83] rounded-xl p-4 text-white shadow-md hover:shadow-lg transition-all duration-300 group overflow-hidden flex flex-col h-full border border-[#3a5b9b] w-full min-w-[260px] m-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="text-[#F26A2E]" size={20} />
          <h3 className="text-base font-semibold text-white">AWS Cloud</h3>
        </div>
        <div className="bg-white bg-opacity-20 p-1.5 rounded-full">
          <ShieldCheck size={16} className="text-green-400" />
        </div>
      </div>

      {/* Account Details */}
      <div className="space-y-2 text-xs flex-1">
        <div className="flex justify-between py-1.5 px-2.5 bg-white bg-opacity-5 rounded">
          <span className="text-gray-300 font-medium">Account:</span>
          <span className="font-medium text-white truncate max-w-[140px]">
            {account.accountName || account.accountId}
          </span>
        </div>

        <div className="flex justify-between py-1.5 px-2.5 bg-white bg-opacity-5 rounded">
          <span className="text-gray-300 font-medium">Region:</span>
          <span className="text-white">{account.awsRegion || account.region || 'N/A'}</span>
        </div>

        <div className="flex justify-between py-1.5 px-2.5 bg-white bg-opacity-5 rounded">
          <span className="text-gray-300 font-medium">ARN:</span>
          <span className="text-white truncate max-w-[140px] block">{account.arn}</span>
        </div>
      </div>

      {/* Remove Button */}
      {canDelete() && (
        <div className="mt-3 pt-2 border-t border-white border-opacity-10">
          <button
            onClick={() => handleRemoveAccount(account._id)}
            className="w-full py-1.5 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors bg-red-500 bg-opacity-10 hover:bg-red-500 hover:bg-opacity-20 rounded"
          >
            <XCircle size={14} />
            Remove
          </button>
        </div>
      )}

      {/* Animated Overlay */}
      <div className="absolute inset-0 bg-white opacity-5 transform rotate-45 scale-x-[2] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1E2633] p-6 px-8 text-white">
      <div className="max-w-6xl mx-auto flex flex-col items-center space-y-8">

        {/* Connect Form */}
        {canWrite() ? (
          <div className="bg-[#2A4C83] border border-[#3a5b9b] rounded-2xl shadow-lg p-6 w-full max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2.5 text-white">
              <Cloud className="text-[#F26A2E]" /> Connect Your Cloud Account
            </h2>

            <div className="mb-4">
              <label htmlFor="cloudProvider" className="block text-sm font-medium text-gray-200 mb-1.5">
                Choose Cloud Provider
              </label>
              <select
                name="cloudProvider"
                value={formData.cloudProvider}
                onChange={handleChange}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="">-- Select Provider --</option>
                <option value="AWS">Amazon Web Services (AWS)</option>
                <option value="Azure">Microsoft Azure</option>
                <option value="GCP">Google Cloud Platform (GCP)</option>
              </select>
            </div>

            {formData.cloudProvider && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Access Key */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    <KeyRound size={14} className="inline mr-1 text-orange-400" /> Access Key
                  </label>
                  <input
                    type={showAccess ? 'text' : 'password'}
                    name="accessKey"
                    value={formData.accessKey}
                    onChange={handleChange}
                    className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccess((prev) => !prev)}
                    className="absolute right-3 top-[34px] text-gray-400 hover:text-orange-400"
                  >
                    {showAccess ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>

                {/* Secret Key */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    <Lock size={14} className="inline mr-1 text-orange-400" /> Secret Key
                  </label>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    name="secretKey"
                    value={formData.secretKey}
                    onChange={handleChange}
                    className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((prev) => !prev)}
                    className="absolute right-3 top-[34px] text-gray-400 hover:text-orange-400"
                  >
                    {showSecret ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    <Globe size={14} className="inline mr-1 text-orange-400" /> Region
                  </label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleChange}
                    className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500 text-sm"
                    required
                  >
                    <option value="">-- Select Region --</option>
                    {regions[formData.cloudProvider]?.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleChange}
                    placeholder="e.g., keerthu"
                    className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#F26A2E] text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 shadow transition text-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
                  {loading ? 'Connecting...' : 'Connect Account'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            🔒 You don’t have permission to connect cloud accounts.
          </div>
        )}

        {/* Connected Accounts Grid — Smaller Cards, Clear Gap */}
        {connectedAccounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center">
            {connectedAccounts.map((account) => (
              <div key={account._id} className="flex justify-center">
                <AccountCard account={account} />
              </div>
            ))}
          </div>
        )}

        {responseMessage && (
          <div className="text-center text-sm text-gray-300 italic flex items-center justify-center gap-1.5">
            <ShieldAlert size={16} className="text-yellow-400" /> {responseMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudConnector;