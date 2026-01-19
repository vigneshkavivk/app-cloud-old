// server/services/clusterService.js
import Cluster from '../models/ClusterModel.js';
import awsService from './awsService.js';
import logger from '../utils/logger.js';

// Create a new cluster
const createCluster = async (clusterData) => {
  try {
    const identityData = await awsService.getCallerIdentity(
      clusterData.awsAccessKey,
      clusterData.awsSecretKey,
      clusterData.awsRegion
    );
    
    const cluster = new Cluster({
      ...clusterData,
      awsAccountNumber: identityData.Account,
      status: clusterData.status || 'Active'
    });
    
    return await cluster.save();
  } catch (error) {
    logger.error('Error creating cluster:', error);
    throw new Error(`Cluster creation failed: ${error.message}`);
  }
};

// Find cluster by ID
const findClusterById = async (id) => {
  try {
    return await Cluster.findById(id);
  } catch (error) {
    logger.error('Error finding cluster by ID:', error);
    throw new Error('Database error when finding cluster');
  }
};

// Find cluster by name
const findClusterByName = async (clusterName) => {
  try {
    return await Cluster.findOne({ clusterName });
  } catch (error) {
    logger.error('Error finding cluster by name:', error);
    throw new Error('Database error when finding cluster by name');
  }
};

// Update cluster
const updateCluster = async (id, updateData) => {
  try {
    return await Cluster.findByIdAndUpdate(id, updateData, { new: true });
  } catch (error) {
    logger.error('Error updating cluster:', error);
    throw new Error(`Cluster update failed: ${error.message}`);
  }
};

// Delete cluster
const deleteCluster = async (id) => {
  try {
    return await Cluster.findByIdAndDelete(id);
  } catch (error) {
    logger.error('Error deleting cluster:', error);
    throw new Error(`Cluster deletion failed: ${error.message}`);
  }
};

export {
  createCluster,
  findClusterById,
  findClusterByName,
  updateCluster,
  deleteCluster
};