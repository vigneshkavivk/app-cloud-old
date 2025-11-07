const mongoose = require('mongoose');
const Cluster = require('../models/ClusterModel');
const { configureAWS } = require('../config/awsConfig');
const logger = require('../utils/logger');

// Save new cluster data
const saveClusterData = async (req, res) => {
  try {
    const { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat, status } = req.body;

    if (!awsAccessKey || !awsSecretKey || !clusterName || !awsRegion || !outputFormat) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Configure AWS and get account info
    const aws = configureAWS(awsAccessKey, awsSecretKey, awsRegion);
    const identityData = await aws.sts.getCallerIdentity({}).promise();
    const awsAccountNumber = identityData.Account;

    const newCluster = new Cluster({
      awsAccessKey,
      awsSecretKey,
      clusterName,
      awsRegion,
      outputFormat,
      status: status || 'Active',
      awsAccountNumber: awsAccountNumber,
    });

    await newCluster.save();
    res.status(201).json({ message: 'Cluster data saved successfully', cluster: newCluster });
  } catch (error) {
    logger.error('Error saving cluster data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all clusters with optional filtering
const getClusters = async (req, res) => {
  try {
    const { clusterName } = req.query;

    let filter = {};
    if (clusterName) {
      filter.clusterName = { $regex: clusterName, $options: 'i' };
    }

    const clusters = await Cluster.find(filter);
    res.status(200).json(clusters);
  } catch (error) {
    logger.error('Error fetching cluster data:', error);
    res.status(500).json({ message: 'Error fetching cluster data', error: error.message });
  }
};

// Get cluster by ID
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
    res.status(200).json(cluster);
  } catch (error) {
    logger.error('Error fetching cluster data by ID:', error);
    res.status(500).json({ message: 'Error fetching cluster data', error: error.message });
  }
};

// Update cluster by ID
const updateCluster = async (req, res) => {
  const { id } = req.params;
  const { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid cluster ID' });
  }

  try {
    const updatedCluster = await Cluster.findByIdAndUpdate(
      id,
      { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat },
      { new: true }
    );

    if (!updatedCluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    res.status(200).json(updatedCluster);
  } catch (error) {
    logger.error('Error updating cluster:', error);
    res.status(500).json({ message: 'Error updating cluster', error: error.message });
  }
};

// Delete cluster by ID
const deleteCluster = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid cluster ID' });
  }

  try {
    const cluster = await Cluster.findByIdAndDelete(id);

    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    return res.status(200).json({ message: 'Cluster deleted successfully' });
  } catch (error) {
    logger.error('Error deleting cluster:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get cluster credentials by cluster name
const getClusterCredentials = async (req, res) => {
  const { clusterName } = req.params;

  try {
    const cluster = await Cluster.findOne({ clusterName });
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster not found' });
    }

    res.status(200).json({
      awsAccessKey: cluster.awsAccessKey,
      awsSecretKey: cluster.awsSecretKey,
      awsRegion: cluster.awsRegion,
      outputFormat: cluster.outputFormat,
    });
  } catch (error) {
    logger.error('Error fetching cluster credentials:', error);
    res.status(500).json({ message: 'Error fetching cluster credentials', error: error.message });
  }
};

module.exports = {
  saveClusterData,
  getClusters,
  getClusterById,
  updateCluster,
  deleteCluster,
  getClusterCredentials
};