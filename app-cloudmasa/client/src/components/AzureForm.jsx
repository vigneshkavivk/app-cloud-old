// src/components/AzureForm.jsx
import React, { useState } from 'react';
import { KeyRound, Lock, Globe, Link, Eye, EyeOff, Building, Box, ShieldCheck } from 'lucide-react';
import api from '../interceptor/api.interceptor'; 


const AzureForm = ({ onSubmit, loading, onCancel }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    tenantId: '',
    subscriptionId: '',
    region: '',
    accountName: '', // ✅ Explicitly add this
  });

  const [showSecret, setShowSecret] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  const regions = ['East US', 'West US', 'West Europe', 'Central US'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (isValidated) setIsValidated(false);
  };

  const validateAndFetchName = async () => {
  const { clientId, clientSecret, tenantId, subscriptionId, region } = formData;
  if (!clientId || !clientSecret || !tenantId || !subscriptionId || !region) {
    alert('Please fill all fields.');
    return;
  }

  setValidationLoading(true);
  try {
    // ✅ Use your existing api interceptor (handles auth automatically)
    const response = await api.post('/api/azure/validate-credentials', {
      clientId,
      clientSecret,
      tenantId,
      subscriptionId,
      region,
    });

    const data = response.data;

    if (data.valid) {
      const name = data.subscriptionName
        ? `${data.subscriptionName} (${subscriptionId.slice(-6)})`
        : `Azure-${subscriptionId.slice(-6)}`;
      setFormData((prev) => ({ ...prev, accountName: name }));
      setIsValidated(true);
    } else {
      alert(data.error || 'Validation failed. Please check your credentials.');
    }
  } catch (err) {
    console.error('Validation error:', err);
    const msg = err.response?.data?.error || 'Failed to validate credentials.';
    alert(msg);
  } finally {
    setValidationLoading(false);
  }
};

  const handleSubmit = (e) => {
  e.preventDefault();

  const { clientId, clientSecret, tenantId, subscriptionId, region, accountName } = formData;

  const errors = [];
  if (!clientId?.trim()) errors.push('Client ID');
  if (!clientSecret?.trim()) errors.push('Client Secret');
  if (!tenantId?.trim()) errors.push('Tenant ID');
  if (!subscriptionId?.trim()) errors.push('Subscription ID');
  if (!region?.trim()) errors.push('Region');
  if (!accountName?.trim()) errors.push('Account Name');

  if (errors.length > 0) {
    alert(`Missing required fields:\n• ${errors.join('\n• ')}`);
    return;
  }

  onSubmit({
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    tenantId: tenantId.trim(),
    subscriptionId: subscriptionId.trim(),
    region: region.trim(),
    accountName: accountName.trim(),
  });
};

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client ID */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <KeyRound size={14} className="inline mr-1 text-blue-400" /> Client ID
        </label>
        <input
          name="clientId"
          value={formData.clientId}
          onChange={handleChange}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          required
        />
      </div>

      {/* Client Secret */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Lock size={14} className="inline mr-1 text-blue-400" /> Client Secret
        </label>
        <input
          type={showSecret ? 'text' : 'password'}
          name="clientSecret"
          value={formData.clientSecret}
          onChange={handleChange}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          required
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowSecret(!showSecret)}
          className="absolute right-3 top-10 text-gray-400 hover:text-blue-400"
        >
          {showSecret ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      {/* Tenant ID */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Building size={14} className="inline mr-1 text-blue-400" /> Tenant ID
        </label>
        <input
          name="tenantId"
          value={formData.tenantId}
          onChange={handleChange}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          required
        />
      </div>

      {/* Subscription ID */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Box size={14} className="inline mr-1 text-blue-400" /> Subscription ID
        </label>
        <input
          name="subscriptionId"
          value={formData.subscriptionId}
          onChange={handleChange}                    
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          required
        />
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Globe size={14} className="inline mr-1 text-blue-400" /> Region
        </label>
        <select
          name="region"
          value={formData.region}
          onChange={handleChange}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          required
        >
          <option value="">-- Select Region --</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Account Name (Auto-filled) */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <ShieldCheck size={14} className="inline mr-1 text-green-400" /> Account Name (Auto-filled)
        </label>
        <input
          type="text"
          name="accountName"
          value={formData.accountName}
          onChange={handleChange} // Optional: allow manual edit
          readOnly
          className="w-full bg-[#0f172a] border border-green-500 text-green-300 rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
        />
      </div>

      {/* Validate Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={validateAndFetchName}
          disabled={validationLoading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-2.5 rounded-md hover:from-blue-600 hover:to-indigo-700 text-sm disabled:opacity-50"
        >
          {validationLoading ? 'Validating...' : 'Validate & Auto-Fill'}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 text-sm bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !isValidated}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-700 text-white font-semibold py-2.5 px-4 rounded-md hover:from-blue-700 hover:to-purple-800 shadow transition text-sm disabled:opacity-50"
        >
          <Link size={16} /> Connect Account
        </button>
      </div>
    </form>
  );
};

export default AzureForm;
