const { spawn } = require('child_process');
const Deployment = require('../models/DeploymentModel');
const Default = require('../models/DefaultModel');
const logger = require('../utils/logger');
const { exec } = require('child_process');


// Save deployment data
const saveDeployment = async (req, res) => {
  const {
    selectedTool,
    selectedCluster,
    selectedAccount,
    selectedToken,
    gitHubUsername,
    repoUrl,
    selectedFolder,
    namespace,
  } = req.body;

  const newDeployment = new Deployment({
    selectedTool,
    selectedCluster,
    selectedAccount,
    selectedToken,
    gitHubUsername,
    repoUrl,
    selectedFolder,
    namespace,
  });

  try {
    await newDeployment.save();
    res.status(200).json({ message: 'Deployment data saved successfully!' });
  } catch (error) {
    logger.error('Error saving deployment data:', error);
    res.status(500).json({ message: 'Error saving deployment data', error });
  }
};

// Deploy tool to cluster
const deployTool = async (req, res) => {
  const { accountId, clusterName, repo, folder, namespace, tool } = req.body;

  if (!accountId || !clusterName || !repo || !folder || !namespace || !tool) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    const shellCommands = [
      `echo "🔧 Starting deployment for tool: ${tool}"`,
      `aws eks update-kubeconfig --name ${clusterName} --region us-east-1`,
      `rm -rf ${repo} && git clone https://github.com/YOUR_ORG/${repo}.git`,
      `cd ${repo}/${folder}`,
      `kubectl create namespace ${namespace}`,
      `kubectl apply -n ${namespace} -f .`,
      `echo "✅ Deployment complete."`
    ];

    const fullCommand = shellCommands.join(' && ');

    const deployProcess = spawn(fullCommand, {
      shell: true,
      env: process.env,
    });

    deployProcess.stdout.on('data', (data) => {
      const message = data.toString();
      logger.info('[stdout]', message);
      socketService.emitToSocket('deploy-logs', message);
    });

    deployProcess.stderr.on('data', (data) => {
      const message = data.toString();
      logger.error('[stderr]', message);
      socketService.emitToSocket('deploy-logs', message);
    });

    deployProcess.on('close', (code) => {
      const status = code === 0 ? 'Deployment completed successfully.' : 'Deployment failed.';
      socketService.emitToSocket('deploy-logs', `\n🚀 ${status}`);
    });

    res.json({ message: 'Deployment started. Streaming logs via WebSocket.' });
  } catch (err) {
    logger.error('Error:', err);
    res.status(500).json({ message: 'Deployment failed.', error: err.message });
  }
};

// Save default repo and folder
const saveDefault = async (req, res) => {
  const { repo, folder } = req.body;

  try {
    const newEntry = new Default({ repo, folder });
    await newEntry.save();
    res.status(200).send('Repository and folder saved!');
  } catch (err) {
    logger.error('Error saving default data:', err);
    res.status(500).send('Error saving data');
  }
};

// Install kubectl
const installKubectl = (req, res) => {
  const { exec } = require('child_process');
  
  exec('./install_kubectl.sh', (error, stdout, stderr) => {
    if (error) {
      logger.error(`exec error: ${error}`);
      return res.status(500).send(`Error: ${stderr}`);
    }
    logger.info(`stdout: ${stdout}`);
    res.send(`kubectl installation output: ${stdout}`);
  });
};
const deleteDeploymentByTool = async (req, res) => {
  const { toolName } = req.params;

  try {
    const result = await Deployment.deleteMany({ selectedTool: toolName });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No deployments found for the given tool name.' });
    }

    res.status(200).json({ message: `Deployment(s) for ${toolName} deleted successfully.` });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error during deletion.' });
  }
};



const deleteArgoCDApp = async (req, res) => {
  try {
    const { appName } = req.body;
    
    if (!appName) {
      return res.status(400).json({ message: 'App name is required' });
    }

    // Execute the ArgoCD delete command
    exec(`argocd app delete ${appName} --cascade --yes`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error deleting ArgoCD app: ${error}`);
        return res.status(500).json({ 
          message: 'Error deleting ArgoCD app', 
          error: stderr 
        });
      }
      
      console.log(`ArgoCD app deleted: ${stdout}`);
      res.json({ 
        success: true,
        message: `ArgoCD app ${appName} deleted successfully`,
        output: stdout
      });
    });
  } catch (error) {
    console.error('ArgoCD deletion error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing ArgoCD deletion',
      error: error.message 
    });
  }
};
module.exports = {
  saveDeployment,
  deployTool,
  saveDefault,
  installKubectl,
  deleteArgoCDApp,
  deleteDeploymentByTool,
};