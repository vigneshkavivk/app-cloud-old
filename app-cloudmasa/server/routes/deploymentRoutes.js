// routes/deploymentRoutes.js
import express from 'express';
import * as deploymentController from '../controllers/deploymentController.js';
import authenticate from '../middleware/auth.js';
import mongoose from 'mongoose';
import Deployment from '../models/DeploymentModel.js';
import Cluster from '../models/ClusterModel.js';


export default (io) => {
  const router = express.Router();

  // Add this temporarily at the top of your router definition
router.get('/test', (req, res) => {
  res.json({ message: 'Route is working!' });
});

  // Existing routes (keep as-is)
  router.post('/save-deployment', authenticate, deploymentController.saveDeployment);
  router.delete('/deploy/:toolName', authenticate, deploymentController.deleteDeploymentByTool);
  router.post('/delete', authenticate, deploymentController.deleteArgoCDApp);

  // 🔥 POST /api/deployments/deploy → Install Argo CD on selected cluster
  router.post('/deploy', authenticate, async (req, res) => {
    const emitLog = (message, isError = false) => {
      const log = `[${new Date().toLocaleTimeString()}] ${message}`;
      console.log(isError ? '❌ ' + log : log);
      io.emit('deploy-log', {
        tool: req.body.selectedTool,
        cluster: req.body.selectedCluster,
        message: log,
        timestamp: new Date().toISOString(),
        error: isError
      });
    };

    try {
      const {
        selectedTool,
        selectedCluster,
        selectedAccount,
        repoUrl,
        selectedFolder,
        namespace = 'argocd',
        tokenMode,
        gitHubUsername
      } = req.body;

      // 🔹 Normalize tool name
      const tool = selectedTool?.trim();
      if (!tool || tool !== 'Argo CD') {
        return res.status(400).json({ error: 'Only "Argo CD" is supported for deployment via this endpoint.' });
      }

      // 🔹 Validation
      if (!selectedCluster || !selectedAccount?._id || !namespace) {
        return res.status(400).json({
          error: 'Missing required fields: selectedCluster, selectedAccount._id, or namespace'
        });
      }

      // 🔹 Fetch cluster
      const clusterDoc = await Cluster.findOne({ name: selectedCluster });
      if (!clusterDoc) {
        return res.status(404).json({ error: `Cluster "${selectedCluster}" not found` });
      }

      // 🔹 Build kube context (ensure account has accountId)
      const accountId = selectedAccount.accountId;
      if (!accountId) {
        return res.status(400).json({ error: 'Selected account is missing accountId' });
      }

      const kubeContext = `arn:aws:eks:${clusterDoc.region}:${accountId}:cluster/${selectedCluster}`;
      const contextFlag = `--context=${kubeContext}`;

      const { exec } = require('child_process');

      // 🔹 Step 1: Create namespace
      emitLog('🔄 Creating namespace...');
      await new Promise((resolve, reject) => {
        const cmd = `kubectl ${contextFlag} create namespace ${namespace} --dry-run=client -o yaml | kubectl ${contextFlag} apply -f -`;
        exec(cmd, (err, stdout, stderr) => {
          if (err && !stderr.includes('AlreadyExists')) {
            emitLog(`⚠️ Namespace creation warning: ${stderr || err.message}`, true);
          }
          resolve(); // Continue even if exists
        });
      });

      // 🔹 Step 2: Apply Argo CD manifests
      emitLog('🛠️ Applying Argo CD manifests from official repo...');
      await new Promise((resolve, reject) => {
        const cmd = `kubectl ${contextFlag} apply -n ${namespace} -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml`;
        exec(cmd, (err, stdout, stderr) => {
          if (err) {
            const errorMsg = stderr || err.message || 'Unknown error during Argo CD install';
            emitLog(`❌ Argo CD install failed: ${errorMsg}`, true);
            return reject(new Error('Failed to install Argo CD'));
          }
          emitLog('✅ Argo CD installed successfully!');
          resolve();
        });
      });

      // 🔹 Save deployment record
      const deployment = new Deployment({
        userId: req.user.id,
        selectedTool: 'Argo CD',
        selectedCluster,
        selectedAccount: selectedAccount._id,
        gitHubUsername: tokenMode === 'company' ? 'Company' : (gitHubUsername?.trim() || ''),
        repoUrl: 'https://github.com/argoproj/argo-cd', // Official repo
        selectedFolder: selectedFolder?.trim() || '',
        namespace: namespace.trim(),
        status: 'Running'
      });

      await deployment.save();

      res.status(201).json({
        message: `Argo CD deployment completed on ${selectedCluster}`,
        id: deployment._id,
        status: 'Running'
      });

    } catch (err) {
      console.error('❌ Deployment error:', err);
      emitLog(`💥 Deployment failed: ${err.message}`, true);
      res.status(500).json({ error: err.message || 'Deployment process failed' });
    }
  });

  // 🔥 DELETE /api/deployments/deploy/:toolName → Uninstall Argo CD
  router.delete('/deploy/:toolName', authenticate, async (req, res) => {
    try {
      const { toolName } = req.params;
      const { clusterName } = req.query;

      const normalizedTool = toolName?.replace(/-/g, ' ').trim();
      if (normalizedTool !== 'Argo CD') {
        return res.status(400).json({ error: 'Only Argo CD can be uninstalled via this endpoint.' });
      }

      if (!clusterName) {
        return res.status(400).json({ error: 'clusterName query parameter is required' });
      }

      const clusterDoc = await Cluster.findOne({ name: clusterName });
      if (!clusterDoc) {
        return res.status(404).json({ error: `Cluster "${clusterName}" not found` });
      }

      // Ensure clusterDoc has account field (could be accountId or nested)
      const accountId = clusterDoc.accountId || (clusterDoc.account?.accountId) || clusterDoc.account;
      if (!accountId) {
        return res.status(400).json({ error: 'Cluster document missing valid AWS account ID' });
      }

      const kubeContext = `arn:aws:eks:${clusterDoc.region}:${accountId}:cluster/${clusterName}`;
      const contextFlag = `--context=${kubeContext}`;

      const { exec } = require('child_process');

      await new Promise((resolve, reject) => {
        exec(`kubectl ${contextFlag} delete namespace argocd`, (err, stdout, stderr) => {
          if (err && !stderr.includes('NotFound')) {
            console.error('Error deleting Argo CD namespace:', stderr || err);
            return reject(new Error('Failed to delete Argo CD namespace'));
          }
          console.log('✅ Argo CD namespace deleted successfully');
          resolve();
        });
      });

      await Deployment.deleteOne({
        userId: req.user.id,
        selectedTool: 'Argo CD',
        selectedCluster: clusterName
      });

      res.status(200).json({ message: 'Argo CD uninstalled successfully!' });

    } catch (err) {
      console.error('❌ Failed to uninstall Argo CD:', err);
      res.status(500).json({ error: err.message || 'Failed to uninstall Argo CD' });
    }
  });

  // Update namespace
  router.put('/deployment/:id/namespace', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { namespace } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid deployment ID' });
      }

      const deployment = await Deployment.findById(id);
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }

      deployment.namespace = (namespace || '').trim();
      await deployment.save();

      res.status(200).json({ message: 'Namespace updated successfully', deployment });
    } catch (error) {
      console.error('Error updating namespace:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};