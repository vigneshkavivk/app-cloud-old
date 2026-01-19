import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Network,
  HardDrive,
  Code,
  Terminal,
  Globe,
  Lock,
  Info,
} from 'lucide-react';

// ✅ Reusable per-field tooltip (appears on hover, closes on leave)
const FieldInfoTooltip = ({ content, show }) => {
  if (!show) return null;
  return (
    <div
      className="absolute z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-sm text-gray-200"
      style={{
        top: '-110px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    >
      <div className="font-medium text-cyan-300 mb-1">💡 Help</div>
      <div>{content}</div>
    </div>
  );
};

const ModuleConfigForm = ({ provider, moduleId, config, onConfigChange, vpcs = [] }) => {
  const [hoveredField, setHoveredField] = useState(null);
  const [advancedVisible, setAdvancedVisible] = useState(false); // 👈 ADD THIS

  const updateConfig = (field, value) => {
    onConfigChange({ ...config, [field]: value });
  };

  // Helper to render label with optional 'i' button & tooltip
  const renderLabel = (labelText, fieldKey, helpText, required = false) => (
    <label className="text-sm font-medium mb-1 flex items-center gap-1">
      {labelText}
      {required && <span className="text-red-400">*</span>}
      {helpText && (
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setHoveredField(fieldKey)}
            onMouseLeave={() => setHoveredField(null)}
            onClick={(e) => e.preventDefault()}
            className="group p-1"
            aria-label={`Help for ${labelText}`}
          >
            <Info size={14} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
          </button>
          <FieldInfoTooltip content={helpText} show={hoveredField === fieldKey} />
        </div>
      )}
    </label>
  );

  return (
    <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
      {/* === Module Title with Icon and Global Tooltip === */}
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <span className="mr-1">
          {moduleId === "compute" && <Server className="text-orange-400" />}
          {moduleId === "gke" && <Database className="text-blue-400" />}
          {moduleId === "vpc" && <Network className="text-green-400" />}
          {moduleId === "storage" && <HardDrive className="text-yellow-400" />}
        </span>
        Configure {moduleId.toUpperCase()}
        <div className="relative">
          <button
            onMouseEnter={() => setHoveredField('module')}
            onMouseLeave={() => setHoveredField(null)}
            onClick={(e) => e.stopPropagation()}
            className="group p-1"
            aria-label="Module Info"
          >
            <Info size={14} className="text-gray-400 group-hover:text-cyan-400 transition-colors" />
          </button>
          <FieldInfoTooltip
            content={{
              compute: 'Launch virtual machines. Specify machine type, image, and networking.',
              gke: 'Managed Kubernetes. Set cluster name, nodes, and machine type.',
              vpc: 'Define a private network. Configure CIDR block and subnets.',
              storage: 'Create scalable object storage. Choose storage class and location.',
            }[moduleId] || 'No info available.'}
            show={hoveredField === 'module'}
          />
        </div>
      </h3>

      {/* Resource Name */}
      {renderLabel("Resource Name", "name", "A unique name for this resource (e.g., 'web-server-prod'). Avoid spaces and special characters.", true)}
      <input
        type="text"
        value={config.name || ""}
        onChange={(e) => updateConfig("name", e.target.value)}
        placeholder={`Enter ${moduleId} name`}
        className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
      />

      {/* ===== Compute Engine ===== */}
      {moduleId === "compute" && provider === "gcp" && (
        <>
          {renderLabel("Machine Type", "machineType", "Size of the virtual machine. e2-micro = free tier; n2-standard-2 = production workloads.")}
          <select
            value={config.machineType || "e2-micro"}
            onChange={(e) => updateConfig("machineType", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="e2-micro">e2-micro (1 vCPU, 1 GB RAM)</option>
            <option value="e2-small">e2-small (1 vCPU, 2 GB RAM)</option>
            <option value="e2-medium">e2-medium (2 vCPU, 4 GB RAM)</option>
            <option value="n2-standard-2">n2-standard-2 (2 vCPU, 8 GB RAM)</option>
          </select>

          {renderLabel("Boot Disk Image", "bootDiskImage", "Operating system image for the VM. e.g., ubuntu-2204-lts, debian-12, windows-server-2022")}
          <select
            value={config.bootDiskImage || "ubuntu-2204-lts"}
            onChange={(e) => updateConfig("bootDiskImage", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="ubuntu-2204-lts">Ubuntu 22.04 LTS</option>
            <option value="debian-12">Debian 12</option>
            <option value="windows-server-2022">Windows Server 2022</option>
          </select>

          {renderLabel("Zone", "zone", "Availability zone for the VM. Must be in the selected region (e.g., us-central1-a).")}
          <select
            value={config.zone || "us-central1-a"}
            onChange={(e) => updateConfig("zone", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="us-central1-a">us-central1-a</option>
            <option value="us-central1-b">us-central1-b</option>
            <option value="us-central1-c">us-central1-c</option>
            <option value="us-central1-f">us-central1-f</option>
          </select>

          {renderLabel("VPC Network", "vpcNetwork", "Virtual Private Cloud — your private network in GCP. Use 'Default VPC' for quick setup, or select a custom one.")}
          <select
            value={config.vpcNetwork || ""}
            onChange={(e) => updateConfig("vpcNetwork", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select VPC --</option>
            <option value="default">Use Default VPC</option>
            {vpcs.map((vpc) => (
              <option key={vpc.id} value={vpc.id}>
                {vpc.name || vpc.id} (CIDR: {vpc.cidrBlock})
              </option>
            ))}
          </select>

          {renderLabel("Subnet", "subnet", "Network segment inside the VPC. Public subnets allow internet access; private ones do not.")}
          <select
            value={config.subnet || ""}
            onChange={(e) => updateConfig("subnet", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select Subnet --</option>
            {vpcs
              .filter((vpc) => vpc.id === config.vpcNetwork)
              .flatMap((vpc) => vpc.subnets || [])
              .map((subnet) => (
                <option key={subnet.id} value={subnet.id}>
                  {subnet.name || subnet.id} (Zone: {subnet.zone})
                </option>
              ))}
          </select>

          {renderLabel("External IP", "externalIp", "Assign a static external IP address to the VM. Required for internet access.")}
          <select
            value={config.externalIp || "ephemeral"}
            onChange={(e) => updateConfig("externalIp", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="ephemeral">Ephemeral IP (dynamic)</option>
            <option value="static">Static IP (reserved)</option>
          </select>

          {renderLabel("SSH Key", "sshKey", "Add your public SSH key to access the VM. Paste your public key here.")}
          <textarea
            value={config.sshKey || ""}
            onChange={(e) => updateConfig("sshKey", e.target.value)}
            placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white text-sm h-20 mb-4"
          />
        </>
      )}

      {/* ===== GKE ===== */}
      {moduleId === "gke" && provider === "gcp" && (
        <>
          {renderLabel("Cluster Name", "clusterName", "Name of your GKE cluster (e.g., 'prod-cluster'). Must be unique per region.")}
          <input
            type="text"
            value={config.clusterName || ""}
            onChange={(e) => updateConfig("clusterName", e.target.value)}
            placeholder="my-gke-cluster"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />

          {renderLabel("Node Count", "nodeCount", "Number of worker nodes in the cluster. Minimum 2 recommended for uptime.")}
          <select
            value={config.nodeCount || 2}
            onChange={(e) => updateConfig("nodeCount", parseInt(e.target.value))}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>

          {renderLabel("Machine Type", "machineType", "EC2 type for worker nodes. e2-micro = dev; n2-standard-2 = production workloads.")}
          <select
            value={config.machineType || "e2-micro"}
            onChange={(e) => updateConfig("machineType", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="e2-micro">e2-micro</option>
            <option value="e2-small">e2-small</option>
            <option value="e2-medium">e2-medium</option>
            <option value="n2-standard-2">n2-standard-2</option>
          </select>

          {renderLabel("Zone", "zone", "Availability zone for the cluster. Must be in the selected region (e.g., us-central1-a).")}
          <select
            value={config.zone || "us-central1-a"}
            onChange={(e) => updateConfig("zone", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="us-central1-a">us-central1-a</option>
            <option value="us-central1-b">us-central1-b</option>
            <option value="us-central1-c">us-central1-c</option>
            <option value="us-central1-f">us-central1-f</option>
          </select>

          {renderLabel("VPC Network", "vpcNetwork", "Virtual Private Cloud — your private network in GCP. Use 'Default VPC' for quick setup, or select a custom one.")}
          <select
            value={config.vpcNetwork || ""}
            onChange={(e) => updateConfig("vpcNetwork", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select VPC --</option>
            <option value="default">Use Default VPC</option>
            {vpcs.map((vpc) => (
              <option key={vpc.id} value={vpc.id}>
                {vpc.name || vpc.id} (CIDR: {vpc.cidrBlock})
              </option>
            ))}
          </select>

          {renderLabel("Subnet", "subnet", "Network segment inside the VPC. Public subnets allow internet access; private ones do not.")}
          <select
            value={config.subnet || ""}
            onChange={(e) => updateConfig("subnet", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select Subnet --</option>
            {vpcs
              .filter((vpc) => vpc.id === config.vpcNetwork)
              .flatMap((vpc) => vpc.subnets || [])
              .map((subnet) => (
                <option key={subnet.id} value={subnet.id}>
                  {subnet.name || subnet.id} (Zone: {subnet.zone})
                </option>
              ))}
          </select>
        </>
      )}

      {/* ===== VPC ===== */}
      {moduleId === "vpc" && provider === "gcp" && (
        <>
          {renderLabel("CIDR Block", "cidrBlock", "IP range for your VPC (e.g., 10.0.0.0/16). Must not overlap with other networks.", true)}
          <input
            type="text"
            value={config.cidrBlock || "10.0.0.0/16"}
            onChange={(e) => updateConfig("cidrBlock", e.target.value)}
            placeholder="10.0.0.0/16"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />

          {renderLabel("Subnet Count", "subnetCount", "Number of subnets to create. Minimum 2 for high availability (one per zone).", true)}
          <select
            value={config.subnetCount || 2}
            onChange={(e) => updateConfig("subnetCount", parseInt(e.target.value))}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>

          {/* Show Advanced Details Button */}
          <button
            type="button"
            onClick={() => setAdvancedVisible(!advancedVisible)}
            className="mb-4 px-4 py-2 bg-[#3a5b9b] hover:bg-[#4a6cbb] text-white rounded-md transition-colors"
          >
            {advancedVisible ? "Hide Advanced Details" : "Show Advanced Details"}
          </button>

          {/* Advanced Details Section */}
          {advancedVisible && (
            <div className="mt-4 p-4 bg-[#2A4C83] rounded-lg border border-[#3a5b9b]">
              <h4 className="text-sm font-medium mb-3">🧩 Auto-generated Resources</h4>
              {/* Subnets Preview */}
              <div className="mb-4">
                <h5 className="text-xs font-medium mb-2">Subnets ({config.subnetCount})</h5>
                <div className="space-y-2">
                  {[...Array(config.subnetCount)].map((_, i) => {
                    // Calculate CIDR based on parent CIDR
                    const parentCidr = config.cidrBlock || "10.0.0.0/16";
                    const [baseIp, prefix] = parentCidr.split('/');
                    const baseParts = baseIp.split('.').map(Number);
                    const subnetSize = 32 - (parseInt(prefix) + 8); // /24 if parent is /16
                    const subnetIp = `${baseParts[0]}.${baseParts[1]}.${i+1}.0/${parseInt(prefix) + 8}`;
                    // Get zone from real list (placeholder)
                    const zone = `us-central1-${String.fromCharCode(97 + i % 4)}`;
                    return (
                      <div key={i} className="p-2 bg-[#1E2633] rounded text-xs">
                        <span className="font-medium">Subnet {i + 1}</span> | Zone: {zone} | CIDR: {subnetIp}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Firewall Rules Preview */}
              <div>
                <h5 className="text-xs font-medium mb-2">Firewall Rules</h5>
                <div className="p-2 bg-[#1E2633] rounded text-xs">
                  <span className="font-medium">Allow HTTP/HTTPS:</span> Allows incoming traffic on ports 80 and 443.
                </div>
                <div className="p-2 bg-[#1E2633] rounded text-xs mt-1">
                  <span className="font-medium">Allow SSH:</span> Allows incoming traffic on port 22 for admin access.
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== Storage ===== */}
      {moduleId === "storage" && provider === "gcp" && (
        <>
          {renderLabel("Storage Class", "storageClass", "STANDARD = general purpose; NEARLINE = infrequent access; COLDLINE = archival (slow retrieval).")}
          <select
            value={config.storageClass || "STANDARD"}
            onChange={(e) => updateConfig("storageClass", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="STANDARD">Standard</option>
            <option value="NEARLINE">Nearline</option>
            <option value="COLDLINE">Coldline</option>
          </select>

          {renderLabel("Location Type", "locationType", "Regional = within a single region; Multi-regional = global access (higher cost).")}
          <select
            value={config.locationType || "REGIONAL"}
            onChange={(e) => updateConfig("locationType", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="REGIONAL">Regional</option>
            <option value="MULTI_REGIONAL">Multi-regional</option>
          </select>

          {renderLabel("Region", "region", "Region where the bucket will be stored. Must be in the selected region (e.g., us-central1).")}
          <select
            value={config.region || "us-central1"}
            onChange={(e) => updateConfig("region", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="us-central1">us-central1</option>
            <option value="us-east1">us-east1</option>
            <option value="us-west1">us-west1</option>
          </select>

          {renderLabel("Versioning", "versioning", "Keep older versions of files. Prevents accidental loss.")}
          <select
            value={config.versioning || "disabled"}
            onChange={(e) => updateConfig("versioning", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="disabled">Disabled</option>
            <option value="enabled">Enabled</option>
          </select>

          {renderLabel("Encryption", "encryption", "Google-managed key = free & automatic; Customer-managed key = more control & audit trail")}
          <select
            value={config.encryption || "GOOGLE_MANAGED"}
            onChange={(e) => updateConfig("encryption", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="GOOGLE_MANAGED">Google-managed key</option>
            <option value="CUSTOMER_MANAGED">Customer-managed key</option>
          </select>

          {renderLabel("Access Control", "accessControl", "Uniform = simple; Fine-grained = detailed control (more complex).")}
          <select
            value={config.accessControl || "UNIFORM"}
            onChange={(e) => updateConfig("accessControl", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="UNIFORM">Uniform</option>
            <option value="FINE_GRAINED">Fine-grained</option>
          </select>
        </>
      )}
    </div>
  );
};

export default ModuleConfigForm;
