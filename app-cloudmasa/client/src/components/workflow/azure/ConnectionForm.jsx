// src/components/workflow/azure/ConnectionForm.jsx
import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Link,
  Eye,
  EyeOff,
  CheckCircle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

const AzureConnectionForm = ({
  selectedProvider,
  formData,
  setFormData,
  connectedAccounts = [],
  selectedAccount,
  setSelectedAccount,
  usingExistingAccount,
  setUsingExistingAccount,
  onValidate,
  onConnect,
  formValid,
  loading = false,
  setLoading,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [localResponseMessage, setLocalResponseMessage] = useState(""); // ✅ local state


  // Handle "Connect" button click — validate then connect
  const handleConnectClick = async () => {
    if (!formValid) return;

    setLoading(true);
  

    try {
      const token = JSON.parse(localStorage.getItem('user'))?.token || '';

      // ✅ Step 1: Validate credentials
      const validateRes = await fetch('/api/azure/validate-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          tenantId: formData.tenantId,
          subscriptionId: formData.subscriptionId,
          region: formData.region || 'global',
          accountName: formData.accountName || 'Azure Account'
        })
      });

      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.valid) {
        throw new Error(validateData.error || 'Validation failed');
      }

      // ✅ Step 2: Auto-fill Account Name from validation response
      if (validateData.subscriptionName) {
        setFormData(prev => ({ ...prev, accountName: validateData.subscriptionName }));
      }

      // ✅ Step 3: Connect (save to DB)
      const connectRes = await fetch('/api/azure/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: formData.clientId,
          clientSecret: formData.clientSecret,
          tenantId: formData.tenantId,
          subscriptionId: formData.subscriptionId,
          region: formData.region,
          accountName: formData.accountName.trim() || `Azure-${formData.subscriptionId?.slice(-6)}`
        })
      });

      const connectData = await connectRes.json();

      if (!connectRes.ok) {
        throw new Error(connectData.error || `HTTP ${connectRes.status}`);
      }

      // ✅ Success!
      setLocalResponseMessage(`✅ ${connectData.message}`);
      // Optionally, refresh accounts list
      // (Your parent component can handle this via state update)

    } catch (err) {
      console.error('Azure connect error:', err);
      setLocalResponseMessage(`❌ ${err.message || 'Failed to connect Azure account'}`);    } finally {
      setLoading(false);
      setTimeout(() => setLocalResponseMessage(""), 3000);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usingExistingAccount && selectedAccount) {
      onConnect({ useExisting: true, accountId: selectedAccount });
    } else if (!usingExistingAccount && formValid) {
      onConnect({ useExisting: false, ...formData });
    }
  };

  // Show existing account selector only if accounts exist
  const showExistingSelector = selectedProvider === 'azure' && connectedAccounts.length > 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <h2 className="text-xl font-semibold flex items-center">
        <KeyRound className="mr-2 text-orange-400" size={20} />
        {selectedProvider.toUpperCase()} Credentials
      </h2>

      {/* ✅ Simple Existing Account Dropdown (matches GCP style) */}
      {showExistingSelector && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Connected Azure Accounts</label>
          <select
            value={selectedAccount || ''}
            onChange={(e) => {
              setSelectedAccount(e.target.value);
              setUsingExistingAccount(true);
            }}
            className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3 text-gray-100"
          >
            <option value="" disabled>
              — Select an Azure Account —
            </option>
            {connectedAccounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.accountName || 'Azure Account'} • {acc.subscriptionId?.slice(0, 8)}...
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedProvider === 'azure' && (!selectedAccount || !usingExistingAccount) && (
  <form onSubmit={(e) => { e.preventDefault(); handleConnectClick(); }}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 🔑 Client ID */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center">
          <Lock className="mr-2 text-blue-400" size={16} /> Client ID
        </label>
        <input
          type="text"
          name="clientId"
          value={formData.clientId}
          onChange={handleChange}
          className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
          required
        />
      </div>

      {/* 🤫 Client Secret */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center">
          <Lock className="mr-2 text-blue-400" size={16} /> Client Secret
        </label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            name="clientSecret"
            value={formData.clientSecret}
            onChange={handleChange}
            className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3 pr-10"
            required
            autoComplete="current-password" // ✅ Helps password managers
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
            aria-label={showSecret ? 'Hide secret' : 'Show secret'}
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* 🏢 Tenant ID */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center">
          <Lock className="mr-2 text-blue-400" size={16} /> Tenant ID
        </label>
        <input
          type="text"
          name="tenantId"
          value={formData.tenantId}
          onChange={handleChange}
          className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
          required
        />
      </div>

      {/* 📦 Subscription ID */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center">
          <Lock className="mr-2 text-blue-400" size={16} /> Subscription ID
        </label>
        <input
          type="text"
          name="subscriptionId"
          value={formData.subscriptionId}
          onChange={handleChange}
          className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
          required
        />
      </div>

      {/* 🖋️ Account Name */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center">
          <Lock className="mr-2 text-blue-400" size={16} /> Account Name
        </label>
        <input
          type="text"
          name="accountName"
          value={formData.accountName}
          onChange={handleChange}
          placeholder="My Azure Subscription"
          className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
          required
        />
      </div>

      {/* 🌐 Region */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center">
          <Lock className="mr-2 text-blue-400" size={16} /> Region
        </label>
        <select
          name="region"
          value={formData.region || 'global'}
          onChange={handleChange}
          className="w-full bg-[#1E2633] border border-[#3a5b9b] rounded-md p-3"
        >
          <option value="global">Global</option>
          <option value="eastus">East US</option>
          <option value="westus">West US</option>
          <option value="northcentralus">North Central US</option>
          <option value="southeastasia">Southeast Asia</option>
          <option value="westeurope">West Europe</option>
        </select>
      </div>
    </div>

    {/* Keep the button OUTSIDE the grid but INSIDE the form */}
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
      <button
        type="submit" // ✅ triggers onSubmit
        disabled={
          loading ||
          (usingExistingAccount && !selectedAccount) ||
          (!usingExistingAccount && !formValid)
        }
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold py-2.5 px-4 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition disabled:opacity-60"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
        {loading
          ? 'Connecting...'
          : selectedAccount
            ? 'Use Selected Account'
            : 'Connect'}
      </button>

      {localResponseMessage && (
        <span className={`text-sm font-medium ${
          /✅|success/i.test(localResponseMessage)
            ? 'text-emerald-400'
            : /⚠️|warn/i.test(localResponseMessage)
              ? 'text-amber-400'
              : 'text-red-400'
        }`}>
          {localResponseMessage}
        </span>
      )}
    </div>
  </form>
)}
    </div>
  );
};

export default AzureConnectionForm;
