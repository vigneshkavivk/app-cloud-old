// client/src/components/Workspace.jsx
import { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SendInvite from './Mailsend';
import { __API_URL__ } from '../config/env.config';
import { useAuth } from '../hooks/useAuth';

const Workspace = () => {
  const { hasPermission } = useAuth();
  const canManageWorkspaces = hasPermission('Overall', 'Administer');
  const canInviteUsers = hasPermission('Overall', 'Administer');

  if (!canManageWorkspaces && !canInviteUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E2633] text-white">
        <div className="text-center p-8 bg-[#2A4C83] rounded-xl">
          <h2 className="text-2xl font-bold text-red-400">🔒 Access Denied</h2>
          <p>Administer permission required to manage workspaces.</p>
        </div>
      </div>
    );
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [formData, setFormData] = useState({
    workspaceName: '',
    adminUser: '',
    adminEmail: '',
  });
  const [deleteWorkspace, setDeleteWorkspace] = useState(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('workspaces');
  const [deleteInviteId, setDeleteInviteId] = useState(null);
  const [isDeleteInviteOpen, setIsDeleteInviteOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [isChangingRole, setIsChangingRole] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [roles, setRoles] = useState([]);

  const getCurrentUserEmail = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.email || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  };

  const currentUserEmail = getCurrentUserEmail();

  const authFetch = async (url, options = {}) => {
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {
        console.warn('Failed to parse user from localStorage:', e);
      }
    }
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    const response = await fetch(`${__API_URL__}${url}`, { ...options, headers });
    if (response.status === 401) {
      toast.error('Session expired. Please log in again.');
      localStorage.removeItem('user');
      window.location.href = '/';
      throw new Error('Unauthorized');
    }
    return response;
  };

  const fetchRoles = async () => {
    try {
      const res = await authFetch('/api/policies/roles');
      if (!res.ok) {
        throw new Error(`Failed to fetch roles: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : data.roles || []);
    } catch (error) {
      console.error('Fetch roles error:', error);
      toast.error('Failed to load roles for assignment');
      setRoles([]);
    }
  };

  useEffect(() => {
    if (isChangingRole) {
      fetchRoles();
    } else {
      setRoles([]);
    }
  }, [isChangingRole]);

  const fetchWorkspacesAndInvites = async () => {
    setIsLoading(true);
    try {
      const [workspacesRes, invitesRes] = await Promise.all([
        authFetch('/api/workspaces'),
        authFetch('/api/invited-users')
      ]);
      if (!workspacesRes.ok) throw new Error('Failed to fetch workspaces');
      if (!invitesRes.ok) throw new Error('Failed to fetch invited users');
      const workspacesData = await workspacesRes.json();
      const invitesData = await invitesRes.json();
      setWorkspaces(workspacesData);
      setInvitedUsers(invitesData);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(error.message || 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async (workspaceId) => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error('Failed to fetch members');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Fetch members error:', error);
      toast.error('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIXED: Now correctly sends role NAME (string)
  const handleChangeRole = async (userId, roleName) => {
    if (!roleName) return;
    try {
      setIsLoading(true);

      // ✅ Validate: role name must exist in fetched list
      const isValid = roles.some(role => role.name === roleName);
      if (!isValid) {
        throw new Error('Selected role is not valid');
      }

      // ✅ Send ROLE NAME (string) — matches your backend design
      const res = await authFetch(`/api/workspaces/${selectedWorkspace._id}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: roleName }),
      });

      if (!res.ok) {
        let errorMessage = 'Failed to update role';
        try {
          const errorBody = await res.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      toast.success('Role updated successfully!');
      fetchMembers(selectedWorkspace._id);
      setIsChangingRole(null);
      setNewRole('');
    } catch (error) {
      console.error('Change role error:', error);
      toast.error(`Failed to update role: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      setIsLoading(true);
      const res = await authFetch(`/api/workspaces/${selectedWorkspace._id}/members/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove member');
      toast.success('Member removed successfully!');
      fetchMembers(selectedWorkspace._id);
    } catch (error) {
      console.error('Remove member error:', error);
      toast.error('Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {
        console.warn('Failed to parse user from localStorage:', e);
      }
    }
    if (!token) {
      toast.error('Please log in to access this page.');
      window.location.href = '/';
      return;
    }
    fetchWorkspacesAndInvites();
  }, []);

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    const { workspaceName, adminUser, adminEmail } = formData;
    if (!workspaceName.trim() || !adminUser.trim() || !adminEmail.trim()) {
      toast.error('All fields are required!');
      return;
    }
    if (!validateEmail(adminEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      setIsLoading(true);
      const response = await authFetch('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          workspaceName,
          adminUser,
          adminEmail
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message && (
          errorData.message.includes('E11000') ||
          errorData.message.includes('already exists') ||
          errorData.message.includes('duplicate')
        )) {
          toast.error(`Workspace "${workspaceName}" already exists. Please choose a different name.`);
        } else {
          toast.error(errorData.message || 'Failed to create workspace');
        }
        return;
      }
      const newWorkspace = await response.json();
      setWorkspaces([...workspaces, newWorkspace]);
      toast.success('Workspace created successfully!');
      setIsOpen(false);
      setFormData({ workspaceName: '', adminUser: '', adminEmail: '' });
    } catch (error) {
      console.error('Create workspace error:', error);
      toast.error('Error creating workspace. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (workspace) => {
    setDeleteWorkspace(workspace);
    setIsDeleteOpen(true);
    setAdminUsername('');
  };

  const handleDeleteConfirm = async () => {
    if (!adminUsername.trim()) {
      toast.error('Please enter the admin username');
      return;
    }
    if (adminUsername.trim().toLowerCase() !== deleteWorkspace.admin.trim().toLowerCase()) {
      toast.error('Admin username does not match!');
      return;
    }
    try {
      setIsDeleting(true);
      const response = await authFetch(`/api/workspaces/${deleteWorkspace._id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          adminUsername: adminUsername.trim()
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete workspace');
      }
      const updatedWorkspaces = workspaces.filter(
        ws => ws._id !== deleteWorkspace._id
      );
      setWorkspaces(updatedWorkspaces);
      setIsDeleteOpen(false);
      toast.success('Workspace deleted successfully!');
    } catch (error) {
      console.error('Delete workspace error:', error);
      toast.error(error.message || 'Error deleting workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteInvitedUser = (id) => {
    setDeleteInviteId(id);
    setIsDeleteInviteOpen(true);
  };

  const handleDeleteInviteConfirm = async () => {
    if (!deleteInviteId) return;
    try {
      setIsDeleting(true);
      const response = await authFetch(`/api/invited-users/${deleteInviteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete invited user');
      }
      toast.success('Invitation deleted successfully');
      setInvitedUsers(invitedUsers.filter(user => user._id !== deleteInviteId));
    } catch (error) {
      console.error('Delete invite error:', error);
      toast.error(error.message || 'Error deleting invited user');
    } finally {
      setIsDeleting(false);
      setIsDeleteInviteOpen(false);
      setDeleteInviteId(null);
    }
  };

  const handleWorkspaceClick = (workspace) => {
    if (!workspace || !workspace._id) return;
    setSelectedWorkspace(workspace);
    fetchMembers(workspace._id);
  };

  const handleInviteSuccess = () => {
    authFetch('/api/invited-users')
      .then(res => res.json())
      .then(data => setInvitedUsers(data))
      .catch(() => toast.error('Failed to refresh invitations'));
  };

  return (
    <div className="min-h-screen p-4 md:p-10 bg-[#1E2633] text-white">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 md:mb-0">
            Workspace Manager
          </h1>
          <div className="flex space-x-3 w-full md:w-auto">
            {canManageWorkspaces && (
              <button
                onClick={() => setIsOpen(true)}
                className="bg-[#2A4C83] hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-md w-full md:w-auto flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Workspace
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 border-b border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('workspaces')}
              className={`py-4 px-1 font-medium text-sm border-b-2 ${activeTab === 'workspaces' ? 'border-[#F26A2E] text-[#F26A2E]' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
            >
              Workspaces
            </button>
            {workspaces.length > 0 && (
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-4 px-1 font-medium text-sm border-b-2 ${activeTab === 'invitations' ? 'border-[#F26A2E] text-[#F26A2E]' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
              >
                Invitations
                {invitedUsers.length > 0 && (
                  <span className="ml-2 bg-[#F26A2E] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {invitedUsers.length}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        {isLoading && activeTab === 'workspaces' && !selectedWorkspace && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F26A2E]"></div>
          </div>
        )}

        {!isLoading && activeTab === 'workspaces' && (
          <div className="space-y-8">
            <div className="bg-[#2A4C83] border border-white/20 rounded-2xl p-6 shadow-xl overflow-hidden">
              {workspaces.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-white mb-2">No workspaces yet</h3>
                  <p className="text-gray-400 mb-4">Create your first workspace to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left text-white rounded-xl">
                    <thead className="uppercase text-white/90 bg-[#1E2633]">
                      <tr>
                        <th className="py-4 px-6">Workspace Name</th>
                        <th className="py-4 px-6">Admin</th>
                        <th className="py-4 px-6">Email</th>
                        <th className="py-4 px-6">Created</th>
                        <th className="py-4 px-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspaces.map((ws, index) => (
                        <tr
                          key={ws._id}
                          className={`border-t border-white/10 transition-all ${
                            index % 2 === 0 ? 'bg-[#24344D]' : 'bg-[#1E2A3A]'
                          } hover:bg-white/10 cursor-pointer`}
                          onClick={() => handleWorkspaceClick(ws)}
                        >
                          <td className="py-4 px-6 font-medium rounded-l-xl">{ws.name}</td>
                          <td className="py-4 px-6">{ws.admin}</td>
                          <td className="py-4 px-6">{ws.email}</td>
                          <td className="py-4 px-6">
                            {ws.createdAt ? new Date(ws.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-4 px-6 rounded-r-xl flex gap-2">
                            {canInviteUsers && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkspace(ws);
                                  setIsInviteOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
                              >
                                Invite User
                              </button>
                            )}
                            {canManageWorkspaces && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(ws);
                                }}
                                className="bg-[#F26A2E] hover:bg-orange-600 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                                disabled={isDeleting}
                              >
                                {isDeleting && deleteWorkspace?._id === ws._id ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Del...
                                  </>
                                ) : (
                                  'Delete'
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedWorkspace && (
              <div className="bg-[#2A4C83] border border-white/20 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    Members in <span className="text-[#F26A2E]">"{selectedWorkspace.name}"</span>
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedWorkspace(null);
                      setMembers([]);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F26A2E]"></div>
                  </div>
                ) : members.length === 0 ? (
                  <div className="bg-[#3A506B] rounded-xl p-6 text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 mx-auto text-gray-300 mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h-8v-2a6 6 0 0112 0v2zM9 12h6v6H9v-6z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"
                      />
                    </svg>
                    <p className="text-white mb-1">No members yet</p>
                    <p className="text-gray-300 text-sm">Invite users to collaborate</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-white rounded-xl">
                      <thead className="uppercase text-white/90 bg-[#1E2633]">
                        <tr>
                          <th className="py-3 px-4">Name / Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member, index) => (
                          <tr
                            key={member._id}
                            className={`border-t border-white/10 ${
                              index % 2 === 0 ? 'bg-[#24344D]' : 'bg-[#1E2A3A]'
                            }`}
                          >
                            <td className="py-3 px-4 font-medium rounded-l-xl">
                              {member.name || member.email}
                            </td>
                            <td className="py-3 px-4">
                              {isChangingRole === member._id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    className="p-1 text-sm bg-[#10151f] text-white border border-blue-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                                  >
                                    <option value="">Select Role</option>
                                    {/* ✅ FIXED: value = role.name (string) */}
                                    {roles.map((role) => (
                                      <option key={role._id} value={role.name}>
                                        {role.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleChangeRole(member._id, newRole)}
                                    disabled={!newRole}
                                    className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setIsChangingRole(null);
                                      setNewRole('');
                                      setRoles([]);
                                    }}
                                    className="px-2 py-0.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <span className="px-2 py-1 bg-[#3A506B] rounded-full text-xs capitalize">
                                  {member.role === 'super-admin' ? 'Super Admin' : member.role}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                  member.email === currentUserEmail
                                    ? 'bg-green-600 text-white'
                                    : member.status === 'active'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-red-600 text-white'
                                }`}
                              >
                                {member.email === currentUserEmail
                                  ? 'Active'
                                  : member.status === 'active'
                                    ? 'Active'
                                    : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4 rounded-r-xl">
                              {!isChangingRole && (
                                <div className="flex space-x-1">
                                  {member.role !== 'super-admin' && canManageWorkspaces && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setIsChangingRole(member._id);
                                          setNewRole(member.role);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs"
                                      >
                                        Change Role
                                      </button>
                                      <button
                                        onClick={() => handleRemoveMember(member._id)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-xs"
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="bg-[#2A4C83] border border-white/20 rounded-2xl p-6 shadow-xl overflow-hidden">
            {invitedUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">No pending invitations</h3>
                <p className="text-gray-400 mb-4">Invite users to collaborate on your workspaces</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-white rounded-xl">
                  <thead className="uppercase text-white/90 bg-[#1E2633]">
                    <tr>
                      <th className="py-4 px-6">Email</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Invited At</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitedUsers.map((user, index) => (
                      <tr
                        key={user._id}
                        className={`border-t border-white/10 transition-all ${
                          index % 2 === 0 ? 'bg-[#24344D]' : 'bg-[#1E2A3A]'
                        } hover:bg-white/10`}
                      >
                        <td className="py-4 px-6 font-medium rounded-l-xl">{user.email}</td>
                        <td className="py-4 px-6 capitalize">
                          <span className="px-2 py-1 bg-[#3A506B] rounded-full text-xs">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {new Date(user.invitedAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 rounded-r-xl">
                          {canManageWorkspaces && (
                            <button
                              onClick={() => handleDeleteInvitedUser(user._id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg flex items-center"
                              disabled={isDeleting}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {isOpen && canManageWorkspaces && (
          <Modal closeModal={() => setIsOpen(false)}>
            <div className="bg-gradient-to-br from-[#1e2a3a] to-[#0d1520] rounded-2xl p-8 shadow-2xl border border-blue-900 text-white backdrop-blur-md">
              <h2 className="text-3xl font-bold mb-6 text-[#F26A2E] drop-shadow-md">Create New Workspace</h2>
              <div className="space-y-5">
                <InputField 
                  label="Workspace Name" 
                  name="workspaceName" 
                  value={formData.workspaceName} 
                  onChange={handleInputChange}
                  placeholder="e.g., Marketing Team"
                  className="bg-[#10151f] text-white border border-blue-700 focus:ring-2 focus:ring-blue-600"
                />
                <InputField 
                  label="Admin Username" 
                  name="adminUser" 
                  value={formData.adminUser} 
                  onChange={handleInputChange}
                  placeholder="e.g., johndoe"
                  className="bg-[#10151f] text-white border border-blue-700 focus:ring-2 focus:ring-blue-600"
                />
                <InputField 
                  label="Admin Email" 
                  name="adminEmail" 
                  value={formData.adminEmail} 
                  onChange={handleInputChange}
                  placeholder="e.g., john@company.com"
                  type="email"
                  className="bg-[#10151f] text-white border border-blue-700 focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  className="bg-gradient-to-r from-[#2A4C83] to-[#3b6bd3] hover:from-[#3b6bd3] hover:to-[#2A4C83] text-white px-6 py-2 rounded-xl shadow-lg flex items-center font-medium transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Create Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {isInviteOpen && selectedWorkspace && canInviteUsers && (
          <Modal closeModal={() => setIsInviteOpen(false)} width="max-w-xl">
            <SendInvite 
              onClose={() => setIsInviteOpen(false)} 
              onSuccess={handleInviteSuccess}
              workspace={selectedWorkspace}
              workspaces={workspaces}
            />
          </Modal>
        )}

        {isDeleteOpen && canManageWorkspaces && (
          <Modal closeModal={() => setIsDeleteOpen(false)}>
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold mb-2 text-red-500">Delete Workspace</h2>
              <p className="mb-6 text-gray-300">
                Are you sure you want to delete <span className="font-semibold text-white">{deleteWorkspace?.name}</span>? This action cannot be undone.
              </p>
              <InputField
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter admin username to confirm"
                label={`Confirm with admin username (${deleteWorkspace?.admin})`}
              />
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-5 py-2 rounded-xl border border-gray-500 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl shadow-md flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Workspace'
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {isDeleteInviteOpen && canManageWorkspaces && (
          <Modal closeModal={() => setIsDeleteInviteOpen(false)}>
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold mb-2 text-red-500">Delete Invitation</h2>
              <p className="mb-6 text-gray-300">
                Are you sure you want to delete this invitation? This action cannot be undone.
              </p>
              <div className="mt-6 flex justify-center space-x-3">
                <button
                  onClick={() => setIsDeleteInviteOpen(false)}
                  className="px-5 py-2 rounded-xl border border-gray-500 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteInviteConfirm}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl shadow-md flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Revoking...
                    </>
                  ) : (
                    'Delete Invitation'
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

const InputField = ({ label, type = 'text', ...props }) => (
  <div className="mb-4">
    {label && <label className="block text-white mb-2 font-medium">{label}</label>}
    <input
      type={type}
      {...props}
      className="w-full border border-white/30 bg-[#1E2633] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F26A2E] placeholder-gray-500"
    />
  </div>
);

const Modal = ({ children, closeModal, width = 'max-w-md' }) => (
  <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 backdrop-blur-sm">
    <div className={`relative bg-[#2A4C83] p-8 rounded-2xl shadow-2xl w-full ${width} mx-4 max-h-[90vh] overflow-y-auto`}>
      <button
        onClick={closeModal}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold transition-colors"
      >
        &times;
      </button>
      {children}
    </div>
  </div>
);

export default Workspace;