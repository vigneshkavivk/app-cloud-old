// terraformController.js (ESM version)
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { decrypt } from '../utils/encryption.js'; // ✅ Import decrypt
import CloudConnection from '../models/CloudConnectionModel.js'; // ✅ Import model

// Helper to simulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Generate main.tf from config
function generateTerraformCode(payload, account = null, deploymentId) {
  const { provider, region, modules, moduleConfig } = payload;
  const modulePath = modules.join('-');

  // Initialize the Terraform code string
  let code = '';

  // Add backend configuration as a terraform block
  code += `terraform {
  backend "s3" {
    bucket         = "cloudmasa-terraform-states-981914209208"
    key            = "${modulePath}/deployments/${deploymentId}/terraform.tfstate"
    region         = "${region}"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}\n\n`;

  if (provider === 'aws') {
    code += `provider "aws" {
  region = "${region}"
}\n\n`;
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
}\n\n`;
    }
    else if (moduleId === 's3') {
      const accountId = account?.accountId || '000000000000';
      const resourceName = config.name?.trim() || '';
      const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
      const bucketName = `cloudmasa-${resourceName}-${timestamp}`;
      const safeBucketName = bucketName.replace(/[^a-z0-9.-]/g, '-').toLowerCase();
      const safePrefix = safeBucketName.length > 63 ? safeBucketName.substring(0, 63) : safeBucketName;
      const environment = config.environment || "prod";

      code += `module "s3" {
  source               = "../../modules/s3"
  account_id           = "${accountId}"
  bucket_name          = "${safePrefix}"
  environment          = "${environment}"
}\n\n`;
    }
    else if (moduleId === 'dynamodb') {
      const dynamodb_table_name = config.name?.trim() || 'FileMetadataProd';
      const environment = config.environment || 'prod';

      code += `module "dynamodb" {
  source                 = "../../modules/dynamodb"
  dynamodb_table_name    = "cloudmasa-${dynamodb_table_name}"
  environment            = "${environment}"
}\n\n`;
    }
    // Add other modules as needed
  }

  return code;
}


// Main deploy function
export async function deploy(req, res) {
  const { provider, region, modules, moduleConfig, account, credentials } = req.body;
  const deploymentId = `dep-${Date.now()}`;
  const deployDir = path.join(__dirname, '../../../terraform/deployments', deploymentId);

  try {
    await fs.mkdir(deployDir, { recursive: true });

    const tfCode = generateTerraformCode(req.body, account, deploymentId);
    await fs.writeFile(path.join(deployDir, 'main.tf'), tfCode);

    // 🔑 Fetch & decrypt credentials
    let awsAccessKeyId = '';
    let awsSecretAccessKey = '';

    if (account && account._id) {
      // Fetch full account from DB
      const fullAccount = await CloudConnection.findById(account._id);
      if (!fullAccount) {
        return res.status(404).json({ success: false, error: "AWS account not found" });
      }
      // Decrypt keys
      awsAccessKeyId = decrypt(fullAccount.awsAccessKey);      // ✅ Correct field name
      awsSecretAccessKey = decrypt(fullAccount.awsSecretKey);  // ✅ Correct field name
    } else if (credentials?.accessKey && credentials?.secretKey) {
      // Use form-provided keys (for new connections)
      awsAccessKeyId = credentials.accessKey;
      awsSecretAccessKey = credentials.secretKey;
    } else {
      return res.status(400).json({
        success: false,
        error: "No valid AWS credentials provided. Please connect an account or enter access keys."
      });
    }

    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: awsAccessKeyId,
      AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
      AWS_DEFAULT_REGION: region
    };

    
    // Run terraform init with backend config
    await new Promise((resolve, reject) => {
      exec('terraform init', { cwd: deployDir, env }, (error, stdout, stderr) => {
        if (error) reject(new Error(`Init failed: ${stderr || error.message}`));
        else resolve();
      });
    });

    // Stream terraform apply to log file
    const logPath = path.join(deployDir, 'deploy.log');
    await fs.writeFile(logPath, '[INFO] Starting terraform apply...\n');

    const apply = exec('terraform apply -auto-approve', { 
      cwd: deployDir, 
      env,
      shell: true // 👈 Important for env vars & cross-platform
    });

    apply.stdout.on('data', (data) => fs.appendFile(logPath, data));
    apply.stderr.on('data', (data) => fs.appendFile(logPath, `[ERROR] ${data}`));

    apply.on('close', async (code) => {
      const status = code === 0 ? 'success' : 'failed';
      try {
        await fs.appendFile(logPath, `\n[INFO] Apply ${status} (exit code: ${code})\n`);
      } catch (err) {
        console.error('Failed to write final log:', err);
      }
      // Optional: Notify frontend via WebSocket or DB update here
    });

    res.json({ success: true, deploymentId });

  } catch (err) {
    console.error('Deploy error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Log streaming endpoint
export async function getLogs(req, res) {
  const { deploymentId } = req.params;
  const logPath = path.join(__dirname, `../../../terraform/deployments/${deploymentId}/deploy.log`);

  try {
    const logs = await fs.readFile(logPath, 'utf8');
    res.send(logs);
  } catch (err) {
    res.status(404).send('Logs not ready');
  }
}
