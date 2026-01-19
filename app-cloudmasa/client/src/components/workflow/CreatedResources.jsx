// src/components/workflow/CreatedResources.jsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Eye, Trash2, X, Copy, AlertTriangle } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const MODULE_ICONS = {
  vpc: { icon: 'VPC', color: 'bg-green-500/20 text-green-400', label: 'VPC Network' },
  s3: { icon: 'S3', color: 'bg-yellow-500/20 text-yellow-400', label: 'S3 Bucket' },
  dynamodb: { icon: 'DDB', color: 'bg-purple-500/20 text-purple-400', label: 'DynamoDB Table' },
  ec2: { icon: 'EC2', color: 'bg-blue-500/20 text-blue-400', label: 'EC2 Instance' },
  lambda: { icon: 'LMB', color: 'bg-red-500/20 text-red-400', label: 'Lambda Function' },
  ecr: { icon: 'ECR', color: 'bg-blue-600/30 text-blue-300', label: 'ECR Repository' },
  sns: { icon: 'SNS', color: 'bg-pink-500/20 text-pink-400', label: 'SNS Topic' },
  lb: { icon: 'LB', color: 'bg-cyan-500/20 text-cyan-400', label: 'Load Balancer' },
  kms: { icon: 'KMS', color: 'bg-amber-500/20 text-amber-400', label: 'KMS Key' },
  iam: { icon: 'IAM', color: 'bg-amber-500/20 text-amber-400', label: 'IAM Role' },
  route53: { icon: 'R53', color: 'bg-orange-500/20 text-orange-400', label: 'Route53 Record' },
  cloudwatch: { icon: 'CW', color: 'bg-indigo-500/20 text-indigo-400', label: 'CloudWatch Log' },
  cloudfront: { icon: 'CF', color: 'bg-indigo-500/20 text-indigo-400', label: 'CloudFront' },
  efs: { icon: 'EFS', color: 'bg-indigo-500/20 text-indigo-400', label: 'EFS Data' },
  cloudtrail: { icon: 'CT', color: 'bg-indigo-500/20 text-indigo-400', label: 'CloudTrail Record' },
  default: { icon: '?', color: 'bg-gray-500/20 text-gray-400', label: 'Module' }
};

const getModuleDisplayName = (dep) => {
  const config = dep.moduleConfig;
  const firstModule = dep.modules?.[0];
  if (!firstModule || !config?.[firstModule]) return `Untitled ${firstModule || 'Resource'}`;
  const cfg = config[firstModule];
  switch (firstModule) {
    case 'vpc': return cfg.name || 'My VPC';
    case 's3': return cfg.name || 'My Bucket';
    case 'dynamodb': return cfg.name || 'My Table';
    case 'ec2': return cfg.name || 'My EC2 Instance';
    case 'lambda': return cfg.functionName || 'My Lambda Function';
    case 'ecr': return cfg.name || 'My ECR Repository';
    case 'sns': return cfg.name || 'My SNS Topic';
    case 'kms': return cfg.alias || 'My KMS Key';
    case 'iam': return cfg.name || 'My IAM Role';
    case 'efs': return cfg.name || 'My EFS Data';
    case 'lb': return cfg.name || 'My LoadBalancer';
    case 'route53': return cfg.domainName || cfg.recordName || 'My DNS Record';
    case 'cloudwatch': return cfg.logGroupName || 'My Log Group';
    case 'cloudfront': return cfg.name || 'My cloudfront';
    case 'cloudtrail': return cfg.name || 'My cloudtrail';
    default: return `${cfg.name || firstModule}`;
  }
};

const CreatedResources = () => {
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [destroyingDeploymentId, setDestroyingDeploymentId] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) throw new Error('No session');
        const user = JSON.parse(rawUser);
        const token = user?.token;

        const res = await fetch('/api/terraform/resources', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
          alert('Session expired');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        const data = await res.json();
        if (data.success) {
          // ✅ Directly use deployments array — no manual grouping!
          const deployments = data.deployments || [];

          // Sort: ECR first, then reverse-chronological
          const sortedDeployments = deployments.sort((a, b) => {
            const aIsEcr = a.modules.includes('ecr');
            const bIsEcr = b.modules.includes('ecr');
            if (aIsEcr && !bIsEcr) return -1;
            if (!aIsEcr && bIsEcr) return 1;
            return b.createdAt - a.createdAt;
          });

          setDeployments(sortedDeployments);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [navigate]);

  const handleDestroy = async (dep) => {
    const name = getModuleDisplayName(dep);
    if (!window.confirm(`⚠️ Destroy entire deployment?\n\n"${name}"\n\nThis will delete ALL resources in this deployment.\nThis action cannot be undone!`)) {
      return;
    }

    setDestroyingDeploymentId(dep.deploymentId);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user?.token;

      const res = await fetch('/api/terraform/destroy-deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ deploymentId: dep.deploymentId })
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Deployment destroyed successfully!");
        setDeployments(prev => prev.filter(d => d.deploymentId !== dep.deploymentId));
        if (selectedDeployment?.deploymentId === dep.deploymentId) {
          setSelectedDeployment(null);
        }
      } else {
        alert("❌ Destroy failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Network error during destroy");
    } finally {
      setDestroyingDeploymentId(null);
    }
  };

  const copyToClipboard = (text, label = '') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label || text);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // 🔑 Core: Render resource-specific details
  const renderResourceDetails = (resource) => {
    const { type, attributes = {} } = resource;

    const renderTag = (value, label, color = 'bg-blue-900/40') => (
      <span className={`${color} px-1.5 py-0.5 rounded text-xs font-mono`}>
        {value}
      </span>
    );

    switch (type) {
      case 'aws_instance': // EC2
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">OS / AMI</span>
              <span>{attributes.ami_description || attributes.ami_id || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Instance Type</span>
              <span>{attributes.instance_type}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Public IP</span>
              <span className="flex items-center gap-1">
                {attributes.public_ip || '—'}
                {attributes.public_ip && (
                  <Button size="xs" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyToClipboard(attributes.public_ip, 'public_ip')}>
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Private IP</span>
              <span className="flex items-center gap-1">
                {attributes.private_ip}
                <Button size="xs" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyToClipboard(attributes.private_ip, 'private_ip')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Security Groups</span>
              <div className="flex flex-wrap gap-1">
                {(attributes.vpc_security_group_ids || attributes.security_groups || []).map((sgId, i) => {
                  const sgName = attributes.security_group_names?.[sgId] || attributes.security_group_descriptions?.[sgId] || sgId;
                  return renderTag(sgName, `sg-${i}`, 'bg-red-900/40');
                })}
                {(!attributes.security_groups?.length && !attributes.vpc_security_group_ids?.length) && <span className="text-gray-500">—</span>}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Key Pair</span>
              <span>{attributes.key_name || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">VPC</span>
              <span>
                {attributes.vpc_name || attributes.vpc_id || '—'}
                {attributes.vpc_name && (
                  <span className="ml-1 text-xs text-gray-500">({attributes.vpc_id})</span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Subnet</span>
              <span>
                {attributes.subnet_name || attributes.subnet_id || '—'}
                {attributes.subnet_name && (
                  <span className="ml-1 text-xs text-gray-500">({attributes.subnet_id})</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">State</span>
              <span className="capitalize">{attributes.instance_state || 'unknown'}</span>
            </div>
          </div>
        );

      case 'aws_vpc':
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">CIDR Block</span>
              <span>{attributes.cidr_block}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Main Route Table</span>
              <span>{attributes.main_route_table_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Internet Gateway</span>
              <span>{attributes.internet_gateway_id || '—'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Subnets</span>
              <div className="flex flex-wrap gap-1">
                {(attributes.subnets || []).map((sn, i) => renderTag(sn.id || sn, `sn-${i}`, 'bg-green-900/40'))}
                {(!attributes.subnets?.length) && <span className="text-gray-500">—</span>}
              </div>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">NAT Gateways</span>
              <div className="flex flex-wrap gap-1">
                {(attributes.nat_gateway_ids || []).map((ng, i) => renderTag(ng, `ng-${i}`, 'bg-amber-900/40'))}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Enable DNS Hostnames</span>
              <span>{attributes.enable_dns_hostnames ? '✅' : '❌'}</span>
            </div>
          </div>
        );

      case 'aws_s3_bucket':
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Bucket Name</span>
              <span>{attributes.bucket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Region</span>
              <span>{attributes.region || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Versioning</span>
              <span>{attributes.versioning?.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Server-Side Encryption</span>
              <span>{attributes.server_side_encryption_configuration ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Public Access Block</span>
              <span>{attributes.public_access_block ? '✅' : '⚠️ Open'}</span>
            </div>
          </div>
        );

      case 'aws_ecr_repository':
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Repository URI</span>
              <span className="flex items-center gap-1 max-w-[180px] truncate">
                {attributes.repository_url || attributes.repository_name}
                <Button size="xs" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyToClipboard(attributes.repository_url, 'repo_uri')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Scan on Push</span>
              <span>{attributes.image_scanning_configuration?.scan_on_push ? '✅' : '❌'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tag Mutability</span>
              <span>{attributes.image_tag_mutability}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Creation Date</span>
              <span>{attributes.created_at ? new Date(attributes.created_at).toLocaleString() : '—'}</span>
            </div>
          </div>
        );

      case 'aws_lb':
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">DNS Name</span>
              <span className="flex items-center gap-1 max-w-[180px] truncate">
                {attributes.dns_name || '—'}
                <Button size="xs" variant="ghost" className="h-5 w-5 p-0" onClick={() => copyToClipboard(attributes.dns_name, 'dns')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Type</span>
              <span className="capitalize">{attributes.load_balancer_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Scheme</span>
              <span className="capitalize">{attributes.scheme}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">VPC ID</span>
              <span>{attributes.vpc_id || '—'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Subnets</span>
              <div className="flex flex-wrap gap-1">
                {(attributes.subnets || []).map((sn, i) => renderTag(sn, `sub-${i}`, 'bg-cyan-900/40'))}
              </div>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Listeners</span>
              <div className="flex flex-wrap gap-1">
                {(attributes.listeners || []).map((l, i) => renderTag(`${l.protocol}:${l.port}`, `lis-${i}`, 'bg-purple-900/40'))}
              </div>
            </div>
          </div>
        );

      case 'aws_security_group':
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name</span>
              <span>{attributes.name || attributes.group_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Description</span>
              <span>{attributes.description || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">VPC ID</span>
              <span>{attributes.vpc_id || '—'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Ingress Rules</span>
              <div className="text-right text-xs max-w-[150px]">
                {(attributes.ingress || []).length ? (
                  attributes.ingress.map((rule, i) => (
                    <div key={i} className="mb-0.5">
                      {rule.from_port}-{rule.to_port} ({rule.protocol}) 
                      {rule.cidr_blocks?.length && ` → ${rule.cidr_blocks.join(', ')}`}
                    </div>
                  ))
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'aws_lambda_function':
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Function Name</span>
              <span>{attributes.function_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Runtime</span>
              <span>{attributes.runtime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Handler</span>
              <span>{attributes.handler}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Memory (MB)</span>
              <span>{attributes.memory_size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Timeout (sec)</span>
              <span>{attributes.timeout}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Role ARN</span>
              <span className="truncate max-w-[150px]">{attributes.role}</span>
            </div>
          </div>
        );

      case 'aws_kms_key':
        return (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Alias</span>
              <span>{attributes.key_id?.startsWith('alias/') ? attributes.key_id : `alias/${attributes.description?.replace(/\s+/g, '-')}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Key ID</span>
              <span className="font-mono text-xs">{attributes.id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Creation Date</span>
              <span>{attributes.creation_date ? new Date(attributes.creation_date).toLocaleString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Key State</span>
              <span>{attributes.key_state || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Rotation Enabled</span>
              <span>{attributes.is_key_rotation_enabled ? '✅' : '❌'}</span>
            </div>
          </div>
        );

      default:
        const safeAttrs = Object.entries(attributes)
          .filter(([k, v]) => !k.startsWith('_') && v != null && v !== '' && k !== 'tags')
          .slice(0, 6);
        return (
          <div className="space-y-2 text-sm">
            {safeAttrs.length > 0 ? (
              safeAttrs.map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400">{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  <span className="truncate max-w-[150px]">
                    {typeof val === 'object' ? JSON.stringify(val).slice(0, 30) + '…' : String(val)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-gray-500 italic">No attributes available</span>
            )}
          </div>
        );
    }
  };

  const DeploymentModal = ({ dep, onClose }) => {
    if (!dep) return null;

    const mainModule = dep.modules[0] || 'unknown';
    const icon = MODULE_ICONS[mainModule]?.icon || '??';
    const color = MODULE_ICONS[mainModule]?.color || 'bg-gray-500/20 text-gray-400';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-3 sm:p-4 z-50">
        <div className="bg-gradient-to-b from-[#1a1f2b] to-[#151924] text-gray-200 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-800 shadow-2xl">
          <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-xl font-bold`}>
                {icon}
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-100">{getModuleDisplayName(dep)}</h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                  {dep.modules.join(', ')} • {dep.region} • {dep.resources.length} resource{dep.resources.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={onClose}
            >
              <X size={20} />
            </Button>
          </div>

          <div className="p-4 sm:p-6 pb-0">
            <div className="space-y-5">
              {dep.resources.map((r, i) => {
                const typeLabel = r.type.replace('aws_', '').replace(/_/g, '-').toUpperCase();
                const displayName = 
                  r.attributes?.tags?.Name || 
                  r.attributes?.name || 
                  r.attributes?.bucket || 
                  r.attributes?.function_name ||
                  r.id.split('.').pop() || 
                  typeLabel;

                return (
                  <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-gray-800 px-2.5 py-1 rounded text-xs font-bold">
                          {typeLabel}
                        </div>
                        <h3 className="font-medium text-gray-100 truncate max-w-[200px]">{displayName}</h3>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => copyToClipboard(r.id, 'resource_id')}
                        title="Copy Resource ID"
                      >
                        <Copy size={14} />
                      </Button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      {renderResourceDetails(r)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-800 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-gray-700 bg-gray-800/50 hover:bg-gray-700/80 text-gray-200"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClose();
                handleDestroy(dep);
              }}
              disabled={destroyingDeploymentId === dep.deploymentId}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {destroyingDeploymentId === dep.deploymentId ? 'Destroying...' : 'Destroy Deployment'}
            </Button>
          </div>

          {copiedField && (
            <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg">
              <span>✓ Copied {copiedField}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        Loading your deployments...
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p>No deployments yet. Create your first resource!</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-200">
        Created Resources
        <span className="ml-3 text-sm bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
          {deployments.length}
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {deployments.map((dep) => {
          const mainModule = dep.modules[0] || 'default';
          const config = MODULE_ICONS[mainModule] || MODULE_ICONS.default;
          const name = getModuleDisplayName(dep);
          const isEcr = mainModule === 'ecr';

          const cardBg = isEcr
            ? 'bg-gradient-to-b from-blue-900/30 to-blue-950/40 border-blue-500/50'
            : 'bg-gradient-to-b from-[#1a1f2b] to-[#151924] border-gray-800';

          return (
            <div
              key={dep.deploymentId}
              className={`rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.015] ${cardBg}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center text-sm font-bold`}>
                      {config.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-100">{name}</h3>
                      <p className="text-xs text-gray-400">{config.label}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-400 space-y-1">
                  <div>📍 {dep.region}</div>
                  <div>📦 {dep.resources.length} resource{dep.resources.length !== 1 ? 's' : ''}</div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-gray-800 hover:bg-gray-700/80 text-gray-200 font-medium border border-gray-700"
                    onClick={() => setSelectedDeployment(dep)}
                  >
                    <Eye size={14} className="mr-1.5" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className={`flex-1 ${isEcr ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                    onClick={() => handleDestroy(dep)}
                    disabled={destroyingDeploymentId === dep.deploymentId}
                  >
                    {destroyingDeploymentId === dep.deploymentId ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting
                      </span>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDeployment && (
        <DeploymentModal
          dep={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
        />
      )}
    </div>
  );
};

export default CreatedResources;
