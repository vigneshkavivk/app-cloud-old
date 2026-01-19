import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { decrypt } from '../utils/encryption.js';
import CloudConnection from '../models/CloudConnectionModel.js';
import DeploymentRecord from '../models/DeploymentRecord.js';
import { promisify } from 'util';
import Resource from '../models/ResourceModel.js'; // 👈 IMPORTANT

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// �� Generate state bucket name per AWS account
function getStateBucketName(awsAccountId) {
  if (!awsAccountId || awsAccountId === 'undefined') {
    throw new Error("AWS account ID is required for state bucket.");
  }
  const cleanId = awsAccountId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `cloudmasa-terraform-states-${cleanId}`;
}

// ===== TERRAFORM CODE GENERATOR =====
function generateTerraformCode(payload, account = null, deploymentId) {
  const { provider, region, modules, moduleConfig } = payload;
  const modulePath = modules.join('-');
  const accountId = account?.accountId || '000000000000';
  const stateBucketName = getStateBucketName(accountId);
  let code = '';
  code += `terraform {
  backend "s3" {
    bucket         = "${stateBucketName}"
    key            = "${modulePath}/deployments/${deploymentId}/terraform.tfstate"
    region         = "${region}"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
`;
  if (provider === 'aws') {
    code += `provider "aws" {
  region = "${region}"
}
`;
  }
  for (const moduleId of modules) {
    const config = moduleConfig[moduleId] || {};
    if (moduleId === "vpc") {
      const cidr = config.cidrBlock || "10.0.0.0/16";
      const subnetCount = config.subnetCount || 2;
      const publicSubnets = [];
      const privateSubnets = [];
      for (let i = 0; i < Math.ceil(subnetCount / 2); i++) {
        publicSubnets.push(`"10.0.${i + 1}.0/24"`);
        privateSubnets.push(`"10.0.${i + 1 + Math.ceil(subnetCount / 2)}.0/24"`);
      }
      code += `module "vpc" {
  source                 = "../../modules/vpc"
  project_name           = "cloudmasa-${config.name || "cloudmasa-deploy"}"
  vpc_cidr               = "${cidr}"
  public_subnet_cidrs    = [${publicSubnets.join(", ")}]
  private_subnet_cidrs   = [${privateSubnets.join(", ")}]
}
`;
    } else if (moduleId === 's3') {
      const environment = config.environment || "prod";
      const resourceName = (config.name?.trim() || 's3').toLowerCase().replace(/[^a-z0-9]/g, '');
      const shortTimestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(2, 8); // e.g., "251220" (YYMMDD)

      let desired = `cm-${resourceName}-${shortTimestamp}`;
      let finalPrefix = desired
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 20);
      if (finalPrefix.length < 3) {
        finalPrefix = `cm-s3-${shortTimestamp}`.substring(0, 20);
      }
      finalPrefix = finalPrefix.replace(/^-+|-+$/g, '');
      if (finalPrefix.length < 3) finalPrefix = 'cm-bucket';

      const storageClass = config.storageClass || "STANDARD";
      const enableVersioning = config.versioning !== false;
      const encryption = config.encryption || "AES256";
      const blockPublicAcls = config.blockPublicAcls !== false;
      const ignorePublicAcls = config.ignorePublicAcls !== false;
      const blockPublicPolicy = config.blockPublicPolicy !== false;
      const restrictPublicBuckets = config.restrictPublicBuckets !== false;

      code += `module "s3" {
  source               = "../../modules/s3"
  account_id           = "${accountId}"
  bucket_name_prefix   = "${finalPrefix}"
  environment          = "${environment}"
  storage_class        = "${storageClass}"
  versioning_enabled   = ${enableVersioning}
  encryption_type      = "${encryption}"
  block_public_acls    = ${blockPublicAcls}
  ignore_public_acls   = ${ignorePublicAcls}
  block_public_policy  = ${blockPublicPolicy}
  restrict_public_buckets = ${restrictPublicBuckets}
}
`;
    } else if (moduleId === 'dynamodb') {
      const dynamodb_table_name = config.name?.trim() || 'FileMetadataProd';
      const environment = config.environment || 'prod';
      code += `module "dynamodb" {
  source                 = "../../modules/dynamodb"
  dynamodb_table_name    = "cloudmasa-${dynamodb_table_name}"
  environment            = "${environment}"
}
`;
    } else if (moduleId === 'sns') {
      const topicName = (config.name?.trim() || 'default-topic').toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const displayName = config.displayName?.trim() || '';
      const email = config.emailSubscription?.trim() || '';
      code += `resource "aws_sns_topic" "sns_topic" {
  name = "${topicName}"
`;
      if (displayName) {
        code += `  display_name = "${displayName}"
`;
      }
      code += `}
`;
      if (email) {
        code += `resource "aws_sns_topic_subscription" "sns_email_sub" {
  topic_arn = aws_sns_topic.sns_topic.arn
  protocol  = "email"
  endpoint  = "${email}"
}
`;
      }
    } else if (moduleId === 'iam') {
      const iamConfig = moduleConfig[moduleId] || {};
      
      const create_user = iamConfig.create_user === true;
      const create_role = iamConfig.create_role === true;
      const user_name = (iamConfig.user_name || '').trim();
      const role_name = (iamConfig.role_name || '').trim();
      const assume_role_policy = iamConfig.assume_role_policy || '';
      const policy_document = iamConfig.policy_document || '';
      const environment = iamConfig.environment || 'prod';

      if (create_user && !user_name) {
        throw new Error('IAM User name is required when creating a user.');
      }
      if (create_role && !role_name) {
        throw new Error('IAM Role name is required when creating a role.');
      }
      if (create_role && !assume_role_policy) {
        throw new Error('Assume Role Policy (JSON) is required for IAM Roles.');
      }
      if (!create_user && !create_role) {
        throw new Error('Please select either "User" or "Role" in the IAM configuration.');
      }

      const escapedAssumePolicy = assume_role_policy.replace(/\n/g, '\\n').replace(/\r/g, '');
      const escapedInlinePolicy = policy_document.replace(/\n/g, '\\n').replace(/\r/g, '');

      code += `module "iam" {
  source              = "../../modules/iam"
  create_user         = ${create_user}
  create_role         = ${create_role}
  user_name           = "${create_user ? user_name : ''}"
  role_name           = "${create_role ? role_name : ''}"
  assume_role_policy  = ${assume_role_policy ? '<<-EOF\n' + escapedAssumePolicy + '\nEOF' : 'null'}
  policy_document     = ${policy_document ? '<<-EOF\n' + escapedInlinePolicy + '\nEOF' : 'null'}
  common_tags = {
    Environment = "${environment}"
    Project     = "CloudMasa"
    Owner       = "CloudUser"
  }
}
`;
    } else if (moduleId === 'ec2') {
      const ec2Config = {
        instance_name: config.name || 'ec2-instance',
        ami_id: config.amiId || 'ami-0c02fb55956c7d316',
        instance_type: config.instanceType || 't2.micro',
        key_name: config.keyName || 'your-existing-key',
        subnet_id: config.subnetId || '',
        security_group_id: config.securityGroupId || '',
        vpc_id: config.vpcId || '',
      };
      if (
        ec2Config.vpc_id &&
        ec2Config.vpc_id !== 'default' &&
        ec2Config.vpc_id !== 'use-selected-vpc'
      ) {
        if (!ec2Config.subnet_id || !ec2Config.security_group_id) {
          throw new Error('Subnet ID and Security Group ID are required for custom VPC');
        }
      }
      code += `module "ec2" {
  source            = "../../modules/ec2"
  instance_name     = "${ec2Config.instance_name}"
  ami_id            = "${ec2Config.ami_id}"
  instance_type     = "${ec2Config.instance_type}"
  key_name          = "${ec2Config.key_name}"
  subnet_id         = "${ec2Config.subnet_id}"
  security_group_id = "${ec2Config.security_group_id}"
  tags = {
    Project = "TerraformDemo"
    Owner   = "Vignesh"
  }
}
`;
    } else if (moduleId === 'lambda') {
      const functionName = config.functionName?.trim() || 'my-lambda-function';
      const runtime = config.runtime || 'python3.9';
      const handler = config.handler || 'lambda_function.lambda_handler';
      const environment = config.environment || 'prod';
      code += `module "lambda" {
  source               = "../../modules/lambda"
  lambda_function_name = "${functionName}"
  lambda_runtime       = "${runtime}"
  lambda_handler       = "${handler}"
  environment          = "${environment}"
  account_id           = "${accountId}"
  aws_region           = "${region}"
  s3_bucket_name       = ""
  s3_bucket_arn        = ""
  dynamodb_table_name  = ""
  dynamodb_table_arn   = ""
  validate_lambda_code = false
}
`;
    } else if (moduleId === 'ecr') {
      const repoName = config.name?.trim() || 'my-app-repo';
      const imageTagMutability = config.imageTagMutability || 'MUTABLE';
      const scanOnPush = config.scanOnPush !== false;
      code += `module "ecr" {
  source                 = "../../modules/ecr"
  repository_name    = "${repoName}"
  image_tag_mutability   = "${imageTagMutability}"
  scan_on_push           = ${scanOnPush}
}
`;
    } else if (moduleId === 'lb') {
      const lbConfig = {
        name: config.name?.trim() || 'cloudmasa-lb',
        lb_type: config.lbType || 'alb',
        vpc_id: config.vpcId || '',
        subnets: config.subnets || [],
        target_port: config.targetPort || 80,
        enable_https: config.enableHttps || false,
        certificate_arn: config.certificateArn || '',
      };
      if (!lbConfig.vpc_id) throw new Error('VPC ID is required for Load Balancer');
      if (!Array.isArray(lbConfig.subnets) || lbConfig.subnets.length === 0) {
        throw new Error('At least one subnet is required for Load Balancer');
      }
      if (lbConfig.lb_type === 'alb' && lbConfig.enable_https && !lbConfig.certificate_arn) {
        throw new Error('ACM Certificate ARN is required when HTTPS is enabled on ALB');
      }
      code += `module "lb" {
  source      = "../../modules/loadbalancer"
  name        = "${lbConfig.name}"
  lb_type     = "${lbConfig.lb_type}"
  vpc_id      = "${lbConfig.vpc_id}"
  subnets     = [${lbConfig.subnets.map(s => `"${s}"`).join(', ')}]
  target_port = ${lbConfig.target_port}
`;
      if (lbConfig.lb_type === 'alb') {
        code += `  enable_https = ${lbConfig.enable_https}
`;
        if (lbConfig.enable_https && lbConfig.certificate_arn) {
          code += `  certificate_arn = "${lbConfig.certificate_arn}"
`;
        }
      }
      code += `}
`;
    } else if (moduleId === 'kms') {
      const alias = config.alias?.trim().toLowerCase() || 'default-key';
      const cleanAlias = alias.replace(/[^a-z0-9-]/g, '-');
      const description = config.description || 'KMS key created via CloudWorkflow';
      const enableKeyRotation = config.enableKeyRotation !== false;
      if (!cleanAlias || !/^[a-z0-9][a-z0-9-]*$/.test(cleanAlias)) {
        throw new Error('KMS alias must be lowercase, start with letter/number, and contain only letters, numbers, or hyphens.');
      }
      code += `module "kms" {
  source              = "../../modules/kms"
  key_alias           = "${cleanAlias}"
  description         = "${description}"
  enable_key_rotation = ${enableKeyRotation}
  account_id          = "${accountId}"
}
`;
    } else if (moduleId === 'route53') {
      const domain = config.domainName?.trim().toLowerCase();
      const recordName = config.recordName?.trim() || '';
      const recordType = config.recordType || 'A';
      const target = config.target?.trim() || '';
      const routingPolicy = config.routingPolicy || 'simple';
      const enableHealthCheck = config.enableHealthCheck || false;
      const healthCheckUrl = config.healthCheckUrl?.trim() || '';
      const weight = config.weight || 100;
      const region = config.region || region;
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
        throw new Error('Valid domain name required (e.g., example.com)');
      }
      if (!target) throw new Error('Target (ALB DNS or CNAME) is required');
      let route53Block = `module "route53" {
  source              = "../../modules/route53"
  domain_name         = "${domain}"
  record_name         = "${recordName}"
  record_type         = "${recordType}"
  target              = "${target}"
  routing_policy      = "${routingPolicy}"
  enable_health_check = ${enableHealthCheck}
`;
      if (enableHealthCheck && healthCheckUrl) {
        route53Block += `  health_check_url = "${healthCheckUrl}"
`;
      }
      if (routingPolicy === 'weighted') {
        route53Block += `  weight = ${weight}
`;
      } else if (routingPolicy === 'latency') {
        route53Block += `  region = "${region}"
`;
      }
      route53Block += `}
`;
      code += route53Block;
    } else if (moduleId === 'efs') {
      const fileSystemName = (config.name?.trim() || 'cloudmasa-efs').replace(/[^a-zA-Z0-9-]/g, '-');
      const performanceMode = config.performanceMode || 'generalPurpose';
      const throughputMode = config.throughputMode || 'provisioned';
      const encrypted = config.encrypted !== false;
      const environment = config.environment || 'prod';
      const provisionedThroughput = throughputMode === 'provisioned' ? (config.provisionedThroughput || 100) : undefined;
      code += `module "efs" {
  source                 = "../../modules/efs"
  file_system_name       = "${fileSystemName}"
  performance_mode       = "${performanceMode}"
  throughput_mode        = "${throughputMode}"
  encrypted              = ${encrypted}
  environment            = "${environment}"
`;
      if (provisionedThroughput !== undefined) {
        code += `  provisioned_throughput_in_mibps = ${provisionedThroughput}
`;
      }
      code += `  tags = {
    Name        = "${fileSystemName}"
    Environment = "${environment}"
  }
}
`;
    } else if (moduleId === 'cloudtrail') {
      const trailName = (config.trailName?.trim() || 'cloudmasa-trail')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .substring(0, 128);
      const s3BucketName = config.s3BucketName?.trim() || '';
      const isMultiRegionTrail = config.isMultiRegionTrail !== false;
      const enableLogFileValidation = config.enableLogFileValidation || false;
      const includeGlobalServiceEvents = config.includeGlobalServiceEvents !== false;
      let bucketName = s3BucketName;
      if (!bucketName) {
        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
        bucketName = `cloudmasa-cloudtrail-${accountId}-${timestamp}`.toLowerCase();
        bucketName = bucketName.replace(/[^a-z0-9.-]/g, '-').substring(0, 63);
      }
      code += `module "cloudtrail" {
  source                      = "../../modules/cloudtrail"
  aws_account_id              = "${accountId}"
  region                      = "${region}"
  trail_name                  = "${trailName}"
  s3_bucket_name              = "${bucketName}"
  s3_key_prefix               = "cloudtrail"
  is_multi_region_trail       = ${isMultiRegionTrail}
  enable_log_file_validation  = ${enableLogFileValidation}
  include_global_service_events = ${includeGlobalServiceEvents}
  tags = {
    Project     = "cloudmasa"
    Environment = "prod"
    ManagedBy   = "terraform"
  }
}
`;
    } else if (moduleId === 'cloudwatch') {
      const applicationName = (config.applicationName?.trim() || 'cloudmasa-app')
        .replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const alertEmail = config.alertEmail?.trim() || 'alerts@cloudmasa.example.com';
      const logRetentionDays = config.logRetentionDays || 14;
      const ecsClusterName = config.ecsClusterName?.trim() || '';
      const albName = config.albName?.trim() || '';
      const environment = config.environment || 'prod';
      const owner = config.owner?.trim() || 'jaga';
      if (!alertEmail.includes('@')) {
        throw new Error(`Invalid alert_email: ${alertEmail}`);
      }
      code += `module "cloudwatch" {
  source               = "../../modules/CloudWatch"
  application_name     = "${applicationName}"
  alert_email          = "${alertEmail}"
  log_retention_days   = ${logRetentionDays}
  aws_region           = "${region}"
  ${ecsClusterName ? `ecs_cluster_name = "${ecsClusterName}"` : '# ecs_cluster_name not provided'}
  ${albName ? `alb_name = "${albName}"` : '# alb_name not provided'}
  common_tags = {
    Environment = "${environment}"
    Project     = "cloudmasa"
    Owner       = "${owner}"
    ManagedBy   = "terraform"
  }
}
`;
    }
  }
  return code;
}

// ===== ADVANCED RESOURCE EXTRACTOR =====
function deepExtractAttributes(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepExtractAttributes);
  if (obj.constant_value !== undefined) return deepExtractAttributes(obj.constant_value);
  if (obj.computed === true) return null;
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'sensitive_attributes' || key.startsWith('__')) continue;
    result[key] = deepExtractAttributes(val);
  }
  return result;
}

function extractResourcesFromModule(module, resources = []) {
  if (Array.isArray(module.resources)) {
    module.resources.forEach(resource => {
      const addr = resource.address || 'unknown';
      const name = resource.name || addr.split('.').pop() || 'unknown';
      const type = resource.type || 'unknown';
      const provider = resource.provider_name || 'aws';
      let attrs = {};
      if (resource.values && typeof resource.values === 'object') {
        attrs = deepExtractAttributes(resource.values);
      }
      const tags = (attrs.tags || attrs.tag || {});
      const nameFromTags = tags.Name || tags.name || name;
      resources.push({
        id: addr,
        name: nameFromTags,
        type,
        provider,
        attributes: attrs,
        status: 'active'
      });
    });
  }
  if (Array.isArray(module.child_modules)) {
    module.child_modules.forEach(child => {
      extractResourcesFromModule(child, resources);
    });
  }
  return resources;
}

// 🔧 BOOTSTRAP: Create S3 + DynamoDB if not exists
async function bootstrapStateBackend(deployDir, region, accountId, env) {
  const bootstrapDir = path.join(__dirname, '../../../terraform/bootstrap');
  const workDir = path.join(deployDir, '.bootstrap');
  await fs.mkdir(workDir, { recursive: true });
  await fs.cp(bootstrapDir, workDir, { recursive: true });
  const tfvars = `aws_account_id = "${accountId}"
region = "${region}"`;
  await fs.writeFile(path.join(workDir, 'terraform.tfvars'), tfvars);
  await execAsync('terraform init', { cwd: workDir, env });
  await execAsync('terraform apply -auto-approve', { cwd: workDir, env });
}

// ================== EXPORTED CONTROLLERS ==================

export async function deploy(req, res) {
  const userId = req.user._id;
  const { provider, region, modules, moduleConfig, account } = req.body;
  if (!account || !account._id) {
    return res.status(400).json({ success: false, error: "No valid AWS account selected." });
  }
  const fullAccount = await CloudConnection.findById(account._id);
  if (!fullAccount) {
    return res.status(404).json({ success: false, error: "AWS account not found" });
  }
  const accountIdForRecord = fullAccount._id;
  const realAwsAccountId = fullAccount.accountId;
  const awsAccessKeyId = decrypt(fullAccount.awsAccessKey);
  const awsSecretAccessKey = decrypt(fullAccount.awsSecretKey);
  if (!realAwsAccountId || realAwsAccountId === 'undefined') {
    return res.status(400).json({ success: false, error: "Invalid AWS account ID." });
  }
  const deploymentId = `dep-${Date.now()}`;
  const deployDir = path.join(__dirname, '../../../terraform/deployments', deploymentId);
  try {
    await fs.mkdir(deployDir, { recursive: true });
    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: awsAccessKeyId,
      AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
      AWS_DEFAULT_REGION: region
    };
    try {
      await bootstrapStateBackend(deployDir, region, realAwsAccountId, env);
    } catch (err) {
      const msg = err.message || '';
      if (!msg.includes('BucketAlreadyExists') && !msg.includes('ResourceInUseException')) {
        throw new Error(`Bootstrap failed: ${err.message}`);
      }
      console.log(`✅ Backend exists for account ${realAwsAccountId}. Proceeding.`);
    }
    const tfCode = generateTerraformCode(req.body, { accountId: realAwsAccountId }, deploymentId);
    await fs.writeFile(path.join(deployDir, 'main.tf'), tfCode);
    await execAsync('terraform init', { cwd: deployDir, env });
    const logPath = path.join(deployDir, 'deploy.log');
    await fs.writeFile(logPath, '[INFO] Starting terraform apply...\n');
    const apply = exec('terraform apply -auto-approve', { cwd: deployDir, env, shell: true });
    let stdoutData = '';
    apply.stdout.on('data', (data) => {
      stdoutData += data;
      fs.appendFile(logPath, data);
    });
    apply.stderr.on('data', (data) => fs.appendFile(logPath, `[ERROR] ${data}`));
    apply.on('close', async (code) => {
      const status = code === 0 ? 'success' : 'failed';
      try {
        await fs.appendFile(logPath, `\n[INFO] Apply ${status} (exit code: ${code})\n`);
      } catch (err) {
        console.error('Log append error:', err);
      }
      let resources = [];
      if (status === 'success') {
        try {
          const { stdout } = await execAsync('terraform show -json', { cwd: deployDir, env });
          const state = JSON.parse(stdout);
          if (state?.values?.root_module) {
            resources = extractResourcesFromModule(state.values.root_module);
          }
          if (resources.length === 0) {
            const lines = stdoutData.split('\n');
            const resourceSet = new Set();
            lines.forEach(line => {
              const match = line.match(/^(\w+\.\w+[\w-]*): Creation complete/);
              if (match) resourceSet.add(match[1]);
            });
            resourceSet.forEach(id => {
              resources.push({ id, name: id.split('.').pop(), type: id.split('.')[0], provider, attributes: {}, status: 'active' });
            });
          }
          const record = new DeploymentRecord({
            userId,
            provider,
            region,
            modules,
            moduleConfig,
            deploymentId,
            accountId: accountIdForRecord,
            status,
            resources
          });
          await record.save();
          
          // ✅ Save each resource to 'Resource' collection
          for (const r of resources) {
            const typeMap = {
              'aws_s3_bucket': 'S3Bucket',
              'aws_instance': 'EC2Instance',
              'aws_dynamodb_table': 'DynamoDBTable',
              'aws_vpc': 'VPC',
              'aws_subnet': 'Subnet',
              'aws_security_group': 'SecurityGroup',
              'aws_sns_topic': 'SNS',
              'aws_iam_role': 'IAMRole',
              'aws_iam_user': 'IAMUser'
            };
            const resourceType = typeMap[r.type] || 'TerraformDeployment';

            const doc = new Resource({
              cloudConnectionId: accountIdForRecord,
              awsAccountId: realAwsAccountId,
              region,
              resourceId: r.id,
              name: r.name || r.id.split('.').pop(),
              resourceType,
              source: 'terraform',
              deploymentId,
              tags: r.attributes?.tags || {},
              discoveredAt: new Date(),
              status: 'active'
            });
            await doc.save().catch(e => console.warn('⚠️ Resource save failed:', e.message));
          }

          console.log(`✅ State stored at: s3://${getStateBucketName(realAwsAccountId)}/${modules.join('-')}/deployments/${deploymentId}/terraform.tfstate`);
        } catch (err) {
          console.error('Save record error:', err);
        }
      }
      setTimeout(async () => {
        try { await fs.rm(deployDir, { recursive: true, force: true }); } catch {}
      }, 5000);
      res.json({ success: true, deploymentId, status });
    });
  } catch (err) {
    console.error('Deploy error:', err);
    try { await fs.rm(deployDir, { recursive: true, force: true }); } catch {}
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getLogs(req, res) {
  const { deploymentId } = req.params;
  const logPath = path.join(__dirname, `../../../terraform/deployments/${deploymentId}/deploy.log`);
  try {
    const logs = await fs.readFile(logPath, 'utf8');
    res.send(logs);
  } catch {
    res.status(404).send('Logs not ready or cleaned up');
  }
}

// ✅ ✅ ✅ FINAL: destroyResource — HARD DELETE (ONLY ONE VERSION)
export async function destroyResource(req, res) {
  const { deploymentId, resourceId } = req.body;

  if (!resourceId || typeof resourceId !== 'string' || resourceId.trim() === '') {
    return res.status(400).json({ success: false, error: "Invalid resource ID." });
  }

  // 🔒 Ensure user owns deployment AND this resourceId
  const deployment = await DeploymentRecord.findOne({ 
    deploymentId, 
    userId: req.user._id,
    "resources.id": resourceId
  });
  
  if (!deployment) {
    return res.status(404).json({ success: false, error: 'Deployment or resource not found.' });
  }

  const account = await CloudConnection.findById(deployment.accountId);
  if (!account) {
    return res.status(400).json({ success: false, error: 'Account missing.' });
  }

  const realAwsAccountId = account.accountId;
  if (!realAwsAccountId || realAwsAccountId === 'undefined') {
    return res.status(400).json({ success: false, error: "Invalid AWS account ID." });
  }

  const deployDir = path.join(__dirname, '../../../terraform/deployments', deploymentId);
  await fs.mkdir(deployDir, { recursive: true });

  const tfCode = generateTerraformCode({
    provider: deployment.provider,
    region: deployment.region,
    modules: deployment.modules,
    moduleConfig: deployment.moduleConfig
  }, { accountId: realAwsAccountId }, deploymentId);

  await fs.writeFile(path.join(deployDir, 'main.tf'), tfCode);

  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: decrypt(account.awsAccessKey),
    AWS_SECRET_ACCESS_KEY: decrypt(account.awsSecretKey),
    AWS_DEFAULT_REGION: deployment.region
  };

  try {
    await execAsync('terraform init', { cwd: deployDir, env });
  } catch (err) {
    await fs.rm(deployDir, { recursive: true, force: true }).catch(() => {});
    return res.status(500).json({ success: false, error: `Init failed: ${err.message}` });
  }

  const destroy = exec(`terraform destroy -target="${resourceId}" -auto-approve`, { cwd: deployDir, env, shell: true });

  destroy.stderr.on('data', (d) => console.error(`[Destroy stderr]`, d.toString().trim()));

  destroy.on('close', async (code) => {
    await fs.rm(deployDir, { recursive: true, force: true }).catch(() => {});

    if (code === 0) {
      // ✅ 1. REMOVE the resource from DeploymentRecord's resources array
      await DeploymentRecord.updateOne(
        { _id: deployment._id },
        { $pull: { resources: { id: resourceId } } }
      );

      // ✅ 2. DELETE the Resource document from Resource collection (HARD DELETE)
      const deleteResult = await Resource.deleteOne({
        cloudConnectionId: deployment.accountId,
        resourceId: resourceId
      });

      if (deleteResult.deletedCount === 0) {
        console.warn(`⚠️ No resource found to delete for resourceId: ${resourceId}`);
      } else {
        console.log(`✅ Resource ${resourceId} HARD DELETED from MongoDB`);
      }

      res.json({ success: true, message: '✅ Resource destroyed and permanently deleted from database.' });

    } else {
      res.status(500).json({ success: false, error: 'Destroy failed.' });
    }
  });
}

// ✅ ✅ ✅ FINAL: destroyDeployment — HARD DELETE (ONLY ONE VERSION)
export async function destroyDeployment(req, res) {
  const { deploymentId, accountId } = req.body;

  if (!deploymentId) {
    return res.status(400).json({ success: false, error: 'deploymentId required' });
  }
  if (!accountId) {
    return res.status(400).json({ success: false, error: 'accountId required' });
  }

  const deployment = await DeploymentRecord.findOne({ 
    deploymentId, 
    accountId 
  });

  if (!deployment) {
    return res.status(404).json({ 
      success: false, 
      error: 'Deployment not found or access denied.' 
    });
  }

  const account = await CloudConnection.findById(accountId);
  if (!account) {
    return res.status(400).json({ success: false, error: 'Account not found.' });
  }

  const realAwsAccountId = account.accountId;
  if (!realAwsAccountId || realAwsAccountId === 'undefined') {
    return res.status(400).json({ success: false, error: "Invalid AWS account ID." });
  }

  const deployDir = path.join(__dirname, '../../../terraform/deployments', deploymentId);
  await fs.mkdir(deployDir, { recursive: true });

  const tfCode = generateTerraformCode({
    provider: deployment.provider,
    region: deployment.region,
    modules: deployment.modules,
    moduleConfig: deployment.moduleConfig
  }, { accountId: realAwsAccountId }, deploymentId);

  await fs.writeFile(path.join(deployDir, 'main.tf'), tfCode);

  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: decrypt(account.awsAccessKey),
    AWS_SECRET_ACCESS_KEY: decrypt(account.awsSecretKey),
    AWS_DEFAULT_REGION: deployment.region
  };

  try {
    await execAsync('terraform init', { cwd: deployDir, env });
    await execAsync('terraform destroy -auto-approve', { cwd: deployDir, env });

    // ✅ 1. DELETE the DeploymentRecord document (HARD DELETE)
    const depDeleteResult = await DeploymentRecord.deleteOne({ _id: deployment._id });
    console.log(`✅ DeploymentRecord deleted:`, depDeleteResult.deletedCount);

    // ✅ 2. DELETE ALL Resource docs linked to this deployment (HARD DELETE)
    const resDeleteResult = await Resource.deleteMany({
      cloudConnectionId: accountId,
      deploymentId: deploymentId
    });
    console.log(`✅ Resources deleted:`, resDeleteResult.deletedCount);

    await fs.rm(deployDir, { recursive: true, force: true }).catch(() => {});

    res.json({ 
      success: true, 
      message: `✅ Deployment ${deploymentId} destroyed and permanently deleted from database.` 
    });

  } catch (err) {
    console.error('Destroy error:', err);
    await fs.rm(deployDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Terraform destroy failed' 
    });
  }
}

// ✅ ADDED: getResources — required by /resources route
export async function getResources(req, res) {
  const { accountId } = req.query;

  if (!accountId) {
    return res.status(400).json({ success: false, error: 'accountId query param required' });
  }

  try {
    // 🔁 Find deployments by accountId, NOT userId
    const deployments = await DeploymentRecord
      .find({ 
        accountId: accountId,
        status: 'success' 
      })
      .sort({ createdAt: -1 })
      .lean();

    const results = deployments.map(dep => ({
      deploymentId: dep.deploymentId,
      region: dep.region,
      accountId: dep.accountId.toString(),
      modules: dep.modules || [],
      moduleConfig: dep.moduleConfig || {},
      resources: (dep.resources || [])
        .filter(r => r && r.status !== 'destroyed' && r.id),
      createdAt: dep.createdAt
    }));

    res.json({ success: true, deployments: results });
  } catch (err) {
    console.error('getResources error:', err);
    res.status(500).json({ success: false, error: 'DB error' });
  }
}

// ===== SCAN & SAVE MANUAL RESOURCES =====
export async function scanAndSaveExistingResources(req, res) {
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });

  try {
    const conn = await CloudConnection.findById(accountId);
    if (!conn) return res.status(404).json({ error: 'Account not found' });

    // Import AWS SDK dynamically
    const AWS = (await import('aws-sdk')).default;
    const config = {
      region: conn.awsRegion || 'us-east-1',
      credentials: {
        accessKeyId: decrypt(conn.awsAccessKey),
        secretAccessKey: decrypt(conn.awsSecretKey)
      }
    };

    const s3 = new AWS.S3(config);
    const ec2 = new AWS.EC2(config);
    const ddb = new AWS.DynamoDB(config);

    // 🟢 S3 Buckets
    const s3Res = await s3.listBuckets().promise();
    const s3List = s3Res.Buckets?.map(b => ({
      awsResourceId: `arn:aws:s3:::${b.Name}`,
      resourceType: 'S3Bucket',
      name: b.Name
    })) || [];

    // 🟢 EC2 Instances
    const ec2Res = await ec2.describeInstances().promise();
    const ec2List = ec2Res.Reservations?.flatMap(r =>
      r.Instances?.map(i => ({
        awsResourceId: i.InstanceId,
        resourceType: 'EC2Instance',
        name: i.Tags?.find(t => t.Key === 'Name')?.Value || i.InstanceId
      })) || []
    ) || [];

    // 🟢 DynamoDB Tables
    const ddbRes = await ddb.listTables().promise();
    const ddbList = ddbRes.TableNames?.map(n => ({
      awsResourceId: `arn:aws:dynamodb:${config.region}:${conn.accountId}:table/${n}`,
      resourceType: 'DynamoDBTable',
      name: n
    })) || [];

    const all = [...s3List, ...ec2List, ...ddbList];

    // Save each to MongoDB
    for (const r of all) {
      await Resource.findOneAndUpdate(
        { cloudConnectionId: conn._id, awsResourceId: r.awsResourceId },
        {
          ...r,
          cloudConnectionId: conn._id,
          awsAccountId: conn.accountId,
          region: config.region,
          source: 'manual',
          deploymentId: null,
          tags: {},
          discoveredAt: new Date(),
          status: 'active'
        },
        { upsert: true }
      );
    }

    res.json({ success: true, count: all.length, message: `✅ ${all.length} resources saved` });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: err.message });
  }
}

