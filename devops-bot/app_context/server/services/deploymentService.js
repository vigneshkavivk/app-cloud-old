const { spawn } = require('child_process');
const Deployment = require('../models/DeploymentModel');
const logger = require('../utils/logger');
const socketService = require('./socketService');

// Create deployment
const createDeployment = async (deploymentData) => {
  try {
    const deployment = new Deployment(deploymentData);
    return await deployment.save();
  } catch (error) {
    logger.error('Error creating deployment:', error);
    throw new Error(`Deployment creation failed: ${error.message}`);
  }
};

// Execute shell commands
const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, {
      shell: true,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      const message = data.toString();
      stdout += message;
      socketService.emitToSocket('deploy-logs', message);
    });

    process.stderr.on('data', (data) => {
      const message = data.toString();
      stderr += message;
      socketService.emitToSocket('deploy-logs', message);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
};

// Deploy to Kubernetes
const deployToKubernetes = async (deploymentConfig) => {
  const { clusterName, repo, folder, namespace, tool } = deploymentConfig;
  
  try {
    // Configure kubectl
    await executeCommand(`aws eks update-kubeconfig --name ${clusterName} --region us-east-1`);
    
    // Clone repository
    await executeCommand(`rm -rf ${repo} && git clone https://github.com/YOUR_ORG/${repo}.git`);
    
    // Create namespace and apply resources
    await executeCommand(`kubectl create namespace ${namespace} --dry-run=client -o yaml | kubectl apply -f -`);
    await executeCommand(`cd ${repo}/${folder} && kubectl apply -n ${namespace} -f .`);
    
    return { success: true, message: 'Deployment completed successfully' };
  } catch (error) {
    logger.error('Deployment error:', error);
    throw new Error(`Deployment failed: ${error.message}`);
  }
};

module.exports = {
  createDeployment,
  executeCommand,
  deployToKubernetes
};