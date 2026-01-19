const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const CloudConnection = require('../models/CloudConnectionModel');
const logger = require('../utils/logger');
const { configureAWS } = require('../config/awsConfig');

// Validate AWS credentials
const validateAWSCredentials = async (req, res) => {
  const { accessKey, secretKey, region } = req.body;

  if (!accessKey || !secretKey) {
    return res.status(400).json({ error: 'Access Key and Secret Key are required' });
  }

  try {
    const awsConfig = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region || 'us-east-1'
    };

    const s3 = new AWS.S3(awsConfig);
    const data = await s3.listBuckets().promise();

    const sts = new AWS.STS(awsConfig);
    const identity = await sts.getCallerIdentity().promise();

    res.json({
      success: true,
      message: 'AWS credentials validated successfully',
      accountId: identity.Account,
      userId: identity.UserId,
      arn: identity.Arn,
      buckets: data.Buckets.map(b => b.Name)
    });
  } catch (error) {
    logger.error('AWS Credential Validation Error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid AWS credentials',
      details: error.message
    });
  }
};

// Connect to AWS and save connection details
const connectToAWS = async (req, res) => {
  const { accessKey, secretKey, region } = req.body;

  if (!accessKey || !secretKey) {
    return res.status(400).json({ error: 'Access key and secret key are required' });
  }

  try {
    const awsConfig = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region || 'us-east-1'
    };

    const sts = new AWS.STS(awsConfig);
    const s3 = new AWS.S3(awsConfig);

    const identity = await sts.getCallerIdentity().promise();
    const buckets = await s3.listBuckets().promise();

    const cloudConnection = new CloudConnection({
      awsAccessKey: accessKey,
      awsSecretKey: secretKey,
      awsRegion: region || 'us-east-1',
      accountId: identity.Account,
      userId: identity.UserId,
      arn: identity.Arn
    });

    await cloudConnection.save();

    res.json({
      message: 'Successfully connected to AWS and saved connection details',
      buckets: buckets.Buckets,
      accountInfo: {
        accountId: identity.Account,
        userId: identity.UserId,
        arn: identity.Arn
      }
    });
  } catch (error) {
    logger.error('AWS Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to connect to AWS',
      awsErrorCode: error.code
    });
  }
};

// Get all AWS accounts
const getAWSAccounts = async (req, res) => {
  try {
    const accounts = await CloudConnection.find();
    res.json(accounts);
  } catch (err) {
    logger.error('Error fetching accounts:', err);
    res.status(500).json({ error: 'Failed to fetch AWS accounts' });
  }
};

// Get EKS clusters for an account
const getEKSClusters = async (req, res) => {
  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({ error: 'Account ID is required' });
  }

  try {
    const account = await CloudConnection.findOne({ accountId });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const awsConfig = {
      accessKeyId: account.awsAccessKey,
      secretAccessKey: account.awsSecretKey,
      region: account.awsRegion || 'us-east-1',
    };

    const eks = new AWS.EKS(awsConfig);
    const clustersData = await eks.listClusters().promise();

    res.json({
      clusters: clustersData.clusters,
    });
  } catch (err) {
    logger.error('Error fetching EKS clusters:', err);
    res.status(500).json({ error: 'Failed to fetch EKS clusters' });
  }
};

// Remove AWS account
const removeAWSAccount = async (req, res) => {
  const { accountId } = req.params;

  logger.info(`Received request to delete account with ID: ${accountId}`);

  try {
    const deletedAccount = await CloudConnection.findOneAndDelete({ accountId });

    if (!deletedAccount) {
      logger.info('Account not found for deletion');
      return res.status(404).json({ error: 'Account not found' });
    }

    logger.info('Account deleted:', deletedAccount);
    res.json({ message: 'Account successfully removed' });
  } catch (error) {
    logger.error('Error during account deletion:', error);
    res.status(500).json({ error: 'Failed to remove account' });
  }
};

// Configure AWS credentials file
const configureAWSCredentials = async (req, res) => {
  const { awsAccessKey, awsSecretKey, awsRegion, outputFormat } = req.body;

  AWS.config.update({
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretKey,
    region: awsRegion || "us-east-1",
  });

  const sts = new AWS.STS();

  try {
    await sts.getCallerIdentity({}).promise();

    const awsCredentialsPath = path.join(require('os').homedir(), ".aws", "credentials");
    const awsConfigPath = path.join(require('os').homedir(), ".aws", "config");

    const credentialsContent = `
[default]
aws_access_key_id = ${awsAccessKey}
aws_secret_access_key = ${awsSecretKey}
    `;

    const configContent = `
[default]
region = ${awsRegion}
output = ${outputFormat}
    `;

    const awsDir = path.dirname(awsCredentialsPath);
    if (!fs.existsSync(awsDir)) {
      fs.mkdirSync(awsDir, { recursive: true });
    }

    fs.writeFileSync(awsCredentialsPath, credentialsContent.trim());
    fs.writeFileSync(awsConfigPath, configContent.trim());

    res.json({ message: "AWS credentials and config saved successfully!" });
  } catch (error) {
    logger.error("AWS Credential Verification/Configuration Error:", error);
    res.status(400).json({ error: "Invalid AWS credentials or configuration failed" });
  }
};

// Save AWS config
const saveAWSConfig = (req, res) => {
  const { accessKey, secretKey, region } = req.body;
  const config = { accessKey, secretKey, region };

  try {
    const configFilePath = path.join(__dirname, '../../config.json');
    let currentConfigs = [];
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf8');
      currentConfigs = JSON.parse(data);
    }
    currentConfigs.push(config);
    fs.writeFileSync(configFilePath, JSON.stringify(currentConfigs, null, 2));
    res.json({ message: 'Configuration saved successfully!', currentConfigs });
  } catch (error) {
    logger.error('Error saving configuration:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
};

// Verify AWS credentials
const verifyAWSCredentials = async (req, res) => {
  const { awsAccessKey, awsSecretKey } = req.body;

  const credentials = new AWS.Credentials(awsAccessKey, awsSecretKey);
  AWS.config.update({ credentials });

  const sts = new AWS.STS();

  try {
    const response = await sts.getCallerIdentity().promise();
    res.json({
      valid: true,
      data: {
        Account: response.Account,
        Arn: response.Arn
      }
    });
  } catch (error) {
    logger.error('Error verifying AWS credentials:', error);
    res.status(400).json({ valid: false, error: 'Invalid credentials' });
  }
};

module.exports = {
  validateAWSCredentials,
  connectToAWS,
  getAWSAccounts,
  getEKSClusters,
  removeAWSAccount,
  configureAWSCredentials,
  saveAWSConfig,
  verifyAWSCredentials
};