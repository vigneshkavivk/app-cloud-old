"use client";
import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SendInvite from "./Mailsend";
import { __API_URL__ } from "../config/env.config";
import { useAuth } from "../hooks/useAuth";
import {
  Layers,
  DollarSign,
  Activity,
  Link2,
  Cloud,
  Github,
  Server,
  Database,
  Zap,
  TrendingUp,
  Lock,
  Plus,
  Trash2,
  UserPlus,
  Edit3,
  X,
  CheckCircle,
  Clock,
} from "lucide-react";

// ✅ Reusable Glass Card (same as Dashboard)
const GlassCard = ({ children, className = "" }) => (
  <div
    className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
  >
    {children}
  </div>
);

// ✅ Section Heading (blue-cyan gradient, like Dashboard)
const SectionHeading = ({ children }) => (
  <h2 className="text-white font-bold text-xl mb-6 uppercase tracking-wide">
    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
      {children}
    </span>
  </h2>
);

// ✅ Input Field (glass-style, matches Dashboard aesthetic)
const InputField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) => (
  <div className="mb-4">
    {label && (
      <label className="block text-gray-300 mb-1 text-sm font-medium">
        {label}
      </label>
    )}
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 placeholder-gray-500 transition-colors"
    />
  </div>
);

// ✅ Glass Modal (backdrop + content styled like Dashboard modals)
const Modal = ({ children, closeModal, width = "max-w-2xl" }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 w-full ${width} shadow-2xl max-h-[90vh] overflow-y-auto`}
    >
      <button
        onClick={closeModal}
        className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold transition-colors duration-200"
      >
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

// ✅ Icon Wrapper (like Dashboard: glow on hover, subtle bg)
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

const Workspace = () => {
  const { hasPermission } = useAuth();
  const canManageWorkspaces = hasPermission("Overall", "Administer");
  const canInviteUsers = hasPermission("Overall", "Administer");

  if (!canManageWorkspaces && !canInviteUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0b14] to-[#06070f] text-white">
        <div className="text-center p-8 max-w-md">
          <Lock className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Overall.Administer</span> permission.
          </p>
        </div>
      </div>
    );
  }

  // Inside Workspace component (not outside — use useEffect or inline <style>)
useEffect(() => {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    .red-orange-gradient-text {
      background: linear-gradient(to right, #ef4444, #f59e0b);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-weight: 600;
    }

    .icon-wrapper {
      padding: 0.5rem;
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    /* Required for backdrop-blur to work — many browsers disable it without this */
    body {
      font-family: 'Inter', sans-serif;
    }
  `;
  document.head.appendChild(style);
  return () => {
    document.head.removeChild(style);
  };
}, []);

  // ✅ State (logic unchanged)
  const [isOpen, setIsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [formData, setFormData] = useState({
    workspaceName: "",
    adminUser: "",
    adminEmail: "",
  });
  const [deleteWorkspace, setDeleteWorkspace] = useState(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("workspaces");
  const [deleteInviteId, setDeleteInviteId] = useState(null);
  const [isDeleteInviteOpen, setIsDeleteInviteOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [isChangingRole, setIsChangingRole] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [roles, setRoles] = useState([]);

  // ✅ Helpers (unchanged)
  const getCurrentUserEmail = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.email || "";
      } catch (e) {
        return "";
      }
    }
    return "";
  };
  const currentUserEmail = getCurrentUserEmail();

  const isSuperAdmin = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.role === "super-admin";
      } catch (e) {
        return false;
      }
    }
    return false;
  };
  const currentUserIsSuperAdmin = isSuperAdmin();

  const authFetch = async (url, options = {}) => {
    const userStr = localStorage.getItem("user");
    let token = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token;
      } catch (e) {}
    }
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    const response = await fetch(`${__API_URL__}${url}`, { ...options, headers });
    if (response.status === 401) {
      toast.error("Session expired. Please log in again.");
      localStorage.removeItem("user");
      window.location.href = "/";
      throw new Error("Unauthorized");
    }
    return response;
  };

  // ✅ API calls (logic unchanged)
  const fetchRoles = async () => {
    try {
      const res = await authFetch("/api/policies/roles");
      if (!res.ok) throw new Error(`Failed to fetch roles`);
      const data = await res.json();
      setRoles(Array.isArray(data) ? data : data.roles || []);
    } catch (error) {
      toast.error("Failed to load roles for assignment");
      setRoles([]);
    }
  };

  useEffect(() => {
    if (isChangingRole) fetchRoles();
    else setRoles([]);
  }, [isChangingRole]);

  const fetchWorkspacesAndInvites = async () => {
    setIsLoading(true);
    try {
      const [workspacesRes, invitesRes] = await Promise.all([
        authFetch("/api/workspaces"),
        authFetch("/api/invited-users"),
      ]);
      if (!workspacesRes.ok || !invitesRes.ok) throw new Error("Failed to fetch data");
      const workspacesData = await workspacesRes.json();
      const invitesData = await invitesRes.json();
      setWorkspaces(workspacesData);
      setInvitedUsers(invitesData);
    } catch (error) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async (workspaceId) => {
    setIsLoading(true);
    try {
      const res = await authFetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      toast.error("Failed to load members");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("user"))?.token;
    if (!token) {
      toast.error("Please log in.");
      window.location.href = "/";
      return;
    }
    fetchWorkspacesAndInvites();
  }, []);

  // ✅ Handlers (logic unchanged)
  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    const { workspaceName, adminUser, adminEmail } = formData;
    if (!workspaceName.trim()) return toast.error("Workspace name is required");
    if (!adminUser.trim()) return toast.error("Admin username is required");
    if (!adminEmail.trim() || !validateEmail(adminEmail))
      return toast.error("Please enter a valid email address");

    try {
      setIsLoading(true);
      const response = await authFetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ workspaceName, adminUser, adminEmail }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message?.includes("already exists"))
          return toast.error(`Workspace "${workspaceName}" already exists.`);
        return toast.error(errorData.message || "Failed to create workspace");
      }
      const newWorkspace = await response.json();
      setWorkspaces([...workspaces, newWorkspace]);
      toast.success("Workspace created successfully!");
      setIsOpen(false);
      setFormData({ workspaceName: "", adminUser: "", adminEmail: "" });
    } catch (error) {
      toast.error("Error creating workspace");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (workspace) => {
    setDeleteWorkspace(workspace);
    setIsDeleteOpen(true);
    setAdminUsername("");
  };

  const handleDeleteConfirm = async () => {
    if (!adminUsername.trim()) return toast.error("Please enter the admin username");
    if (adminUsername.trim().toLowerCase() !== deleteWorkspace.admin.trim().toLowerCase())
      return toast.error("Admin username does not match!");

    try {
      setIsDeleting(true);
      const response = await authFetch(`/api/workspaces/${deleteWorkspace._id}`, {
        method: "DELETE",
        body: JSON.stringify({ adminUsername: adminUsername.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete workspace");
      }
      setWorkspaces(workspaces.filter((ws) => ws._id !== deleteWorkspace._id));
      setIsDeleteOpen(false);
      toast.success("Workspace deleted successfully!");
    } catch (error) {
      toast.error(error.message || "Error deleting workspace");
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
      const res = await authFetch(`/api/invited-users/${deleteInviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete invitation");
      setInvitedUsers(invitedUsers.filter((u) => u._id !== deleteInviteId));
      toast.success("Invitation deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete invitation");
    } finally {
      setIsDeleting(false);
      setDeleteInviteId(null);
      setIsDeleteInviteOpen(false);
    }
  };

  const handleWorkspaceClick = (workspace) => {
    if (!workspace?._id) return;
    setSelectedWorkspace(workspace);
    fetchMembers(workspace._id);
  };

  const handleInviteSuccess = () => {
    authFetch("/api/invited-users")
      .then((res) => res.json())
      .then((data) => setInvitedUsers(data))
      .catch(() => toast.error("Failed to refresh invitations"));
  };

  const handleChangeRole = async (userId) => {
    if (!selectedWorkspace || !newRole) return;
    const isValid = roles.some((role) => role.name === newRole);
    if (!isValid) return toast.error("Selected role is not valid");

    try {
      const res = await authFetch(
        `/api/workspaces/${selectedWorkspace._id}/members/${userId}/role`,
        { method: "PUT", body: JSON.stringify({ role: newRole }) }
      );
      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.message || "Failed to update role");
      }
      toast.success("Role updated successfully!");
      fetchMembers(selectedWorkspace._id);
      setIsChangingRole(null);
      setNewRole("");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedWorkspace) return;
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      setIsLoading(true);
      const res = await authFetch(`/api/workspaces/${selectedWorkspace._id}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Member removed successfully!");
      fetchMembers(selectedWorkspace._id);
    } catch (error) {
      toast.error("Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Render
  return (
    <>
      {/* Background Layers (Dashboard-style) */}
      <div className="dashboard-bg" />
      <div className="animated-gradient-bg" />

      <div className="min-h-screen p-4 sm:p-6 md:p-8 text-white">
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-10">
            <div className="max-w-7xl mx-auto relative z-10">
            <h1 className="text-4xl font-bold text-center mb-8">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Workspace Manager 
              </span>
            </h1>
              <div className="flex space-x-3 w-full md:w-auto">
                {currentUserIsSuperAdmin && (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white hover:from-teal-600 hover:via-cyan-700 hover:to-blue-800 px-5 py-2.5 rounded-xl shadow-md font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Workspace
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex space-x-6 border-b border-white/10">
              <button
                onClick={() => setActiveTab("workspaces")}
                className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "workspaces"
                    ? "border-[#ef4444] text-[#ef4444]"
                    : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                Workspaces
              </button>
              {workspaces.length > 0 && (
                <button
                  onClick={() => setActiveTab("invitations")}
                  className={`py-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === "invitations"
                      ? "border-[#f59e0b] text-[#f59e0b]"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Invitations
                  {invitedUsers.length > 0 && (
                    <span className="ml-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {invitedUsers.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Workspaces Tab */}
          {activeTab === "workspaces" && (
            <div className="space-y-8">
              {/* Workspaces Table */}
              <GlassCard>
                <SectionHeading>Workspaces</SectionHeading>
                {isLoading && !selectedWorkspace ? (
                  <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="text-center py-10">
                    <IconWrapper className="mx-auto mb-4">
                      <Layers className="text-cyan-400" size={24} />
                    </IconWrapper>
                    <h3 className="text-lg font-medium text-white mb-1">No workspaces yet</h3>
                    <p className="text-gray-400">Create your first workspace to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-300 uppercase text-xs">
                          <th className="py-3 px-4">Workspace Name</th>
                          <th className="py-3 px-4">Admin</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Created</th>
                          <th className="py-3 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workspaces.map((ws, index) => (
                          <tr
                            key={ws._id}
                            className={`border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                              index % 2 === 0 ? "bg-white/3" : "bg-white/5"
                            }`}
                            onClick={() => handleWorkspaceClick(ws)}
                          >
                            <td className="py-4 px-4 font-medium">
                              <span className="red-orange-gradient-text">{ws.name}</span>
                            </td>
                            <td className="py-4 px-4">{ws.admin}</td>
                            <td className="py-4 px-4">{ws.email}</td>
                            <td className="py-4 px-4">
                              {ws.createdAt
                                ? new Date(ws.createdAt).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="py-4 px-4 flex gap-2">
                              {canInviteUsers && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWorkspace(ws);
                                    setIsInviteOpen(true);
                                  }}
                                  className="flex items-center gap-1 bg-gradient-to-r from-teal-900 via-emerald-900 to-teal-800 hover:from-teal-800 hover:via-emerald-800 hover:to-teal-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:shadow-md transition-shadow"
                                >
                                  <UserPlus size={14} />
                                  Invite
                                </button>
                              )}
                              {canManageWorkspaces && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(ws);
                                  }}
                                  className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:shadow-md transition-shadow"
                                  disabled={isDeleting && deleteWorkspace?._id === ws._id}
                                >
                                  {isDeleting && deleteWorkspace?._id === ws._id ? (
                                    <svg
                                      className="animate-spin h-3 w-3"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      />
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      />
                                    </svg>
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
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
              </GlassCard>

              {/* Member List */}
              {selectedWorkspace && (
                <GlassCard>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                      Members in{" "}
                      <span className="red-orange-gradient-text">
                        "{selectedWorkspace.name}"
                      </span>
                    </h2>
                    <button
                      onClick={() => {
                        setSelectedWorkspace(null);
                        setMembers([]);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-400" />
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8">
                      <IconWrapper className="mx-auto mb-3">
                        <UserPlus className="text-cyan-400" size={20} />
                      </IconWrapper>
                      <p className="text-gray-400">No members yet. Invite users to collaborate.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-300 uppercase text-xs">
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
                              className={`border-t border-white/5 ${
                                index % 2 === 0 ? "bg-white/3" : "bg-white/5"
                              }`}
                            >
                              <td className="py-3 px-4 font-medium">
                                {member.name || member.email}
                              </td>
                              <td className="py-3 px-4">
                               {isChangingRole === member._id ? (
                                  <div className="flex flex-wrap gap-1 items-center">
                                    <select
                                      value={newRole}
                                      onChange={(e) => setNewRole(e.target.value)}
                                      className="bg-blue-900/30 border border-blue-500/30 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 text-white"
                                    >
                                      <option value="">Select Role</option>
                                      {roles.map((role) => (
                                        <option key={role._id} value={role.name}>
                                          {role.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleChangeRole(member._id)}
                                      disabled={!newRole}
                                      className="flex items-center gap-1 bg-gradient-to-r from-cyan-600 to-blue-700 text-white px-2 py-1 rounded text-xs font-medium"
                                    >
                                      <CheckCircle size={12} />
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsChangingRole(null);
                                        setNewRole("");
                                      }}
                                      className="flex items-center gap-1 bg-red-900/20 hover:bg-red-900/30 px-2 py-1 rounded text-xs text-red-300"
                                    >
                                      <X size={12} />
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <span className="px-2 py-1 bg-white/5 rounded-full text-xs capitalize text-cyan-300">
                                    {member.role === "super-admin" ? "Super Admin" : member.role}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {member.email === currentUserEmail ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs">
                                    <CheckCircle size={12} />
                                    You
                                  </span>
                                ) : member.status === "active" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs">
                                    <CheckCircle size={12} />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs">
                                    <Clock size={12} />
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {!isChangingRole &&
                                  member.role !== "super-admin" &&
                                  canManageWorkspaces && (
                                    <div className="flex flex-wrap gap-1">
                                      <button
                                        onClick={() => {
                                          setIsChangingRole(member._id);
                                          setNewRole(member.role);
                                        }}
                                        className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-cyan-300 px-2 py-1 rounded text-xs"
                                      >
                                        <Edit3 size={12} />
                                        Change Role
                                      </button>
                                      <button
                                        onClick={() => handleRemoveMember(member._id)}
                                        className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-2 py-1 rounded text-xs"
                                      >
                                        <Trash2 size={12} />
                                        Remove
                                      </button>
                                    </div>
                                  )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === "invitations" && (
            <GlassCard>
              <SectionHeading>Invitations</SectionHeading>
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
                </div>
              ) : invitedUsers.length === 0 ? (
                <div className="text-center py-10">
                  <IconWrapper className="mx-auto mb-4">
                    <UserPlus className="text-cyan-400" size={24} />
                  </IconWrapper>
                  <h3 className="text-lg font-medium text-white mb-1">No pending invitations</h3>
                  <p className="text-gray-400">Invite users to collaborate on your workspaces</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-300 uppercase text-xs">
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Invited At</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitedUsers.map((user, index) => (
                        <tr
                          key={user._id}
                          className={`border-t border-white/5 hover:bg-white/5 transition-colors ${
                            index % 2 === 0 ? "bg-white/3" : "bg-white/5"
                          }`}
                        >
                          <td className="py-4 px-4 font-medium">{user.email}</td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-white/5 rounded-full text-xs capitalize text-cyan-300">
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {new Date(user.invitedAt || user.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                user.status === "pending"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              {user.status === "pending" ? (
                                <Clock size={12} />
                              ) : (
                                <CheckCircle size={12} />
                              )}
                              {user.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {canManageWorkspaces && (
                              <button
                                onClick={() => handleDeleteInvitedUser(user._id)}
                                className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                                disabled={isDeleting && deleteInviteId === user._id}
                              >
                                {isDeleting && deleteInviteId === user._id ? (
                                  <svg
                                    className="animate-spin h-3 w-3"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    />
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                  </svg>
                                ) : (
                                  <Trash2 size={14} />
                                )}
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
            </GlassCard>
          )}

          {/* Modals */}
          {isOpen && currentUserIsSuperAdmin && (
            <Modal closeModal={() => setIsOpen(false)}>
              <h2 className="text-2xl font-bold mb-6 red-orange-gradient-text">
                Create New Workspace
              </h2>
              <form onSubmit={handleCreate}>
                <InputField
                  label="Workspace Name"
                  name="workspaceName"
                  value={formData.workspaceName}
                  onChange={handleInputChange}
                  placeholder="e.g., Development Team"
                  required
                />
                <InputField
                  label="Admin Username"
                  name="adminUser"
                  value={formData.adminUser}
                  onChange={handleInputChange}
                  placeholder="e.g., johndoe"
                  required
                />
                <InputField
                  label="Admin Email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  placeholder="e.g., john.doe@example.com"
                  type="email"
                  required
                />
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white hover:from-teal-600 hover:via-cyan-700 hover:to-blue-800 px-5 py-2 rounded-xl font-medium flex items-center gap-1"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Workspace
                      </>
                    )}
                  </button>
                </div>
              </form>
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
                <IconWrapper glowColor="orange" className="mx-auto mb-4">
                  <Trash2 className="text-rose-400" size={28} />
                </IconWrapper>
                <h2 className="text-xl font-bold text-rose-400 mb-2">Delete Workspace</h2>
                <p className="mb-6 text-gray-300">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold red-orange-gradient-text">
                    {deleteWorkspace?.name}
                  </span>
                  ? This action cannot be undone.
                </p>
                <InputField
                  label={`Confirm with admin username (${deleteWorkspace?.admin})`}
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Enter admin username"
                />
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={() => setIsDeleteOpen(false)}
                    className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-xl font-medium"
                  >
                    {isDeleting ? "Deleting..." : "Delete Workspace"}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {isDeleteInviteOpen && canManageWorkspaces && (
            <Modal closeModal={() => setIsDeleteInviteOpen(false)}>
              <div className="text-center">
                <IconWrapper glowColor="orange" className="mx-auto mb-4">
                  <Trash2 className="text-rose-400" size={28} />
                </IconWrapper>
                <h2 className="text-xl font-bold text-rose-400 mb-2">Delete Invitation</h2>
                <p className="mb-6 text-gray-300">
                  Are you sure you want to delete this invitation? The user will no longer be able
                  to join.
                </p>
                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    onClick={() => setIsDeleteInviteOpen(false)}
                    className="px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteInviteConfirm}
                    disabled={isDeleting}
                    className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-xl font-medium"
                  >
                    {isDeleting ? "Revoking..." : "Delete Invitation"}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </>
  );
};

export default Workspace;
