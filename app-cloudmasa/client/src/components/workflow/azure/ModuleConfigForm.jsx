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
          {moduleId === "vm" && <Server className="text-orange-400" />}
          {moduleId === "aks" && <Database className="text-blue-400" />}
          {moduleId === "vnet" && <Network className="text-green-400" />}
          {moduleId === "blob" && <HardDrive className="text-yellow-400" />}
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
              vm: 'Launch virtual machines. Specify size, image, and networking.',
              aks: 'Managed Kubernetes. Set cluster name, nodes, and size.',
              vnet: 'Define a private network. Configure CIDR block and subnets.',
              blob: 'Create scalable object storage. Choose storage tier and redundancy.',
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

      {/* ===== Virtual Machine ===== */}
      {moduleId === "vm" && provider === "azure" && (
        <>
          {renderLabel("VM Size", "vmSize", "Size of the virtual machine. Standard_B1s = free tier; Standard_D2s_v3 = production workloads.")}
          <select
            value={config.vmSize || "Standard_B1s"}
            onChange={(e) => updateConfig("vmSize", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="Standard_B1s">Standard_B1s (1 vCPU, 1 GB RAM)</option>
            <option value="Standard_B2s">Standard_B2s (2 vCPU, 4 GB RAM)</option>
            <option value="Standard_D2s_v3">Standard_D2s_v3 (2 vCPU, 8 GB RAM)</option>
          </select>

          {renderLabel("OS Image", "osImage", "Operating system image for the VM. e.g., Ubuntu 22.04-LTS, Windows Server 2022, CentOS 8.4")}
          <select
            value={config.osImage || "Ubuntu 22.04-LTS"}
            onChange={(e) => updateConfig("osImage", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="Ubuntu 22.04-LTS">Ubuntu 22.04 LTS</option>
            <option value="Windows Server 2022">Windows Server 2022</option>
            <option value="CentOS 8.4">CentOS 8.4</option>
          </select>

          {renderLabel("Region", "region", "Region where the VM will be deployed. Must be in the selected region (e.g., eastus).")}
          <select
            value={config.region || "eastus"}
            onChange={(e) => updateConfig("region", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="eastus">East US</option>
            <option value="westeurope">West Europe</option>
            <option value="southeastasia">Southeast Asia</option>
            <option value="brazilsouth">Brazil South</option>
          </select>

          {renderLabel("VNet", "vnet", "Virtual Network — your private network in Azure. Use 'Default VNet' for quick setup, or select a custom one.")}
          <select
            value={config.vnet || ""}
            onChange={(e) => updateConfig("vnet", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select VNet --</option>
            <option value="default">Use Default VNet</option>
            {vpcs.map((vpc) => (
              <option key={vpc.id} value={vpc.id}>
                {vpc.name || vpc.id} (CIDR: {vpc.cidrBlock})
              </option>
            ))}
          </select>

          {renderLabel("Subnet", "subnet", "Network segment inside the VNet. Public subnets allow internet access; private ones do not.")}
          <select
            value={config.subnet || ""}
            onChange={(e) => updateConfig("subnet", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select Subnet --</option>
            {vpcs
              .filter((vpc) => vpc.id === config.vnet)
              .flatMap((vpc) => vpc.subnets || [])
              .map((subnet) => (
                <option key={subnet.id} value={subnet.id}>
                  {subnet.name || subnet.id} (Zone: {subnet.zone})
                </option>
              ))}
          </select>

          {renderLabel("Public IP", "publicIp", "Assign a static public IP address to the VM. Required for internet access.")}
          <select
            value={config.publicIp || "dynamic"}
            onChange={(e) => updateConfig("publicIp", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="dynamic">Dynamic IP</option>
            <option value="static">Static IP</option>
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

      {/* ===== AKS ===== */}
      {moduleId === "aks" && provider === "azure" && (
        <>
          {renderLabel("Cluster Name", "clusterName", "Name of your AKS cluster (e.g., 'prod-cluster'). Must be unique per region.")}
          <input
            type="text"
            value={config.clusterName || ""}
            onChange={(e) => updateConfig("clusterName", e.target.value)}
            placeholder="my-aks-cluster"
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

          {renderLabel("VM Size", "vmSize", "Size of the worker nodes. Standard_B2s = dev; Standard_D2s_v3 = production workloads.")}
          <select
            value={config.vmSize || "Standard_B2s"}
            onChange={(e) => updateConfig("vmSize", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="Standard_B2s">Standard_B2s</option>
            <option value="Standard_B4s">Standard_B4s</option>
            <option value="Standard_D2s_v3">Standard_D2s_v3</option>
          </select>

          {renderLabel("Region", "region", "Region where the cluster will be deployed. Must be in the selected region (e.g., eastus).")}
          <select
            value={config.region || "eastus"}
            onChange={(e) => updateConfig("region", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="eastus">East US</option>
            <option value="westeurope">West Europe</option>
            <option value="southeastasia">Southeast Asia</option>
            <option value="brazilsouth">Brazil South</option>
          </select>

          {renderLabel("VNet", "vnet", "Virtual Network — your private network in Azure. Use 'Default VNet' for quick setup, or select a custom one.")}
          <select
            value={config.vnet || ""}
            onChange={(e) => updateConfig("vnet", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select VNet --</option>
            <option value="default">Use Default VNet</option>
            {vpcs.map((vpc) => (
              <option key={vpc.id} value={vpc.id}>
                {vpc.name || vpc.id} (CIDR: {vpc.cidrBlock})
              </option>
            ))}
          </select>

          {renderLabel("Subnet", "subnet", "Network segment inside the VNet. Public subnets allow internet access; private ones do not.")}
          <select
            value={config.subnet || ""}
            onChange={(e) => updateConfig("subnet", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select Subnet --</option>
            {vpcs
              .filter((vpc) => vpc.id === config.vnet)
              .flatMap((vpc) => vpc.subnets || [])
              .map((subnet) => (
                <option key={subnet.id} value={subnet.id}>
                  {subnet.name || subnet.id} (Zone: {subnet.zone})
                </option>
              ))}
          </select>
        </>
      )}

      {/* ===== VNet ===== */}
      {moduleId === "vnet" && provider === "azure" && (
        <>
          {renderLabel("CIDR Block", "cidrBlock", "IP range for your VNet (e.g., 10.0.0.0/16). Must not overlap with other networks.", true)}
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
                    const zone = `eastus-${i + 1}`;
                    return (
                      <div key={i} className="p-2 bg-[#1E2633] rounded text-xs">
                        <span className="font-medium">Subnet {i + 1}</span> | Zone: {zone} | CIDR: {subnetIp}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Network Security Group Preview */}
              <div>
                <h5 className="text-xs font-medium mb-2">Network Security Group</h5>
                <div className="p-2 bg-[#1E2633] rounded text-xs">
                  <span className="font-medium">Allow HTTP/HTTPS:</span> Allows incoming traffic on ports 80 and 443.
                </div>
                <div className="p-2 bg-[#1E2633] rounded text-xs mt-1">
                  <span className="font-medium">Allow SSH/RDP:</span> Allows incoming traffic on ports 22 (SSH) and 3389 (RDP).
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== Blob Storage ===== */}
      {moduleId === "blob" && provider === "azure" && (
        <>
          {renderLabel("Storage Tier", "storageTier", "Hot = frequently accessed; Cool = infrequently accessed; Archive = archival (slow retrieval).")}
          <select
            value={config.storageTier || "Hot"}
            onChange={(e) => updateConfig("storageTier", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="Hot">Hot</option>
            <option value="Cool">Cool</option>
            <option value="Archive">Archive</option>
          </select>

          {renderLabel("Redundancy", "redundancy", "LRS = locally redundant; ZRS = zone redundant; GRS = geo-redundant (highest cost).")}
          <select
            value={config.redundancy || "LRS"}
            onChange={(e) => updateConfig("redundancy", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="LRS">Locally Redundant (LRS)</option>
            <option value="ZRS">Zone Redundant (ZRS)</option>
            <option value="GRS">Geo-Redundant (GRS)</option>
          </select>

          {renderLabel("Region", "region", "Region where the storage account will be created. Must be in the selected region (e.g., eastus).")}
          <select
            value={config.region || "eastus"}
            onChange={(e) => updateConfig("region", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="eastus">East US</option>
            <option value="westeurope">West Europe</option>
            <option value="southeastasia">Southeast Asia</option>
            <option value="brazilsouth">Brazil South</option>
          </select>

          {renderLabel("Access Key", "accessKey", "Generate a storage account access key for programmatic access. This key will be displayed once and cannot be retrieved later.")}
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={config.generateAccessKey !== false}
              onChange={(e) => updateConfig("generateAccessKey", e.target.checked)}
              className="rounded text-orange-500 mr-2"
            />
            {renderLabel("Generate Access Key", "accessKey", "Generates a primary and secondary access key for this storage account.", false)}
          </div>

          {renderLabel("Encryption", "encryption", "Microsoft-managed key = free & automatic; Customer-managed key = more control & audit trail")}
          <select
            value={config.encryption || "Microsoft-managed"}
            onChange={(e) => updateConfig("encryption", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="Microsoft-managed">Microsoft-managed key</option>
            <option value="Customer-managed">Customer-managed key</option>
          </select>

          {renderLabel("Access Control", "accessControl", "RBAC = role-based access; Shared Key = access via account key (legacy).")}
          <select
            value={config.accessControl || "RBAC"}
            onChange={(e) => updateConfig("accessControl", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="RBAC">RBAC</option>
            <option value="Shared Key">Shared Key</option>
          </select>
        </>
      )}
    </div>
  );
};

export default ModuleConfigForm;
