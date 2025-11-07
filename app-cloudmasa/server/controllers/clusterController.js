import mongoose from 'mongoose';
import AWS from 'aws-sdk';
import Cluster from '../models/ClusterModel.js';
import CloudConnection from '../models/CloudConnectionModel.js';
import { configureAWS } from '../config/awsConfig.js';
import { decrypt } from '../utils/encryption.js';
import logger from '../utils/logger.js';

const isValidAwsAccountId = (id) => {
  return typeof id === 'string' && /^\d{12}$/.test(id);
};

const saveClusterData = async (req, res) => {
  try {
    const { accountId, name, region, outputFormat = 'json' } = req.body;

    if (!accountId || !name || !region) {
      return res.status(400).json({ 
        message: 'Account ID, cluster name, and region are required' 
      });
    }

    if (!isValidAwsAccountId(accountId)) {
      return res.status(400).json({ 
        message: 'Invalid account ID format. Must be exactly 12 digits.' 
      });
    }

    const account = await CloudConnection.findOne({ accountId });
    if (!account) {
      return res.status(404).json({ 
        message: 'AWS account connection not found. Please connect this account first.' 
      });
    }

    if (!account.awsAccessKey || !account.awsSecretKey) {
      logger.error(`Account ${accountId} is missing AWS credentials in DB`);
      return res.status(500).json({ 
        message: 'AWS credentials not configured for this account' 
      });
    }

    let awsAccessKey, awsSecretKey;
    try {
      awsAccessKey = decrypt(account.awsAccessKey);
      awsSecretKey = decrypt(account.awsSecretKey);
    } catch (decryptError) {
      logger.error('Decryption failed:', decryptError.message);
      return res.status(500).json({ 
        message: 'Failed to decrypt AWS credentials. Check encryption key.' 
      });
    }

    if (!awsAccessKey || !awsSecretKey) {
      return res.status(500).json({ 
        message: 'Decrypted AWS credentials are empty or invalid' 
      });
    }

    const awsServices = configureAWS(awsAccessKey, awsSecretKey, region);
    const eks = awsServices.eks;

    logger.info(`Fetching cluster: ${name} in ${region}`);
    const describeResult = await eks.describeCluster({ name }).promise();
    const clusterData = describeResult.cluster;

    if (clusterData.status !== 'ACTIVE') {
      return res.status(400).json({
        message: `Cluster is not ACTIVE. Current status: ${clusterData.status}`,
      });
    }

    const existingCluster = await Cluster.findOne({ 
      name: clusterData.name, 
      account: accountId 
    });
    if (existingCluster) {
      return res.status(409).json({
        message: "Cluster with this name already exists for the given account"
      });
    }

    // ✅ Extract kubeContext from request body
    const { kubeContext } = req.body;
    
    // Validate kubeContext
    if (!kubeContext || typeof kubeContext !== 'string' || kubeContext.trim() === '') {
      return res.status(400).json({
        message: 'Validation error',
        details: 'kubeContext is required and must be a non-empty string'
      });
    }
    
    const newCluster = new Cluster({
      name: clusterData.name,
      region: region,
      account: accountId,
      status: 'running',
      outputFormat: outputFormat,
      kubeContext: kubeContext.trim(), // ✅ Now included!
    });

    await newCluster.save();

    logger.info(`✅ Cluster saved: ${clusterData.name}`);
    return res.status(201).json({
      message: 'Cluster added successfully',
      cluster: newCluster,
    });

  } catch (error) {
    logger.error('❌ Full error in saveClusterData:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    });

    if (error.code === 'AccessDeniedException') {
      return res.status(403).json({ message: 'AWS permissions denied. Check IAM policy.' });
    }
    if (error.code === 'ResourceNotFoundException') {
      return res.status(404).json({ message: 'Cluster not found in AWS. Check name and region.' });
    }
    if (error.code === 'InvalidSignatureException') {
      return res.status(401).json({ message: 'Invalid AWS credentials.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', details: error.message });
    }

    return res.status(500).json({ message: 'Failed to add cluster. Check server logs.' });
  }
};

const getClusters = async (req, res) => {
  try {
    const { name, account } = req.query;
    let filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (account) filter.account = account;
    const clusters = await Cluster.find(filter);

    const transformedClusters = clusters.map(cluster => ({
      _id: cluster._id,
      name: cluster.name,
      status: cluster.status || 'unknown',
      region: cluster.region,
      account: cluster.account,
      nodes: cluster.nodes || 0,
      version: cluster.version || 'v1.0',
    }));

    res.status(200).json(transformedClusters);
  } catch (error) {
    logger.error('Error fetching clusters:', error);
    res.status(500).json({ message: 'Error fetching cluster data', error: error.message });
  }
};

const getClusterById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid cluster ID' });
  }
  try {
    const cluster = await Cluster.findById(id);
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    const transformed = {
      _id: cluster._id,
      name: cluster.name,
      status: cluster.status || 'unknown',
      region: cluster.region,
      account: cluster.account,
      nodes: cluster.nodes || 0,
      version: cluster.version || 'v1.0',
    };

    res.status(200).json(transformed);
  } catch (error) {
    logger.error('Error fetching cluster by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCluster = async (req, res) => {
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
    if (!updatedCluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    const transformed = {
      _id: updatedCluster._id,
      name: updatedCluster.name,
      status: updatedCluster.status || 'unknown',
      region: updatedCluster.region,
      account: updatedCluster.account,
      nodes: updatedCluster.nodes || 0,
      version: updatedCluster.version || 'v1.0',
    };

    res.status(200).json(transformed);
  } catch (error) {
    logger.error('Error updating cluster:', error);
    res.status(500).json({ message: 'Error updating cluster' });
  }
};

const deleteCluster = async (req, res) => {
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

const getClusterCredentials = async (req, res) => {
  const { name } = req.params;
  try {
    const cluster = await Cluster.findOne({ name });
    if (!cluster) return res.status(404).json({ message: 'Cluster not found' });

    res.status(200).json({
      awsRegion: cluster.region,
    });
  } catch (error) {
    logger.error('Error fetching cluster credentials:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ FIXED: ESM-compatible getLiveNodeCount
// ✅ NEW getLiveNodeCount — NO AWS CLI, NO K8s API
const getLiveNodeCount = async (req, res) => {
  try {
    const { clusterId } = req.params;

    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ success: false, message: 'Cluster not found' });
    }

    const account = await CloudConnection.findOne({ accountId: cluster.account });
    if (!account || !account.awsAccessKey || !account.awsSecretKey) {
      return res.status(400).json({ success: false, message: 'AWS credentials missing' });
    }

    const awsAccessKey = decrypt(account.awsAccessKey);
    const awsSecretKey = decrypt(account.awsSecretKey);

    // ✅ Use EC2 — no CLI, no K8s, no token
    const ec2 = new AWS.EC2({
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
      region: cluster.region
    });

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

    res.json({ success: true, nodeCount });

  } catch (error) {
    logger.error('Live node count error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch live node count', error: error.message });
  }
};

// ✅ EXPORT with getLiveNodeCount
export {
  saveClusterData,
  getClusters,
  getClusterById,
  updateCluster,
  deleteCluster,
  getClusterCredentials,
  getLiveNodeCount
};
