// src/components/UpgradeClusterModal.jsx
import React, { useState, useEffect } from 'react';
import {
  ArrowUpCircle,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import api from '../interceptor/api.interceptor';

// ✅ No TypeScript — plain JS
const UpgradeClusterModal = ({ isOpen, onClose, cluster, onUpgradeSuccess }) => {
  const [availableVersions, setAvailableVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!isOpen || !cluster) return;

    const fetchVersions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.post('/api/clusters/get-upgrade-versions', {
          clusterId: cluster._id,
        });
        const versions = res.data.versions || [];
        setAvailableVersions(versions);
        if (versions.length > 0) {
          setSelectedVersion(versions[0]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch upgrade versions');
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, cluster]);

  const handleUpgrade = async () => {
    if (!cluster || !selectedVersion) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post('/api/clusters/upgrade-cluster', {
        clusterId: cluster._id,
        version: selectedVersion,
      });

      if (res.data.success) {
        setSuccess(`✅ Upgrade initiated for ${cluster.name} to v${selectedVersion}`);
        setTimeout(() => {
          onUpgradeSuccess();
          onClose();
        }, 1500);
      } else {
        throw new Error(res.data.message || 'Unknown error');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upgrade failed. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen || !cluster) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowUpCircle className="text-blue-400" size={20} />
              Upgrade Cluster
            </h2>
            <p className="text-gray-300 text-sm">
              Update Kubernetes version for <span className="font-mono">{cluster.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 p-1.5 hover:bg-red-900/20 rounded transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Version */}
        <div className="mb-5 p-3 bg-white/5 rounded-lg text-sm">
          <span className="text-gray-400">Current version:</span>
          <span className="ml-2 font-mono font-semibold text-orange-400">
            v{cluster.currentVersion}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800/40 text-red-200 rounded-md flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-800/40 text-green-200 rounded-md flex items-center gap-2 text-sm">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        {/* Version Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Target Kubernetes Version
          </label>
          <div className="relative">
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              disabled={loading || availableVersions.length === 0}
              className="w-full p-2.5 pr-9 rounded-md bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm"
            >
              {availableVersions.length === 0 ? (
                <option disabled value="">
                  {loading ? 'Loading versions...' : 'No upgrades available'}
                </option>
              ) : (
                availableVersions.map((v) => (
                  <option key={v} value={v}>
                    v{v} {v === cluster.currentVersion ? '(current)' : ''}
                  </option>
                ))
              )}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Only newer, supported versions are shown.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md font-medium text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={
              loading ||
              !selectedVersion ||
              selectedVersion === cluster.currentVersion ||
              availableVersions.length === 0
            }
            className={`flex-1 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-1.5 transition ${
              loading ||
              !selectedVersion ||
              selectedVersion === cluster.currentVersion ||
              availableVersions.length === 0
                ? 'bg-white/10 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-gray-900 hover:from-blue-600 hover:to-cyan-600'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" />
                Upgrading...
              </>
            ) : (
              'Confirm Upgrade'
            )}
          </button>
        </div>

        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-md text-xs text-yellow-200">
          ⚠️ Cluster nodes will be drained and replaced during upgrade. Downtime may occur.
        </div>
      </div>
    </div>
  );
};

export default UpgradeClusterModal;
