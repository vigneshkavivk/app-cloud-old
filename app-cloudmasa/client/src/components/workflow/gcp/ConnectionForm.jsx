import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  Globe,
  Link,
  Eye,
  EyeOff,
  CheckCircle,
  Cloud,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';

const ConnectionForm = ({
  selectedProvider,
  formData,
  setFormData,
  connectedAccounts,
  selectedAccount,
  setSelectedAccount,
  usingExistingAccount,
  setUsingExistingAccount,
  onValidate,
  onConnect,
  responseMessage,
  formValid,
  loading = false,
}) => {
  const [showSecret, setShowSecret] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Parse GCP JSON key
  const parseAndValidateGcpKey = () => {
    try {
      const json = JSON.parse(formData.gcpKeyJson);
      if (json.type !== 'service_account') {
        throw new Error('Not a service account key');
      }
      if (!json.project_id || !json.private_key || !json.client_email) {
        throw new Error('Missing required fields: project_id, private_key, client_email');
      }
      setFormData(prev => ({
        ...prev,
        projectId: json.project_id,
        clientEmail: json.client_email,
        accountName: json.project_id,
        gcpParsed: true,
      }));
      toast.success(`✅ Parsed key for project: ${json.project_id}`);
    } catch (err) {
      toast.error(`Invalid JSON or key format: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center">
        <KeyRound className="mr-2 text-orange-400" /> {selectedProvider.toUpperCase()} Credentials
      </h2>
      {/* ✅ GCP — Show Connected Accounts Dropdown + Key Upload */}
      {selectedProvider === "gcp" && (
        <>
          {/* ✅ Show existing accounts first */}
          {connectedAccounts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <Cloud className="mr-2 text-blue-400" /> Connected GCP Accounts
              </h3>
              <select
                value={selectedAccount ? selectedAccount._id : ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    setSelectedAccount(null);
                    setUsingExistingAccount(false);
                  } else {
                    const selected = connectedAccounts.find(acc => acc._id === e.target.value);
                    if (selected) {
                      setSelectedAccount(selected);
                      setFormData({
                        ...formData,
                        region: selected.region || 'global',
                        projectId: selected.projectId,
                        clientEmail: selected.email,
                        accountName: selected.accountName,
                        gcpParsed: true,
                      });
                      setUsingExistingAccount(true);
                    }
                  }
                }}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3"
              >
                <option value="">-- Select an Account --</option>
                {connectedAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.accountName} (Project ID: {account.projectId}) (Region: {account.region})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Select an existing GCP account to use.</p>
            </div>
          )}
          {/* ✅ Key upload section (only if no account selected or creating new) */}
          {!usingExistingAccount && (
            <div className="space-y-5">
              <div className="text-center py-4 bg-blue-900/30 rounded-lg border border-blue-700/50">
                <KeyRound className="mx-auto text-blue-400" size={48} />
                <h3 className="text-lg font-medium text-blue-200 mt-2">GCP Service Account Key</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Upload or paste your GCP service account JSON key file.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1.5">
                  Service Account Key (JSON)
                </label>
                <textarea
                  name="gcpKeyJson"
                  value={formData.gcpKeyJson || ''}
                  onChange={handleChange}
                  placeholder='{ "type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..." }'
                  rows={6}
                  className="w-full bg-[#1E2633] border border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from: GCP Console → IAM → Service Accounts → Keys → Add Key → JSON
                </p>
              </div>
              <button
                type="button"
                onClick={parseAndValidateGcpKey}
                disabled={loading || !formData.gcpKeyJson?.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white hover:from-teal-600 hover:via-cyan-700 hover:to-blue-800 font-semibold py-2.5 px-4 rounded-md shadow transition text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                Parse & Validate Key
              </button>
              {/* Auto-filled fields after parse */}
              {formData.gcpParsed && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1.5">
                      Project ID (Auto-filled)
                    </label>
                    <input
                      type="text"
                      value={formData.projectId}
                      readOnly
                      className="w-full bg-[#1E2633] border border-green-500 text-green-300 rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1.5">
                      Client Email (Auto-filled)
                    </label>
                    <input
                      type="text"
                      value={formData.clientEmail}
                      readOnly
                      className="w-full bg-[#1E2633] border border-green-500 text-green-300 rounded-md p-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-1.5">
                      Account Name
                    </label>
                    <input
                      type="text"
                      name="accountName"
                      value={formData.accountName}
                      onChange={handleChange}
                      placeholder="e.g., My GCP Project"
                      className="w-full bg-[#1E2633] border border-gray-600 text-white rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {/* ✅ Region selector — always shown */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center">
              <Globe className="mr-2 text-blue-400" size={16} /> Region
            </label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              disabled={usingExistingAccount}
              className={`w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3 ${
                usingExistingAccount ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {["us-central1", "us-east1", "us-west1"].map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Select the region where your resources will be deployed.
              {usingExistingAccount && " (Disabled because an existing account is selected)"}
            </p>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {selectedProvider === "gcp" && formData.gcpParsed && (
  <button
    type="button"  // ✅ NOT "submit"
    onClick={onConnect}  // ✅ Critical: call the handler from CloudWorkflow
    disabled={loading}
    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold py-2.5 px-4 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition"
  >
    {loading ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
    {loading ? 'Connecting...' : 'Connect Account'}
  </button>
)}
        {/* ✅ Success/Warning/Error messages appear here */}
        {responseMessage && (
          <span className={`ml-3 text-sm font-medium ${
            responseMessage.includes('✅') ? 'text-emerald-400' :
            responseMessage.includes('⚠️') ? 'text-amber-400' :
            'text-red-400'
          }`}>
            {responseMessage}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConnectionForm;
