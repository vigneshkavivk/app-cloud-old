// src/components/Mailsend.jsx
import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { __API_URL__ } from '../config/env.config';

const SendInvite = ({ onClose, onSuccess, workspace }) => {
  const { hasPermission } = useAuth();
  const canInvite = hasPermission('Overall', 'Administer');

  if (!canInvite) {
    return (
      <div className="text-center py-8">
        <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-400 mb-2">Access Denied</h3>
        <p className="text-gray-300 text-sm">
          You need <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">Overall.Administer</span> permission.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-5 py-2.5 bg-gradient-to-r from-white to-amber-300 text-gray-900 font-medium rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          Close
        </button>
      </div>
    );
  }

  if (!workspace || !workspace._id) {
    console.error('[SendInvite] Invalid workspace:', workspace);
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-bold text-red-400 mb-2">❌ Invalid Workspace</h3>
        <p className="text-gray-300">Workspace data missing.</p>
        <button
          onClick={onClose}
          className="mt-4 px-5 py-2.5 bg-gradient-to-r from-white to-amber-300 text-gray-900 font-medium rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          Close
        </button>
      </div>
    );
  }

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: ''
  });
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const authFetch = async (url, options = {}) => {
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {
        console.warn('[SendInvite] Failed to parse user');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const res = await fetch(`${__API_URL__}${url}`, { ...options, headers });

    if (res.status === 401) {
      console.error('[SendInvite] Unauthorized');
    }
    return res;
  };

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await authFetch('/api/policies/roles');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rolesData = Array.isArray(data) ? data : data.roles || [];
        setRoles(rolesData);
        if (rolesData.length > 0) {
          setFormData(prev => ({ ...prev, role: rolesData[0].name }));
        }
      } catch (err) {
        console.error('[SendInvite] Failed to load roles:', err);
        setResponse('❌ Failed to load roles. Contact admin.');
      } finally {
        setRolesLoaded(true);
      }
    };
    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'role') setResponse('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { email, role } = formData;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) return setResponse('📧 Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return setResponse('📧 Please enter a valid email address');
    if (!role) return setResponse('👤 Please select a role');

    setLoading(true);
    setResponse('');

    let senderName = formData.name.trim();
    if (!senderName) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          senderName = user.name || '';
        } catch (e) {}
      }
    }

    try {
      const payload = {
        name: senderName,
        email: trimmedEmail,
        role: role,
        workspaceId: workspace._id,
      };

      const res = await authFetch('/api/send-email', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Server error');
      }

      const result = await res.json();
      setResponse(result.message || '✅ Invitation sent successfully!');
      if (onSuccess) onSuccess();
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error('[SendInvite] Submit error:', err);
      setResponse(`❌ ${err.message || 'Failed to send invitation. Try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <h2 className="text-2xl font-bold text-white mb-6">
        Invite to <span className="red-orange-gradient-text">{workspace.name}</span>
      </h2>
      <p className="text-sm text-gray-300 mb-6">
        Grant workspace access with a specific role
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Your Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Saravana"
            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-gray-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Recipient Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="user@company.com"
            className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-gray-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Access Role
          </label>
          {rolesLoaded ? (
            roles.length > 0 ? (
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              >
                <option value="">— Select Role —</option>
                {roles.map(role => (
                  <option key={role._id || role.name} value={role.name}>
                    {role.name}
                    {role.name === 'admin' && ' (Full access)'}
                    {role.name === 'devops' && ' (Deploy & manage)'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 text-sm">
                ⚠️ No roles configured. Contact admin.
              </div>
            )
          ) : (
            <div className="text-gray-400 italic">⏳ Loading roles...</div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading || !formData.role || !rolesLoaded}
          className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold transition-all mt-2 ${
            (loading || !formData.role || !rolesLoaded)
              ? 'bg-orange-500/40 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white hover:from-teal-600 hover:via-cyan-700 hover:to-blue-800 shadow-md hover:shadow-lg hover:scale-[1.02]'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Invitation
            </>
          )}
        </button>
      </form>
      
      {response && (
      <div className={`mt-5 p-3.5 rounded-xl text-sm font-medium border ${
        // ✅ Check for success indicators
        /success|sent|saved|created|updated|completed/i.test(response)
          ? 'bg-green-900/20 text-green-300 border-green-800/50'
          : 'bg-red-900/25 text-red-300 border-red-800/50'
      }`}>
        {response}
      </div>
    )}
    </>
  );
};

export default SendInvite;
