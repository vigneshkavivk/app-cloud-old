// server/controllers/awsController.js (ESM FORMAT)
import AWS from 'aws-sdk';
import CloudConnection from '../models/CloudConnectionModel.js';
import { encrypt, decrypt } from '../utils/encryption.js';

// ========================
// NEW: Live Pricing Logic
// ========================
const fetchPricingFromAws = async (serviceCode, region, filters = []) => {
  // Pricing API only available in us-east-1 & ap-south-1
  const pricing = new AWS.Pricing({ region: 'us-east-1' });

  const params = {
    ServiceCode: serviceCode,
    Filters: [
      { Type: 'TERM_MATCH', Field: 'location', Value: getAwsRegionName(region) },
      ...filters
    ],
    FormatVersion: 'aws_v1'
  };

  try {
    const data = await pricing.getProducts(params).promise();
    const prices = {};

    data.PriceList.forEach(product => {
      const productObj = JSON.parse(product);
      const terms = productObj.terms.OnDemand;
      const termKey = Object.keys(terms)[0];
      const priceDimensions = terms[termKey].priceDimensions;
      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey].pricePerUnit.USD);

      let key = 'default';
      if (serviceCode === 'AmazonEC2') {
        key = productObj.product.attributes.instanceType;
      } else if (serviceCode === 'AmazonS3') {
        key = productObj.product.attributes.storageClass || 'STANDARD';
      }

      if (!isNaN(pricePerUnit)) {
        prices[key] = pricePerUnit;
      }
    });

    return prices;
  } catch (err) {
    console.error(`Pricing fetch error for ${serviceCode}:`, err.message);
    return {};
  }
};

const getAwsRegionName = (regionCode) => {
  const map = {
    'us-east-1': 'US East (N. Virginia)',
    'us-west-2': 'US West (Oregon)',
    'eu-central-1': 'EU (Frankfurt)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-south-1': 'Asia Pacific (Mumbai)',
    // Add more as needed
  };
  return map[regionCode] || regionCode;
};

// ✅ NEW CONTROLLER FUNCTION
const getPricing = async (req, res) => {
  try {
    const { region, modules = [] } = req.body;

    if (!region) {
      return res.status(400).json({ success: false, error: 'Region is required' });
    }

    const pricing = {};

    if (modules.includes('ec2')) {
      pricing.ec2 = await fetchPricingFromAws('AmazonEC2', region, [
        { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
        { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
        { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
      ]);
    }

    if (modules.includes('s3')) {
      pricing.s3 = await fetchPricingFromAws('AmazonS3', region);
    }

    if (modules.includes('vpc')) {
      const natPricing = await fetchPricingFromAws('AmazonVPC', region, [
        { Type: 'TERM_MATCH', Field: 'usagetype', Value: `${region}-NatGateway-Hours` }
      ]);
      pricing.vpc = { natGateway: natPricing[Object.keys(natPricing)[0]] || 0.045 };
    }

    res.json({ success: true, pricing }); // ✅ Return { ec2: {}, s3: {}, vpc: {} }
  } catch (error) {
    console.error('Pricing API error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch live pricing' });
  }
};

// ========================
// EXISTING FUNCTIONS (UNCHANGED)
// ========================
const validateAWSCredentials = async (req, res) => {
  const { accessKeyId, secretAccessKey, region = 'us-east-1' } = req.body;
  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'Access key and secret key are required' });
  }
  try {
    const sts = new AWS.STS({ accessKeyId, secretAccessKey, region });
    await sts.getCallerIdentity().promise();
    res.json({ valid: true, message: 'AWS credentials are valid' });
  } catch (err) {
    console.error('AWS validation error:', err);
    res.status(401).json({ valid: false, error: 'Invalid AWS credentials' });
  }
};

const getVpcs = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ success: false, error: 'accountId (MongoDB ID) is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ success: false, error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const data = await ec2.describeVpcs({}).promise();
    const vpcs = data.Vpcs.map(vpc => ({
      id: vpc.VpcId,
      name: vpc.Tags?.find(tag => tag.Key === 'Name')?.Value || vpc.VpcId,
      cidrBlock: vpc.CidrBlock,
      state: vpc.State,
      isDefault: vpc.IsDefault
    }));
    res.json({ success: true, vpcs });
  } catch (err) {
    console.error('❌ VPC Fetch Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch VPCs', details: err.message });
  }
};

const connectToAWS = async (req, res) => {
  const { accessKeyId, secretAccessKey, region = 'us-east-1', accountName = '' } = req.body;
  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'Access key and secret key are required' });
  }
  try {
    const sts = new AWS.STS({ accessKeyId, secretAccessKey, region });
    const identity = await sts.getCallerIdentity().promise();
    let iamUserName = 'Unknown';
    if (identity.Arn && identity.Arn.includes('user/')) {
      iamUserName = identity.Arn.split('user/')[1];
    } else if (identity.Arn && identity.Arn.includes('assumed-role/')) {
      const parts = identity.Arn.split('/');
      iamUserName = parts.length > 2 ? parts[1] : 'AssumedRole';
    }
    const finalAccountName = accountName.trim() || iamUserName || identity.Account;
    const cloudConnection = new CloudConnection({
      awsAccessKey: encrypt(accessKeyId),
      awsSecretKey: encrypt(secretAccessKey),
      awsRegion: region,
      accountId: identity.Account,
      iamUserName,
      accountName: finalAccountName,
      userId: req.user?._id || 'anonymous',
      arn: identity.Arn,
    });
    await cloudConnection.save();
    res.json({ success: true, message: 'AWS account connected successfully' });
  } catch (err) {
    console.error('AWS connection error:', err);
    res.status(500).json({ error: 'Failed to connect AWS account', details: err.message });
  }
};

const getAWSAccounts = async (req, res) => {
  try {
    const accounts = await CloudConnection.find({}, 'accountId awsRegion arn userId iamUserName accountName');
    res.json(accounts);
  } catch (err) {
    console.error('Error fetching AWS accounts:', err);
    res.status(500).json({ error: 'Failed to fetch AWS accounts' });
  }
};

const removeAWSAccount = async (req, res) => {
  const { accountId } = req.params;
  try {
    const deleted = await CloudConnection.findOneAndDelete({ _id: accountId });
    if (!deleted) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ message: 'Account successfully removed' });
  } catch (err) {
    console.error('Error removing AWS account:', err);
    res.status(500).json({ error: 'Failed to remove account' });
  }
};

const getEksClusters = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId (MongoDB ID) is required' });
  }
  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }
    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';
    const eks = new AWS.EKS({ accessKeyId, secretAccessKey, region });
    const data = await eks.listClusters({}).promise();
    res.json({ clusters: data.clusters || [] });
  } catch (err) {
    console.error('❌ EKS Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch EKS clusters', details: err.message });
  }
};

// ========================
// EXPORTS
// ========================
export {
  validateAWSCredentials,
  connectToAWS,
  getAWSAccounts,
  removeAWSAccount,
  getVpcs,
  getEksClusters,
  getPricing // ✅ ADDED
};
