// server/controllers/awsController.js
import AWS from 'aws-sdk';
import CloudConnection from '../models/CloudConnectionModel.js';
import Cluster from '../models/ClusterModel.js'; // Required for cascade delete
import { encrypt, decrypt } from '../utils/encryption.js';

// ========================
// Pricing Logic (UNCHANGED)
// ========================
const fetchPricingFromAws = async (serviceCode, region, filters = [], awsConfig = null) => {
  if (!awsConfig || !awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
    throw new Error('AWS credentials missing for Pricing API');
  }

  const pricingConfig = {
    region: 'us-east-1',
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey
  };

  const pricing = new AWS.Pricing(pricingConfig);
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
      const productObj = typeof product === 'string' ? JSON.parse(product) : product;

      const terms = productObj.terms?.OnDemand;
      if (!terms) return;

      const termKey = Object.keys(terms)[0];
      const priceDimensions = terms[termKey]?.priceDimensions;
      if (!priceDimensions) return;

      const priceKey = Object.keys(priceDimensions)[0];
      const pricePerUnit = parseFloat(priceDimensions[priceKey]?.pricePerUnit?.USD);
      let key = 'default';

      if (serviceCode === 'AmazonEC2') {
        key = productObj.product?.attributes?.instanceType || 'default';
      } else if (serviceCode === 'AmazonS3') {
        key = productObj.product?.attributes?.storageClass || 'STANDARD';
      }

      if (!isNaN(pricePerUnit)) {
        prices[key] = pricePerUnit;
      }
    });

    return prices;
  } catch (err) {
    console.error(`Pricing fetch error for ${serviceCode}:`, {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      retryable: err.retryable
    });
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
  };
  return map[regionCode] || regionCode;
};

// ========================
// VALIDATE CREDENTIALS
// ========================
const validateAWSCredentials = async (req, res) => {
  const { accessKeyId, secretAccessKey, region = 'us-east-1' } = req.body;
  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'Access key and secret key are required' });
  }
  try {
    const config = { accessKeyId, secretAccessKey, region };
    const sts = new AWS.STS(config);
    const identity = await sts.getCallerIdentity().promise();
    const accountId = identity.Account;
    const arn = identity.Arn;
    const roleArn = `arn:aws:iam::${accountId}:role/CostExplorerAccessRole`;

    let accountAlias = null;
    try {
      const iam = new AWS.IAM(config);
      const aliases = await iam.listAccountAliases().promise();
      accountAlias = aliases.AccountAliases?.[0] || null;
    } catch (err) {
      // Ignore
    }

    let suggestedName = accountId;
    if (accountAlias) {
      suggestedName = accountAlias;
    } else if (arn.includes('user/')) {
      suggestedName = arn.split('user/')[1].split('/')[0];
    } else if (arn.includes('assumed-role/')) {
      const parts = arn.split('/');
      suggestedName = parts.length > 2 ? parts[1] : accountId;
    }

    res.json({
      valid: true,
      accountId,
      accountAlias,
      suggestedName,
      arn,
      roleArn,
      message: 'AWS credentials are valid',
    });
  } catch (err) {
    console.error('AWS validation error:', err.message || err);
    res.status(401).json({
      valid: false,
      error: err.message || 'Invalid AWS credentials',
    });
  }
};

// ========================
// CONNECT TO AWS
// ========================
const connectToAWS = async (req, res) => {
  const { accessKeyId, secretAccessKey, region = 'us-east-1', accountName = '', roleArn = '' } = req.body;
  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ error: 'Access key and secret key are required' });
  }
  try {
    const sts = new AWS.STS({ accessKeyId, secretAccessKey, region });
    const identity = await sts.getCallerIdentity().promise();

    const existingConnection = await CloudConnection.findOne({
      accountId: identity.Account,
      awsRegion: region
    });
    if (existingConnection) {
      return res.json({
        success: true,
        message: `✅ ${identity.Account} already connected in ${region}.`,
        reused: true
      });
    }

    let iamUserName = 'Unknown';
    if (identity.Arn && identity.Arn.includes('user/')) {
      iamUserName = identity.Arn.split('user/')[1];
    } else if (identity.Arn && identity.Arn.includes('assumed-role/')) {
      const parts = identity.Arn.split('/');
      iamUserName = parts.length > 2 ? parts[1] : 'AssumedRole';
    }
    const finalAccountName = accountName.trim() || iamUserName || identity.Account;
    const finalRoleArn = roleArn || `arn:aws:iam::${identity.Account}:role/CostExplorerAccessRole`;

    const cloudConnection = new CloudConnection({
      awsAccessKey: encrypt(accessKeyId),
      awsSecretKey: encrypt(secretAccessKey),
      awsRegion: region,
      accountId: identity.Account,
      iamUserName,
      accountName: finalAccountName,
      userId: req.user?._id || 'anonymous',
      arn: identity.Arn,
      roleArn: finalRoleArn,
    });
    await cloudConnection.save();
    res.json({ success: true, message: 'AWS account connected successfully' });
  } catch (err) {
    console.error('AWS connection error:', err);
    res.status(500).json({ error: 'Failed to connect AWS account', details: err.message });
  }
};

// ========================
// GET AWS ACCOUNTS
// ========================
const getAWSAccounts = async (req, res) => {
  try {
    const accounts = await CloudConnection.find({}, 'accountId awsRegion arn userId iamUserName accountName roleArn');
    res.json(accounts);
  } catch (err) {
    console.error('Error fetching AWS accounts:', err);
    res.status(500).json({ error: 'Failed to fetch AWS accounts' });
  }
};

// ========================
// DELETE AWS ACCOUNT + CASCADE DELETE CLUSTERS
// ========================
const removeAWSAccount = async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    return res.status(400).json({ error: 'Account ID (_id) is required' });
  }

  try {
    const connection = await CloudConnection.findById(_id);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }

    const { accountId } = connection;
    const result = await Cluster.deleteMany({
      $or: [
        { account: accountId },
        { cloudConnectionId: _id }
      ]
    });

    console.log(`✅ Deleted ${result.deletedCount} clusters for account: ${accountId}`);
    await CloudConnection.findByIdAndDelete(_id);

    res.json({
      message: 'AWS account and its associated clusters deleted successfully from database',
      clustersDeleted: result.deletedCount,
      success: true
    });
  } catch (err) {
    console.error('❌ Error during deletion:', err);
    res.status(500).json({
      error: 'Failed to delete AWS account and related clusters',
      details: err.message
    });
  }
};

// ========================
// GET VPCS + SUBNETS + SECURITY GROUPS
// ========================
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

    const vpcData = await ec2.describeVpcs({}).promise();
    const enrichedVpcs = await Promise.all(
      vpcData.Vpcs.map(async (vpc) => {
        const vpcId = vpc.VpcId;

        const subnetData = await ec2.describeSubnets({
          Filters: [{ Name: 'vpc-id', Values: [vpcId] }]
        }).promise();
        const subnets = subnetData.Subnets.map(subnet => ({
          id: subnet.SubnetId,
          name: subnet.Tags?.find(tag => tag.Key === 'Name')?.Value || subnet.SubnetId,
          availabilityZone: subnet.AvailabilityZone,
          cidrBlock: subnet.CidrBlock,
          state: subnet.State,
          isPublic: subnet.MapPublicIpOnLaunch
        }));

        const sgData = await ec2.describeSecurityGroups({
          Filters: [{ Name: 'vpc-id', Values: [vpcId] }]
        }).promise();
        const securityGroups = sgData.SecurityGroups.map(sg => ({
          id: sg.GroupId,
          name: sg.GroupName,
          description: sg.Description
        }));

        return {
          id: vpc.VpcId,
          name: vpc.Tags?.find(tag => tag.Key === 'Name')?.Value || vpc.VpcId,
          cidrBlock: vpc.CidrBlock,
          state: vpc.State,
          isDefault: vpc.IsDefault,
          subnets,
          securityGroups
        };
      })
    );

    res.json({ success: true, vpcs: enrichedVpcs });
  } catch (err) {
    console.error('❌ VPC Fetch Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch VPCs, subnets, or security groups',
      details: err.message 
    });
  }
};

// ========================
// GET FULL EKS CLUSTERS
// ========================
const getEksClusters = async (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId (MongoDB _id) is required' });
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
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });

    const listResult = await eks.listClusters({}).promise();
    const clusterNames = listResult.clusters || [];

    const clusterDetails = await Promise.all(
      clusterNames.map(async (name) => {
        try {
          const { cluster } = await eks.describeCluster({ name }).promise();
          const dbCluster = await Cluster.findOne({ name: cluster.name, account: connection.accountId });

          const ec2Params = {
            Filters: [
              { Name: `tag:kubernetes.io/cluster/${name}`, Values: ['owned', 'shared'] },
              { Name: 'instance-state-name', Values: ['running'] }
            ]
          };
          const ec2Data = await ec2.describeInstances(ec2Params).promise();
          let liveNodeCount = 0;
          ec2Data.Reservations.forEach(res => {
            liveNodeCount += res.Instances.length;
          });

          const statusMap = {
            'ACTIVE': 'running',
            'CREATING': 'creating',
            'DELETING': 'deleting',
            'FAILED': 'failed'
          };
          const displayStatus = statusMap[cluster.status] || cluster.status.toLowerCase();

          return {
            _id: dbCluster?._id || `${connection._id}-${name}`,
            dbId: dbCluster?._id || null,
            name: cluster.name,
            status: displayStatus,
            region: cluster.region,
            version: cluster.version,
            account: connection.accountId,
            accountName: connection.accountName,
            liveNodeCount,
            endpoint: cluster.endpoint,
            createdAt: cluster.createdAt,
            isSaved: !!dbCluster
          };
        } catch (err) {
          console.warn(`⚠️ Failed to describe cluster "${name}":`, err.message);
          return null;
        }
      })
    );

    res.json(clusterDetails.filter(Boolean));
  } catch (err) {
    console.error('❌ EKS Fetch Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch EKS clusters',
      details: err.message 
    });
  }
};

// ========================
// GET PRICING
// ========================
const getPricing = async (req, res) => {
  try {
    const { region, modules = [], accountId: connectionId } = req.body;
    if (!region || !connectionId) {
      return res.status(400).json({ success: false, error: 'Region and AWS account connection ID are required' });
    }

    const connection = await CloudConnection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ success: false, error: 'AWS connection not found' });
    }

    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const pricing = {};
    const pricingConfig = { accessKeyId, secretAccessKey, region: 'us-east-1' };

    if (modules.includes('ec2')) {
      pricing.ec2 = await fetchPricingFromAws('AmazonEC2', region, [
        { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
        { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
        { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
      ], pricingConfig);
    }
    if (modules.includes('s3')) {
      pricing.s3 = await fetchPricingFromAws('AmazonS3', region, [], pricingConfig);
    }
    if (modules.includes('vpc')) {
      pricing.vpc = await fetchPricingFromAws('AmazonVPC', region, [
        { Type: 'TERM_MATCH', Field: 'usagetype', Value: `${region}-NatGateway-Hours` }
      ], pricingConfig);
    }
    if (modules.includes('lambda')) {
      pricing.lambda = { requests: 0.0000002, duration: 0.0000166667 };
    }
    if (modules.includes('dynamodb')) {
      pricing.dynamodb = { read: 0.25, write: 1.25, storage: 0.25 };
    }
    if (modules.includes('kms')) {
      pricing.kms = { key: 1.0 };
    }
    if (modules.includes('route53')) {
      pricing.route53 = { hostedZone: 0.5 };
    }
    if (modules.includes('efs')) {
      pricing.efs = { storage: 0.30 };
    }
    if (modules.includes('sns')) {
      pricing.sns = { publish: 0.5 / 1e6, sms: 0.00645 };
    }
    if (modules.includes('cloudwatch')) {
      pricing.cloudwatch = { logs: 0.57, metrics: 0.30 };
    }
    if (modules.includes('ecr')) {
      pricing.ecr = { storage: 0.10 };
    }
    if (modules.includes('lb')) {
      pricing.lb = { alb: 0.0225, nlb: 0.0225, gwlb: 0.012 };
    }

    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Pricing API error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch live pricing', details: error.message });
  }
};

// ========================
// FETCH AMIs
// ========================
const getAmis = async (req, res) => {
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
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });

    const params = {
      Filters: [
        { Name: 'state', Values: ['available'] },
        { Name: 'architecture', Values: ['x86_64', 'arm64'] }
      ]
    };

    const data = await ec2.describeImages(params).promise();

    const amis = data.Images.map(image => ({
      id: image.ImageId,
      name: image.Name || image.ImageId,
      description: image.Description || '',
      os: image.PlatformDetails || image.Platform || 'Unknown',
      architecture: image.Architecture,
      virtualizationType: image.VirtualizationType,
      creationDate: image.CreationDate
    }));

    res.json({ success: true, amis });
  } catch (err) {
    console.error('❌ AMI Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AMIs',
      details: err.message
    });
  }
};

// ========================
// FETCH KEY PAIRS
// ========================
const getKeyPairs = async (req, res) => {
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
    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });

    const data = await ec2.describeKeyPairs().promise();

    const keyPairs = data.KeyPairs.map(kp => ({
      name: kp.KeyName,
      fingerprint: kp.KeyFingerprint,
      // You can add more fields if needed
    }));

    res.json({ success: true, keyPairs });
  } catch (err) {
    console.error('❌ Key Pair Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Key Pairs',
      details: err.message
    });
  }
};

// ========================
// ✅ FETCH AVAILABLE AVAILABILITY ZONES FOR A REGION
// ========================
const getAvailabilityZones = async (req, res) => {
  const { accountId, region } = req.body;
  if (!accountId || !region) {
    return res.status(400).json({ error: 'accountId and region are required' });
  }

  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }

    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);

    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });

    const data = await ec2.describeAvailabilityZones({
      Filters: [
        { Name: 'state', Values: ['available'] }
      ]
    }).promise();

    const azs = data.AvailabilityZones.map(az => ({
      name: az.ZoneName,
      group: az.GroupName,
      state: az.State
    }));

    res.json({ success: true, availabilityZones: azs });
  } catch (err) {
    console.error('❌ AZ Fetch Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Availability Zones',
      details: err.message
    });
  }
};

// ========================
// ✅ FETCH ALL EC2 INSTANCE TYPES (TOP-LEVEL)
// ========================
const getInstanceTypes = async (req, res) => {
  console.log("✅ getInstanceTypes called with body:", req.body);
  console.log("✅ User from auth middleware:", req.user); // Should NOT be undefined

  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }

  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }

    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';

    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });

    const instanceTypes = [];
    let nextToken = null;
    do {
      const params = nextToken ? { NextToken: nextToken } : {};
      const data = await ec2.describeInstanceTypes(params).promise();
      instanceTypes.push(...data.InstanceTypes);
      nextToken = data.NextToken;
    } while (nextToken);

    const formatted = instanceTypes
      .map(it => ({
        name: it.InstanceType,
        vCpus: it.VCpuInfo?.DefaultVCpus || 0,
        memoryGiB: Math.round((it.MemoryInfo?.SizeInMiB || 0) / 1024),
        family: it.InstanceType.split('.')[0]
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, instanceTypes: formatted });
  } catch (err) {
    console.error('Failed to fetch instance types:', err);
    res.status(500).json({ error: 'Failed to fetch instance types', details: err.message });
  }
};

// ========================
// FETCH TERRAFORM (IaC) RESOURCES ONLY
// ========================
const getAccountResources = async (req, res) => {
  const { accountId } = req.query;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId (MongoDB _id) is required' });
  }

  try {
    const connection = await CloudConnection.findById(accountId);
    if (!connection) {
      return res.status(404).json({ error: 'AWS account connection not found' });
    }

    const accessKeyId = decrypt(connection.awsAccessKey);
    const secretAccessKey = decrypt(connection.awsSecretKey);
    const region = connection.awsRegion || 'us-east-1';

    const ec2 = new AWS.EC2({ accessKeyId, secretAccessKey, region });
    const s3 = new AWS.S3({ accessKeyId, secretAccessKey, region });
    const lambda = new AWS.Lambda({ accessKeyId, secretAccessKey, region });

    const [ec2Data, s3Data, lambdaData] = await Promise.all([
      ec2.describeInstances({}).promise().catch(() => ({ Reservations: [] })),
      s3.listBuckets({}).promise().catch(() => ({ Buckets: [] })),
      lambda.listFunctions({}).promise().catch(() => ({ Functions: [] }))
    ]);

    const isTerraformResource = (tags = []) => {
      if (!Array.isArray(tags)) return false;
      const tagMap = Object.fromEntries(tags.map(t => [t.Key?.toLowerCase(), t.Value?.toLowerCase()]));
      return (
        tagMap['terraform'] === 'true' ||
        tagMap['createdby'] === 'terraform' ||
        tagMap['tf']?.startsWith('aws_') ||
        tagMap['managed_by'] === 'terraform' ||
        tagMap['iac']?.includes('terraform')
      );
    };

    const terraformResources = { ec2: [], s3: [], lambda: [], total: 0 };

    ec2Data.Reservations.flatMap(r => r.Instances || []).forEach(inst => {
      if (isTerraformResource(inst.Tags)) {
        terraformResources.ec2.push({
          id: inst.InstanceId,
          name: inst.Tags?.find(t => t.Key === 'Name')?.Value || inst.InstanceId,
          type: 'EC2',
          state: inst.State.Name,
          region
        });
      }
    });

    const bucketSamples = s3Data.Buckets?.slice(0, 20) || [];
    for (const bucket of bucketSamples) {
      try {
        const tagRes = await s3.getBucketTagging({ Bucket: bucket.Name }).promise();
        const tags = tagRes.TagSet || [];
        if (isTerraformResource(tags)) {
          terraformResources.s3.push({
            id: bucket.Name,
            name: bucket.Name,
            type: 'S3',
            region
          });
        }
      } catch (err) {
        if (err.code !== 'NoSuchTagSet' && err.code !== 'AccessDenied') {
          console.warn(`S3 tagging error for ${bucket.Name}:`, err.code);
        }
      }
    }

    lambdaData.Functions?.forEach(fn => {
      const tags = Object.entries(fn.Tags || {}).map(([k, v]) => ({ Key: k, Value: v }));
      if (isTerraformResource(tags)) {
        terraformResources.lambda.push({
          id: fn.FunctionName,
          name: fn.FunctionName,
          type: 'Lambda',
          runtime: fn.Runtime,
          region
        });
      }
    });

    terraformResources.total =
      terraformResources.ec2.length +
      terraformResources.s3.length +
      terraformResources.lambda.length;

    res.status(200).json({
      success: true,
      iacOnly: true,
      provider: 'aws',
      accountId: connection.accountId,
      region,
      resources: terraformResources
    });

  } catch (err) {
    console.error('❌ getAccountResources (IaC-only) error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to scan for IaC resources',
      details: err.message
    });
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
  getPricing,
  getInstanceTypes,
  getAmis,
  getKeyPairs,
  getAvailabilityZones,
  getAccountResources
};

