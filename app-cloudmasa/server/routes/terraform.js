import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import CloudConnection from '../models/CloudConnectionModel.js';
import { decrypt } from '../utils/encryption.js';

const router = Router();

// Define the base path to your app-cloud folder
const APP_CLOUD_BASE_PATH = '/home/ubuntu/app-cloud';

// Map display names to folder names (case-insensitive)
const dbTypeMap = {
  mongodb: 'mongodb',
  mysql: 'mysql',
  postgresql: 'postgres', // UI sends "postgresql" → maps to "postgres" folder
  influxdb: 'influxdb',
  victoriametrics: 'victoriametrics',
  couchbase: 'couchbase',
  mariadb: 'mariadb',
  liquibase: 'liquibase',
  docdb: 'docdb',
};

// ========================
// GET /api/database/tfvars-schema
// ========================
router.get('/tfvars-schema', async (req, res) => {
  const { dbType } = req.query;

  console.log('=== FETCHING TFVARS SCHEMA ===');
  console.log('Query param: dbType:', dbType);

  if (!dbType) {
    return res.status(400).json({ error: 'dbType is required' });
  }

  const normalizedDbType = dbType.toLowerCase();
  const folderName = dbTypeMap[normalizedDbType];
  if (!folderName) {
    return res.status(400).json({ error: `Unsupported database type: "${dbType}"` });
  }

  const terraformDir = path.resolve(
    APP_CLOUD_BASE_PATH,
    'terraform-databases',
    'modules',
    folderName
  );

  if (!fs.existsSync(terraformDir)) {
    console.error(`❌ ERROR: Terraform config not found for "${dbType}". Searched: ${terraformDir}`);
    return res.status(400).json({
      error: `Terraform config not found for "${dbType}". Expected folder: ${folderName}`,
      searchedPath: terraformDir,
    });
  }

  const variablesFilePath = path.join(terraformDir, 'variables.tf');
  if (!fs.existsSync(variablesFilePath)) {
    console.warn(`⚠️ variables.tf not found at: ${variablesFilePath}. Returning empty schema.`);
    return res.json([]);
  }

  try {
    const fileContent = fs.readFileSync(variablesFilePath, 'utf8');
    const schema = [];

    // ✅ STRICT ALLOWLIST: Only for mysql, postgres, docdb
    const strictAllowlist = {
      mysql: [
        'environment',
        'instance_class',
        'allocated_storage',
        'db_name',
        'db_username',
        'db_password',
        'private_subnet_ids',
        'security_group_ids',
        'deletion_protection',
        'aws_region'
      ],
      postgresql: [
        'environment',
        'instance_class',
        'allocated_storage',
        'db_name',
        'db_username',
        'db_password',
        'private_subnet_ids',
        'security_group_ids',
        'deletion_protection',
        'aws_region'
      ],
      docdb: [
        'environment',
        'instance_class',
        'db_name',
        'db_username',
        'db_password',
        'private_subnet_ids',
        'security_group_ids',
        'deletion_protection',
        'aws_region'
      ]
    };

    const useAllowlist = strictAllowlist.hasOwnProperty(normalizedDbType);
    const allowedSet = useAllowlist ? new Set(strictAllowlist[normalizedDbType]) : null;

    const variableBlockRegex = /variable\s+"([^"]+)"\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = variableBlockRegex.exec(fileContent)) !== null) {
      const name = match[1];

      // ✅ Apply allowlist ONLY for mysql/postgres/docdb
      if (useAllowlist && !allowedSet.has(name)) {
        continue;
      }

      const blockContent = match[2];

      // Extract description
      const descMatch = blockContent.match(/description\s*=\s*"([^"]*)"/);
      const description = descMatch ? descMatch[1] : '';

      // Extract type
      const typeMatch = blockContent.match(/type\s*=\s*(\w+)/);
      let type = 'string';
      if (typeMatch) {
        type = typeMatch[1].toLowerCase();
        if (['number', 'bool'].includes(type)) {
          type = 'string'; // Keep input as text
        }
      }

      // Extract default
      const defaultMatch = blockContent.match(/default\s*=\s*(.+?)(?=\s*(?:#|$))/);
      let defaultValue = '';
      if (defaultMatch) {
        let rawDefault = defaultMatch[1].trim();
        if (rawDefault.startsWith('"') && rawDefault.endsWith('"')) {
          rawDefault = rawDefault.slice(1, -1);
        }
        defaultValue = rawDefault;
      }

      // Hide default for sensitive fields
      if (name.includes('password') || name.includes('secret')) {
        defaultValue = '';
      }

      schema.push({
        name,
        description,
        type,
        default: defaultValue,
        required: !defaultValue && !blockContent.includes('default ='),
      });
    }

    console.log(`✅ Loaded ${schema.length} variables for ${dbType} (${useAllowlist ? 'strict mode' : 'full mode'})`);
    res.json(schema);

  } catch (err) {
    console.error('❌ Failed to parse variables.tf:', err);
    res.status(500).json({ error: 'Failed to load configuration options.' });
  }
});

// ========================
// POST /api/database/deploy
// ========================
router.post('/deploy', async (req, res) => {
  const { dbType, awsAccountId, actionType = 'create', variables = {} } = req.body;

  console.log('=== TERRAFORM DEPLOY REQUEST ===');
  console.log('Received dbType:', dbType, 'awsAccountId:', awsAccountId, 'actionType:', actionType, 'variables:', variables);

  if (!dbType) {
    console.error('❌ ERROR: dbType is required');
    return res.status(400).json({ error: 'dbType is required' });
  }

  if (!awsAccountId) {
    console.error('❌ ERROR: awsAccountId is required');
    return res.status(400).json({ error: 'awsAccountId is required' });
  }

  const normalizedDbType = dbType.toLowerCase();
  const folderName = dbTypeMap[normalizedDbType];
  if (!folderName) {
    console.error(`❌ ERROR: Unsupported database type: "${dbType}"`);
    return res.status(400).json({ error: `Unsupported database type: "${dbType}"` });
  }

  const terraformDir = path.resolve(
    APP_CLOUD_BASE_PATH,
    'terraform-databases',
    'modules',
    folderName
  );

  console.log('✅ Terraform Directory:', terraformDir);

  if (!fs.existsSync(terraformDir)) {
    console.error(`❌ ERROR: Terraform config not found for "${dbType}". Searched: ${terraformDir}`);
    return res.status(400).json({
      error: `Terraform config not found for "${dbType}". Expected folder: ${folderName}`,
      searchedPath: terraformDir,
    });
  }

  // SSE headers for live logs
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
  });

  const sendEvent = (data) => {
    console.log('➡️ Sending SSE Event:', data);
    res.write(` ${JSON.stringify(data)}\n\n`);
  };

  // Fetch and decrypt AWS credentials
  let awsAccessKeyId = '';
  let awsSecretAccessKey = '';
  let awsRegion = 'us-east-1';

  try {
    const accountDoc = await CloudConnection.findById(awsAccountId);
    if (!accountDoc) {
      sendEvent({ status: 'error', message: 'Selected AWS account not found.' });
      return res.end();
    }
    awsAccessKeyId = decrypt(accountDoc.awsAccessKey);
    awsSecretAccessKey = decrypt(accountDoc.awsSecretKey);
    awsRegion = accountDoc.awsRegion || 'us-east-1';
  } catch (err) {
    console.error('Failed to load AWS credentials:', err);
    sendEvent({ status: 'error', message: 'Failed to decrypt AWS credentials.' });
    return res.end();
  }

  const actionLabel = actionType === 'destroy' ? 'Destroying' : 'Creating';
  sendEvent({ status: 'starting', message: `🚀 ${actionLabel} ${dbType}...` });

  // Run terraform init first
  console.log('⏳ Running: terraform init in', terraformDir);
  const tfInit = spawn('terraform', ['init'], {
    cwd: terraformDir,
    shell: true,
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: awsAccessKeyId,
      AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
      AWS_DEFAULT_REGION: awsRegion,
    },
  });

  tfInit.stderr.on('data', (data) => {
    const errorMsg = data.toString();
    console.error('❌ INIT STDERR:', errorMsg);
    sendEvent({ status: 'error', output: `INIT ERROR: ${errorMsg}` });
  });

  tfInit.stdout.on('data', (data) => {
    const stdoutMsg = data.toString();
    console.log('✅ INIT STDOUT:', stdoutMsg);
    sendEvent({ status: 'running', output: `INIT: ${stdoutMsg}` });
  });

  tfInit.on('close', (code) => {
    console.log(`✅ INIT finished with code: ${code}`);
    if (code !== 0) {
      sendEvent({ status: 'failed', message: '❌ Terraform init failed.' });
      return res.end();
    }

    // Determine command based on actionType
    let command = 'apply';
    let args = ['-auto-approve', '-lock=false'];
    if (actionType === 'destroy') {
      command = 'destroy';
      args = ['-auto-approve', '-lock=false'];
    }

    // Prepare temporary tfvars file
    const tempTfvarsPath = path.join(terraformDir, 'temp.tfvars');
    let tempTfvarsContent = '';
    for (const [key, value] of Object.entries(variables)) {
      const escapedValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
      tempTfvarsContent += `${key} = ${escapedValue}\n`;
    }
    fs.writeFileSync(tempTfvarsPath, tempTfvarsContent, 'utf8');
    console.log(`✅ Wrote temporary tfvars to: ${tempTfvarsPath}`);
    args.push('-var-file=temp.tfvars');

    console.log(`⏳ Running: terraform ${command} ${args.join(' ')} in`, terraformDir);
    const tfProcess = spawn('terraform', [command, ...args], {
      cwd: terraformDir,
      shell: true,
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
        AWS_DEFAULT_REGION: awsRegion,
      },
    });

    tfProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.log(`✅ ${command.toUpperCase()} OUTPUT:`, line);
        sendEvent({ status: 'running', output: line });
      });
    });

    tfProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        console.error(`❌ ${command.toUpperCase()} ERROR:`, line);
        sendEvent({ status: 'error', output: `${command.toUpperCase()} ERROR: ${line}` });
      });
    });

    tfProcess.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempTfvarsPath);
        console.log(`✅ Cleaned up temporary tfvars file: ${tempTfvarsPath}`);
      } catch (cleanupErr) {
        console.error(`⚠️ Failed to clean up temporary tfvars file: ${cleanupErr.message}`);
      }

      console.log(`✅ ${command.toUpperCase()} finished with code: ${code}`);
      if (code === 0) {
        const successMsg = actionType === 'destroy'
          ? '✅ Database destroyed successfully!'
          : '✅ Database created successfully!';
        sendEvent({ status: 'success', message: successMsg });
      } else {
        const errorMsg = actionType === 'destroy'
          ? '❌ Terraform destroy failed.'
          : '❌ Terraform apply failed.';
        sendEvent({ status: 'failed', message: errorMsg });
      }
      res.end();
    });

    req.on('close', () => {
      console.log('⚠️ Client disconnected, killing Terraform process...');
      tfProcess.kill();
      sendEvent({ status: 'info', message: 'Client disconnected. Terraform process killed.' });
    });

    tfProcess.on('error', (err) => {
      console.error(`❌ SPAWN ERROR (${command}):`, err);
      sendEvent({ status: 'error', output: `SPAWN ERROR (${command}): ${err.message}` });
      res.end();
    });
  });

  tfInit.on('error', (err) => {
    console.error('❌ SPAWN ERROR (init):', err);
    sendEvent({ status: 'error', output: `SPAWN ERROR (init): ${err.message}` });
    res.end();
  });
});

// ========================
// GET /api/database/existing
// ========================
router.get('/existing', async (req, res) => {
  const { dbType, awsAccountId } = req.query;
  console.log('=== FETCHING EXISTING DATABASES ===');
  console.log('Query params:', { dbType, awsAccountId });

  if (!dbType || !awsAccountId) {
    return res.status(400).json({ error: 'dbType and awsAccountId are required' });
  }

  const normalizedDbType = dbType.toLowerCase();
  const folderName = dbTypeMap[normalizedDbType];
  if (!folderName) {
    return res.status(400).json({ error: `Unsupported database type: "${dbType}"` });
  }

  const terraformDir = path.resolve(
    APP_CLOUD_BASE_PATH,
    'terraform-databases',
    'modules',
    folderName
  );

  if (!fs.existsSync(terraformDir)) {
    console.warn(`⚠️ Terraform module not found at: ${terraformDir}`);
    return res.json([]);
  }

  const stateFile = path.join(terraformDir, 'terraform.tfstate');

  if (!fs.existsSync(stateFile)) {
    console.log('ℹ️ No terraform.tfstate found. Returning empty list.');
    return res.json([]);
  }

  try {
    const stateContent = fs.readFileSync(stateFile, 'utf8');
    const state = JSON.parse(stateContent);
    const resources = state.resources || [];
    const dbInstances = [];

    for (const resource of resources) {
      if (resource.type === 'aws_db_instance') {
        for (const instance of resource.instances || []) {
          const attrs = instance.attributes;
          if (attrs && attrs.endpoint) {
            dbInstances.push({
              name: attrs.identifier || attrs.db_name || 'Unnamed DB',
              db_instance_identifier: attrs.db_instance_identifier,
              status: attrs.status || 'Available',
              endpoint: attrs.endpoint,
              region: attrs.region || 'Unknown',
            });
          }
        }
      }
      // Add other resource types if needed (e.g., aws_docdb_cluster)
    }

    console.log(`✅ Found ${dbInstances.length} existing ${dbType} instance(s).`);
    return res.json(dbInstances);
  } catch (err) {
    console.error('❌ Failed to read or parse terraform.tfstate:', err);
    return res.status(500).json({ error: 'Failed to load existing database instances.' });
  }
});


// ========================
// GET /api/database/activity
// ========================
import DatabaseActivity from '../models/DatabaseActivityModel.js';

router.get('/activity', async (req, res) => {
  try {
    const activities = await DatabaseActivity.find({
      action: { $in: ['create', 'destroy'] }
    }).sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    console.error('Failed to fetch activity:', err);
    res.status(500).json({ error: 'Failed to load activity history' });
  }
});

// ========================
// GET /api/database/in-progress
// ========================
router.get('/in-progress', async (req, res) => {
  try {
    const inProgress = await DatabaseActivity.find({
      action: 'in-progress',
      isDeploying: true
    }).sort({ updatedAt: -1 });
    res.json(inProgress);
  } catch (err) {
    console.error('Failed to fetch in-progress deployments:', err);
    res.status(500).json({ error: 'Failed to load in-progress deployments' });
  }
});

// ========================
// POST /api/database/log-activity
// ========================
router.post('/log-activity', async (req, res) => {
  const {
    action,
    dbType,
    awsAccountId,
    awsAccountName,
    endpoint,
    currentStep,
    logs = [],
    statusMessage = "",
    isDeploying = false,
    finalOutput = ""
  } = req.body;

  if (!action || !dbType || !awsAccountId || !awsAccountName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let log;

    // For 'in-progress', update existing record if exists
    if (action === 'in-progress') {
      const existing = await DatabaseActivity.findOne({
        action: 'in-progress',
        dbType,
        awsAccountId,
        isDeploying: true
      });

      if (existing) {
        existing.currentStep = currentStep || existing.currentStep;
        existing.logs = logs;
        existing.statusMessage = statusMessage;
        existing.isDeploying = isDeploying;
        existing.finalOutput = finalOutput;
        if (endpoint) existing.endpoint = endpoint;
        log = await existing.save();
      } else {
        log = new DatabaseActivity({
          action,
          dbType,
          awsAccountId,
          awsAccountName,
          currentStep,
          logs,
          statusMessage,
          isDeploying,
          finalOutput,
          endpoint
        });
        await log.save();
      }
    } else {
      // Finalize: create or destroy
      log = new DatabaseActivity({
        action,
        dbType,
        awsAccountId,
        awsAccountName,
        endpoint: action === 'create' ? endpoint : undefined,
        currentStep,
        logs,
        statusMessage,
        isDeploying: false,
        finalOutput
      });
      await log.save();
    }

    res.status(201).json({ success: true, id: log._id, ...log.toObject() });
  } catch (err) {
    console.error('Failed to log activity:', err);
    res.status(500).json({ error: 'Failed to save activity log' });
  }
});

export default router;
