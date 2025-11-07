// src/components/Policies.jsx
import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from './Sidebar';
import { useAuth } from '../hooks/useAuth';
import api from '../interceptor/api.interceptor';
import { ChevronDown, Trash2, Plus } from 'lucide-react';

const Policies = () => {
  const { role: userRole } = useAuth();

  // ✅ Only super-admin can access
  if (userRole !== 'super-admin') {
    return (
      <div className="min-h-screen bg-[#1E2633] text-white flex">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar activePage="Policies" />
        <main className="flex-1 ml-64 p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">Policies & Permissions</h1>
            <div className="bg-[#2A4C83] border border-white/20 rounded-xl p-6 text-center">
              <h2 className="text-xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
              <p className="text-gray-300">Administer permission required to manage policies.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState('');
  const [expandedRoles, setExpandedRoles] = useState(new Set());

  // Permission groups (UI structure only)
  const permissionGroups = Object.entries({
    Overall: ['Administer', 'Read'],
    Credentials: ['Create', 'Delete', 'Update', 'View'],
    Agent: ['Configure', 'Connect', 'Create', 'Delete', 'Disconnect', 'Provision', 'Build'],
    Job: ['Configure', 'Create', 'Delete', 'Discover', 'Move'],
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

  const fetchRoles = async () => {
    try {
      const res = await api.get('/api/policies/roles');
      const normalizedRoles = res.data.map(role => {
        const permSet = new Set();
        Object.entries(role.permissions || {}).forEach(([cat, actions]) => {
          Object.entries(actions).forEach(([action, enabled]) => {
            if (enabled) {
              permSet.add(`${cat.toLowerCase()}-${action.toLowerCase()}`);
            }
          });
        });
        return {
          ...role,
          id: role.name, // ✅ Use name as ID
          permissions: permSet
        };
      });
      setRoles(normalizedRoles);
    } catch (err) {
      console.error('Fetch roles error:', err);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    const name = newRoleName.trim();
    if (!name) {
      toast.error('Role name is required');
      return;
    }
    const normalizedName = name.toLowerCase();
    if (roles.some(r => r.name === normalizedName)) {
      toast.error('Role already exists');
      return;
    }

    try {
      const res = await api.post('/api/policies/roles', {
        name,
        permissions: {}
      });
      const newRole = {
        ...res.data,
        id: res.data.name,
        permissions: new Set()
      };
      setRoles([...roles, newRole]);
      setNewRoleName('');
      toast.success(`Role "${name}" created!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create role');
    }
  };

  const updateRolePermission = async (roleName, permissionId, enabled) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return;

    const newPermissionsSet = new Set(role.permissions);
    if (enabled) {
      newPermissionsSet.add(permissionId);
    } else {
      newPermissionsSet.delete(permissionId);
    }

    // Convert Set → nested object
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
      setRoles(roles.map(r =>
        r.name === roleName ? { ...r, permissions: newPermissionsSet } : r
      ));
      toast.success('Permissions updated');
    } catch (err) {
      toast.error('Failed to update permissions');
    }
  };

  const handleDeleteRole = async (roleName, displayName) => {
    if (!window.confirm(`Delete role "${displayName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/policies/roles/${roleName}`);
      setRoles(roles.filter(r => r.name !== roleName));
      const newExpanded = new Set(expandedRoles);
      newExpanded.delete(roleName);
      setExpandedRoles(newExpanded);
      toast.success('Role deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete role');
    }
  };

  const toggleRoleExpand = (roleName) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleName)) {
        newSet.delete(roleName);
      } else {
        newSet.add(roleName);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E2633] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#F26A2E]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E2633] text-white flex">
      <ToastContainer position="top-right" autoClose={3000} />
      <Sidebar activePage="Policies" />
      <main className="flex-1 ml-64 p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Policies & Permissions</h1>

          {/* Create New Role */}
          <div className="bg-[#2A4C83] border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Role</h2>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Role name (e.g., Auditor, Deployer)"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
                className="flex-1 px-4 py-3 bg-[#1E2633] border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#F26A2E] focus:ring-1 focus:ring-[#F26A2E]"
              />
              <button
                onClick={handleAddRole}
                className="flex items-center gap-2 px-4 py-3 bg-[#F26A2E] hover:bg-orange-600 text-white rounded-lg font-medium transition"
              >
                <Plus size={18} />
                Create Role
              </button>
            </div>
          </div>

          {/* Role Permissions */}
          <div className="bg-[#2A4C83] border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Role Permissions</h2>
            {roles.length === 0 ? (
              <p className="text-gray-400 py-4">No roles defined.</p>
            ) : (
              <div className="space-y-3">
                {roles.map((role) => (
                  <div
                    key={role.name}
                    className="border border-white/20 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleRoleExpand(role.name)}
                      className="w-full px-4 py-3 bg-[#1E2633] hover:bg-[#24344D] transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          size={16}
                          className={`text-[#F26A2E] transition-transform ${
                            expandedRoles.has(role.name) ? 'rotate-180' : ''
                          }`}
                        />
                        <div className="text-left">
                          <h3 className="font-semibold text-white">{role.name}</h3>
                          <p className="text-xs text-gray-400">
                            {role.permissions.size} of{' '}
                            {permissionGroups.reduce((acc, g) => acc + g.permissions.length, 0)}{' '}
                            permissions
                          </p>
                        </div>
                      </div>
                      {/* ✅ Only protect 'super-admin' from deletion */}
                      {role.name !== 'super-admin' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role.name, role.name);
                          }}
                          className="p-1 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </button>

                    {expandedRoles.has(role.name) && (
                      <div className="bg-[#1E2633] border-t border-white/20 p-4">
                        <div className="max-h-96 overflow-y-auto pr-2">
                          {permissionGroups.map((group) => (
                            <div key={group.name}>
                              <h4 className="text-xs font-semibold text-[#F26A2E] uppercase tracking-wide mb-2">
                                {group.name}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {group.permissions.map((perm) => (
                                  <label
                                    key={perm.id}
                                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#24344D] cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={role.permissions.has(perm.id)}
                                      onChange={(e) =>
                                        updateRolePermission(role.name, perm.id, e.target.checked)
                                      }
                                      className="mt-0.5 w-3 h-3 rounded border-gray-600 bg-[#1E2633] cursor-pointer accent-[#F26A2E]"
                                    />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-white">{perm.name}</p>
                                      <p className="text-xs text-gray-400">{perm.description}</p>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default Policies;