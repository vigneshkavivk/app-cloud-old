const AWS = require('aws-sdk');
const { configureAWS } = require('../config/awsConfig');
const logger = require('../utils/logger');

// Get caller identity from AWS
const getCallerIdentity = async (accessKey, secretKey, region = 'us-east-1') => {
  try {
    const aws = configureAWS(accessKey, secretKey, region);
    return await aws.sts.getCallerIdentity({}).promise();
  } catch (error) {
    logger.error('Error getting AWS caller identity:', error);
    throw new Error(`AWS Identity Error: ${error.message}`);
  }
};

// List S3 buckets
const listS3Buckets = async (accessKey, secretKey, region = 'us-east-1') => {
  try {
    const aws = configureAWS(accessKey, secretKey, region);
    return await aws.s3.listBuckets().promise();
  } catch (error) {
    logger.error('Error listing S3 buckets:', error);
    throw new Error(`AWS S3 Error: ${error.message}`);
  }
};

// List EKS clusters
const listEKSClusters = async (accessKey, secretKey, region = 'us-east-1') => {
  try {
    const aws = configureAWS(accessKey, secretKey, region);
    return await aws.eks.listClusters().promise();
  } catch (error) {
    logger.error('Error listing EKS clusters:', error);
    throw new Error(`AWS EKS Error: ${error.message}`);
  }
};

module.exports = {
  getCallerIdentity,
  listS3Buckets,
  listEKSClusters
};