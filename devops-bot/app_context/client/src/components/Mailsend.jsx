import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Send, Loader2 } from 'lucide-react';
import api from '../interceptor/api.interceptor';

const SendInvite = ({ onClose, workspaces }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: 'admin',
    workspace: workspaces.length > 0 ? workspaces[0].name : '' 
  });
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    try {
      const res = await api.post('/api/send-email', formData, {
        headers: { 'Content-Type': 'application/json' },
      });
      // const res = await axios.post('http://localhost:3000/api/send-email', formData, {
      //   headers: { 'Content-Type': 'application/json' },
      // });
      setResponse(res.data.message);
      setFormData({ 
        name: '', 
        email: '', 
        role: 'admin',
        workspace: workspaces.length > 0 ? workspaces[0].name : '' 
      });
    } catch (err) {
      console.error(err);
      setResponse(err.response?.data?.message || 'Failed to send invitation. Please try again.');
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
          <h2 className="text-2xl font-bold text-white">Send Invitation</h2>
          <p className="text-sm text-white/60 mt-1">Invite team members to your CloudMaSa workspace</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Your Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
              className="w-full px-4 py-2.5 bg-[#2A3A50] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent outline-none transition-all placeholder:text-white/30"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Recipient's Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="team@example.com"
              className="w-full px-4 py-2.5 bg-[#2A3A50] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent outline-none transition-all placeholder:text-white/30"
            />
          </div>
          
          {workspaces.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Workspace</label>
              <select
                name="workspace"
                value={formData.workspace}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#2A3A50] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent outline-none appearance-none"
                required
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.name} value={workspace.name}>
                    {workspace.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Access Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[#2A3A50] text-white border border-white/10 rounded-lg focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent outline-none appearance-none"
            >
              <option value="admin">Admin (Full access)</option>
              <option value="devops">DevOps (Deploy & manage)</option>
              <option value="developer">Developer (Code & test)</option>
              <option value="guest">Guest (Limited access)</option>
              <option value="viewer">Viewer (Read-only)</option>
            </select>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all mt-4 ${
              loading 
                ? 'bg-[#F26A2E]/80 cursor-not-allowed' 
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
            response.includes('success') 
              ? 'bg-green-900/30 text-green-400 border border-green-800/50' 
              : 'bg-red-900/30 text-red-400 border border-red-800/50'
          }`}>
            {response}
          </div>
        )}
        
        <div className="mt-4 text-xs text-white/40 text-center">
          The recipient will receive an email with instructions to join.
        </div>
      </div>
    </div>
  );
};

export default SendInvite;