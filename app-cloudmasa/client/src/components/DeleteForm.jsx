// client/src/components/DeleteForm.jsx
import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../interceptor/api.interceptor';

const DeleteForm = ({ toolName, closeModal }) => {
  const [instances, setInstances] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  // 🔍 Fetch all deployed instances for this tool
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/api/deployments/instances?toolName=${encodeURIComponent(toolName)}`);
        setInstances(data.instances || []);
      } catch (err) {
        toast.error('Failed to load deployments.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [toolName]);

  const selected = instances.find(i => i._id === selectedId);

  const handleDelete = async () => {
    if (confirmation !== 'DELETE') {
      toast.error('Type "DELETE" to confirm.');
      return;
    }
    if (!selectedId) {
      toast.error('Select a deployment to delete.');
      return;
    }

    setIsDeleting(true);
    try {
      // ✅ Delete by deployment _id — most accurate
      await api.delete(`/api/deployments/${toolName}?deploymentId=${selectedId}`);
      toast.success(`✅ Deleted ${toolName} from ${selected.namespace} (${selected.selectedCluster})`);
      closeModal();
    } catch (err) {
      const msg = err.response?.data?.error || 'Deletion failed';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-lg bg-gray-900 text-white">
        <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={20} />
        </button>

        <h3 className="text-xl font-bold text-center mb-4">🗑️ Delete {toolName}</h3>

        {isLoading ? (
          <div className="py-6 text-center">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-cyan-400 mb-2"></div>
            <p>Loading deployments...</p>
          </div>
        ) : instances.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No deployments found.</p>
        ) : (
          <div className="space-y-4">
            {/* Instance Selector */}
            <div>
              <label className="block text-sm font-medium mb-1">Select Deployment</label>
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 pr-8 text-white appearance-none"
                >
                  <option value="">-- Choose an Cluster--</option>
                  {instances.map((inst) => (
                    <option key={inst._id} value={inst._id}>
                      {inst.namespace} • {inst.selectedCluster} • {inst.accountName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Preview */}
            {selected && (
              <div className="p-3 bg-gray-800 rounded border border-gray-700 space-y-1 text-sm">
                <p><span className="font-medium">Cluster:</span> {selected.selectedCluster}</p>
                <p><span className="font-medium">Namespace:</span> <code>{selected.namespace}</code></p>
                <p><span className="font-medium">AWS Account:</span> {selected.accountName}</p>
                <p><span className="font-medium">Repo:</span> {selected.repoUrl.replace('https://github.com/', '')}</p>
              </div>
            )}

            {/* Warning */}
            {selected && (
              <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-300">
                <AlertTriangle size={14} className="inline mr-1" />
                This will delete the Argo CD application and the namespace <strong>{selected.namespace}</strong>.
              </div>
            )}

            {/* Confirmation */}
            {selected && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Type <span className="font-bold text-red-400">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  placeholder="DELETE"
                />
              </div>
            )}

            <button
              onClick={handleDelete}
              disabled={isDeleting || !selected || confirmation !== 'DELETE'}
              className={`w-full py-2.5 rounded font-medium flex items-center justify-center gap-2 ${
                selected && confirmation === 'DELETE'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'
                  : 'bg-gray-700 cursor-not-allowed'
              }`}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Selected Instance
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteForm;
