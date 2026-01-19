// src/components/SecurityManagement.jsx
import React, { useState } from "react";

const SecurityManagement = () => {
  const [secrets, setSecrets] = useState([
    {
      name: "database-password",
      path: "secret/production/db",
      type: "Password",
      lastAccessed: "5 mins ago",
      accessCount: 142,
      status: "Active",
    },
    {
      name: "api-key-stripe",
      path: "secret/production/payment",
      type: "Api-Key",
      lastAccessed: "1 hour ago",
      accessCount: 89,
      status: "Active",
    },
    {
      name: "aws-access-key",
      path: "secret/production/aws",
      type: "Access-Key",
      lastAccessed: "3 hours ago",
      accessCount: 234,
      status: "Active",
    },
    {
      name: "jwt-secret",
      path: "secret/production/auth",
      type: "Token",
      lastAccessed: "2 days ago",
      accessCount: 567,
      status: "Expiring",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredSecrets = secrets.filter(secret => {
    const matchesSearch = secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          secret.path.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || secret.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddSecret = () => {
    alert("Add Secret Form will open here!");
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vault Secrets</h1>
        <button
          onClick={handleAddSecret}
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Secret
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search secrets by name or path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Expiring">Expiring</option>
        </select>
      </div>

      {/* Secrets Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Path</th>
              <th className="p-4">Type</th>
              <th className="p-4">Last Accessed</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSecrets.map((secret, index) => (
              <tr key={index} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="p-4">{secret.name}</td>
                <td className="p-4">{secret.path}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-gray-600 text-xs rounded-full">{secret.type}</span>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <div>{secret.lastAccessed}</div>
                    <div className="text-xs text-gray-400">{secret.accessCount} times accessed</div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    secret.status === "Active" 
                      ? "bg-green-600 text-green-100" 
                      : "bg-yellow-600 text-yellow-100"
                  }`}>
                    {secret.status}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-gray-400 hover:text-white">
                    ⋮
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vault Status Card */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.724 2.97 2.97 0 001.77-1.907 7.002 7.002 0 00-13.034 2.17 11.857 11.857 0 006.267 6.267 7.002 7.002 0 002.17-13.034c1.656.73 3.374 1.37 5.113 1.847A7.002 7.002 0 0018.224 15.707 11.857 11.857 0 0012 12.25c-1.745 0-3.374-.636-5.113-1.847A7.002 7.002 0 006.267 3.455z" clipRule="evenodd" />
            </svg>
            <h3 className="font-semibold">Vault Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Connection</span>
              <span className="text-green-500">Healthy</span>
            </div>
            <div className="flex justify-between">
              <span>Encryption</span>
              <span>AES-256</span>
            </div>
            <div className="flex justify-between">
              <span>Last Backup</span>
              <span>2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityManagement;
