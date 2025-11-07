// src/components/Mailsend.jsx
import React, { useState, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import api from '../interceptor/api.interceptor';

const SendInvite = ({ onClose, onSuccess, workspace }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: '' // Will hold role NAME (string), e.g., "devops"
  });
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Fetch roles by NAME (not ID)
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/api/policies/roles');
        const rolesData = Array.isArray(res.data) ? res.data : [];
        setRoles(rolesData);
        if (rolesData.length > 0) {
          setFormData(prev => ({ ...prev, role: rolesData[0].name })); // ✅ Use .name
        }
      } catch (err) {
        console.error('Failed to load roles:', err);
        setResponse('Failed to load roles. Please try again later.');
        // Do NOT use fallback roles with fake IDs
      }
    };
    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.role) {
      setResponse('Please select a role');
      return;
    }
    setLoading(true);
    setResponse('');

    const storedUser = localStorage.getItem('user');
    let senderName = formData.name;
    if (storedUser && !senderName) {
      try {
        const user = JSON.parse(storedUser);
        senderName = user.name || '';
      } catch (err) {
        console.warn('Failed to parse user');
      }
    }

    try {
      const payload = {
        name: senderName,
        email: formData.email.trim(),
        role: formData.role, // ✅ Send ROLE NAME (string)
        workspaceId: workspace._id,
        workspaceName: workspace.name
      };

      const res = await api.post('/api/send-email', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      setResponse(res.data.message || 'Invitation sent successfully!');
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Invite error:', err);
      setResponse(
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'Failed to send invitation. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1E2633] rounded-xl shadow-2xl p-6 w-full max-w-md border border-white/10 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Invite to {workspace?.name}</h2>
          <p className="text-sm text-white/60 mt-1">
            Grant access to this workspace with a specific role
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Your Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full px-4 py-2.5 bg-[#2A3A50] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent outline-none transition-all placeholder:text-white/30"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="colleague@company.com"
              className="w-full px-4 py-2.5 bg-[#2A3A50] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent outline-none transition-all placeholder:text-white/30"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Access Role</label>
            {roles.length > 0 ? (
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#2A3A50] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent outline-none appearance-none"
              >
                <option value="">-- Select Role --</option>
                {roles.map(role => (
                  <option key={role._id} value={role.name}> {/* ✅ value = role.name */}
                    {role.name}
                    {role.name === 'admin' && ' (Full access)'}
                    {role.name === 'devops' && ' (Deploy & manage)'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-white/60">Loading roles...</div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !formData.role}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all mt-4 ${
              (loading || !formData.role)
                ? 'bg-[#F26A2E]/50 cursor-not-allowed' 
                : 'bg-[#F26A2E] hover:bg-[#F26A2E]/90 shadow-md hover:shadow-lg'
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
          <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            response.toLowerCase().includes('success') 
              ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
              : 'bg-red-900/30 text-red-400 border border-red-800/50'
          }`}>
            {response}
          </div>
        )}
        
        <div className="mt-4 text-xs text-white/40 text-center">
          The recipient will receive an email with setup instructions.
        </div>
      </div>
    </div>
  );
};

export default SendInvite;