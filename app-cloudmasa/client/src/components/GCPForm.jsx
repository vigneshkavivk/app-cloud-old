// GCPForm.jsx — cleaned, auto-fill, global region
import React, { useState, useCallback } from 'react';
import { Lock, Globe, Link, Eye, EyeOff, Mail, FileText } from 'lucide-react';

const GCPForm = ({ onSubmit, loading, onCancel }) => {
  const [formData, setFormData] = useState({
    privateKey: '',
    projectId: '',
    clientEmail: '',
    accountName: '',
  });
  const [showKey, setShowKey] = useState(false);

  // When parsing JSON, *override* all fields from the key and disable editing
const parseJsonKey = useCallback((jsonString) => {
  try {
    // Normalize whitespace (fix trailing spaces in URLs)
    const cleaned = jsonString
      .replace(/\s+/g, ' ')
      .replace(/"auth_uri"\s*:\s*"(.*?)"/gi, (_, u) => `"auth_uri":"${u.trim()}"`)
      .replace(/"token_uri"\s*:\s*"(.*?)"/gi, (_, u) => `"token_uri":"${u.trim()}"`);
    
    const data = JSON.parse(cleaned);

    if (!data.private_key || !data.client_email || !data.project_id) {
      throw new Error('Invalid key: missing private_key, client_email, or project_id');
    }

    // ✅ Lock everything to the JSON content
    setFormData({
      privateKey: cleaned,
      projectId: data.project_id,
      clientEmail: data.client_email,
      accountName: data.project_id,
    });
  } catch (err) {
    alert('⚠️ Invalid GCP JSON key. Please download it fresh from IAM > Service Accounts.');
    setFormData(prev => ({ ...prev, privateKey: '' }));
  }
}, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'privateKey' && value.trim().startsWith('{')) {
      parseJsonKey(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { projectId, clientEmail, privateKey } = formData;
    if (!projectId || !clientEmail || !privateKey) {
      alert('Please fill all required fields (auto-fill after pasting JSON key)');
      return;
    }
    onSubmit({
      projectId,
      clientEmail,
      privateKey,
      accountName: formData.accountName || projectId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Private Key */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Lock size={14} className="inline mr-1 text-green-400" /> Private Key (JSON)
        </label>
        <textarea
          name="privateKey"
          value={formData.privateKey}
          onChange={handleChange}
          placeholder="Paste your GCP service account JSON key here"
          rows={6}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-mono"
          required
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-10 text-gray-400 hover:text-green-400"
        >
          {showKey ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      {/* Project ID */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Globe size={14} className="inline mr-1 text-green-400" /> Project ID
        </label>
        <input
          type="text"
          value={formData.projectId}
          readOnly
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <Mail size={14} className="inline mr-1 text-green-400" /> Service Account Email
        </label>
        <input
          type="email"
          value={formData.clientEmail}
          readOnly
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
        />
      </div>

      {/* Account Name */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-1.5">
          <FileText size={14} className="inline mr-1 text-gray-400" /> Display Name
        </label>
        <input
          type="text"
          value={formData.accountName}
          onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
          className="w-full bg-[#0f172a] border border-gray-600 text-white rounded-md p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
        />
      </div>

      {/* Region (hidden) */}
      <input type="hidden" name="region" value="global" />

      <div className="pt-2 flex flex-col gap-2">
        <button
          type="submit"
          disabled={loading || !formData.projectId || !formData.clientEmail}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-semibold py-2.5 px-4 rounded-md hover:from-green-700 hover:to-emerald-800 shadow transition text-sm disabled:opacity-50"
        >
          <Link size={16} />
          Connect GCP Account
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-md"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default GCPForm;
