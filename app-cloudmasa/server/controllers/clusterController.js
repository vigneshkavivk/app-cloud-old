import mongoose from 'mongoose';
import AWS from 'aws-sdk';
import { exec } from 'child_process';
import { spawn } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import Cluster from '../models/ClusterModel.js';
import CloudConnection from '../models/CloudConnectionModel.js';
import { decrypt } from '../utils/encryption.js';
import logger from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EKS_MODULE_PATH = path.resolve(__dirname, '..', '..', '..', 'eks-cluster');
const execAsync = promisify(exec);

const deleteEksNodegroups = async (clusterName, region, accessKey, secretKey) => {
  const eks = new AWS.EKS({
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region
  });

  logger.info(`🧹 Checking nodegroups for cluster: ${clusterName}`);

  const listRes = await eks.listNodegroups({ clusterName }).promise();
  const nodegroups = listRes.nodegroups || [];

  if (nodegroups.length === 0) {
    logger.info(`ℹ️ No nodegroups found for ${clusterName}`);
    return;
  }

  logger.info(`🗑️ Deleting nodegroups: ${nodegroups.join(', ')}`);

  for (const ng of nodegroups) {
    await eks.deleteNodegroup({
      clusterName,
      nodegroupName: ng
    }).promise();
  }

  // Wait until nodegroups are fully deleted
  let stillExists = true;
  while (stillExists) {
    await new Promise(r => setTimeout(r, 15000));

    const res = await eks.listNodegroups({ clusterName }).promise();
    stillExists = res.nodegroups.length > 0;

    if (stillExists) {
      logger.info(`⏳ Waiting for nodegroups to be deleted...`);
    }
  }

  logger.info(`✅ All nodegroups deleted for ${clusterName}`);
};

const isValidAwsAccountId = (id) => {
  return typeof id === 'string' && /^\d{12}$/.test(id);
};

// ───────────────────────────────────────
//  CONFIGURE AWS
// ───────────────────────────────────────
const configureAWS = (accessKey, secretKey, region) => {
  const config = {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    region: region,
  };
  return {
    eks: new AWS.EKS(config),
    ec2: new AWS.EC2(config),
  };
};

// ───────────────────────────────────────
//  GET LIVE NODE COUNT FOR A CLUSTER (FROM EC2)
// ───────────────────────────────────────
const getLiveNodeCountForCluster = async (cluster) => {
  try {
    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account || !account.awsAccessKey || !account.awsSecretKey) {
      throw new Error(`AWS credentials missing for account: ${cluster.account}`);
    }

    const awsAccessKey = decrypt(account.awsAccessKey);
    const awsSecretKey = decrypt(account.awsSecretKey);

    const ec2 = new AWS.EC2({
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
      region: cluster.region
    });

    // Filter: Nodes tagged with `kubernetes.io/cluster/<name>` + running state
    const params = {
      Filters: [
        {
          Name: `tag:kubernetes.io/cluster/${cluster.name}`,
          Values: ['owned', 'shared']
        },
        {
          Name: 'instance-state-name',
          Values: ['running']
        }
      ]
    };

    const data = await ec2.describeInstances(params).promise();
    let nodeCount = 0;
    for (const reservation of data.Reservations) {
      nodeCount += reservation.Instances.length;
    }

    return nodeCount;
  } catch (err) {
    logger.warn(`⚠️ Live node fetch failed for ${cluster.name} (${cluster.region}):`, err.message);
    return cluster.nodes || 0; // fallback to DB value
  }
};

// ───────────────────────────────────────
// CREATE EKS CLUSTER VIA TERRAFORM
// ───────────────────────────────────────
// ───────────────────────────────────────
// CREATE EKS CLUSTER VIA TERRAFORM
// ───────────────────────────────────────
export const createCluster = async (req, res) => {
  const {
    clusterName,
    vpcId,
    subnetIds,
    nodeCount = 2,
    instanceType = "t3.medium",
    awsAccountId = "default-account"
  } = req.body;

  if (!clusterName || !vpcId || !subnetIds || !Array.isArray(subnetIds) || subnetIds.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Cluster name, VPC ID, and at least 2 subnet IDs are required'
    });
  }
  if (!/^vpc-[a-z0-9]+$/.test(vpcId)) {
    return res.status(400).json({ success: false, message: 'Invalid VPC ID format' });
  }
  for (const subnet of subnetIds) {
    if (!/^subnet-[a-z0-9]+$/.test(subnet)) {
      return res.status(400).json({ success: false, message: `Invalid Subnet ID: ${subnet}` });
    }
  }

  let awsAccessKey, awsSecretKey, region;
  try {
    const account = await CloudConnection.findOne({ accountId: awsAccountId });
    if (!account) {
      return res.status(404).json({ success: false, message: 'AWS account not found' });
    }
    awsAccessKey = decrypt(account.awsAccessKey);
    awsSecretKey = decrypt(account.awsSecretKey);
    region = account.awsRegion || 'us-west-2';

    const ec2 = new AWS.EC2({ accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey, region });
    const subnetData = await ec2.describeSubnets({ SubnetIds: subnetIds }).promise();

    const publicSubnetIds = [];
    const privateSubnetIds = [];
    for (const subnet of subnetData.Subnets) {
      let isPrivate = false;
      if (subnet.Tags) {
        isPrivate = subnet.Tags.some(tag =>
          tag.Key === 'kubernetes.io/role/internal-elb' ||
          (tag.Key === 'Name' && tag.Value.toLowerCase().includes('private'))
        );
      }
      isPrivate ? privateSubnetIds.push(subnet.SubnetId) : publicSubnetIds.push(subnet.SubnetId);
    }

    if (publicSubnetIds.length < 1 || privateSubnetIds.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'At least 1 public and 1 private subnet are required'
      });
    }

    // ✅ CORRECT PATH (project root / eks-cluster)
    const EKS_MODULE_PATH = path.resolve(__dirname, '..', '..', '..', 'eks-cluster');
    logger.info(`🚀 Initializing Terraform in: ${EKS_MODULE_PATH}`);

    // ——— 1. terraform init ———
    const initCmd = spawn('terraform', ['init', '-upgrade'], {
      cwd: EKS_MODULE_PATH,
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: awsAccessKey,
        AWS_SECRET_ACCESS_KEY: awsSecretKey,
        AWS_DEFAULT_REGION: region
      },
      timeout: 3600000
    });

    initCmd.stdout.on('data', (data) => logger.info(`[Terraform init] ${data}`));
    initCmd.stderr.on('data', (data) => logger.error(`[Terraform init] ${data}`));

    await new Promise((resolve, reject) => {
      initCmd.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`terraform init failed with code ${code}`));
      });
      initCmd.on('error', (err) => {
        if (err.code === 'ENOENT') {
          reject(new Error('terraform CLI not found — run `which terraform` to verify'));
        } else {
          reject(err);
        }
      });
    });

    // ——— 2. terraform apply ———
    const allSubnetIds = [...publicSubnetIds, ...privateSubnetIds];
    const applyArgs = [
      'apply',
      '-auto-approve',
      `-var=cluster_name=${clusterName}`,
      `-var=vpc_id=${vpcId}`,
      `-var=subnet_ids=[${allSubnetIds.map(id => `"${id}"`).join(', ')}]`,
      `-var=desired_size=${parseInt(nodeCount)}`,
      `-var=min_size=${parseInt(nodeCount)}`,
      `-var=max_size=${parseInt(nodeCount)}`,
      `-var=instance_types=["${instanceType}"]`,
      `-var=cluster_ingress_cidrs=["0.0.0.0/0"]`,
      `-var=endpoint_public_access=true`,
      `-var=endpoint_private_access=false`,
      `-var=capacity_type=ON_DEMAND`
    ];

    const applyCmd = spawn('terraform', applyArgs, {
      cwd: EKS_MODULE_PATH,
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: awsAccessKey,
        AWS_SECRET_ACCESS_KEY: awsSecretKey,
        AWS_DEFAULT_REGION: region
      },
      timeout: 2100000
    });

    applyCmd.stdout.on('data', (data) => {
      const out = data.toString().trim();
      if (out) logger.info(`[Terraform apply] ${out}`);
    });
    applyCmd.stderr.on('data', (data) => {
      const err = data.toString().trim();
      if (err) logger.error(`[Terraform apply] ${err}`);
    });

    await new Promise((resolve, reject) => {
      applyCmd.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`terraform apply failed with code ${code}`));
      });
      applyCmd.on('error', (err) => {
        if (err.code === 'ENOENT') {
          reject(new Error('terraform CLI not found — run `which terraform` to verify'));
        } else {
          reject(err);
        }
      });
    });

    // ——— 3. Save to DB ———
    const newCluster = new Cluster({
      name: clusterName,
      region: region,
      account: awsAccountId,
      status: 'running',
      nodes: parseInt(nodeCount),
      version: '1.29'
    });
    await newCluster.save();
    logger.info(`🎉 Cluster ${clusterName} created and saved!`);
    return res.status(200).json({
      success: true,
      message: '✅ EKS cluster creation succeeded!',
      clusterId: newCluster._id,
      clusterName
    });

  } catch (error) {
    const errorMessage = error.message || 'Unknown Terraform error';
    logger.error('❌ Terraform automation failed:', {
      message: errorMessage,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: '❌ Cluster creation failed',
      error: errorMessage
    });
  }
};
// ───────────────────────────────────────
// SAVE EXISTING CLUSTER (WITH KUBECONTEXT)
// ───────────────────────────────────────
export const saveClusterData = async (req, res) => {
  try {
    const { accountId, name, region, outputFormat = 'json', kubeContext } = req.body;

    if (!accountId || !name || !region) {
      return res.status(400).json({ message: 'Account ID, cluster name, and region are required' });
    }
    if (!isValidAwsAccountId(accountId)) {
      return res.status(400).json({ message: 'Invalid account ID format. Must be exactly 12 digits.' });
    }

    const account = await CloudConnection.findOne({ accountId });
    if (!account) {
      return res.status(404).json({ message: 'AWS account connection not found.' });
    }
    if (!account.awsAccessKey || !account.awsSecretKey) {
      return res.status(500).json({ message: 'AWS credentials not configured.' });
    }

    let awsAccessKey, awsSecretKey;
    try {
      awsAccessKey = decrypt(account.awsAccessKey);
      awsSecretKey = decrypt(account.awsSecretKey);
    } catch (err) {
      return res.status(500).json({ message: 'Failed to decrypt AWS credentials.' });
    }

    if (!kubeContext || typeof kubeContext !== 'string' || kubeContext.trim() === '') {
      return res.status(400).json({ message: 'kubeContext is required and must be a non-empty string' });
    }

    const { eks } = configureAWS(awsAccessKey, awsSecretKey, region);
    const describeResult = await eks.describeCluster({ name }).promise();
    const clusterData = describeResult.cluster;

    if (clusterData.status !== 'ACTIVE') {
      return res.status(400).json({ message: `Cluster is not ACTIVE. Current status: ${clusterData.status}` });
    }

    const existingCluster = await Cluster.findOne({ name: clusterData.name, account: accountId });
    if (existingCluster) {
      return res.status(409).json({ message: "Cluster already exists for this account" });
    }

    const newCluster = new Cluster({
      name: clusterData.name,
      region: region,
      account: accountId,
      status: 'running',
      outputFormat: outputFormat,
      kubeContext: kubeContext.trim(),
    });
    await newCluster.save();

    logger.info(`✅ Cluster saved: ${clusterData.name}`);
    return res.status(201).json({ message: 'Cluster added successfully', cluster: newCluster });

  } catch (error) {
    logger.error('❌ saveClusterData error:', error);
    if (error.code === 'AccessDeniedException') return res.status(403).json({ message: 'AWS permissions denied.' });
    if (error.code === 'ResourceNotFoundException') return res.status(404).json({ message: 'Cluster not found in AWS.' });
    if (error.code === 'InvalidSignatureException') return res.status(401).json({ message: 'Invalid AWS credentials.' });
    return res.status(500).json({ message: 'Failed to add cluster. Check server logs.' });
  }
};

// ───────────────────────────────────────
// GET CLUSTERS ✅ WITH DYNAMIC LIVE NODE COUNT
// ───────────────────────────────────────
export const getClusters = async (req, res) => {
  try {
    const { name, awsAccountId } = req.query;

    let filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (awsAccountId) filter.account = awsAccountId;

    const clusters = await Cluster.find(filter);

    const transformedClusters = await Promise.all(
      clusters.map(async (cluster) => {
        let liveNodeCount = cluster.nodes || 0;

        // ✅ Only fetch live count for RUNNING clusters (safe & efficient)
        if (cluster.status === 'running') {
          liveNodeCount = await getLiveNodeCountForCluster(cluster);
        }

        return {
          _id: cluster._id,
          name: cluster.name,
          status: cluster.status || 'unknown',
          region: cluster.region,
          account: cluster.account,
          accountName: cluster.accountName || '',
          nodes: cluster.nodes || 0,
          version: cluster.version || 'v1.29',
          liveNodeCount, // ✅ REAL, LIVE count (updated every page load)
        };
      })
    );

    res.status(200).json(transformedClusters);
  } catch (error) {
    logger.error('❌ getClusters error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch clusters', 
      error: error.message 
    });
  }
};

// ───────────────────────────────────────
// GET CLUSTER BY ID
// ───────────────────────────────────────
export const getClusterById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid cluster ID' });
  }
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ message: 'Cluster not found' });

    const liveNodeCount = cluster.status === 'running'
      ? await getLiveNodeCountForCluster(cluster)
      : cluster.nodes || 0;

    res.status(200).json({
      _id: cluster._id,
      name: cluster.name,
      status: cluster.status || 'unknown',
      region: cluster.region,
      account: cluster.account,
      accountName: cluster.accountName || '',
      nodes: cluster.nodes || 0,
      version: cluster.version || 'v1.29',
      liveNodeCount,
    });
  } catch (error) {
    logger.error('Error fetching cluster by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ───────────────────────────────────────
// UPDATE CLUSTER
// ───────────────────────────────────────
export const updateCluster = async (req, res) => {
  const { id } = req.params;
  const { name, region, outputFormat, status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid cluster ID' });
  }
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (region) updateData.region = region;
    if (outputFormat) updateData.outputFormat = outputFormat;
    if (status) updateData.status = status;

    const updatedCluster = await Cluster.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedCluster) return res.status(404).json({ message: 'Cluster not found' });

    const liveNodeCount = updatedCluster.status === 'running'
      ? await getLiveNodeCountForCluster(updatedCluster)
      : updatedCluster.nodes || 0;

    res.status(200).json({
      _id: updatedCluster._id,
      name: updatedCluster.name,
      status: updatedCluster.status || 'unknown',
      region: updatedCluster.region,
      account: updatedCluster.account,
      accountName: updatedCluster.accountName || '',
      nodes: updatedCluster.nodes || 0,
      version: updatedCluster.version || 'v1.29',
      liveNodeCount,
    });
  } catch (error) {
    logger.error('Error updating cluster:', error);
    res.status(500).json({ message: 'Error updating cluster' });
  }
};

// ───────────────────────────────────────
// DELETE CLUSTER
// ───────────────────────────────────────
export const deleteCluster = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid cluster ID' });
  }
  try {
    const cluster = await Cluster.findByIdAndDelete(id);
    if (!cluster) return res.status(404).json({ message: 'Cluster not found' });
    res.status(200).json({ message: 'Cluster deleted successfully' });
  } catch (error) {
    logger.error('Error deleting cluster:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ───────────────────────────────────────
// GET CLUSTER CREDENTIALS
// ───────────────────────────────────────
export const getClusterCredentials = async (req, res) => {
  const { name } = req.params;
  try {
    const cluster = await Cluster.findOne({ name });
    if (!cluster) return res.status(404).json({ message: 'Cluster not found' });
    res.status(200).json({ awsRegion: cluster.region });
  } catch (error) {
    logger.error('Error fetching cluster credentials:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ───────────────────────────────────────
// GET LIVE NODE COUNT (Standalone API — optional, kept for frontend use)
// ───────────────────────────────────────
export const getLiveNodeCount = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) return res.status(404).json({ success: false, message: 'Cluster not found' });

    const liveNodeCount = await getLiveNodeCountForCluster(cluster);
    res.json({ success: true, nodeCount: liveNodeCount });
  } catch (error) {
    logger.error('Live node count error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live node count', error: error.message });
  }
};

// ───────────────────────────────────────
// AWS VPC & SUBNET HELPERS
// ───────────────────────────────────────
export const getVpcs = async (req, res) => {
  const { accountId, region } = req.body;
  if (!accountId || !region) return res.status(400).json({ success: false, message: 'Account ID and region required' });
  try {
    const account = await CloudConnection.findOne({ accountId });
    if (!account) return res.status(404).json({ success: false, message: 'AWS account not found' });
    const awsAccessKey = decrypt(account.awsAccessKey);
    const awsSecretKey = decrypt(account.awsSecretKey);
    const ec2 = new AWS.EC2({ accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey, region });
    const data = await ec2.describeVpcs().promise();
    res.status(200).json({ success: true, vpcs: data.Vpcs || [] });
  } catch (error) {
    logger.error('Error fetching VPCs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch VPCs', error: error.message });
  }
};

export const getSubnets = async (req, res) => {
  const { accountId, region, vpcId } = req.body;
  if (!accountId || !region || !vpcId) return res.status(400).json({ success: false, message: 'Required fields missing' });
  try {
    const account = await CloudConnection.findOne({ accountId });
    if (!account) return res.status(404).json({ success: false, message: 'AWS account not found' });
    const awsAccessKey = decrypt(account.awsAccessKey);
    const awsSecretKey = decrypt(account.awsSecretKey);
    const ec2 = new AWS.EC2({ accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey, region });
    const data = await ec2.describeSubnets({ Filters: [{ Name: 'vpc-id', Values: [vpcId] }] }).promise();
    res.status(200).json({ success: true, subnets: data.Subnets || [] });
  } catch (error) {
    logger.error('Error fetching subnets:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subnets', error: error.message });
  }
};
// ───────────────────────────────────────
// GET AVAILABLE UPGRADE VERSIONS FOR A CLUSTER (REAL EKS MATRIX 2025)
// ───────────────────────────────────────
export const getUpgradeVersions = async (req, res) => {
  const { clusterId } = req.body;
  if (!clusterId || !mongoose.Types.ObjectId.isValid(clusterId)) {
    return res.status(400).json({ error: 'Valid clusterId is required' });
  }

  try {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }

    // Parse current version: supports "v1.29", "1.29", "1.29.3", etc.
    let current = (cluster.version || '1.29').replace(/^v/, '');
    if (current.includes('.')) {
      current = current.split('.').slice(0, 2).join('.'); // e.g., "1.29.3" → "1.29"
    } else {
      current = '1.29'; // fallback
    }

    const [major, minor] = current.split('.').map(Number);

    // ✅ EKS-supported versions as of Nov 2025 (from official AWS docs)
    const supported = new Set([
      '1.27', '1.28', '1.29', // Extended Support
      '1.30', '1.31', '1.32', '1.33'  // Standard Support
    ]);

    // ✅ Only allow upgrading to next 1-2 minor versions (EKS policy)
    const upgrades = [];
    for (let i = 1; i <= 2; i++) {
      const ver = `${major}.${minor + i}`;
      if (supported.has(ver)) {
        upgrades.push(`v${ver}`);
      }
    }

    res.json({
      versions: upgrades,
      currentVersion: `v${current}`
    });

  } catch (err) {
    logger.error('[getUpgradeVersions] Error:', err);
    res.status(500).json({ error: 'Failed to fetch upgrade versions' });
  }
};
// ───────────────────────────────────────
// UPGRADE CLUSTER KUBERNETES VERSION
// ───────────────────────────────────────
export const upgradeCluster = async (req, res) => {
  const { clusterId, version } = req.body;
  if (!clusterId || !version) {
    return res.status(400).json({ error: 'clusterId and version are required' });
  }

  try {
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }

    // 🔐 Fetch AWS creds to call EKS API
    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) {
      return res.status(404).json({ error: 'AWS account not found' });
    }

    const awsAccessKey = decrypt(account.awsAccessKey);
    const awsSecretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
      region
    });

    // ✅ Trigger EKS control plane upgrade (non-disruptive)
    await eks.updateClusterVersion({
      name: cluster.name,
      version: version.replace('v', '')
    }).promise();

    // ✅ Update DB record
    cluster.version = version;
    cluster.status = 'upgrading'; // UI can show spinner
    await cluster.save();

    logger.info(`🚀 Upgrade initiated: ${cluster.name} → ${version}`);
    res.json({
      success: true,
      message: `Upgrade to ${version} initiated for ${cluster.name}. Control plane upgrade takes 30–60 mins.`,
      cluster: {
        _id: cluster._id,
        name: cluster.name,
        version: cluster.version,
        status: cluster.status
      }
    });

  } catch (err) {
    logger.error('[upgradeCluster] Error:', err);
    if (err.code === 'InvalidParameterException') {
      return res.status(400).json({ error: 'Invalid upgrade version or cluster state' });
    }
    if (err.code === 'ResourceNotFoundException') {
      return res.status(404).json({ error: 'Cluster not found in AWS' });
    }
    res.status(500).json({ error: 'Failed to upgrade cluster' });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER CONFIG (with live data summary)
// ───────────────────────────────────────
export const getClusterConfig = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getClusterConfig] Request for cluster: ${id}`);
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid cluster ID' });
  }

  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) {
      logger.warn(`[getClusterConfig] Cluster not found: ${id}`);
      return res.status(404).json({ error: 'Cluster not found' });
    }

    const liveNodeCount = await getLiveNodeCountForCluster(cluster);

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) {
      logger.error(`[getClusterConfig] Account not found: ${cluster.account}`);
      return res.status(404).json({ error: 'AWS account not configured' });
    }
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    // Test AWS CLI first
    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    
    let tokenData;
    try {
      const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
      tokenData = JSON.parse(tokenResult.stdout.trim());
      if (!tokenData.status?.token) {
        throw new Error('Invalid token format');
      }
    } catch (err) {
      logger.error(`[getClusterConfig] Token fetch failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to authenticate with AWS EKS',
        details: err.message
      });
    }

    // Test kubectl commands one by one
    const kubectlBase = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}"`;

    // Test if kubectl can connect first
    try {
      await execAsync(`${kubectlBase} get nodes --request-timeout=10s`, { timeout: 15000 });
      logger.info(`[getClusterConfig] Kubectl connection successful for ${cluster.name}`);
    } catch (err) {
      logger.error(`[getClusterConfig] Kubectl connection failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to connect to cluster',
        details: err.message
      });
    }

    // Now fetch actual data
    const [podsOut, deploymentsOut, servicesOut, namespacesOut] = await Promise.all([
      execAsync(`${kubectlBase} get pods --all-namespaces -o json`, { timeout: 20000 }).catch(e => {
        logger.warn(`[getClusterConfig] Pods fetch failed:`, e.message);
        return { stdout: '{"items":[]}' };
      }),
      execAsync(`${kubectlBase} get deployments --all-namespaces -o json`, { timeout: 20000 }).catch(e => {
        logger.warn(`[getClusterConfig] Deployments fetch failed:`, e.message);
        return { stdout: '{"items":[]}' };
      }),
      execAsync(`${kubectlBase} get svc --all-namespaces -o json`, { timeout: 20000 }).catch(e => {
        logger.warn(`[getClusterConfig] Services fetch failed:`, e.message);
        return { stdout: '{"items":[]}' };
      }),
      execAsync(`${kubectlBase} get ns -o json`, { timeout: 20000 }).catch(e => {
        logger.warn(`[getClusterConfig] Namespaces fetch failed:`, e.message);
        return { stdout: '{"items":[]}' };
      })
    ]);

    const pods = JSON.parse(podsOut.stdout).items || [];
    const deployments = JSON.parse(deploymentsOut.stdout).items || [];
    const services = JSON.parse(servicesOut.stdout).items || [];
    const namespaces = JSON.parse(namespacesOut.stdout).items || [];

    const runningPods = pods.filter(p => 
      p.status.phase === 'Running' && 
      p.status.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
    ).length;

    logger.info(`[getClusterConfig] Data fetched successfully for ${cluster.name}`, {
      pods: pods.length,
      runningPods,
      deployments: deployments.length,
      services: services.length,
      namespaces: namespaces.length
    });

    res.json({
      cluster: {
        id: cluster._id,
        name: cluster.name,
        region: cluster.region,
        version: cluster.version || '1.29',
        status: cluster.status,
      },
      liveData: {
        resourceSummary: {
          nodes: { ready: liveNodeCount, total: liveNodeCount },
          pods: { running: runningPods, total: pods.length },
          deployments: deployments.length,
          services: services.length,
          namespaces: namespaces.length
        }
      }
    });

  } catch (err) {
    logger.error('[getClusterConfig] Unexpected error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch cluster config',
      details: err.message 
    });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER NODES
// ───────────────────────────────────────
export const getNodes = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getNodes] Request for cluster: ${id}`);
  
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());

    const kubectlCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}" get nodes -o json`;
    let nodesOut;
    try {
      nodesOut = await execAsync(kubectlCmd, { timeout: 20000 });
    } catch (err) {
      logger.error(`[getNodes] kubectl failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to fetch nodes',
        details: err.message
      });
    }

    const nodes = JSON.parse(nodesOut.stdout).items || [];

    res.json(nodes.map(node => {
      const labels = node.metadata?.labels || {};
      const conditions = node.status?.conditions || [];
      const readyCond = conditions.find(c => c.type === 'Ready');
      const status = !readyCond ? 'Unknown' : readyCond.status === 'True' ? 'Running' : 'Not Ready';

      return {
        name: node.metadata.name,
        status,
        role: labels['node-role.kubernetes.io/control-plane'] ? 'control-plane' : 'worker',
        instanceType: labels['node.kubernetes.io/instance-type'] || 'n/a',
        os: (node.status?.nodeInfo?.osImage || '').split(' ')[0] || 'unknown',
        age: Date.now() - new Date(node.metadata.creationTimestamp).getTime()
      };
    }));

  } catch (err) {
    logger.error('[getNodes] Error:', err);
    res.status(500).json({ error: 'Failed to fetch nodes', details: err.message });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER NAMESPACES
// ───────────────────────────────────────
export const getNamespaces = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getNamespaces] Request for cluster: ${id}`);
  
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());

    const kubectlCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}" get ns -o json`;
    
    let nsOut;
    try {
      nsOut = await execAsync(kubectlCmd, { timeout: 20000 });
    } catch (err) {
      logger.error(`[getNamespaces] kubectl failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to fetch namespaces',
        details: err.message
      });
    }

    const namespaces = JSON.parse(nsOut.stdout).items || [];
    logger.info(`[getNamespaces] Fetched ${namespaces.length} namespaces for ${cluster.name}`);

    res.json(namespaces.map(ns => ({
      name: ns.metadata.name,
      status: ns.status.phase,
      age: Date.now() - new Date(ns.metadata.creationTimestamp).getTime()
    })));

  } catch (err) {
    logger.error('[getNamespaces] Error:', err);
    res.status(500).json({ error: 'Failed to fetch namespaces', details: err.message });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER WORKLOADS
// ───────────────────────────────────────
export const getWorkloads = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getWorkloads] Request for cluster: ${id}`);
  
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());

    const kubectlBase = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}"`;

    const [depOut, stsOut] = await Promise.all([
      execAsync(`${kubectlBase} get deployments --all-namespaces -o json`, { timeout: 20000 }).catch(e => {
        logger.warn(`[getWorkloads] Deployments fetch failed:`, e.message);
        return { stdout: '{"items":[]}' };
      }),
      execAsync(`${kubectlBase} get statefulsets --all-namespaces -o json`, { timeout: 20000 }).catch(e => {
        logger.warn(`[getWorkloads] StatefulSets fetch failed:`, e.message);
        return { stdout: '{"items":[]}' };
      })
    ]);

    const deployments = JSON.parse(depOut.stdout).items || [];
    const statefulSets = JSON.parse(stsOut.stdout).items || [];

    const workloads = [
      ...deployments.map(dep => ({
        name: dep.metadata.name,
        namespace: dep.metadata.namespace,
        type: 'Deployment',
        ready: dep.status.readyReplicas || 0,
        replicas: dep.spec.replicas || 0,
        status: dep.status.conditions?.find(c => c.type === 'Available')?.status === 'True' ? 'Running' : 'Pending',
        age: Date.now() - new Date(dep.metadata.creationTimestamp).getTime()
      })),
      ...statefulSets.map(ss => ({
        name: ss.metadata.name,
        namespace: ss.metadata.namespace,
        type: 'StatefulSet',
        ready: ss.status.readyReplicas || 0,
        replicas: ss.spec.replicas || 0,
        status: ss.status.conditions?.find(c => c.type === 'Available')?.status === 'True' ? 'Running' : 'Pending',
        age: Date.now() - new Date(ss.metadata.creationTimestamp).getTime()
      }))
    ];

    logger.info(`[getWorkloads] Fetched ${workloads.length} workloads for ${cluster.name}`);

    res.json(workloads);

  } catch (err) {
    logger.error('[getWorkloads] Error:', err);
    res.status(500).json({ error: 'Failed to fetch workloads', details: err.message });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER SERVICES
// ───────────────────────────────────────
export const getServices = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getServices] Request for cluster: ${id}`);
  
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());

    const kubectlCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}" get svc --all-namespaces -o json`;
    
    let svcOut;
    try {
      svcOut = await execAsync(kubectlCmd, { timeout: 20000 });
    } catch (err) {
      logger.error(`[getServices] kubectl failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to fetch services',
        details: err.message
      });
    }

    const services = JSON.parse(svcOut.stdout).items || [];

    res.json(services.map(svc => ({
      name: svc.metadata.name,
      namespace: svc.metadata.namespace,
      type: svc.spec.type,
      clusterIP: svc.spec.clusterIP || 'None',
      ports: (svc.spec.ports || []).map(p => `${p.port}/${p.protocol}`),
      age: Date.now() - new Date(svc.metadata.creationTimestamp).getTime()
    })));

  } catch (err) {
    logger.error('[getServices] Error:', err);
    res.status(500).json({ error: 'Failed to fetch services', details: err.message });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER INGRESSES
// ───────────────────────────────────────
export const getIngresses = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getIngresses] Request for cluster: ${id}`);
  
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());

    const kubectlCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}" get ingress --all-namespaces -o json`;
    
    let ingOut;
    try {
      ingOut = await execAsync(kubectlCmd, { timeout: 20000 });
    } catch (err) {
      logger.error(`[getIngresses] kubectl failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to fetch ingresses',
        details: err.message
      });
    }

    const ingresses = JSON.parse(ingOut.stdout).items || [];

    res.json(ingresses.map(ing => ({
      name: ing.metadata.name,
      namespace: ing.metadata.namespace,
      hosts: (ing.spec.rules || []).map(r => r.host).filter(Boolean),
      paths: (ing.spec.rules || []).flatMap(r => (r.http?.paths || []).map(p => p.path)).filter(Boolean),
      age: Date.now() - new Date(ing.metadata.creationTimestamp).getTime()
    })));

  } catch (err) {
    logger.error('[getIngresses] Error:', err);
    res.status(500).json({ error: 'Failed to fetch ingresses', details: err.message });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER EVENTS
// ───────────────────────────────────────
export const getEvents = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getEvents] Request for cluster: ${id}`);
  
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());

    const kubectlCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}" get events --sort-by='.lastTimestamp' --field-selector 'type!=Normal' --all-namespaces -o json`;
    
    let evOut;
    try {
      evOut = await execAsync(kubectlCmd, { timeout: 20000 });
    } catch (err) {
      logger.error(`[getEvents] kubectl failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to fetch events',
        details: err.message
      });
    }

    const events = JSON.parse(evOut.stdout).items || [];

    res.json(events.map(e => ({
      type: e.type,
      reason: e.reason,
      message: (e.message || '').substring(0, 200),
      namespace: e.metadata.namespace,
      timestamp: e.lastTimestamp || e.eventTime
    })).slice(0, 50));

  } catch (err) {
    logger.error('[getEvents] Error:', err);
    res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
};

// ───────────────────────────────────────
// NEW: GET CLUSTER KUBE-SYSTEM STATUS
// ───────────────────────────────────────
export const getKubeSystemStatus = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getKubeSystemStatus] Request for cluster: ${id}`);
  
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;

    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();

    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());

    const kubectlCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}" get pods -n kube-system -o json`;
    
    let podsOut;
    try {
      podsOut = await execAsync(kubectlCmd, { timeout: 20000 });
    } catch (err) {
      logger.error(`[getKubeSystemStatus] kubectl failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to fetch kube-system pods',
        details: err.message
      });
    }

    const pods = JSON.parse(podsOut.stdout).items || [];

    const critical = ['coredns', 'kube-proxy', 'aws-node'];
    let healthy = true;
    const components = {};

    critical.forEach(prefix => {
      const matched = pods.filter(p => p.metadata.name.startsWith(prefix));
      const ready = matched.filter(p => 
        p.status.phase === 'Running' &&
        p.status.conditions?.some(c => c.type === 'Ready' && c.status === 'True')
      ).length;
      const status = ready === matched.length ? 'Running' : 'Degraded';
      if (status === 'Degraded') healthy = false;
      components[prefix] = { status, ready, total: matched.length };
    });

    res.json({
      status: healthy ? 'Running' : 'Degraded',
      components
    });

  } catch (err) {
    logger.error('[getKubeSystemStatus] Error:', err);
    res.status(500).json({ error: 'Failed to fetch kube-system status', details: err.message });
  }
};
// ───────────────────────────────────────
// NEW: GET CLUSTER PODS
// ───────────────────────────────────────
export const getPods = async (req, res) => {
  const { id } = req.params;
  logger.info(`[getPods] Request for cluster: ${id}`);
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });
    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) return res.status(404).json({ error: 'AWS account not configured' });
    const accessKey = decrypt(account.awsAccessKey);
    const secretKey = decrypt(account.awsSecretKey);
    const region = cluster.region;
    const eks = new AWS.EKS({ accessKeyId: accessKey, secretAccessKey: secretKey, region });
    const { cluster: eksCluster } = await eks.describeCluster({ name: cluster.name }).promise();
    const tokenCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" aws eks get-token --cluster-name "${cluster.name}" --region "${region}"`;
    const tokenResult = await execAsync(tokenCmd, { timeout: 15000 });
    const tokenData = JSON.parse(tokenResult.stdout.trim());
    const kubectlCmd = `AWS_ACCESS_KEY_ID="${accessKey}" AWS_SECRET_ACCESS_KEY="${secretKey}" AWS_DEFAULT_REGION="${region}" kubectl --server="${eksCluster.endpoint}" --insecure-skip-tls-verify=true --token="${tokenData.status.token}" get pods --all-namespaces -o json`;
    let podsOut;
    try {
      podsOut = await execAsync(kubectlCmd, { timeout: 20000 });
    } catch (err) {
      logger.error(`[getPods] kubectl failed:`, err.message);
      return res.status(500).json({ 
        error: 'Failed to fetch pods',
        details: err.message
      });
    }
    const pods = JSON.parse(podsOut.stdout).items || [];
    res.json(pods.map(pod => {
      const phase = pod.status.phase || 'Unknown';
      const readyCond = pod.status.conditions?.find(c => c.type === 'Ready');
      const status = !readyCond 
        ? phase 
        : readyCond.status === 'True' ? 'Running' : 'Not Ready';
      
      return {
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: status,
        restarts: (pod.status.containerStatuses || [])
          .reduce((sum, c) => sum + (c.restartCount || 0), 0),
        age: Date.now() - new Date(pod.metadata.creationTimestamp).getTime(),
        node: pod.spec.nodeName || 'unknown'
      };
    }));
  } catch (err) {
    logger.error('[getPods] Error:', err);
    res.status(500).json({ error: 'Failed to fetch pods', details: err.message });
  }
};
// ───────────────────────────────────────
// NEW: GET CLUSTER METRICS (mock data)
// ───────────────────────────────────────
export const getMetrics = async (req, res) => {
  const now = Date.now();
  const data = [];
  for (let i = 0; i < 288; i++) {
    const time = new Date(now - (288 - i) * 5 * 60 * 1000).toISOString();
    data.push({
      time: time.split('T')[1].substring(0, 5),
      cpu: Math.max(5, Math.min(95, 20 + 30 * Math.sin(i / 30) + (Math.random() - 0.5) * 20)),
      memory: Math.max(10, Math.min(90, 35 + 25 * Math.cos(i / 40) + (Math.random() - 0.5) * 25)),
      network: Math.max(5, Math.min(85, 15 + 20 * Math.sin(i / 25) + (Math.random() - 0.5) * 15))
    });
  }
  res.json(data);
};

// ───────────────────────────────────────
// DESTROY EKS CLUSTER VIA TERRAFORM (mirror of createCluster)
// ───────────────────────────────────────
export const destroyCluster = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid cluster ID' });
  }

  let cluster;
  try {
    cluster = await Cluster.findById(id);
    if (!cluster) {
      return res.status(404).json({ success: false, message: 'Cluster not found' });
    }
  } catch (err) {
    logger.error('DB lookup error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }

  let awsAccessKey, awsSecretKey, region;
  try {
    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account) {
      return res.status(400).json({ success: false, message: 'AWS account not found' });
    }

    awsAccessKey = decrypt(account.awsAccessKey);
    awsSecretKey = decrypt(account.awsSecretKey);
    region = account.awsRegion || 'us-west-2';
  } catch (err) {
    logger.error('AWS credential error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load AWS credentials' });
  }

  const EKS_MODULE_PATH = path.resolve(__dirname, '..', '..', '..', 'eks-cluster');
  logger.info(`🗑️ Destroying Terraform EKS in: ${EKS_MODULE_PATH}`);

  try {
    // 🔥 NEW STEP 0: delete nodegroups first
    await deleteEksNodegroups(
      cluster.name,
      region,
      awsAccessKey,
      awsSecretKey
    );

    // ——— 1. terraform init ———
    const initCmd = spawn('terraform', ['init', '-upgrade'], {
      cwd: EKS_MODULE_PATH,
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: awsAccessKey,
        AWS_SECRET_ACCESS_KEY: awsSecretKey,
        AWS_DEFAULT_REGION: region
      }
    });

    initCmd.stdout.on('data', d => logger.info(`[Terraform init] ${d}`));
    initCmd.stderr.on('data', d => logger.error(`[Terraform init] ${d}`));

    await new Promise((resolve, reject) => {
      initCmd.on('close', code =>
        code === 0 ? resolve() : reject(new Error(`terraform init failed: ${code}`))
      );
    });

    // ——— 2. terraform destroy ———
    const destroyCmd = spawn('terraform', ['destroy', '-auto-approve'], {
      cwd: EKS_MODULE_PATH,
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: awsAccessKey,
        AWS_SECRET_ACCESS_KEY: awsSecretKey,
        AWS_DEFAULT_REGION: region
      }
    });

    destroyCmd.stdout.on('data', d => logger.info(`[Terraform destroy] ${d}`));
    destroyCmd.stderr.on('data', d => logger.error(`[Terraform destroy] ${d}`));

    await new Promise((resolve, reject) => {
      destroyCmd.on('close', code =>
        code === 0 ? resolve() : reject(new Error(`terraform destroy failed: ${code}`))
      );
    });

    // ——— 3. Delete DB record ———
    await Cluster.findByIdAndDelete(id);
    logger.info(`✅ Cluster ${cluster.name} destroyed and DB entry removed`);

    return res.status(200).json({
      success: true,
      message: `✅ EKS cluster "${cluster.name}" fully destroyed`
    });

  } catch (error) {
    logger.error('❌ Destroy failed', error);
    return res.status(500).json({
      success: false,
      message: '❌ EKS cluster destroy failed',
      error: error.message
    });
  }
};
