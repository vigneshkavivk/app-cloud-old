// server/services/deploymentService.js
import { spawn } from 'child_process';
import Deployment from '../models/DeploymentModel.js';
import logger from '../utils/logger.js';
import socketService from './socketService.js';

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
    // Step 1: Configure kubectl to target the right cluster
    await executeCommand(`aws eks update-kubeconfig --name ${clusterName} --region us-east-1`);

    // Step 2: Create namespace if not exists
    await executeCommand(`kubectl create namespace ${namespace} --dry-run=client -o yaml | kubectl apply -f -`);

    // Step 3: Map tool name to Helm chart path
    const helmChartMap = {
      'Grafana': './helm-charts/grafana',
      'Prometheus': './helm-charts/prometheus',
      'Jenkins': './helm-charts/jenkins',
      'GitLab': './helm-charts/gitlab',
      'Argo': './helm-charts/argo-cd',
      'Loki': './helm-charts/loki',
      'Thanos': './helm-charts/thanos',
      'Jaeger': './helm-charts/jaeger',
      'Nexus': './helm-charts/nexus',
      'Keycloak': './helm-charts/keycloak',
      'Velero': './helm-charts/velero',
    };

    const chartPath = helmChartMap[tool];

    if (!chartPath) {
      throw new Error(`No Helm chart found for tool: ${tool}`);
    }

    // Step 4: Install Helm release
    const helmCommand = `helm upgrade --install ${tool.toLowerCase()} ${chartPath} --namespace ${namespace}`;
    await executeCommand(helmCommand);

    // Optional: Wait for pods to be ready
    await executeCommand(`kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=${tool.toLowerCase()} --namespace ${namespace} --timeout=300s`);

    return { success: true, message: `${tool} deployed successfully using Helm!` };

  } catch (error) {
    logger.error('Helm deployment error:', error);
    throw new Error(`Helm deployment failed: ${error.message}`);
  }
};

export {
  createDeployment,
  executeCommand,
  deployToKubernetes
};