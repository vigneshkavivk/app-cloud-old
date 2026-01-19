// ✅ terraform.js — FULLY FIXED (safe deployment_id injection + IAM uniqueness + ✅ AUTO LOCAL CLEANUP after S3 state save)
import { Router } from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import CloudConnection from '../models/CloudConnectionModel.js';
import DatabaseActivity from '../models/DatabaseActivityModel.js';
import { decrypt } from '../utils/encryption.js';
import { promisify } from 'util';
import AWS from 'aws-sdk';

const execAsync = promisify(exec);
const router = Router();
const APP_CLOUD_BASE_PATH = '/home/ubuntu/app-cloud';

const dbTypeMap = {
  mongodb: 'mongodb',
  mysql: 'mysql',
  postgresql: 'postgresql',
  influxdb: 'influxdb',
  victoriametrics: 'victoriametrics',
  couchbase: 'couchbase',
  mariadb: 'mariadb',
  liquibase: 'liquibase',
  docdb: 'docdb',
};

function getStateBucketName(awsAccountId) {
  if (!awsAccountId || awsAccountId === 'undefined') {
    throw new Error('AWS account ID is required for state bucket.');
  }
  const cleanId = awsAccountId.replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(12, '0').slice(0, 12);
  return `cloudmasa-terraform-states-${cleanId}`;
}

function parseDbParameters(paramStr) {
  if (!paramStr) return [];
  if (Array.isArray(paramStr)) return paramStr.map(p => ({
    name: String(p.name || ''),
    value: String(p.value || '')
  })).filter(p => p.name);
  try {
    const parsed = JSON.parse(paramStr);
    if (Array.isArray(parsed)) {
      return parsed.map(p => ({
        name: String(p.name || ''),
        value: String(p.value || '')
      })).filter(p => p.name);
    }
  } catch {}
  const params = [];
  const parts = paramStr.split(/,\s*(?=\bname\s*=)/i);
  for (let part of parts) {
    const nameMatch = part.match(/name\s*=\s*["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/i);
    const valueMatch = part.match(/value\s*=\s*["']?([^"']*)["']?/i);
    if (nameMatch && valueMatch) {
      params.push({
        name: nameMatch[1],
        value: valueMatch[1].trim()
      });
    }
  }
  return params;
}

async function bootstrapBackend(bucketName, region, env) {
  const bootstrapDir = path.join(APP_CLOUD_BASE_PATH, 'terraform-databases', 'bootstrap');
  const workDir = path.join(APP_CLOUD_BASE_PATH, 'tmp', `bootstrap-${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });
  await fs.cp(bootstrapDir, workDir, { recursive: true });

  const tfvarsContent = `bucket_name = "${bucketName}"
region = "${region}"`;
  await fs.writeFile(path.join(workDir, 'terraform.tfvars'), tfvarsContent);

  try {
    console.log(`🔧 Initializing Terraform in ${workDir} for backend setup...`);
    await execAsync('terraform init', { cwd: workDir, env });
    console.log(`✅ Terraform initialized.`);
    console.log(`🚀 Applying Terraform configuration in ${workDir}...`);
    await execAsync('terraform apply -auto-approve', { cwd: workDir, env });
    console.log(`✅ Backend resources created: s3://${bucketName}`);
  } catch (err) {
    const stderr = (err.stderr || '').toLowerCase();
    const isBucketExists = stderr.includes('bucketalreadyexists');
    const isTableExists = stderr.includes('resourceinuseexception') && stderr.includes('table already exists');
    if (isBucketExists || isTableExists) {
      console.log(`✅ Backend resources already exist: s3://${bucketName}, dynamodb://terraform-locks`);
    } else {
      console.error(`❌ Bootstrap failed: ${err.message}`);
      throw new Error(`Backend setup failed: ${err.message}`);
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ✅ Fetch VPCs
router.get('/vpcs', async (req, res) => {
  const { awsAccountId } = req.query;
  if (!awsAccountId) return res.status(400).json({ error: 'awsAccountId required' });
  try {
    const accountDoc = await CloudConnection.findById(awsAccountId);
    if (!accountDoc) return res.status(404).json({ error: 'AWS account not found' });

    const awsAccessKeyId = decrypt(accountDoc.awsAccessKey);
    const awsSecretAccessKey = decrypt(accountDoc.awsSecretKey);
    const region = accountDoc.awsRegion || 'us-east-1';

    const ec2 = new AWS.EC2({ accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey, region });
    const data = await ec2.describeVpcs({}).promise();

    const vpcs = data.Vpcs.map(vpc => ({
      id: vpc.VpcId,
      cidr: vpc.CidrBlock,
      isDefault: vpc.IsDefault || false,
      state: vpc.State,
      tags: (vpc.Tags || []).reduce((acc, t) => ({ ...acc, [t.Key]: t.Value }), {}),
    }));
    res.json(vpcs);
  } catch (err) {
    console.error('Failed to fetch VPCs:', err);
    res.status(500).json({ error: 'Failed to fetch VPCs' });
  }
});

// ✅ Fetch Subnets
router.get('/subnets', async (req, res) => {
  const { awsAccountId, vpcId } = req.query;
  if (!awsAccountId || !vpcId) return res.status(400).json({ error: 'awsAccountId and vpcId required' });

  try {
    const accountDoc = await CloudConnection.findById(awsAccountId);
    if (!accountDoc) return res.status(404).json({ error: 'AWS account not found' });

    const awsAccessKeyId = decrypt(accountDoc.awsAccessKey);
    const awsSecretAccessKey = decrypt(accountDoc.awsSecretKey);
    const region = accountDoc.awsRegion || 'us-east-1';

    const ec2 = new AWS.EC2({ accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey, region });
    const data = await ec2.describeSubnets({
      Filters: [{ Name: 'vpc-id', Values: [vpcId] }],
    }).promise();

    const subnets = data.Subnets.map(sub => ({
      id: sub.SubnetId,
      cidr: sub.CidrBlock,
      availabilityZone: sub.AvailabilityZone,
      isPublic: sub.MapPublicIpOnLaunch,
      state: sub.State,
      tags: (sub.Tags || []).reduce((acc, t) => ({ ...acc, [t.Key]: t.Value }), {}),
    }));
    res.json(subnets);
  } catch (err) {
    console.error('Failed to fetch Subnets:', err);
    res.status(500).json({ error: 'Failed to fetch Subnets' });
  }
});

// 🔍 Utility: Check if module supports `deployment_id`
async function moduleSupportsVariable(modulePath, varName = 'deployment_id') {
  const variablesPath = path.join(modulePath, 'variables.tf');
  try {
    const content = await fs.readFile(variablesPath, 'utf8');
    const regex = new RegExp(`variable\\s+"${varName}"\\s*{`, 'm');
    return regex.test(content);
  } catch (e) {
    console.warn(`⚠️ Could not read ${variablesPath}: ${e.message}`);
    return false;
  }
}

// 🔁 Helper: Sanitize & map UI input → Terraform-compatible tfvars
// ✅ FIXED mapUiToTfVars — fully type-aware, supports both RDS and non-RDS databases
function mapUiToTfVars(variables, dbType) {
  const tfVars = { ...variables };

  // ✅ RENAME legacy UI keys (universal)
  if (tfVars.name && !tfVars.environment) {
    tfVars.environment = tfVars.name;
  }
  if (tfVars.dbname && !tfVars.db_name) {
    tfVars.db_name = tfVars.dbname;
  }
  if (tfVars.subnet_ids && !tfVars.private_subnet_ids) {
    tfVars.private_subnet_ids = Array.isArray(tfVars.subnet_ids)
      ? tfVars.subnet_ids
      : tfVars.subnet_ids.split(',').map(s => s.trim()).filter(Boolean);
  }

  const normalizedDbType = dbType.toLowerCase();

  // ✅ MYSQL SPECIFIC: mysql only
  if (normalizedDbType === 'mysql') {
    // Parse arrays
    const arrayKeys = ['private_subnet_ids', 'security_group_ids', 'enabled_cloudwatch_logs_exports'];
    arrayKeys.forEach(key => {
      if (tfVars[key]) {
        if (typeof tfVars[key] === 'string') {
          tfVars[key] = tfVars[key].split(',').map(s => s.trim()).filter(Boolean);
        } else if (!Array.isArray(tfVars[key])) {
          tfVars[key] = [String(tfVars[key])];
        }
      } else {
        tfVars[key] = [];
      }
    });

    // ✅ DO NOT parse db_parameters for MySQL - use defaults instead
    // MySQL doesn't need custom db_parameters like PostgreSQL does
    
    // Normalize booleans
    const boolKeys = [
      'multi_az', 'skip_final_snapshot', 'deletion_protection',
      'copy_tags_to_snapshot', 'auto_minor_version_upgrade', 'iam_auth_enabled'
    ];
    boolKeys.forEach(k => {
      if (k in tfVars) {
        tfVars[k] = String(tfVars[k]).toLowerCase() === 'true';
      }
    });

    // Normalize numbers
    const numKeys = ['allocated_storage', 'backup_retention_period', 'monitoring_interval'];
    numKeys.forEach(k => {
      if (k in tfVars) {
        const val = Number(tfVars[k]);
        tfVars[k] = isNaN(val) ? 0 : val;
      }
    });

    // Set defaults for MySQL
    const defaults = {
      aws_region: 'us-east-1',
      instance_class: 'db.t3.micro',
      allocated_storage: 20,
      backup_retention_period: 7,
      monitoring_interval: 60,
      skip_final_snapshot: true,
      deletion_protection: false,
      copy_tags_to_snapshot: true,
      auto_minor_version_upgrade: true,
      iam_auth_enabled: false,
      ca_cert_identifier: 'rds-ca-rsa2048-g1',
      enabled_cloudwatch_logs_exports: ['error', 'general', 'slowquery'], // MySQL specific logs
      multi_az: false,
    };

    Object.entries(defaults).forEach(([k, v]) => {
      if (!(k in tfVars) || tfVars[k] === '' || tfVars[k] == null) {
        tfVars[k] = v;
      }
    });

    // Validate required
    const required = [
      'environment', 'db_name', 'db_username', 'db_password',
      'vpc_id', 'private_subnet_ids',
    ];
    const missing = required.filter(k => {
      if (k === 'private_subnet_ids') return !Array.isArray(tfVars[k]) || tfVars[k].length === 0;
      return !(k in tfVars) || (!tfVars[k] && tfVars[k] !== false);
    });
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }

    // Remove UI-only keys before passing to module
    const unsupportedForModule = ['name', 'dbname', 'subnet_ids', 'db_parameters']; // ✅ Add db_parameters
    const cleanVars = {};
    for (const [k, v] of Object.entries(tfVars)) {
      if (!unsupportedForModule.includes(k)) {
        cleanVars[k] = v;
      }
    }
    return cleanVars;

  // ✅ POSTGRESQL: has db_parameters support
  } else if (normalizedDbType === 'postgresql') {
    // Parse arrays
    const arrayKeys = ['private_subnet_ids', 'security_group_ids', 'enabled_cloudwatch_logs_exports'];
    arrayKeys.forEach(key => {
      if (tfVars[key]) {
        if (typeof tfVars[key] === 'string') {
          tfVars[key] = tfVars[key].split(',').map(s => s.trim()).filter(Boolean);
        } else if (!Array.isArray(tfVars[key])) {
          tfVars[key] = [String(tfVars[key])];
        }
      } else {
        tfVars[key] = [];
      }
    });

    // ✅ Parse db_parameters for PostgreSQL
    if ('db_parameters' in tfVars) {
      tfVars.db_parameters = parseDbParameters(tfVars.db_parameters);
    }

    // Normalize booleans
    const boolKeys = [
      'multi_az', 'skip_final_snapshot', 'deletion_protection',
      'copy_tags_to_snapshot', 'auto_minor_version_upgrade', 'iam_auth_enabled'
    ];
    boolKeys.forEach(k => {
      if (k in tfVars) {
        tfVars[k] = String(tfVars[k]).toLowerCase() === 'true';
      }
    });

    // Normalize numbers
    const numKeys = ['allocated_storage', 'backup_retention_period', 'monitoring_interval'];
    numKeys.forEach(k => {
      if (k in tfVars) {
        const val = Number(tfVars[k]);
        tfVars[k] = isNaN(val) ? 0 : val;
      }
    });

    // Set defaults for PostgreSQL
    const defaults = {
      aws_region: 'us-east-1',
      instance_class: 'db.t3.micro',
      allocated_storage: 20,
      backup_retention_period: 7,
      monitoring_interval: 60,
      skip_final_snapshot: true,
      deletion_protection: false,
      copy_tags_to_snapshot: true,
      auto_minor_version_upgrade: true,
      iam_auth_enabled: false,
      ca_cert_identifier: 'rds-ca-rsa2048-g1',
      enabled_cloudwatch_logs_exports: ['postgresql'],
      db_parameters: [],
      multi_az: false,
    };

    Object.entries(defaults).forEach(([k, v]) => {
      if (!(k in tfVars) || tfVars[k] === '' || tfVars[k] == null) {
        tfVars[k] = v;
      }
    });

    // Validate required
    const required = [
      'environment', 'db_name', 'db_username', 'db_password',
      'vpc_id', 'private_subnet_ids',
    ];
    const missing = required.filter(k => {
      if (k === 'private_subnet_ids') return !Array.isArray(tfVars[k]) || tfVars[k].length === 0;
      return !(k in tfVars) || (!tfVars[k] && tfVars[k] !== false);
    });
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }

    // Remove UI-only keys before passing to module
    const unsupportedForModule = ['name', 'dbname', 'subnet_ids']; // ✅ Don't exclude db_parameters for PostgreSQL
    const cleanVars = {};
    for (const [k, v] of Object.entries(tfVars)) {
      if (!unsupportedForModule.includes(k)) {
        cleanVars[k] = v;
      }
    }
    return cleanVars;

  // ✅ MARIADB: similar to mysql
  } else if (normalizedDbType === 'mariadb') {
    // Parse arrays
    const arrayKeys = ['private_subnet_ids', 'security_group_ids', 'enabled_cloudwatch_logs_exports'];
    arrayKeys.forEach(key => {
      if (tfVars[key]) {
        if (typeof tfVars[key] === 'string') {
          tfVars[key] = tfVars[key].split(',').map(s => s.trim()).filter(Boolean);
        } else if (!Array.isArray(tfVars[key])) {
          tfVars[key] = [String(tfVars[key])];
        }
      } else {
        tfVars[key] = [];
      }
    });

    // ✅ DO NOT parse db_parameters for MariaDB - use defaults instead
    // MariaDB doesn't need custom db_parameters like PostgreSQL does
    
    // Normalize booleans
    const boolKeys = [
      'multi_az', 'skip_final_snapshot', 'deletion_protection',
      'copy_tags_to_snapshot', 'auto_minor_version_upgrade', 'iam_auth_enabled'
    ];
    boolKeys.forEach(k => {
      if (k in tfVars) {
        tfVars[k] = String(tfVars[k]).toLowerCase() === 'true';
      }
    });

    // Normalize numbers
    const numKeys = ['allocated_storage', 'backup_retention_period', 'monitoring_interval'];
    numKeys.forEach(k => {
      if (k in tfVars) {
        const val = Number(tfVars[k]);
        tfVars[k] = isNaN(val) ? 0 : val;
      }
    });

    // Set defaults for MariaDB
    const defaults = {
      aws_region: 'us-east-1',
      instance_class: 'db.t3.micro',
      allocated_storage: 20,
      backup_retention_period: 7,
      monitoring_interval: 60,
      skip_final_snapshot: true,
      deletion_protection: false,
      copy_tags_to_snapshot: true,
      auto_minor_version_upgrade: true,
      iam_auth_enabled: false,
      ca_cert_identifier: 'rds-ca-rsa2048-g1',
      enabled_cloudwatch_logs_exports: ['error', 'general', 'slowquery'], // MariaDB specific logs
      multi_az: false,
    };

    Object.entries(defaults).forEach(([k, v]) => {
      if (!(k in tfVars) || tfVars[k] === '' || tfVars[k] == null) {
        tfVars[k] = v;
      }
    });

    // Validate required
    const required = [
      'environment', 'db_name', 'db_username', 'db_password',
      'vpc_id', 'private_subnet_ids',
    ];
    const missing = required.filter(k => {
      if (k === 'private_subnet_ids') return !Array.isArray(tfVars[k]) || tfVars[k].length === 0;
      return !(k in tfVars) || (!tfVars[k] && tfVars[k] !== false);
    });
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }

    // Remove UI-only keys before passing to module
    const unsupportedForModule = ['name', 'dbname', 'subnet_ids', 'db_parameters']; // ✅ Add db_parameters
    const cleanVars = {};
    for (const [k, v] of Object.entries(tfVars)) {
      if (!unsupportedForModule.includes(k)) {
        cleanVars[k] = v;
      }
    }
    return cleanVars;

  // ✅ DOCDB
  } else if (normalizedDbType === 'docdb') {
    // Parse arrays
    const arrayKeys = ['private_subnet_ids', 'security_group_ids', 'enabled_cloudwatch_logs_exports'];
    arrayKeys.forEach(key => {
      if (tfVars[key]) {
        if (typeof tfVars[key] === 'string') {
          tfVars[key] = tfVars[key].split(',').map(s => s.trim()).filter(Boolean);
        } else if (!Array.isArray(tfVars[key])) {
          tfVars[key] = [String(tfVars[key])];
        }
      } else {
        tfVars[key] = [];
      }
    });

    // ✅ Normalize booleans (only supported ones)
    const boolKeys = ['skip_final_snapshot', 'deletion_protection'];
    boolKeys.forEach(k => {
      if (k in tfVars) {
        tfVars[k] = String(tfVars[k]).toLowerCase() === 'true';
      }
    });

    // ✅ Normalize numbers
    const numKeys = ['backup_retention_period'];
    numKeys.forEach(k => {
      if (k in tfVars) {
        const val = Number(tfVars[k]);
        tfVars[k] = isNaN(val) ? 7 : val;
      }
    });

    // ✅ Add optional instance control
    if ('instance_class' in tfVars) {
      // pass through
    } else {
      tfVars.instance_class = 'db.t3.medium'; // or pull from UI default
    }

    if ('instance_count' in tfVars) {
      tfVars.instance_count = Math.max(1, parseInt(tfVars.instance_count) || 1);
    } else {
      tfVars.instance_count = 1;
    }

    // ✅ Set defaults
    const defaults = {
      environment: tfVars.environment || tfVars.name || 'default',
      db_username: tfVars.db_username || '',
      db_password: tfVars.db_password || '',
      backup_retention_period: 7,
      skip_final_snapshot: true,
      deletion_protection: false,
      enabled_cloudwatch_logs_exports: ['audit', 'profiler'],
      private_subnet_ids: [],
      security_group_ids: [],
      instance_class: 'db.t3.medium',
      instance_count: 1,
    };

    Object.entries(defaults).forEach(([k, v]) => {
      if (!(k in tfVars) || tfVars[k] === '' || tfVars[k] == null) {
        tfVars[k] = v;
      }
    });

    // ✅ Validate required
    const required = [
      'environment', 'db_username', 'db_password', 'private_subnet_ids'
    ];
    
    const missing = required.filter(k => {
      if (k === 'private_subnet_ids') return !Array.isArray(tfVars[k]) || tfVars[k].length < 2;
      return !(k in tfVars) || (!tfVars[k] && tfVars[k] !== false);
    });
    
    if (missing.length > 0) {
      throw new Error(`Missing required variables for DocumentDB: ${missing.join(', ')}`);
    }

    // ✅ Remove unsupported keys (CRITICAL!)
    const unsupported = [
      'db_name', 'dbname', 'allocated_storage', 'monitoring_interval',
      'copy_tags_to_snapshot', 'auto_minor_version_upgrade',
      'ca_cert_identifier', 'db_parameters', 'multi_az', 'iam_auth_enabled',
      'vpc_id', 'name', 'subnet_ids'
    ];

    const cleanVars = {};
    for (const [k, v] of Object.entries(tfVars)) {
      if (!unsupported.includes(k)) {
        cleanVars[k] = v;
      }
    }

    return cleanVars;

  // ✅ NON-RDS (EC2/Container) DBs
  } else if (['influxdb', 'victoriametrics', 'couchbase', 'liquibase'].includes(normalizedDbType)) {
    return {
      environment: tfVars.environment || tfVars.name || 'default',
      db_name: tfVars.db_name || tfVars.dbname || '',
      db_username: tfVars.db_username || '',
      db_password: tfVars.db_password || '',
    };

  // ✅ Unknown
  } else {
    console.warn(`⚠️ Unknown dbType: "${dbType}" — falling back to minimal vars`);
    return {
      environment: tfVars.environment || tfVars.name || 'default',
    };
  }
} // ← This was missing - closes the mapUiToTfVars function

// ✅ FIXED deploy — safe `deployment_id` injection + ✅ AUTO LOCAL CLEANUP
router.post('/deploy', async (req, res) => {
  const { dbType, awsAccountId, actionType = 'create', variables = {} } = req.body;

  if (!dbType) return res.status(400).json({ error: 'dbType is required' });
  if (!awsAccountId) return res.status(400).json({ error: 'awsAccountId is required' });

  const normalizedDbType = dbType.toLowerCase();
  const folderName = dbTypeMap[normalizedDbType];
  if (!folderName) return res.status(400).json({ error: `Unsupported db: ${dbType}` });

  const accountDoc = await CloudConnection.findById(awsAccountId);
  if (!accountDoc) return res.status(404).json({ error: 'AWS account not found' });

  const awsAccessKeyId = decrypt(accountDoc.awsAccessKey);
  const awsSecretAccessKey = decrypt(accountDoc.awsSecretKey);
  const awsRegion = accountDoc.awsRegion || 'us-east-1';
  const realAwsAccountId = accountDoc.accountId;

  if (!realAwsAccountId) {
    return res.status(400).json({ error: 'Invalid AWS account ID in database' });
  }

  const deploymentId = `db-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const deployDir = path.join(APP_CLOUD_BASE_PATH, 'terraform-databases', 'deployments', deploymentId);
  await fs.mkdir(deployDir, { recursive: true });

  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: awsAccessKeyId,
    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
    AWS_DEFAULT_REGION: awsRegion,
  };

  const stateBucketName = getStateBucketName(realAwsAccountId);

  try {
    await bootstrapBackend(stateBucketName, awsRegion, env);
  } catch (err) {
    return res.status(500).json({ error: `Backend setup failed: ${err.message}` });
  }

  const moduleDir = path.resolve(APP_CLOUD_BASE_PATH, 'terraform-databases', 'modules', folderName);

  let tfVars;
  try {
    tfVars = mapUiToTfVars(variables, normalizedDbType);
  } catch (err) {
    return res.status(400).json({ error: `Validation failed: ${err.message}` });
  }

  // 🛠️ Resolve final vars + check if module supports `deployment_id`
  const supportsDeploymentId = await moduleSupportsVariable(moduleDir, 'deployment_id');
  const suffix = supportsDeploymentId
    ? ''
    : `-${deploymentId.substring(deploymentId.length - 6)}`;

  if (normalizedDbType === 'postgresql') {
    tfVars.environment = tfVars.environment + suffix;
  }

  const mainTfContent = `
terraform {
  backend "s3" {
    bucket         = "${stateBucketName}"
    key            = "database/${normalizedDbType}/${deploymentId}/terraform.tfstate"
    region         = "${awsRegion}"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "${awsRegion}"
}

module "database" {
  source = "${moduleDir}"
${Object.entries(tfVars)
  .map(([k, v]) => {
    if (k === 'vpc_id') return '';
    if (k === 'deployment_id' && !supportsDeploymentId) return '';
    if (Array.isArray(v)) {
      if (k === 'db_parameters') {
        const items = v.map(item =>
          `{ name = "${(item.name || '').replace(/"/g, '\\"')}", value = "${(item.value || '').replace(/"/g, '\\"')}" }`
        ).join(',\n    ');
        return `  ${k} = [\n    ${items}\n  ]`;
      } else {
        const quoted = v.map(x => `"${String(x).replace(/"/g, '\\"')}"`).join(', ');
        return `  ${k} = [${quoted}]`;
      }
    } else if (typeof v === 'boolean') {
      return `  ${k} = ${v}`;
    } else if (typeof v === 'number') {
      return `  ${k} = ${v}`;
    } else if (typeof v === 'string') {
      return `  ${k} = "${v.replace(/"/g, '\\"')}"`;
    } else {
      return `  ${k} = "${String(v).replace(/"/g, '\\"')}"`;
    }
  })
  .filter(line => line.trim() !== '')
  .join('\n')}
${supportsDeploymentId ? `  deployment_id = "${deploymentId}"` : ''}
}
`.trim();

  await fs.writeFile(path.join(deployDir, 'main.tf'), mainTfContent);
  console.log(`📄 Generated main.tf for ${dbType} (ID: ${deploymentId})`);

  const inputDbName = variables.db_name?.trim() || variables.dbname?.trim() || 'Unnamed DB';

  const logEntry = new DatabaseActivity({
    action: 'in-progress',
    dbType,
    awsAccountId,
    awsAccountName: accountDoc.accountName || accountDoc.accountId,
    deploymentId,
    isDeploying: true,
    statusMessage: 'Initializing...',
    variables: JSON.stringify(variables),
    dbName: inputDbName,
    vpcId: variables.vpc_id || '',
    subnetIds: variables.subnet_ids || [],
  });
  await logEntry.save();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  const runTerraformExec = async (command, args = []) => {
    const fullCommand = `terraform ${command} ${args.join(' ')}`;
    try {
      const result = await execAsync(fullCommand, { cwd: deployDir, env, shell: true });
      if (result.stdout) sendEvent({ output: result.stdout });
      if (result.stderr) sendEvent({ output: result.stderr });
      return result;
    } catch (err) {
      sendEvent({ status: 'error', output_error: err.stderr || err.stdout || err.message });
      throw err;
    }
  };

  try {
    sendEvent({ message: '🚀 Initializing Terraform...' });
    await runTerraformExec('init', ['-input=false', '-upgrade']);

    const actionLabel = actionType === 'destroy' ? 'Destroying' : 'Creating';
    sendEvent({ message: `${actionLabel} ${dbType} (ID: ${deploymentId})...` });

    if (actionType === 'destroy') {
      await runTerraformExec('destroy', ['-auto-approve', '-input=false']);
    } else {
      await runTerraformExec('apply', ['-auto-approve', '-input=false']);
    }

    let endpoint = '';
    let actualResourceName = inputDbName;
    let dbIdentifier = '';
    if (actionType !== 'destroy') {
      try {
        const outputRes = await execAsync('terraform output -json', { cwd: deployDir, env });
        const outputs = JSON.parse(outputRes.stdout);
        endpoint = outputs.endpoint?.value || outputs.address?.value || '';
        dbIdentifier = outputs.db_instance_identifier?.value || outputs.identifier?.value || '';
        actualResourceName = outputs.db_name?.value || variables.db_name || variables.dbname || dbIdentifier || inputDbName;
        console.log(`🔍 Terraform Outputs → endpoint: ${endpoint}, identifier: ${dbIdentifier}, name: ${actualResourceName}`);
      } catch (e) {
        console.warn('⚠️ terraform output parsing failed; using UI-provided name:', e.message);
      }
    }

    const cleanName = actualResourceName.endsWith(suffix) 
      ? actualResourceName.slice(0, -suffix.length)
      : actualResourceName;

    await DatabaseActivity.updateOne(
      { _id: logEntry._id },
      {
        action: actionType === 'destroy' ? 'destroy' : 'create',
        isDeploying: false,
        statusMessage: actionType === 'destroy' ? '✅ Destroyed' : '✅ Created',
        endpoint,
        finalOutput: endpoint,
        completedAt: new Date(),
        dbName: cleanName,
        vpcId: variables.vpc_id || '',
        subnetIds: variables.subnet_ids || [],
        dbIdentifier,
      }
    );

    // ✅ ✅ ✅ AUTO LOCAL CLEANUP — Added: Delete local deployDir after SUCCESS
    try {
      console.log(`🗑️ [Cleanup] Deleting local deployment dir: ${deployDir}`);
      await fs.rm(deployDir, { recursive: true, force: true });
      console.log(`✅ [Cleanup] Local deployment dir deleted`);
    } catch (cleanupErr) {
      console.warn(`⚠️ [Cleanup] Failed to delete local dir (not critical): ${cleanupErr.message}`);
      // Do NOT fail the request — main operation succeeded
    }

    sendEvent({
      status: 'success',
      message: actionType === 'destroy'
        ? `✅ Database destroyed (ID: ${deploymentId})`
        : `✅ Database created (ID: ${deploymentId})`,
      endpoint,
      deploymentId,
      finalDbName: cleanName,
      dbIdentifier,
    });
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    await DatabaseActivity.updateOne(
      { _id: logEntry._id },
      { 
        isDeploying: false, 
        statusMessage: `❌ Failed: ${err.message.substring(0, 100)}` 
      }
    );
    if (!res.writableEnded) {
      sendEvent({ status: 'failed', message: err.message });
    }
    // ⚠️ Cleanup failed deployment dir on error too (optional but clean)
    try { await fs.rm(deployDir, { recursive: true, force: true }); } catch {}
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// ✅ /destroy — same logic + ✅ AUTO LOCAL CLEANUP
router.post('/destroy', async (req, res) => {
  const { deploymentId } = req.body;
  if (!deploymentId) return res.status(400).json({ error: 'deploymentId is required' });

  const activity = await DatabaseActivity.findOne({ 
    deploymentId, 
    action: { $in: ['create', 'in-progress'] } 
  });
  if (!activity) return res.status(404).json({ error: 'Deployment not found or already destroyed' });

  const accountDoc = await CloudConnection.findById(activity.awsAccountId);
  if (!accountDoc) return res.status(404).json({ error: 'AWS account not found' });

  const awsAccessKeyId = decrypt(accountDoc.awsAccessKey);
  const awsSecretAccessKey = decrypt(accountDoc.awsSecretKey);
  const awsRegion = accountDoc.awsRegion || 'us-east-1';
  const realAwsAccountId = accountDoc.accountId;

  const tempDir = path.join(APP_CLOUD_BASE_PATH, 'tmp', `destroy-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const env = {
    ...process.env,
    AWS_ACCESS_KEY_ID: awsAccessKeyId,
    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
    AWS_DEFAULT_REGION: awsRegion,
  };

  const stateBucketName = getStateBucketName(realAwsAccountId);
  const normalizedDbType = activity.dbType.toLowerCase();
  const folderName = dbTypeMap[normalizedDbType];

  let tfVars;
  try {
    const parsedVars = JSON.parse(activity.variables || '{}');
    tfVars = mapUiToTfVars(parsedVars, normalizedDbType);
  } catch (err) {
    return res.status(500).json({ error: `Failed to parse stored variables: ${err.message}` });
  }

  const moduleDir = path.resolve(APP_CLOUD_BASE_PATH, 'terraform-databases', 'modules', folderName);
  const supportsDeploymentId = await moduleSupportsVariable(moduleDir, 'deployment_id');

  const suffix = supportsDeploymentId ? '' : `-${deploymentId.substring(deploymentId.length - 6)}`;
  if (normalizedDbType === 'postgresql') {
    tfVars.environment = (tfVars.environment || '').endsWith(suffix) 
      ? tfVars.environment 
      : tfVars.environment + suffix;
  }

  const mainTfContent = `
terraform {
  backend "s3" {
    bucket         = "${stateBucketName}"
    key            = "database/${normalizedDbType}/${deploymentId}/terraform.tfstate"
    region         = "${awsRegion}"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "${awsRegion}"
}

module "database" {
  source = "${moduleDir}"
${Object.entries(tfVars)
  .map(([k, v]) => {
    if (k === 'vpc_id') return '';
    if (k === 'deployment_id' && !supportsDeploymentId) return '';
    if (Array.isArray(v)) {
      if (k === 'db_parameters') {
        const items = v.map(item =>
          `{ name = "${(item.name || '').replace(/"/g, '\\"')}", value = "${(item.value || '').replace(/"/g, '\\"')}" }`
        ).join(',\n    ');
        return `  ${k} = [\n    ${items}\n  ]`;
      } else {
        const quoted = v.map(x => `"${String(x).replace(/"/g, '\\"')}"`).join(', ');
        return `  ${k} = [${quoted}]`;
      }
    } else if (typeof v === 'boolean') {
      return `  ${k} = ${v}`;
    } else if (typeof v === 'number') {
      return `  ${k} = ${v}`;
    } else if (typeof v === 'string') {
      return `  ${k} = "${v.replace(/"/g, '\\"')}"`;
    } else {
      return `  ${k} = "${String(v).replace(/"/g, '\\"')}"`;
    }
  })
  .filter(line => line.trim() !== '')
  .join('\n')}
${supportsDeploymentId ? `  deployment_id = "${deploymentId}"` : ''}
}
`.trim();

  await fs.writeFile(path.join(tempDir, 'main.tf'), mainTfContent);

  res.writeHead(200, { 
    'Content-Type': 'text/event-stream', 
    'Cache-Control': 'no-cache' 
  });

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  const runTerraformExec = async (command, args = []) => {
    const fullCommand = `terraform ${command} ${args.join(' ')}`;
    try {
      const result = await execAsync(fullCommand, { cwd: tempDir, env, shell: true });
      if (result.stdout) sendEvent({ output: result.stdout });
      if (result.stderr) sendEvent({ output: result.stderr });
      return result;
    } catch (err) {
      sendEvent({ status: 'error', output_error: err.stderr || err.message });
      throw err;
    }
  };

  try {
    sendEvent({ message: `🗑️ Initializing destroy for ${deploymentId}...` });
    await runTerraformExec('init', ['-input=false']);
    await runTerraformExec('destroy', ['-auto-approve', '-input=false']);

    await DatabaseActivity.updateOne(
      { deploymentId },
      {
        action: 'destroy',
        isDeploying: false,
        completedAt: new Date(),
        dbName: activity.dbName,
        vpcId: activity.vpcId,
        subnetIds: activity.subnetIds,
      }
    );

    // ✅ ✅ ✅ AUTO LOCAL CLEANUP — Added: Delete local tempDir after SUCCESS
    try {
      console.log(`🗑️ [Cleanup] Deleting local temp dir: ${tempDir}`);
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`✅ [Cleanup] Local temp dir deleted`);
    } catch (cleanupErr) {
      console.warn(`⚠️ [Cleanup] Failed to delete local temp dir (not critical): ${cleanupErr.message}`);
    }

    sendEvent({ status: 'success', message: `✅ Destroyed: ${deploymentId}` });
  } catch (err) {
    console.error('Destroy failed:', err);
    if (!res.writableEnded) {
      sendEvent({ status: 'failed', message: err.message });
    }
    // Cleanup on error too
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch {}
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// Activity endpoints (unchanged)
router.get('/activity', async (req, res) => {
  try {
    const activities = await DatabaseActivity.find({
      action: { $in: ['create', 'destroy', 'in-progress'] }
    }).sort({ updatedAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

router.post('/log-activity', async (req, res) => {
  const { action, dbType, awsAccountId, awsAccountName, endpoint, deploymentId, dbName, vpcId, subnetIds } = req.body;
  if (!action || !dbType || !awsAccountId || !awsAccountName) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const log = new DatabaseActivity({
      action,
      dbType,
      awsAccountId,
      awsAccountName,
      endpoint,
      isDeploying: false,
      completedAt: new Date(),
      deploymentId,
      dbName,
      vpcId,
      subnetIds,
    });
    await log.save();
    res.status(201).json({ success: true, id: log._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

export default router;
