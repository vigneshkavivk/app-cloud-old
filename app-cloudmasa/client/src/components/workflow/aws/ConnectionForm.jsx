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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center">
        <KeyRound className="mr-2 text-orange-400" /> {selectedProvider.toUpperCase()} Credentials
      </h2>
      {/* ✅ AWS */}
      {selectedProvider === "aws" && (
        <>
          {connectedAccounts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <Cloud className="mr-2 text-orange-400" /> Connected Accounts
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
                      setFormData({ ...formData, region: selected.awsRegion });
                      setUsingExistingAccount(true);
                    }
                  }
                }}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3"
              >
                <option value="">-- Select an Account --</option>
                {connectedAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.accountName} ({account.accountId}) (Region: {account.awsRegion})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Select an existing AWS account to use.</p>
            </div>
          )}
          <div className="mb-6">
            <label className=" text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-orange-400" size={16} /> AWS Access Key
            </label>
            <div className="relative">
              <input
                type="text"
                name="accessKey"
                value={formData.accessKey}
                onChange={handleChange}
                disabled={usingExistingAccount}
                className={`w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3 ${
                  usingExistingAccount ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                required={!usingExistingAccount}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter your AWS Access Key ID from your IAM credentials.</p>
          </div>
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 flex items-center">
              <Lock className="mr-2 text-orange-400" size={16} /> AWS Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                name="secretKey"
                value={formData.secretKey}
                onChange={handleChange}
                disabled={usingExistingAccount}
                className={`w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-3 ${
                  usingExistingAccount ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                required={!usingExistingAccount}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-3 text-gray-400 hover:text-orange-400"
              >
                {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Enter your AWS Secret Access Key from your IAM credentials.</p>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {selectedProvider === "aws" && (
          <>
            <button
              type="button"
              onClick={onValidate}
              disabled={usingExistingAccount}
              className={`flex items-center gap-2 py-2 px-4 rounded font-medium transition ${
                usingExistingAccount
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              <Link size={16} /> Test Connection
            </button>
            {formData.accessKey && formData.secretKey && !usingExistingAccount && (
              <button
                type="button"
                onClick={onConnect}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-medium transition"
              >
                <CheckCircle size={16} /> Connect Account
              </button>
            )}
          </>
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
