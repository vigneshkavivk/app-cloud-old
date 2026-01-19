// src/components/workflow/AccountResources.jsx
import React, { useState, useEffect } from 'react';
import { Code, X, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // ✅ Import auth hook

const AccountResources = ({ selectedAccount, selectedProvider, onCreateNewResource }) => {
  const { hasPermission, user } = useAuth();

  // 🔐 RBAC: Require 'Agent.Read' to view this page at all
  if (!hasPermission('Agent', 'Read')) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 text-red-400 mb-3">
            <Lock className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Access Denied</h3>
          </div>
          <p className="text-gray-400">
            You need <code className="bg-gray-800 px-1.5 py-0.5 rounded">Agent Read</code> permission to view deployments.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Permission flags
  const canDestroy = hasPermission('Agent', 'Delete'); // For destroy button
  const canCreate = hasPermission('Agent', 'Create'); // For "Create New Resource"

  const [deployments, setDeployments] = useState([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [errorDeployments, setErrorDeployments] = useState(null);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const navigate = useNavigate();

  // ✅ Destroy handler — no auth header, but protected by RBAC UI + backend
  const handleDestroyDeployment = async (deploymentId) => {
    if (!canDestroy) {
      alert('🔒 You do not have permission to destroy deployments.');
      return;
    }

    if (!window.confirm(
      `⚠️ Destroy entire deployment?\nID: ${deploymentId}\nThis runs \`terraform destroy\` and cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch('/api/terraform/destroy-deployment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deploymentId, accountId: selectedAccount._id })
        
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Destroyed: ${deploymentId}`);
        setDeployments(prev => prev.filter(d => d.deploymentId !== deploymentId));
        setSelectedDeployment(null);
      } else {
        alert(`❌ Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  // ✅ Fetch deployments — public fetch (no token), but filtered by accountId
  useEffect(() => {
    if (!selectedAccount || selectedProvider !== 'aws') {
      setLoadingDeployments(false);
      return;
    }

    const fetchDeployments = async () => {
      setLoadingDeployments(true);
      setErrorDeployments(null);

      try {
        const res = await fetch(`/api/terraform/resources?accountId=${selectedAccount._id}`);

        if (!res.ok) {
          let errorMessage = `HTTP ${res.status}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        const data = await res.json();
        if (data.success) {
          const filtered = (data.deployments || []).filter(
            dep => dep.accountId === selectedAccount._id?.toString()
          );
          setDeployments(filtered);
        } else {
          setErrorDeployments(data.error || 'Unknown error loading deployments');
        }
      } catch (err) {
        console.error('Fetch deployments error:', err);
        setErrorDeployments(err.message || 'Failed to load deployments');
      } finally {
        setLoadingDeployments(false);
      }
    };

    fetchDeployments();
  }, [selectedAccount, selectedProvider]);

  // ✅ Render UI
  return (
    <div className="space-y-6">
      {/* ✅ TERRAFORM DEPLOYMENTS HEADING */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Code className="text-green-400" /> Terraform Deployments
        </h3>
        <div className="text-sm text-gray-400 italic mb-3">
          {canDestroy
            ? "Click any deployment to view details or destroy it."
            : "You can view deployments, but cannot destroy them."}
        </div>

        {loadingDeployments ? (
          <div className="text-gray-500">Loading deployments...</div>
        ) : errorDeployments ? (
          <div className="text-red-400 text-sm">⚠️ {errorDeployments}</div>
        ) : deployments && deployments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {deployments.map((dep) => (
              <div
                key={dep.deploymentId}
                className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-800/70 transition ${
                  !canDestroy ? 'opacity-90' : ''
                }`}
                onClick={() => setSelectedDeployment(dep)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-cyan-300 text-xs truncate">{dep.deploymentId}</div>
                    <div className="text-xs text-gray-400 mt-1 truncate">
                      {dep.modules.map(m => m.toUpperCase()).join(', ')}
                    </div>
                    {dep.resources && dep.resources.length > 0 && (
                      <div className="text-xs mt-1">
                        <span className="text-green-400">✓ {dep.resources.length} resource(s)</span>
                      </div>
                    )}
                  </div>
                  {canDestroy ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDestroyDeployment(dep.deploymentId);
                      }}
                      
                    >
                    </button>
                  ) : (
                    <span className="text-gray-600 text-xs">🔒</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-gray-800/50 border border-dashed border-gray-600 rounded-xl mb-4">
              <Code className="text-gray-500 w-8 h-8 mx-auto" />
            </div>
            <h4 className="text-gray-300 font-medium mb-1">No Terraform deployments yet</h4>
            <p className="text-gray-500 text-sm mb-4">Create your first infrastructure with CloudMaSa</p>
          </div>
        )}
      </div>

      {/* ✅ Create Button — conditionally enabled */}
      {canCreate ? (
        <button
          onClick={onCreateNewResource || (() => console.warn('onCreateNewResource not provided'))}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-1"
        >
          ➕ Create New Resource
        </button>
      ) : (
        <button
          disabled
          className="px-4 py-2 bg-gray-700 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
          title="You need 'Agent Create' permission"
        >
          ➕ Create New Resource (🔒 Access Denied)
        </button>
      )}

      {/* ✅ MODAL FOR DEPLOYMENT DETAILS */}
      {selectedDeployment && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-5">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-white">Deployment Details</h4>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-800 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">ID:</span>
                  <span className="font-mono text-cyan-300">{selectedDeployment.deploymentId}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-800 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Modules:</span>
                  <span className="text-yellow-400">{selectedDeployment.modules.join(', ')}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-800 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-blue-400">{new Date(selectedDeployment.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-800 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Resources:</span>
                  <span className="text-green-400">✓ {selectedDeployment.resources?.length || 0}</span>
                </div>
              </div>

              {selectedDeployment.resources?.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-300 mb-2">Resource List:</h5>
                  <div className="space-y-2">
                    {selectedDeployment.resources.slice(0, 5).map((r, i) => (
                      <div key={i} className="p-2 bg-gray-800 rounded text-xs">
                        <div className="flex justify-between">
                          <span>{r.name || r.id}</span>
                          <span className="text-gray-500">{r.type}</span>
                        </div>
                      </div>
                    ))}
                    {selectedDeployment.resources.length > 5 && (
                      <div className="text-xs text-gray-500 mt-1">
                        +{selectedDeployment.resources.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-700 mt-4">
                {canDestroy ? (
                  <button
                    onClick={() => handleDestroyDeployment(selectedDeployment.deploymentId)}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm flex items-center justify-center gap-1"
                  >
                    🗑️ Destroy Deployment
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2 bg-gray-700 text-gray-400 rounded font-medium text-sm cursor-not-allowed"
                    title="You need 'Agent Delete' permission"
                  >
                    🔒 Destroy Deployment (Access Denied)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {selectedAccount && (
        <div className="text-center mt-6 text-gray-500 text-sm">
          🔍 Scanned: <span className="font-mono">{selectedAccount.accountId}</span> in <span className="font-mono">{selectedAccount.awsRegion}</span>
        </div>
      )}
    </div>
  );
};

export default AccountResources;
