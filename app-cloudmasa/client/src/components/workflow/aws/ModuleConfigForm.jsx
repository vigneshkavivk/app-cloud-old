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
  const [availableAZs, setAvailableAZs] = useState([]);
  const [loadingAZs, setLoadingAZs] = useState(false);

  const updateConfig = (field, value) => {
    onConfigChange({ ...config, [field]: value });
  };

  // ✅ Dynamic AWS data hooks
  const [instanceTypes, setInstanceTypes] = useState([]);
  const [loadingInstanceTypes, setLoadingInstanceTypes] = useState(false);
  const [amis, setAmis] = useState([]);
  const [loadingAmis, setLoadingAmis] = useState(false);
  const [keyPairs, setKeyPairs] = useState([]);
  const [loadingKeyPairs, setLoadingKeyPairs] = useState(false);

  // Fetch Instance Types
  useEffect(() => {
    if (moduleId === "ec2" && provider === "aws" && config.awsAccountId) {
      const fetchTypes = async () => {
        setLoadingInstanceTypes(true);
        try {
          const token = JSON.parse(localStorage.getItem('user'))?.token || '';
          const res = await fetch('/api/aws/instance-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ accountId: config.awsAccountId })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch Instance Types`);
          const data = await res.json();
          if (data.success && Array.isArray(data.instanceTypes)) {
            setInstanceTypes(data.instanceTypes);
            if (!config.instanceType && data.instanceTypes.length > 0) {
              updateConfig("instanceType", data.instanceTypes[0].name);
            }
          } else throw new Error('Invalid response format');
        } catch (err) {
          console.error("❌ Failed to fetch instance types:", err);
          setInstanceTypes([]);
          updateConfig("instanceType", "");
          alert(`Failed to load instance types: ${err.message}`);
        } finally {
          setLoadingInstanceTypes(false);
        }
      };
      fetchTypes();
    }
  }, [moduleId, provider, config.awsAccountId, config.instanceType]);

  // Fetch AMIs
  useEffect(() => {
    if (moduleId === "ec2" && provider === "aws" && config.awsAccountId) {
      const fetchAmis = async () => {
        setLoadingAmis(true);
        try {
          const token = JSON.parse(localStorage.getItem('user'))?.token || '';
          const res = await fetch('/api/aws/amis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ accountId: config.awsAccountId })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch AMIs`);
          const data = await res.json();
          if (data.success && Array.isArray(data.amis)) {
            setAmis(data.amis);
            if (!config.amiId && data.amis.length > 0) {
              updateConfig("amiId", data.amis[0].id);
            }
          } else throw new Error('Invalid response format');
        } catch (err) {
          console.error("❌ Failed to fetch AMIs:", err);
          setAmis([]);
          updateConfig("amiId", "");
        } finally {
          setLoadingAmis(false);
        }
      };
      fetchAmis();
    }
  }, [moduleId, provider, config.awsAccountId, config.amiId]);

  // Fetch Key Pairs
  useEffect(() => {
    if (moduleId === "ec2" && provider === "aws" && config.awsAccountId) {
      const fetchKeyPairs = async () => {
        setLoadingKeyPairs(true);
        try {
          const token = JSON.parse(localStorage.getItem('user'))?.token || '';
          const res = await fetch('/api/aws/key-pairs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ accountId: config.awsAccountId })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch Key Pairs`);
          const data = await res.json();
          if (data.success && Array.isArray(data.keyPairs)) {
            setKeyPairs(data.keyPairs);
            if (!config.keyName && data.keyPairs.length > 0) {
              updateConfig("keyName", data.keyPairs[0].name);
            }
          } else throw new Error('Invalid response format');
        } catch (err) {
          console.error("❌ Failed to fetch Key Pairs:", err);
          setKeyPairs([]);
          updateConfig("keyName", "");
          alert(`Failed to load Key Pairs: ${err.message}`);
        } finally {
          setLoadingKeyPairs(false);
        }
      };
      fetchKeyPairs();
    }
  }, [moduleId, provider, config.awsAccountId, config.keyName]);

  // Fetch AZs when VPC is selected and we have region info
  useEffect(() => {
    if (moduleId === "vpc" && provider === "aws" && config.awsAccountId) {
      const fetchAZs = async () => {
        setLoadingAZs(true);
        try {
          const token = JSON.parse(localStorage.getItem('user'))?.token || '';
          const res = await fetch('/api/aws/availability-zones', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              accountId: config.awsAccountId,
              region: config.region || 'us-east-1'
            })
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch AZs`);
          const data = await res.json();
          if (data.success && Array.isArray(data.availabilityZones)) {
            setAvailableAZs(data.availabilityZones);
          } else {
            throw new Error('Invalid response format');
          }
        } catch (err) {
          console.error("❌ Failed to fetch AZs:", err);
          setAvailableAZs([]);
        } finally {
          setLoadingAZs(false);
        }
      };
      fetchAZs();
    }
  }, [moduleId, provider, config.awsAccountId, config.region]);

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
          {moduleId === "ec2" && <Server className="text-orange-400" />}
          {moduleId === "s3" && <HardDrive className="text-yellow-400" />}
          {moduleId === "vpc" && <Network className="text-green-400" />}
          {moduleId === "eks" && <Database className="text-blue-400" />}
          {moduleId === "lambda" && <Code className="text-purple-400" />}
          {moduleId === "dynamodb" && <Database className="text-blue-400" />}
          {moduleId === "cloudfront" && <Globe className="text-teal-400" />}
          {moduleId === "iam" && <Lock className="text-gray-400" />}
          {moduleId === "sns" && <Terminal className="text-pink-400" />}
          {moduleId === "ecr" && <HardDrive className="text-blue-400" />}
          {moduleId === "lb" && <Network className="text-cyan-400" />}
          {moduleId === "efs" && <HardDrive className="text-emerald-400" />}
          {moduleId === "route53" && <Globe className="text-amber-400" />}
          {moduleId === "kms" && <Lock className="text-indigo-400" />}
          {moduleId === "cloudtrail" && <Terminal className="text-teal-400" />}
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
              ec2: 'Launch virtual servers. Specify instance type, AMI, and networking.',
              s3: 'Create scalable object storage. Choose storage class and versioning.',
              vpc: 'Define a private network. Configure CIDR block and subnets.',
              eks: 'Managed Kubernetes. Set cluster name, nodes, and instance type.',
              lambda: 'Serverless functions. Specify runtime, handler, and code.',
              dynamodb: 'NoSQL database. Set keys and capacity.',
              iam: 'Manage users, roles, and policies for access control.',
              sns: 'Publish messages to subscribers (email, Lambda, etc.).',
              ecr: 'Container registry. Configure mutability and scanning.',
              lb: 'Distribute traffic across targets (EC2, containers).',
              efs: 'Shared file system. Configure performance & encryption.',
              route53: 'Manage DNS records with optional health checks.',
              kms: 'Create encryption keys with rotation.',
              cloudtrail: 'Audit AWS activity across regions.',
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

      {/* ===== EC2 with Dynamic Fields ===== */}
      {moduleId === "ec2" && provider === "aws" && (
        <>
          {/* Instance Type */}
          <div className="mb-4">
            {renderLabel("Instance Type", "instanceType", "Size of the virtual server. t2.micro = free tier; m5.large = production workloads.")}
            {loadingInstanceTypes ? (
              <p className="text-gray-400 text-sm">Fetching instance types...</p>
            ) : (
              <select
                value={config.instanceType || ""}
                onChange={(e) => updateConfig("instanceType", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
                disabled={!instanceTypes.length}
              >
                <option value="">-- Select Instance Type --</option>
                {instanceTypes.map(it => (
                  <option key={it.name} value={it.name}>
                    {it.name} ({it.vCpus} vCPU, {it.memoryGiB} GiB)
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* AMI ID */}
          <div className="mb-4">
            {renderLabel("AMI ID", "amiId", "Amazon Machine Image ID — specifies the OS and software (e.g., ami-0abcdef1234567890). Find in EC2 > AMIs.")}
            {loadingAmis ? (
              <p className="text-gray-400 text-sm">Fetching AMIs...</p>
            ) : (
              <select
                value={config.amiId || ""}
                onChange={(e) => updateConfig("amiId", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
                disabled={!amis.length}
              >
                <option value="">-- Select AMI --</option>
                {amis.map(ami => (
                  <option key={ami.id} value={ami.id}>
                    {ami.name || ami.id} ({ami.os || 'Unknown OS'})
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* VPC */}
          {renderLabel("VPC", "vpcId", "Virtual Private Cloud — your private network in AWS. Use 'Default VPC' for quick setup, or select a custom one.")}
          <select
            value={config.vpcId || ""}
            onChange={(e) => updateConfig("vpcId", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select VPC --</option>
            <option value="default">Use Default VPC</option>
            {vpcs.map((vpc) => (
              <option key={vpc.id} value={vpc.id}>
                {vpc.name || vpc.id} (CIDR: {vpc.cidrBlock})
              </option>
            ))}
            <option value="use-selected-vpc">Use Selected VPC Module</option>
          </select>
          {/* Subnet & Security Group (if custom VPC) */}
          {(config.vpcId && config.vpcId !== "default" && config.vpcId !== "use-selected-vpc") && (
            <>
              {renderLabel("Subnet", "subnetId", "Network segment inside the VPC. Public subnets allow internet access; private ones do not.")}
              <select
                value={config.subnetId || ""}
                onChange={(e) => updateConfig("subnetId", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="">-- Select Subnet --</option>
                {vpcs
                  .filter((vpc) => vpc.id === config.vpcId)
                  .flatMap((vpc) => vpc.subnets || [])
                  .map((subnet) => (
                    <option key={subnet.id} value={subnet.id}>
                      {subnet.name || subnet.id} (AZ: {subnet.availabilityZone})
                    </option>
                  ))}
              </select>
              {renderLabel("Security Group", "securityGroupId", "Firewall rules — controls which ports are open (e.g., 22 for SSH, 80 for HTTP).")}
              <select
                value={config.securityGroupId || ""}
                onChange={(e) => updateConfig("securityGroupId", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="">-- Select Security Group --</option>
                {vpcs
                  .filter((vpc) => vpc.id === config.vpcId)
                  .flatMap((vpc) => vpc.securityGroups || [])
                  .map((sg) => (
                    <option key={sg.id} value={sg.id}>
                      {sg.name || sg.id}
                    </option>
                  ))}
              </select>
            </>
          )}
          {/* SSH Key Pair */}
          <div className="mb-4">
            {renderLabel("SSH Key Pair", "keyName", "Name of your existing EC2 key pair (e.g., 'my-key'). Must be created in AWS EC2 > Key Pairs first.")}
            {loadingKeyPairs ? (
              <p className="text-gray-400 text-sm">Fetching Key Pairs...</p>
            ) : (
              <select
                value={config.keyName || ""}
                onChange={(e) => updateConfig("keyName", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
                disabled={!keyPairs.length}
              >
                <option value="">-- Select Key Pair --</option>
                {keyPairs.map(kp => (
                  <option key={kp.name} value={kp.name}>
                    {kp.name} ({kp.fingerprint})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-400 mt-1">Must be an existing key pair.</p>
          </div>
        </>
      )}

      {/* Remaining modules: use static configs with tooltips (from File 1) */}
      {moduleId === "s3" && provider === "aws" && (
        <div className="space-y-4">
          {/* Storage Class */}
          {renderLabel("Storage Class", "storageClass", "STANDARD = general purpose; INTELLIGENT_TIERING = auto-cost optimize; GLACIER = low-cost archive (slow retrieval).")}
          <select
            value={config.storageClass || "STANDARD"}
            onChange={(e) => updateConfig("storageClass", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="STANDARD">Standard</option>
            <option value="INTELLIGENT_TIERING">Intelligent Tiering</option>
            <option value="GLACIER">Glacier</option>
          </select>
          {/* Versioning */}
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={config.versioning !== false}
              onChange={(e) => updateConfig("versioning", e.target.checked)}
              className="rounded text-orange-500 mr-2"
            />
            {renderLabel("Enable Versioning", "versioning", "Keep older versions of files. Prevents accidental loss.", false)}
          </div>
          {/* Encryption */}
          {renderLabel("Encryption", "encryption", "SSE-S3 = free & automatic; SSE-KMS = more control & audit trail")}
          <select
            value={config.encryption || "AES256"}
            onChange={(e) => updateConfig("encryption", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="AES256">SSE-S3 (AES-256)</option>
            <option value="aws:kms">SSE-KMS</option>
          </select>
          {/* Block Public Access */}
          <div className="mb-4">
            <div className="font-medium text-sm mb-2 flex items-center gap-1">
              Block Public Access
              <button
                type="button"
                onMouseEnter={() => setHoveredField('publicAccess')}
                onMouseLeave={() => setHoveredField(null)}
                className="group p-1"
              >
                <Info size={14} className="text-gray-400 group-hover:text-cyan-400" />
              </button>
              <FieldInfoTooltip
                content="Prevent public access. Uncheck only for static websites or public assets."
                show={hoveredField === 'publicAccess'}
              />
            </div>
            <div className="space-y-2 text-gray-300 text-xs">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.blockPublicAcls !== false}
                  onChange={(e) => updateConfig("blockPublicAcls", e.target.checked)}
                  className="mr-2 rounded text-orange-500"
                />
                Block new public ACLs
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.ignorePublicAcls !== false}
                  onChange={(e) => updateConfig("ignorePublicAcls", e.target.checked)}
                  className="mr-2 rounded text-orange-500"
                />
                Ignore existing public ACLs
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.blockPublicPolicy !== false}
                  onChange={(e) => updateConfig("blockPublicPolicy", e.target.checked)}
                  className="mr-2 rounded text-orange-500"
                />
                Block public bucket policies
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.restrictPublicBuckets !== false}
                  onChange={(e) => updateConfig("restrictPublicBuckets", e.target.checked)}
                  className="mr-2 rounded text-orange-500"
                />
                Restrict public buckets
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">✅ Default: All checked (fully private)</p>
          </div>
          {/* Tags */}
          {renderLabel("Tags (Optional)", "tags", "For cost tracking & organization. e.g., Module=Auth, Env=Prod")}
          <div className="space-y-2 mb-4">
            {(config.tags || []).map((tag, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={tag.key || ""}
                  onChange={(e) => {
                    const newTags = [...(config.tags || [])];
                    newTags[i] = { ...newTags[i], key: e.target.value };
                    updateConfig("tags", newTags);
                  }}
                  placeholder="Key"
                  className="flex-1 bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
                />
                <input
                  type="text"
                  value={tag.value || ""}
                  onChange={(e) => {
                    const newTags = [...(config.tags || [])];
                    newTags[i] = { ...newTags[i], value: e.target.value };
                    updateConfig("tags", newTags);
                  }}
                  placeholder="Value"
                  className="flex-1 bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newTags = (config.tags || []).filter((_, idx) => idx !== i);
                    updateConfig("tags", newTags);
                  }}
                  className="px-3 bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const newTags = [...(config.tags || []), { key: "", value: "" }];
                updateConfig("tags", newTags);
              }}
              className="text-cyan-400 text-sm flex items-center gap-1"
            >
              + Add Tag
            </button>
          </div>
        </div>
      )}

      {moduleId === "vpc" && provider === "aws" && (
        <>
          {/* CIDR Block */}
          {renderLabel("CIDR Block", "cidrBlock", "IP range for your VPC (e.g., 10.0.0.0/16). Must not overlap with other networks.", true)}
          <input
            type="text"
            value={config.cidrBlock || "10.0.0.0/16"}
            onChange={(e) => updateConfig("cidrBlock", e.target.value)}
            placeholder="10.0.0.0/16"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {/* Subnet Count */}
          {renderLabel("Subnet Count", "subnetCount", "Number of subnets to create. Minimum 2 for high availability (one per AZ).", true)}
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
              {/* Loading State */}
              {loadingAZs ? (
                <p className="text-gray-400 text-sm">Fetching Availability Zones...</p>
              ) : (
                <>
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
                        // Get AZ from real list
                        const az = availableAZs[i % availableAZs.length]?.name || `us-east-1${String.fromCharCode(97 + i % 4)}`;
                        return (
                          <div key={i} className="p-2 bg-[#1E2633] rounded text-xs">
                            <span className="font-medium">Subnet {i + 1}</span> | AZ: {az} | CIDR: {subnetIp}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Route Tables Preview */}
                  <div className="mb-4">
                    <h5 className="text-xs font-medium mb-2">Route Tables</h5>
                    <div className="p-2 bg-[#1E2633] rounded text-xs">
                      <span className="font-medium">Main Route Table:</span> Routes all traffic within VPC.
                    </div>
                    <div className="p-2 bg-[#1E2633] rounded text-xs mt-1">
                      <span className="font-medium">Public Route Table:</span> Routes internet-bound traffic via Internet Gateway.
                    </div>
                  </div>
                  {/* Internet Gateway Preview */}
                  <div>
                    <h5 className="text-xs font-medium mb-2">Internet Gateway</h5>
                    <div className="p-2 bg-[#1E2633] rounded text-xs">
                      <span className="font-medium">IGW:</span> Will be created and attached to the VPC for public access.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {moduleId === "cloudtrail" && provider === "aws" && (
        <>
          {renderLabel("Trail Name", "trailName", "Unique name for your CloudTrail (e.g., 'prod-audit-trail').", true)}
          <input
            type="text"
            value={config.trailName || ""}
            onChange={(e) => updateConfig("trailName", e.target.value)}
            placeholder="my-cloudtrail"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-lg p-3 text-white mb-4"
          />
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              checked={config.isMultiRegionTrail !== false}
              onChange={(e) => updateConfig("isMultiRegionTrail", e.target.checked)}
              className="mt-0.5 w-4 h-4 text-orange-500 rounded border-gray-500 bg-[#2A4C83]"
            />
            <div>
              {renderLabel("Multi-Region Trail", "multiRegion", "Log API activity across all AWS regions (not just the current one).", false)}
              <p className="text-xs text-gray-400">Log activity in all AWS regions.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              checked={config.enableLogFileValidation || false}
              onChange={(e) => updateConfig("enableLogFileValidation", e.target.checked)}
              className="mt-0.5 w-4 h-4 text-orange-500 rounded border-gray-500 bg-[#2A4C83]"
            />
            <div>
              {renderLabel("Enable Log File Validation", "logValidation", "Creates cryptographically signed digest files to verify log integrity.", false)}
              <p className="text-xs text-gray-400">Creates signed digest files for integrity verification.</p>
            </div>
          </div>
          {renderLabel("S3 Bucket Name (Optional)", "s3Bucket", "Name of an existing bucket to store logs. Leave blank to auto-create a secure one.")}
          <input
            type="text"
            value={config.s3BucketName || ""}
            onChange={(e) => updateConfig("s3BucketName", e.target.value)}
            placeholder="Leave empty to auto-create"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-lg p-3 text-white mb-4"
          />
        </>
      )}

      {moduleId === "lb" && provider === "aws" && (
        <>
          {renderLabel("Load Balancer Type", "lbType", "ALB = HTTP/HTTPS apps; NLB = high-performance TCP/UDP; GWLB = traffic inspection.", true)}
          <select
            value={config.lbType || "alb"}
            onChange={(e) => updateConfig("lbType", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="alb">Application Load Balancer (ALB)</option>
            <option value="nlb">Network Load Balancer (NLB)</option>
            <option value="gwlb">Gateway Load Balancer (GWLB)</option>
          </select>
          {renderLabel("Target Port", "targetPort", "Port your application listens on (e.g., 80 for web, 3000 for Node.js).")}
          <input
            type="number"
            min="1"
            max="65535"
            value={config.targetPort || 80}
            onChange={(e) => updateConfig("targetPort", parseInt(e.target.value, 10) || 80)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {config.lbType === "alb" && (
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={!!config.enableHttps}
                onChange={(e) => updateConfig("enableHttps", e.target.checked)}
                className="h-4 w-4 rounded text-orange-500 border-[#3a5b9b] bg-[#2A4C83]"
              />
              {renderLabel("Enable HTTPS", "https", "Terminate SSL/TLS at the load balancer using an ACM certificate.", false)}
            </div>
          )}
          {config.enableHttps && (
            <>
              {renderLabel("ACM Certificate ARN", "certArn", "ARN of a valid SSL certificate from AWS Certificate Manager (ACM), in the same region.", true)}
              <input
                type="text"
                value={config.certificateArn || ""}
                onChange={(e) => updateConfig("certificateArn", e.target.value.trim())}
                placeholder="arn:aws:acm:region:account:certificate/uuid"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
                required
              />
            </>
          )}
          {renderLabel("VPC", "vpcIdLb", "VPC where the load balancer will be deployed. Must have at least two subnets in different AZs.", true)}
          <select
            value={config.vpcId || ""}
            onChange={(e) => updateConfig("vpcId", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select VPC --</option>
            {vpcs.map((vpc) => (
              <option key={vpc.id} value={vpc.id}>
                {vpc.name ? `${vpc.name} (${vpc.id})` : vpc.id} — CIDR: {vpc.cidrBlock}
              </option>
            ))}
          </select>
          {config.vpcId && (
            <>
              {renderLabel("Subnets", "subnets", "Select ≥2 subnets in different Availability Zones for high availability.", true)}
              <select
                multiple
                value={config.subnets || []}
                onChange={(e) =>
                  updateConfig("subnets", Array.from(e.target.selectedOptions, (opt) => opt.value))
                }
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white h-28 mb-4"
              >
                {vpcs
                  .find((vpc) => vpc.id === config.vpcId)
                  ?.subnets?.map((subnet) => (
                    <option key={subnet.id} value={subnet.id}>
                      {subnet.name || subnet.id} — AZ: {subnet.availabilityZone}
                    </option>
                  )) || []}
              </select>
            </>
          )}
        </>
      )}

      {moduleId === "efs" && provider === "aws" && (
        <>
          {renderLabel("File System Name", "efsName", "Human-readable name for your EFS (e.g., 'app-logs-efs').", true)}
          <input
            type="text"
            value={config.name || ""}
            onChange={(e) => updateConfig("name", e.target.value)}
            placeholder="my-efs-file-system"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {renderLabel("Performance Mode", "perfMode", "General Purpose = standard workloads; Max I/O = large-scale parallel access (e.g., big data).")}
          <select
            value={config.performanceMode || "generalPurpose"}
            onChange={(e) => updateConfig("performanceMode", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="generalPurpose">General Purpose</option>
            <option value="maxIO">Max I/O</option>
          </select>
          {renderLabel("Throughput Mode", "throughput", "Bursting = pay per use (good for dev); Provisioned = fixed high speed (for production).")}
          <select
            value={config.throughputMode || "provisioned"}
            onChange={(e) => updateConfig("throughputMode", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="provisioned">Provisioned</option>
            <option value="bursting">Bursting</option>
          </select>
          {config.throughputMode === "provisioned" && (
            <>
              {renderLabel("Provisioned Throughput (MiB/s)", "provThroughput", "Fixed throughput speed. 1 MiB/s = ~1.05 MB/s. Range: 1–1024.")}
              <input
                type="number"
                value={config.provisionedThroughput || 100}
                onChange={(e) => updateConfig("provisionedThroughput", parseInt(e.target.value) || 100)}
                min="1"
                max="1024"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
            </>
          )}
          <div className="flex items-center mt-2 mb-4">
            <input
              type="checkbox"
              checked={config.encrypted !== false}
              onChange={(e) => updateConfig("encrypted", e.target.checked)}
              className="rounded text-orange-500"
            />
            {renderLabel("Encrypt File System", "efsEncrypt", "Encrypts data at rest using AWS KMS. Recommended for production.", false)}
          </div>
          {renderLabel("Environment Tag", "env", "Used for tagging and filtering (e.g., 'dev', 'staging', 'prod').")}
          <select
            value={config.environment || "prod"}
            onChange={(e) => updateConfig("environment", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="prod">Production</option>
          </select>
        </>
      )}

      {moduleId === "route53" && provider === "aws" && (
        <>
          {renderLabel("Domain Name (Hosted Zone)", "domain", "Must match an existing public hosted zone in Route 53 (e.g., 'example.com').", true)}
          <input
            type="text"
            value={config.domainName || ""}
            onChange={(e) => updateConfig("domainName", e.target.value.toLowerCase().trim())}
            placeholder="example.com"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {renderLabel("Record Name", "recordName", "Subdomain (e.g., 'www', 'api'). Leave blank for root domain (@).")}
          <input
            type="text"
            value={config.recordName || ""}
            onChange={(e) => updateConfig("recordName", e.target.value.toLowerCase().trim())}
            placeholder="www, app, or leave blank for root (@)"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {renderLabel("Record Type", "recordType", "A = IPv4; AAAA = IPv6; CNAME = alias (cannot use for root domain).", true)}
          <select
            value={config.recordType || "A"}
            onChange={(e) => updateConfig("recordType", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="A">A — IPv4 Address</option>
            <option value="AAAA">AAAA — IPv6 Address</option>
            <option value="CNAME">CNAME — Alias (not for root)</option>
          </select>
          {renderLabel(
            config.recordType === "CNAME" ? "CNAME Target" : "Alias Target",
            "target",
            config.recordType === "CNAME"
              ? "Domain name to point to (e.g., app.example.com)."
              : "ALB/NLB DNS name (e.g., my-alb-123.elb.us-east-1.amazonaws.com). Route 53 creates a free alias.",
            true
          )}
          <input
            type="text"
            value={config.target || ""}
            onChange={(e) => updateConfig("target", e.target.value.trim())}
            placeholder={
              config.recordType === "CNAME"
                ? "app.example.com"
                : "my-alb-123.elb.us-east-1.amazonaws.com"
            }
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
            required
          />
          {renderLabel("Routing Policy", "routing", "Simple = basic; Weighted = split traffic by %; Latency = route to lowest-latency region.")}
          <select
            value={config.routingPolicy || "simple"}
            onChange={(e) => updateConfig("routingPolicy", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="simple">Simple</option>
            <option value="weighted">Weighted</option>
            <option value="latency">Latency-Based</option>
          </select>
          {config.routingPolicy === "weighted" && (
            <>
              {renderLabel("Weight (0–255)", "weight", "Higher weight = more traffic. Total weight across records determines % share.")}
              <input
                type="number"
                min="0"
                max="255"
                value={config.weight != null ? config.weight : 100}
                onChange={(e) => updateConfig("weight", Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)))}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
            </>
          )}
          {config.routingPolicy === "latency" && (
            <>
              {renderLabel("Latency Region", "latencyRegion", "Choose the AWS region closest to your users (e.g., ap-southeast-1 = Singapore).")}
              <select
                value={config.region || "us-east-1"}
                onChange={(e) => updateConfig("region", e.target.value)}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              </select>
            </>
          )}
          <div className="flex items-start mb-4">
            <input
              type="checkbox"
              checked={!!config.enableHealthCheck}
              onChange={(e) => updateConfig("enableHealthCheck", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-orange-500 border-[#3a5b9b] bg-[#2A4C83]"
            />
            <div>
              {renderLabel("Enable Health Check", "healthCheck", "Route 53 will periodically ping the endpoint and stop routing to unhealthy ones.", false)}
              <p className="text-xs text-gray-400 mt-0.5">Route 53 will monitor endpoint health.</p>
            </div>
          </div>
          {config.enableHealthCheck && (
            <>
              {renderLabel("Health Check Endpoint URL", "healthUrl", "Full URL Route 53 will call (e.g., https://app.example.com/health). Must return HTTP 200.", true)}
              <input
                type="url"
                value={config.healthCheckUrl || ""}
                onChange={(e) => updateConfig("healthCheckUrl", e.target.value.trim())}
                placeholder="https://app.example.com/health"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
                required
              />
            </>
          )}
        </>
      )}

      {moduleId === "kms" && provider === "aws" && (
        <>
          {renderLabel("KMS Key Alias", "kmsAlias", "Short name for your key (e.g., 'db-key'). Full ARN will be alias/my-app-key. Must be unique.", true)}
          <input
            type="text"
            value={config.alias || ""}
            onChange={(e) => {
              let val = e.target.value.toLowerCase();
              val = val.replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
              updateConfig("alias", val);
            }}
            placeholder="my-app-key"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={config.enableKeyRotation !== false}
              onChange={(e) => updateConfig("enableKeyRotation", e.target.checked)}
              className="h-4 w-4 rounded text-orange-500 border-[#3a5b9b] bg-[#2A4C83]"
            />
            {renderLabel("Enable automatic annual rotation", "keyRotation", "AWS will automatically rotate the key every year for security compliance.", false)}
          </div>
          {renderLabel("Description", "kmsDesc", "Brief description of what this key protects (e.g., 'Encrypts EFS and RDS data').")}
          <textarea
            value={config.description || "KMS key for encrypting cloud resources"}
            onChange={(e) => updateConfig("description", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white text-sm mb-4"
            rows="2"
          />
        </>
      )}

      {moduleId === "eks" && provider === "aws" && (
        <>
          {renderLabel("Cluster Name", "clusterName", "Name of your EKS cluster (e.g., 'prod-cluster'). Must be unique per region.")}
          <input
            type="text"
            value={config.clusterName || ""}
            onChange={(e) => updateConfig("clusterName", e.target.value)}
            placeholder="my-eks-cluster"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {renderLabel("Node Count", "nodeCount", "Number of EC2 instances in the node group. Minimum 2 recommended for uptime.")}
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
          {renderLabel("Instance Type", "eksInstance", "EC2 type for worker nodes. t3.medium = dev; m5.large = production workloads.")}
          <select
            value={config.instanceType || "t3.medium"}
            onChange={(e) => updateConfig("instanceType", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="t3.medium">t3.medium</option>
            <option value="t3.large">t3.large</option>
            <option value="m5.large">m5.large</option>
          </select>
        </>
      )}

      {moduleId === "ecr" && provider === "aws" && (
        <>
          <div className="flex items-start space-x-2 mb-4">
            <input
              type="checkbox"
              checked={config.autoCreateIAM !== false}
              onChange={(e) => updateConfig("autoCreateIAM", e.target.checked)}
              className="mt-1 rounded text-orange-500"
            />
            <div>
              {renderLabel("Auto-create IAM role", "ecrIAM", "Creates a role with push/pull permissions for this repository.", false)}
              <p className="text-xs text-gray-400">Grants push/pull access.</p>
            </div>
          </div>
          {renderLabel("Image Tag Mutability", "mutability", "Mutable = tags can be overwritten; Immutable = prevents accidental overwrites (recommended).")}
          <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`mutability-${moduleId}`}
                checked={config.imageTagMutability === 'MUTABLE'}
                onChange={() => updateConfig("imageTagMutability", 'MUTABLE')}
                className="mr-2"
              />
              Mutable
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`mutability-${moduleId}`}
                checked={config.imageTagMutability === 'IMMUTABLE'}
                onChange={() => updateConfig("imageTagMutability", 'IMMUTABLE')}
                className="mr-2"
              />
              Immutable
            </label>
          </div>
          <div className="flex items-center mt-2 mb-4">
            <input
              type="checkbox"
              checked={config.scanOnPush !== false}
              onChange={(e) => updateConfig("scanOnPush", e.target.checked)}
              className="rounded text-orange-500"
            />
            {renderLabel("Enable scan on push", "scan", "Scans container images for vulnerabilities when pushed to ECR (uses Amazon ECR Scan).", false)}
          </div>
        </>
      )}

      {moduleId === "dynamodb" && provider === "aws" && (
        <>
          {renderLabel("Environment Tag", "ddbEnv", "Used for tagging and cost allocation (e.g., 'dev', 'staging', 'prod').")}
          <select
            value={config.environment || "prod"}
            onChange={(e) => updateConfig("environment", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="prod">Production</option>
          </select>
        </>
      )}

      {moduleId === "lambda" && provider === "aws" && (
        <>
          {renderLabel("Runtime", "runtime", "Programming language and version (e.g., Python 3.9, Node.js 18).")}
          <select
            value={config.runtime || ""}
            onChange={(e) => updateConfig("runtime", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="">-- Select Runtime --</option>
            <option value="python3.9">Python 3.9</option>
            <option value="nodejs18.x">Node.js 18.x</option>
            <option value="java17">Java 17</option>
            <option value="dotnet6">.NET 6</option>
          </select>
          {renderLabel("Handler", "handler", "Function entry point: filename.functionName (e.g., 'lambda_function.lambda_handler' for Python).")}
          <input
            type="text"
            value={config.handler || "lambda_function.lambda_handler"}
            onChange={(e) => updateConfig("handler", e.target.value)}
            placeholder="lambda_function.lambda_handler"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
        </>
      )}

      {moduleId === "sns" && provider === "aws" && (
        <>
          {renderLabel("Display Name", "snsName", "Friendly name shown in notifications (e.g., 'MyApp Alerts').")}
          <input
            type="text"
            value={config.displayName || ""}
            onChange={(e) => updateConfig("displayName", e.target.value)}
            placeholder="MyProject Alert Notifications"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {renderLabel("Email Subscription", "email", "Email address to subscribe to this topic. Confirmation email will be sent.")}
          <input
            type="email"
            value={config.emailSubscription || ""}
            onChange={(e) => updateConfig("emailSubscription", e.target.value)}
            placeholder="Enter email address (e.g., company@example.com)"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
        </>
      )}

      {moduleId === "iam" && provider === "aws" && (
        <>
          {renderLabel("Resource Type", "iamType", "User = long-term credentials; Role = temporary credentials for services/apps.", false)}
          <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="iamType"
                checked={config.create_user === true}
                onChange={() => updateConfig("create_user", true)}
                className="mr-2"
              />
              User
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="iamType"
                checked={config.create_role === true}
                onChange={() => updateConfig("create_role", true)}
                className="mr-2"
              />
              Role
            </label>
          </div>
          {config.create_user && (
            <>
              {renderLabel("User Name", "userName", "Login name for the IAM user (e.g., 'ci-cd-bot').", true)}
              <input
                type="text"
                value={config.user_name || ""}
                onChange={(e) => updateConfig("user_name", e.target.value)}
                placeholder="my-user"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("User Path", "userPath", "Organizational path (e.g., /engineering/dev/). Optional but helpful for filtering.")}
              <input
                type="text"
                value={config.user_path || "/"}
                onChange={(e) => updateConfig("user_path", e.target.value)}
                placeholder="/path/to/user/"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              <div className="flex items-start gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={config.create_access_key !== false}
                  onChange={(e) => updateConfig("create_access_key", e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-orange-500 rounded border-gray-500 bg-[#2A4C83]"
                />
                <div>
                  {renderLabel("Create Access Key", "accessKey", "Generates AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for programmatic access.", false)}
                  <p className="text-xs text-gray-400">Generate an access key pair for this user.</p>
                </div>
              </div>
            </>
          )}
          {config.create_role && (
            <>
              {renderLabel("Role Name", "roleName", "Name of the IAM role (e.g., 'lambda-execution-role').", true)}
              <input
                type="text"
                value={config.role_name || ""}
                onChange={(e) => updateConfig("role_name", e.target.value)}
                placeholder="my-role"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Role Path", "rolePath", "Organizational path (e.g., /service/lambda/). Optional.")}
              <input
                type="text"
                value={config.role_path || "/"}
                onChange={(e) => updateConfig("role_path", e.target.value)}
                placeholder="/path/to/role/"
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
              />
              {renderLabel("Assume Role Policy (JSON)", "assumePolicy", "Defines who (service/user) can assume this role. Example: EC2, Lambda, or another AWS account.", true)}
              <textarea
                value={config.assume_role_policy || ""}
                onChange={(e) => updateConfig("assume_role_policy", e.target.value)}
                placeholder={`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ec2.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}`}
                className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white text-sm h-28 mb-4"
              />
            </>
          )}
          {renderLabel("Inline Policy (JSON)", "inlinePolicy", "Permissions this user/role has (e.g., read S3, invoke Lambda). Be least-privilege.", false)}
          <textarea
            value={config.policy_document || ""}
            onChange={(e) => updateConfig("policy_document", e.target.value)}
            placeholder={`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}`}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white text-sm h-28 mb-4"
          />
          {renderLabel("Environment Tag", "iamEnv", "Tag for filtering and cost tracking (e.g., 'prod', 'dev').")}
          <select
            value={config.environment || "prod"}
            onChange={(e) => updateConfig("environment", e.target.value)}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value="dev">Development</option>
            <option value="staging">Staging</option>
            <option value="prod">Production</option>
          </select>
        </>
      )}

      {moduleId === "cloudwatch" && (
        <>
          {renderLabel("Log Group Name", "logGroup", "Container for log streams (e.g., /aws/lambda/my-function). Must be unique.", true)}
          <input
            type="text"
            value={config.logGroupName || ""}
            onChange={(e) => updateConfig("logGroupName", e.target.value)}
            placeholder="my-app-logs"
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
          {renderLabel("Retention Period (Days)", "retention", "How long logs are kept. 0 = never expire. 14 days = default.")}
          <select
            value={config.retentionInDays || 14}
            onChange={(e) => updateConfig("retentionInDays", parseInt(e.target.value))}
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          >
            <option value={1}>1 Day</option>
            <option value={3}>3 Days</option>
            <option value={7}>1 Week</option>
            <option value={14}>2 Weeks (Default)</option>
            <option value={30}>1 Month</option>
            <option value={60}>2 Months</option>
            <option value={90}>3 Months</option>
            <option value={180}>6 Months</option>
            <option value={365}>1 Year</option>
            <option value={0}>Never Delete</option>
          </select>
          {renderLabel("KMS Key ID (Optional)", "kmsLog", "ARN of a KMS key to encrypt log data at rest. Leave blank for AWS-managed key.")}
          <input
            type="text"
            value={config.kmsKeyId || ""}
            onChange={(e) => updateConfig("kmsKeyId", e.target.value)}
            placeholder="arn:aws:kms:region:account:key/..."
            className="w-full bg-[#2A4C83] border border-[#3a5b9b] rounded-md p-2 text-white mb-4"
          />
        </>
      )}
    </div>
  );
};

export default ModuleConfigForm;
