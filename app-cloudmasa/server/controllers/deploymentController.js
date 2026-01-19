import { exec } from 'node:child_process';
import { access, readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { load as yamlLoad } from 'js-yaml'; // safe for generated YAML
import { promisify } from 'node:util';
import { decrypt } from '../utils/encryption.js';
import CloudConnection from '../models/CloudConnectionModel.js';
import Deployment from '../models/DeploymentModel.js';

const execAsync = promisify(exec);

// Whitelisted GitHub org
const ALLOWED_ORG = 'CloudMasa-Tech';

// 🔐 Validate GitHub repo URL
const isValidRepo = (url) => {
  try {
    const u = new URL(url);
    // Ensure path starts with `/CloudMasa-Tech/`
    return u.hostname === 'github.com' && u.pathname.startsWith(`/${ALLOWED_ORG}/`);
  } catch {
    return false;
  }
};

// 🧹 Sanitize folder name (allow letters, digits, ., -, _, /)
const sanitizeFolder = (folder) => {
  return folder.replace(/[^a-zA-Z0-9._/-]/g, '').substring(0, 100);
};

// 🏷️ Sanitize Kubernetes label value (must match DNS-1123 + allow . and _ inside)
const sanitizeK8sLabel = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')   // replace invalid chars (including space) with '-'
    .replace(/^-+/, '')              // trim leading -
    .replace(/-+$/, '')              // trim trailing -
    .substring(0, 63)                // max 63 chars
    .replace(/--+/g, '-');           // collapse multiple dashes
};

// 🛡️ Sanitize Kubernetes name (DNS-1123 label)
const sanitizeK8sName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

// GET /api/deployments/latest?toolName=Argo-CD
export const getLatestDeployment = async (req, res) => {
  const { toolName } = req.query;
  if (!toolName) {
    return res.status(400).json({ error: 'toolName query param required' });
  }

  try {
    const deployment = await Deployment.findOne({ selectedTool: toolName })
      .sort({ createdAt: -1 })
      .select('selectedCluster namespace selectedAccount repoUrl')
      .lean();

    if (!deployment) {
      return res.status(404).json({ error: 'No deployment found for this tool' });
    }

    return res.json(deployment);
  } catch (err) {
    console.error('[getLatestDeployment] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment record' });
  }
};

// ✅ GET /api/deployments/count → returns { count: N }
export const getDeploymentCount = async (req, res) => {
  try {
    const count = await Deployment.countDocuments({});
    return res.status(200).json({ count });
  } catch (err) {
    console.error('[getDeploymentCount] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment count' });
  }
};

// GET /api/deployments/instances?toolName=Nexus
export const getDeployedInstances = async (req, res) => {
  const { toolName } = req.query;
  if (!toolName) {
    return res.status(400).json({ error: 'toolName query param required' });
  }

  try {
    const instances = await Deployment.find({ selectedTool: toolName })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      instances.map(async (inst) => {
        let accountName = 'Unknown';
        try {
          const acc = await CloudConnection.findById(inst.selectedAccount._id);
          accountName = acc?.accountName?.trim() || acc?.accountId || 'Unknown';
        } catch (e) {
          accountName = inst.selectedAccount.name || inst.selectedAccount.accountId || 'Unknown';
        }
        return { ...inst, accountName };
      })
    );

    return res.json({ toolName, instances: enriched });
  } catch (err) {
    console.error('[getDeployedInstances] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment instances' });
  }
};

// 📦 Create or Update Argo CD Application (GitOps)
export const updateArgoCDApplication = async (req, res) => {
  const {
    selectedCluster,
    namespace,
    repoUrl,
    selectedFolder,
    awsAccountId,
    selectedTool,
    gitHubToken,
  } = req.body;

  if (!selectedCluster || typeof selectedCluster !== 'string') {
    return res.status(400).json({ error: 'Valid cluster name is required' });
  }
  if (!namespace || namespace.length === 0 || namespace.length > 63) {
    return res.status(400).json({ error: 'Namespace must be 1–63 characters' });
  }
  if (!repoUrl || !isValidRepo(repoUrl)) {
    return res.status(400).json({ error: `Repository must belong to ${ALLOWED_ORG} on GitHub` });
  }
  if (!selectedFolder) {
    return res.status(400).json({ error: 'Folder path is required' });
  }
  if (!awsAccountId) {
    return res.status(400).json({ error: 'AWS Account ID is required' });
  }
  if (!gitHubToken) {
    return res.status(400).json({ error: 'GitHub token is required' });
  }

  const cleanFolder = sanitizeFolder(selectedFolder);
  const appName = sanitizeK8sName(`${namespace}-${selectedTool}`);
  const timestamp = Date.now();
  const tempDir = join(process.cwd(), 'temp');
  const tempKubeconfig = join(tempDir, `kubeconfig-${selectedCluster}-${timestamp}.yaml`);
  const tempManifest = join(tempDir, `${appName}.yaml`);

  let awsAccessKeyId, awsSecretAccessKey, awsRegion, accountId;
  let savedDeployment;
  try {
    await mkdir(tempDir, { recursive: true });

    const dbAccount = await CloudConnection.findById(awsAccountId);
    if (!dbAccount) {
      return res.status(404).json({ error: 'AWS account not found' });
    }

    awsAccessKeyId = decrypt(dbAccount.awsAccessKey);
    awsSecretAccessKey = decrypt(dbAccount.awsSecretKey);
    awsRegion = dbAccount.awsRegion;
    accountId = dbAccount.accountId;

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      return res.status(400).json({
        error: 'AWS credentials missing for this account',
        suggestion: 'Add AWS credentials in the database'
      });
    }

    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: awsAccessKeyId,
      AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
      AWS_DEFAULT_REGION: awsRegion
    };

    const shEscape = (str) => `'${String(str).replace(/'/g, "'\"'\"'")}'`;
    const clusterNameEsc = shEscape(selectedCluster);
    const regionEsc = shEscape(awsRegion);

    const describeCmd = `aws eks describe-cluster --name ${clusterNameEsc} --region ${regionEsc} --query 'cluster.status' --output text`;
    const { stdout: status } = await execAsync(describeCmd, { timeout: 10_000, env });
    if (status.trim() !== 'ACTIVE') {
      return res.status(400).json({ error: `Cluster "${selectedCluster}" is not ACTIVE` });
    }

    const kubeconfigPathEsc = shEscape(tempKubeconfig);
    const kubeconfigCmd = `aws eks update-kubeconfig --name ${clusterNameEsc} --region ${regionEsc} --kubeconfig ${kubeconfigPathEsc}`;
    await execAsync(kubeconfigCmd, { timeout: 15_000, env });

    let gitHubUsername = 'x-access-token';
    try {
      const ghUserRes = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${gitHubToken}`,
          'User-Agent': 'CloudMasa-Deployer',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 5000
      });

      if (!ghUserRes.ok) {
        const errData = await ghUserRes.text();
        console.warn(`[GitHub User Fetch] Failed (${ghUserRes.status}):`, errData);
        gitHubUsername = 'x-access-token';
      } else {
        const userData = await ghUserRes.json();
        gitHubUsername = userData.login || 'x-access-token';
        console.log(`[GitHub] Authenticated as: @${gitHubUsername}`);
      }
    } catch (fetchErr) {
      console.warn('[GitHub User Fetch] Network error — using fallback username', fetchErr.message);
      gitHubUsername = 'x-access-token';
    }

    try {
      const deploymentDoc = new Deployment({
        selectedTool,
        selectedCluster,
        namespace,
        repoUrl,
        selectedFolder: cleanFolder,
        gitHubUsername,
        selectedAccount: {
          _id: dbAccount._id,
          accountId: dbAccount.accountId,
          name: dbAccount.name || 'N/A'
        },
        selectedToken: {
          type: 'github-pat',
          masked: gitHubToken ? `${gitHubToken.substring(0, 4)}****${gitHubToken.slice(-4)}` : null
        }
      });

      savedDeployment = await deploymentDoc.save();
      console.log(`[DB] 📥 Saved deployment metadata: ${savedDeployment._id}`);
    } catch (dbErr) {
      console.error('[DB] 🚨 Failed to persist deployment record:', dbErr.message);
    }

    const secretManifest = `apiVersion: v1
kind: Secret
metadata:
  name: github-token-${Buffer.from(repoUrl).toString('base64').substring(0, 16).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: ${repoUrl.trim()}
  password: ${gitHubToken}
  username: ${gitHubUsername}
`;

    const tempSecret = join(tempDir, `secret.yaml`);
    await writeFile(tempSecret, secretManifest, 'utf8');
    const applySecretCmd = `KUBECONFIG=${kubeconfigPathEsc} kubectl apply -f ${shEscape(tempSecret)}`;
    await execAsync(applySecretCmd, { timeout: 10_000, env });

    const manifest = `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${appName}
  namespace: argocd
  labels:
    tool: ${sanitizeK8sLabel(selectedTool)}
    cluster: ${selectedCluster}
    awsAccount: "${accountId}"
spec:
  project: default
  source:
    repoURL: ${repoUrl.trim()}
    targetRevision: HEAD
    path: ${cleanFolder}
  destination:
    server: https://kubernetes.default.svc  
    namespace: ${namespace}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
`;

    try {
      yamlLoad(manifest);
    } catch (yamlErr) {
      console.error('[YAML Error]', yamlErr.message);
      return res.status(500).json({ error: 'Failed to generate valid Argo CD manifest', detail: yamlErr.message });
    }

    await writeFile(tempManifest, manifest, 'utf8');

    const applyCmd = `KUBECONFIG=${kubeconfigPathEsc} kubectl apply -f ${shEscape(tempManifest)}`;
    await execAsync(applyCmd, { timeout: 45_000, env });

    if (savedDeployment) {
      savedDeployment.status = 'deployed';
      savedDeployment.argoAppName = appName;
      await savedDeployment.save();
    }

    try {
      const syncCmd = `KUBECONFIG=${kubeconfigPathEsc} kubectl argo app sync ${shEscape(appName)} -n argocd`;
      await execAsync(syncCmd, { timeout: 30_000, env });
    } catch (syncErr) {
      console.warn('[Sync] Failed (continuing):', syncErr.message);
    }

    console.log(`[ArgoCD] Deployed "${appName}" to cluster "${selectedCluster}"`);
    return res.status(200).json({
      message: `Argo CD application "${appName}" is syncing to cluster "${selectedCluster}" in namespace "${namespace}".`,
      appName,
      cluster: selectedCluster,
      namespace,
      deploymentId: savedDeployment?._id
    });

  } catch (err) {
    console.error('[updateArgoCDApplication] Error:', {
      cluster: selectedCluster,
      error: err.message,
      stderr: err.stderr?.toString()
    });

    if (savedDeployment) {
      savedDeployment.status = 'failed';
      savedDeployment.errorMessage = err.message;
      await savedDeployment.save().catch(e => console.error('[DB Update] Failed to mark as failed:', e));
    }

    let errorMsg = 'Deployment failed';
    if (err.stderr?.includes?.('Unable to locate credentials')) {
      errorMsg = 'AWS credentials missing or invalid';
    } else if (err.stderr?.includes?.('Unauthorized') || err.stderr?.includes?.('AccessDenied')) {
      errorMsg = 'AWS credentials lack EKS permissions';
    } else if (err.stderr?.includes?.('No cluster found')) {
      errorMsg = `EKS cluster "${selectedCluster}" not found in region ${awsRegion}`;
    } else if (err.message?.includes?.('timeout')) {
      errorMsg = 'Deployment timed out';
    }

    return res.status(500).json({
      error: errorMsg,
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    await unlink(tempKubeconfig).catch(() => {});
    await unlink(tempManifest).catch(() => {});
  }
};

// 🗑️ DELETE /deploy/:toolName — supports ?deploymentId=...
// 🗑️ DELETE /deploy/:toolName — supports ?deploymentId=... + deletes namespace
export const deleteArgoCDApplication = async (req, res) => {
  const { toolName } = req.params;
  const { deploymentId } = req.query;

  if (!toolName) {
    return res.status(400).json({ error: 'toolName is required' });
  }

  try {
    let deployment;
    if (deploymentId) {
      deployment = await Deployment.findById(deploymentId);
      if (!deployment) return res.status(404).json({ error: 'Deployment not found' });
      if (deployment.selectedTool !== toolName) return res.status(400).json({ error: 'Tool mismatch' });
    } else {
      deployment = await Deployment.findOne({ selectedTool: toolName }).sort({ createdAt: -1 }).lean();
      if (!deployment) return res.status(404).json({ error: 'No deployment found' });
    }

    const { selectedCluster, namespace, argoAppName, selectedAccount } = deployment;
    if (!argoAppName) return res.status(400).json({ error: 'Argo CD app name missing' });

    // 🔐 Fetch AWS creds
    const dbAccount = await CloudConnection.findById(selectedAccount._id);
    if (!dbAccount) return res.status(404).json({ error: 'AWS account not found' });

    const awsAccessKeyId = decrypt(dbAccount.awsAccessKey);
    const awsSecretAccessKey = decrypt(dbAccount.awsSecretKey);
    const awsRegion = dbAccount.awsRegion;
    if (!awsAccessKeyId || !awsSecretAccessKey) return res.status(400).json({ error: 'AWS credentials missing' });

    const env = {
      ...process.env,
      AWS_ACCESS_KEY_ID: awsAccessKeyId,
      AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
      AWS_DEFAULT_REGION: awsRegion
    };

    const timestamp = Date.now();
    const tempDir = join(process.cwd(), 'temp');
    const tempKubeconfig = join(tempDir, `kubeconfig-${selectedCluster}-${timestamp}.yaml`);
    await mkdir(tempDir, { recursive: true });

    const shEscape = (str) => `'${String(str).replace(/'/g, "'\"'\"'")}'`;

    // 📥 Generate kubeconfig
    await execAsync(
      `aws eks update-kubeconfig --name ${shEscape(selectedCluster)} --region ${shEscape(awsRegion)} --kubeconfig ${shEscape(tempKubeconfig)}`,
      { timeout: 15_000, env }
    );

    // 🗑️ 1. Delete Argo CD Application CR
    await execAsync(
      `KUBECONFIG=${shEscape(tempKubeconfig)} kubectl delete application ${shEscape(argoAppName)} -n argocd --ignore-not-found`,
      { timeout: 20_000, env }
    );

    // 🗑️ 2. ✅ DELETE NAMESPACE (CRITICAL FIX)
    if (namespace && !['default', 'kube-system', 'argocd'].includes(namespace)) {
      console.log(`[NS] Deleting namespace: ${namespace}`);
      try {
        await execAsync(
          `KUBECONFIG=${shEscape(tempKubeconfig)} kubectl delete namespace ${shEscape(namespace)} --ignore-not-found`,
          { timeout: 30_000, env }
        );
        console.log(`[NS] ✅ Namespace "${namespace}" deleted.`);
      } catch (nsErr) {
        console.warn(`[NS] Warning: Failed to delete namespace "${namespace}":`, nsErr.message);
        // Proceed anyway (e.g., namespace may be stuck in Terminating)
      }
    }

    // 🧹 3. Delete deployment record
    await Deployment.findByIdAndDelete(deployment._id);

    // 🧹 Cleanup
    await unlink(tempKubeconfig).catch(() => {});

    return res.status(200).json({
      message: `✅ ${toolName} and namespace "${namespace}" deleted.`,
      tool: toolName,
      deploymentId: deployment._id,
      cluster: selectedCluster,
      namespace
    });

  } catch (err) {
    console.error('[deleteArgoCDApplication] Error:', err);
    return res.status(500).json({
      error: 'Failed to delete tool and namespace',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// 📊 Get Argo CD Application Status (mock for now)
export const getArgoCDStatus = async (req, res) => {
  const { appName, cluster } = req.query;
  if (!appName || !cluster) {
    return res.status(400).json({ error: 'appName and cluster query params required' });
  }
  return res.json({
    status: 'Healthy',
    message: 'Application is synced and healthy.',
    syncStatus: 'Synced',
    healthStatus: 'Healthy'
  });
};

// 📋 GET /api/deployments/list → returns ALL deployments
export const getAllDeployments = async (req, res) => {
  try {
    // Fetch all deployments, sorted by creation time (newest first)
    const deployments = await Deployment.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Enrich each deployment with account name
    const enrichedDeployments = await Promise.all(
      deployments.map(async (dep) => {
        let accountName = 'Unknown';
        try {
          const acc = await CloudConnection.findById(dep.selectedAccount._id);
          accountName = acc?.accountName?.trim() || acc?.accountId || 'Unknown';
        } catch (e) {
          accountName = dep.selectedAccount.name || dep.selectedAccount.accountId || 'Unknown';
        }
        return { ...dep, accountName };
      })
    );

    return res.status(200).json(enrichedDeployments);
  } catch (err) {
    console.error('[getAllDeployments] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch deployments' });
  }
};

// 🌐 Get Clusters by AWS Account ID (replace with DB in prod)
export const getClusters = async (req, res) => {
  const { awsAccountId } = req.query;
  if (!awsAccountId || typeof awsAccountId !== 'string') {
    return res.status(400).json({ error: 'Valid awsAccountId query param required' });
  }

  try {
    const clustersPath = join(process.cwd(), 'data', 'clusters.json');
    const clustersData = JSON.parse(await readFile(clustersPath, 'utf8'));
    const filtered = clustersData.filter(c => c.awsAccountId === awsAccountId);
    return res.json(filtered);
  } catch (err) {
    console.error('[getClusters] Failed:', err);
    return res.status(500).json({ error: 'Failed to fetch clusters' });
  }
};
