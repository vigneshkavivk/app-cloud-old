"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../hooks/useAuth';
import api from '../interceptor/api.interceptor';
import {
  ChevronDown,
  Trash2,
  Plus,
  Lock,
  Layers,
  CheckCircle,
  Info,
  Settings2,
  Edit2,
  X,
} from 'lucide-react';

// ✅ Glass Card (reuse from Dashboard)
const GlassCard = ({ children, className = "" }) => (
  <div
    className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${className}`}
  >
    {children}
  </div>
);

// ✅ Section Heading (blue-cyan gradient)
const SectionHeading = ({ children, className = "" }) => (
  <h2
    className={`text-white font-bold text-xl mb-6 uppercase tracking-wide ${className}`}
  >
    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
      {children}
    </span>
  </h2>
);

// ✅ IconWrapper (glow on hover, subtle bg)
const IconWrapper = ({ children, className = "", glowColor = "cyan" }) => (
  <div
    className={`flex items-center justify-center p-2 rounded-lg bg-white/5 border border-white/10 transition-all duration-300 hover:shadow-lg ${
      glowColor === "cyan"
        ? "hover:shadow-[0_0_12px_rgba(0,200,255,0.4)]"
        : glowColor === "orange"
        ? "hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]"
        : ""
    } ${className}`}
  >
    {children}
  </div>
);

// ✅ Info Popup (for role details on hover)
const InfoPopup = ({ role, totalPermissions }) => (
  <div className="absolute right-0 mt-1 w-64 bg-[#121826] border border-white/10 rounded-lg p-3 text-sm text-gray-200 shadow-xl z-50 animate-fade-in">
    <div className="font-semibold text-cyan-300 mb-1">Role: {role.name}</div>
    <div className="text-xs text-gray-400 space-y-1">
      <p>✅ {role.permissions.size} permissions granted</p>
      <p>📁 {totalPermissions} total available</p>
      <p>🔒 Super Admin: {role.name === 'super-admin' ? 'Yes' : 'No'}</p>
      <p className="mt-2">Hover over permissions to see descriptions.</p>
    </div>
  </div>
);

// ✅ Gradient Text Styles (defined once)
const gradientStyles = `
  .red-orange-gradient-text {
    background: linear-gradient(to right, #ef4444, #f59e0b);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 600;
  }
  .orange-gradient-text {
    background: linear-gradient(to right, #f97316, #f59e0b);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 600;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.2s ease-out forwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
`;

const Policies = () => {
  const { role: userRole } = useAuth();

  // 🔒 Restrict access to super-admin only
  if (userRole !== 'super-admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0b14] to-[#06070f] text-white">
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="text-center p-8 max-w-md">
          <Lock className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            Only <span className="font-mono">super-admin</span> can manage policies.
          </p>
        </div>
      </div>
    );
  }

  // 🧠 State
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');
  const [expandedRoles, setExpandedRoles] = useState(new Set());
  const [hoveredRole, setHoveredRole] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editName, setEditName] = useState('');
  const hasInjectedStyles = useRef(false);

  // 📋 Permission Groups Definition
  const permissionGroups = Object.entries({
    Overall: ['Administer', 'Read'],
    Credentials: ['Create', 'Delete', 'Update', 'View', 'Read'],
    Agent: ['Configure', 'Connect', 'Create', 'Delete', 'Disconnect', 'Provision', 'Build', 'Read'],
    Job: ['Configure', 'Create', 'Delete', 'Discover', 'Move', 'Read'],
    Run: ['Read', 'Workspace', 'Delete'],
    View: ['Read', 'Replay', 'Update', 'Configure'],
    SCM: ['Read', 'Tag', 'HealthCheck', 'ThresholdDump'],
    Metrics: ['View']
  }).map(([name, actions]) => ({
    name,
    permissions: actions.map(action => ({
      id: `${name.toLowerCase()}-${action.toLowerCase()}`,
      name: action,
      description: `${action} ${name.toLowerCase()}`
    }))
  }));

  const totalPermissionsCount = permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0);

  // 🔧 Inject global styles (once)
  useEffect(() => {
    if (hasInjectedStyles.current) return;
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      ${gradientStyles}
      body { font-family: 'Inter', sans-serif; }
    `;
    document.head.appendChild(style);
    hasInjectedStyles.current = true;
    return () => {
      if (style.parentNode) document.head.removeChild(style);
    };
  }, []);

  // 🔄 Fetch all roles
  const fetchRoles = useCallback(async () => {
    try {
      const res = await api.get('/api/policies/roles');
      if (!Array.isArray(res.data)) throw new Error('Invalid roles format');
      const normalizedRoles = res.data.map(role => {
        const permSet = new Set();
        Object.entries(role.permissions || {}).forEach(([cat, actions]) => {
          if (typeof actions === 'object' && !Array.isArray(actions)) {
            Object.entries(actions).forEach(([action, enabled]) => {
              if (enabled) permSet.add(`${cat.toLowerCase()}-${action.toLowerCase()}`);
            });
          }
        });
        return { ...role, id: role.name, permissions: permSet };
      });
      setRoles(normalizedRoles);
    } catch (err) {
      console.error('Fetch roles error:', err);
      toast.error('Failed to load roles from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ➕ Create New Role
  const handleAddRole = async () => {
    const name = newRoleName.trim();
    if (!name) return toast.error('Role name is required');
    if (name.toLowerCase() === 'super-admin') return toast.error('Cannot create "super-admin" role');
    if (roles.some(r => r.name.toLowerCase() === name.toLowerCase())) return toast.error('Role already exists');

    try {
      const res = await api.post('/api/policies/roles', { name: name.toLowerCase(), permissions: {} });
      const newRole = { ...res.data, id: res.data.name, permissions: new Set() };
      setRoles(prev => [...prev, newRole]);
      setNewRoleName('');
      toast.success(`Role "${name}" created successfully!`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create role';
      toast.error(errorMsg);
    }
  };

  // ✏️ Rename Role
  const handleRenameRole = async () => {
    if (!editingRole) return;
    const newName = editName.trim();
    if (!newName) return toast.error('Role name cannot be empty');
    if (newName.toLowerCase() === 'super-admin') return toast.error('Role name "super-admin" is reserved');
    if (roles.some(r => r.name.toLowerCase() === newName.toLowerCase() && r.name !== editingRole.name))
      return toast.error('A role with that name already exists');

    try {
      await api.put(`/api/policies/roles/${editingRole.name}`, { name: newName });
      setRoles(prev =>
        prev.map(r =>
          r.name === editingRole.name ? { ...r, name: newName } : r
        )
      );
      setEditingRole(null);
      setEditName('');
      toast.success(`Role renamed to "${newName}"`);
    } catch (err) {
      console.error('Rename role error:', err);
      toast.error(err.response?.data?.error || 'Failed to rename role');
    }
  };

  // ✏️ Update Role Permission
  const updateRolePermission = async (roleName, permissionId, enabled) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return toast.error('Role not found');

    const newPermissionsSet = new Set(role.permissions);
    if (enabled) newPermissionsSet.add(permissionId);
    else newPermissionsSet.delete(permissionId);

    const permissionsObj = {};
    newPermissionsSet.forEach(pid => {
      const [category, ...actionParts] = pid.split('-');
      const action = actionParts.join('-');
      const catKey = category.charAt(0).toUpperCase() + category.slice(1);
      const actionKey = action.charAt(0).toUpperCase() + action.slice(1);
      if (!permissionsObj[catKey]) permissionsObj[catKey] = {};
      permissionsObj[catKey][actionKey] = true;
    });

    try {
      await api.put(`/api/policies/roles/${roleName}`, { permissions: permissionsObj });
      setRoles(prev =>
        prev.map(r => r.name === roleName ? { ...r, permissions: newPermissionsSet } : r)
      );
      toast.success('Permissions updated successfully');
    } catch (err) {
      console.error('Update permission error:', err);
      toast.error('Failed to update permissions');
    }
  };

  // 🗑️ Delete Role
  const handleDeleteRole = async (roleName, displayName) => {
    if (roleName === 'super-admin') return toast.error('Cannot delete super-admin role');
    if (!window.confirm(`Delete role "${displayName}"?\nThis action cannot be undone.`)) return;

    try {
      await api.delete(`/api/policies/roles/${roleName}`);
      setRoles(prev => prev.filter(r => r.name !== roleName));
      setExpandedRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(roleName);
        return newSet;
      });
      toast.success(`Role "${displayName}" deleted`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete role';
      toast.error(errorMsg);
    }
  };

  // 📌 Toggle Role Expand
  const toggleRoleExpand = (roleName) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev);
      newSet.has(roleName) ? newSet.delete(roleName) : newSet.add(roleName);
      return newSet;
    });
  };

  // 🚀 Initial Load
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ⏳ Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0b14] to-[#06070f]">
        <div className="dashboard-bg" />
        <div className="animated-gradient-bg" />
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  // 🎨 UI Rendering
  return (
    <>
      {/* Background Layers (match Dashboard) */}
      <div className="dashboard-bg" />
      <div className="animated-gradient-bg" />
      <div className="min-h-screen p-4 sm:p-6 md:p-8 text-white relative">
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Policies & Permissions
              </span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Manage roles and fine-grained access control for your organization.
            </p>
          </header>

          {/* Create New Role */}
          <GlassCard className="mb-8 max-w-2xl mx-auto w-full">
            <SectionHeading>Create New Role</SectionHeading>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <label className="block text-gray-300 mb-1 text-sm font-medium">Role Name</label>
                <div className="flex rounded-lg border border-white/10 overflow-hidden">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
                    placeholder="e.g., Auditor, Deployer"
                    className="flex-1 bg-white/5 text-white placeholder-gray-400 py-3 px-4 focus:outline-none focus:ring-0"
                  />
                  <button
                    onClick={handleAddRole}
                    disabled={!newRoleName.trim()}
                    className={`flex items-center justify-center gap-2 px-4 font-medium whitespace-nowrap transition-all ${
                      newRoleName.trim()
                        ? "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:shadow-red-500/30"
                        : "bg-white/5 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <Plus size={16} />
                    <span className="font-medium">Create Role</span>
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Role Permissions List */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <SectionHeading className="!mb-0">Role Permissions</SectionHeading>
              <button
                onClick={() => setShowInfoModal(true)}
                aria-label="Show permission syntax guide"
                className="group p-1 cursor-help hover:text-cyan-400 transition-colors"
                title="Click for permission syntax guide"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400 group-hover:text-cyan-400 transition-colors"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>
            </div>

            {roles.length === 0 ? (
              <div className="text-center py-10">
                <IconWrapper className="mx-auto mb-4">
                  <Layers className="text-cyan-400" size={24} />
                </IconWrapper>
                <h3 className="text-lg font-medium text-white mb-1">No roles defined yet</h3>
                <p className="text-gray-400">Create a role to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {roles.map((role) => (
                  <div
                    key={role.name}
                    className="border border-white/10 rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleRoleExpand(role.name)}
                      className="w-full px-5 py-4 bg-white/3 hover:bg-white/5 transition-colors flex items-center justify-between"
                      aria-expanded={expandedRoles.has(role.name)}
                    >
                      <div className="flex items-center gap-4">
                        <ChevronDown
                          size={18}
                          className={`text-cyan-400 transition-transform duration-300 ${
                            expandedRoles.has(role.name) ? 'rotate-180' : ''
                          }`}
                        />
                        <div className="text-left">
                          <h3 className="text-lg font-bold flex items-center gap-1">
                            {role.name === 'super-admin' ? (
                              <span className="orange-gradient-text">Super Admin</span>
                            ) : (
                              <>
                                {editingRole?.name === role.name ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      onKeyPress={(e) => e.key === 'Enter' && handleRenameRole()}
                                      className="bg-white/10 text-white px-2 py-1 rounded border border-white/20 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-32"
                                      autoFocus
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRenameRole();
                                      }}
                                      className="text-emerald-400 hover:text-emerald-300"
                                      title="Save rename"
                                    >
                                      <CheckCircle size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingRole(null);
                                        setEditName('');
                                      }}
                                      className="text-gray-400 hover:text-white"
                                      title="Cancel"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (role.name === 'super-admin') return;
                                        setEditingRole(role);
                                        setEditName(role.name);
                                      }}
                                      className={`p-1 rounded text-gray-400 hover:text-cyan-400 ${role.name === 'super-admin' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                      aria-label="Rename role"
                                      disabled={role.name === 'super-admin'}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </h3>
                          <p className="text-sm text-gray-400 mt-1 flex items-center">
                            <span className="text-cyan-300 font-medium">{role.permissions.size}</span>
                            <span className="mx-1">/</span>
                            <span className="text-gray-500">{totalPermissionsCount}</span>
                            <span className="ml-2">permissions granted</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {role.name !== 'super-admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role.name, role.name);
                            }}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-lg hover:shadow-red-500/30 transition-shadow"
                            aria-label={`Delete role ${role.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div
                          className="relative"
                          onMouseEnter={() => setHoveredRole(role.name)}
                          onMouseLeave={() => setHoveredRole(null)}
                        >
                          <button
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-cyan-400 transition-colors"
                            aria-label={`Info for role ${role.name}`}
                          >
                            <Info size={16} />
                          </button>
                          {hoveredRole === role.name && (
                            <InfoPopup role={role} totalPermissions={totalPermissionsCount} />
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedRoles.has(role.name) && (
                      <div className="bg-white/3 border-t border-white/10 p-5">
                        <div className="max-h-96 overflow-y-auto pr-2 space-y-5">
                          {permissionGroups.map((group) => (
                            <div key={group.name}>
                              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-cyan-400">
                                {group.name}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {group.permissions.map((perm) => (
                                  <label
                                    key={perm.id}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-white/2 hover:bg-white/5 cursor-pointer transition-colors group"
                                    title={perm.description}
                                  >
                                    <div className="mt-0.5 flex items-center">
                                      <input
                                        type="checkbox"
                                        checked={role.permissions.has(perm.id)}
                                        onChange={(e) =>
                                          updateRolePermission(role.name, perm.id, e.target.checked)
                                        }
                                        className="w-4 h-4 rounded border-gray-600 bg-[#121826] cursor-pointer accent-cyan-500"
                                        aria-label={`Toggle ${perm.name} for ${role.name}`}
                                      />
                                      {role.permissions.has(perm.id) && (
                                        <CheckCircle
                                          size={14}
                                          className="text-emerald-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">{perm.name}</p>
                                      <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* ✅ Info Modal */}
          {showInfoModal && (
            <div
              className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
              onClick={(e) => e.target === e.currentTarget && setShowInfoModal(false)}
            >
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 shadow-xl max-w-md w-full mx-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    Permission Syntax Guide
                  </h3>
                  <button
                    onClick={() => setShowInfoModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="text-sm text-gray-300 space-y-2">
                  <p>
                    <span className="font-mono text-cyan-400">*</span> = All actions under that category  
                    (e.g., <code className="bg-black/30 px-1 py-0.5 rounded">Credentials:Create/Delete/Update/View</code>)
                  </p>
                  <div className="mt-4 space-y-1">
                    <p>- <span className="font-mono text-cyan-400">Overall:Administer</span> → Workspace, Policies</p>
                    <p>- <span className="font-mono text-cyan-400">Overall:Read</span> → Dashboard</p>
                    <p>- <span className="font-mono text-cyan-400">Credentials:*</span> → Cloud Connector</p>
                    <p>- <span className="font-mono text-cyan-400">Agent:Configure/Provision</span> → Clusters</p>
                    <p>- <span className="font-mono text-cyan-400">Job:Create / Run:Read</span> → Work Flow</p>
                    <p>- <span className="font-mono text-cyan-400">SCM:Read/Tag</span> → SCM Connector</p>
                    <p>- <span className="font-mono text-cyan-400">View:Read</span> → Tools</p>
                    <p>- <span className="font-mono text-cyan-400">Metrics:View</span> → Database & Monitoring</p>
                    <p>- <span className="font-mono text-cyan-400">Agent:Build / Job:Discover</span> → MaSa Bot</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="mt-8 text-center text-xs text-gray-500">
            <p>All permission changes and renames are saved automatically. Super-admin role cannot be modified or deleted.</p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default Policies;
