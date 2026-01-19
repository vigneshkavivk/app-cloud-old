// src/components/AWSForm.jsx
import React, { useState, useCallback } from 'react';
import {
  KeyRound,
  Lock,
  Globe,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Link,
} from 'lucide-react';
import api from '../interceptor/api.interceptor'; // ✅ Use interceptor for auth headers

const AWSForm = ({ onSubmit, loading, onCancel }) => {
  const [formData, setFormData] = useState({
    accessKey: '',
    secretKey: '',
    region: '',
    accountName: '',
    roleArn: '',
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);

  const regions = [
    'us-east-1',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'ap-south-1',
    'ap-southeast-1',
  ];

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (
        (name === 'accessKey' || name === 'secretKey' || name === 'region') &&
        isValidated
      ) {
        setIsValidated(false);
      }
    },
    [isValidated]
  );

  const validateAndFetchAccountName = async () => {
    const { accessKey, secretKey, region } = formData;
    if (!accessKey.trim() || !secretKey.trim() || !region) {
      alert('Please fill Access Key, Secret Key, and Region.');
      return;
    }

    setValidationLoading(true);
    try {
      // ✅ Use `api` instead of raw `fetch` to include auth headers
      const response = await api.post('/api/aws/validate-credentials', {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        region,
      });

      const data = response.data;

      if (data.valid && data.accountId) {
        const nameToUse =
          data.accountAlias ||
          (data.arn?.includes('user/')
            ? data.arn.split('user/')[1].split('/')[0]
            : null) ||
          `AWS-${data.accountId.slice(-6)}` ||
          'AWS Account';

        setFormData((prev) => ({
          ...prev,
          accountName: nameToUse,
          roleArn: data.roleArn || '',
        }));

        setIsValidated(true);
        alert(`✅ Connected to: ${nameToUse}`);
      } else {
        alert(data.error || 'Invalid AWS credentials.');
        setIsValidated(false);
      }
    } catch (err) {
      console.error('Validation error:', err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to validate AWS credentials.';
      alert(`❌ ${msg}`);
      setIsValidated(false);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleSubmit = (e) => {
  e.preventDefault();

  if (!formData.accessKey.trim()) {
    alert('Access Key is required.');
    return;
  }
  if (!formData.secretKey.trim()) {
    alert('Secret Key is required.');
    return;
  }
  if (!formData.region) {
    alert('Region is required.');
    return;
  }
  if (!formData.roleArn.trim()) {
    alert('Role ARN is required. Please validate first.');
    return;
  }

  onSubmit({
    accessKey: formData.accessKey,      // ✅ Use correct field names
    secretKey: formData.secretKey,      // ✅ Use correct field names
    region: formData.region,
    accountName: formData.accountName,
    roleArn: formData.roleArn,
  });
};

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ✅ Hidden username field for password manager accessibility */}
      <input
        type="text"
        name="username"
        className="hidden"
        autoComplete="username"
      />

      {/* Access Key */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <KeyRound size={14} className="inline mr-1 text-blue-400" /> Access Key
        </label>
        <input
          type={showAccess ? 'text' : 'password'}
          name="accessKey"
          value={formData.accessKey}
          onChange={handleChange}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          required
          autoComplete="new-password" // ✅ Critical for security
        />
        <button
          type="button"
          onClick={() => setShowAccess(!showAccess)}
          className="absolute right-3 top-10 text-gray-400 hover:text-blue-400"
          aria-label={showAccess ? 'Hide access key' : 'Show access key'}
        >
          {showAccess ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      {/* Secret Key */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Lock size={14} className="inline mr-1 text-blue-400" /> Secret Key
        </label>
        <input
          type={showSecret ? 'text' : 'password'}
          name="secretKey"
          value={formData.secretKey}
          onChange={handleChange}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          required
          autoComplete="new-password" // ✅ Prevents password manager misuse
        />
        <button
          type="button"
          onClick={() => setShowSecret(!showSecret)}
          className="absolute right-3 top-10 text-gray-400 hover:text-blue-400"
          aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
        >
          {showSecret ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
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
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Account Name */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          Account Name (Auto-filled)
        </label>
        <input
          type="text"
          name="accountName"
          value={formData.accountName}
          readOnly={!isValidated} // editable only before validation
          onChange={handleChange}
          className={`w-full rounded-md p-2.5 text-sm focus:ring-2 ${
            isValidated
              ? 'bg-[#0f172a] border border-green-500 text-green-300 focus:border-green-500 focus:ring-green-500'
              : 'bg-[#0f172a] border border-gray-600 text-gray-400 focus:border-gray-500 focus:ring-blue-500'
          }`}
        />
      </div>

      {/* Role ARN — after validation */}
      {isValidated && (
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1.5">
            <ShieldCheck size={14} className="inline mr-1 text-green-400" /> Role ARN (Auto-generated)
          </label>
          <input
            type="text"
            name="roleArn"
            value={formData.roleArn}
            readOnly
            className="w-full bg-[#0f172a] border border-green-500 text-green-300 rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            IAM role used for secure access (via AssumeRole).
          </p>
        </div>
      )}

      <div className="pt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={validateAndFetchAccountName}
          disabled={validationLoading || !formData.accessKey || !formData.secretKey || !formData.region}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white hover:from-teal-600 hover:via-cyan-700 hover:to-blue-800 font-semibold py-2.5 px-4 rounded-md shadow transition text-sm disabled:opacity-50"
        >
          {validationLoading ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Validating...
            </>
          ) : (
            <ShieldCheck size={16} />
          )}
          Validate & Auto-Fill Account Name
        </button>
        <div className="flex gap-2">
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
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 font-semibold py-2.5 px-4 rounded-md hover:from-orange-600 hover:to-orange-700 shadow transition text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Link size={16} />}
            Connect Account
          </button>
        </div>
      </div>
    </form>
  );
};

export default AWSForm;

