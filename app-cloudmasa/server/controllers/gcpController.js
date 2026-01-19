// server/controllers/gcpController.js
import GcpConnection from '../models/GcpConnection.js';
import { GoogleAuth } from 'google-auth-library';

// ✅ Reusable validator
const validateGcpCredentials = async (clientEmail, privateKey, projectId) => {
  const auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const res = await client.request({
    url: `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`,
  });
  return res.data;
};

export const connectToGCP = async (req, res) => {
  try {
    const { privateKey, accountName } = req.body; // only these needed from frontend
    const userId = req.user?._id;

    if (!privateKey) {
      return res.status(400).json({ error: 'Private key (JSON) is required' });
    }

    // ✅ 1. Parse & validate JSON key
    let parsed;
    try {
      // Clean spaces (especially in URLs)
      const cleanedKey = privateKey
        .replace(/\s+/g, ' ')
        .replace(/"auth_uri"\s*:\s*"(.*?)"/gi, (_, u) => `"auth_uri":"${u.trim()}"`)
        .replace(/"token_uri"\s*:\s*"(.*?)"/gi, (_, u) => `"token_uri":"${u.trim()}"`);
      
      parsed = JSON.parse(cleanedKey);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format in private key' });
    }

    // ✅ 2. Extract ONLY from JSON — ignore req.body.projectId/clientEmail
    const { 
      project_id: projectId, 
      client_email: clientEmail, 
      private_key: actualPrivateKey 
    } = parsed;

    if (!projectId || !clientEmail || !actualPrivateKey) {
      return res.status(400).json({
        error: 'Missing required fields in JSON key: project_id, client_email, or private_key'
      });
    }

    // ✅ 3. Authenticate using ONLY these extracted values
    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: actualPrivateKey.trim(),
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // ✅ 4. Test access to *this exact project*
    const client = await auth.getClient();
    const resData = await client.request({
      url: `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`,
    });

    // ✅ 5. Save
    const existing = await GcpConnection.findOne({ userId, projectId });
    if (existing) {
      return res.status(409).json({ error: 'Project already connected', reused: true });
    }

    const connection = new GcpConnection({
      userId,
      email: clientEmail,
      projectId,
      projectName: accountName || resData.data.name || projectId,
      region: 'global',
      status: 'active',
      privateKey: actualPrivateKey.trim(),
    });

    await connection.save();

    res.status(201).json({
      success: true,
      message: `✅ Connected to GCP project: ${projectId}`,
      account: {
        _id: connection._id.toString(),
        cloudProvider: 'GCP',
        accountId: projectId,
        accountName: accountName || resData.data.name || projectId,
        projectId,
        region: 'global',
        email: clientEmail,
      },
    });

  } catch (err) {
    console.error('❌ GCP connect error:', err.message);

    // Friendly errors
    const msg = err.message;
    let userMsg = 'Failed to connect. Check your JSON key and permissions.';

    if (msg.includes('403') && msg.includes('Cloud Resource Manager API')) {
      userMsg = `API disabled in project ${msg.match(/project (\d+)/)?.[1] || 'unknown'}. Please enable Cloud Resource Manager API in that project.`;
    } else if (msg.includes('403')) {
      userMsg = 'Service account lacks permissions. Assign "Project Viewer" role in GCP Console.';
    } else if (msg.includes('404') && msg.includes('projects')) {
      userMsg = 'Project not found or access denied. Check project ID and IAM roles.';
    } else if (msg.includes('private_key')) {
      userMsg = 'Invalid private key. Ensure you copied the full JSON key.';
    }

    res.status(500).json({ error: userMsg });
  }
};

// ✅ List
export const getGCPAccounts = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const accounts = await GcpConnection.find(
      { userId, status: 'active' },
      { privateKey: 0 } // never expose key
    ).lean();

    const formatted = accounts.map(acc => ({
      _id: acc._id.toString(),
      cloudProvider: 'GCP',
      accountId: acc.projectId,
      accountName: acc.projectName,
      projectId: acc.projectId,
      region: acc.region || 'global',
      email: acc.email,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ GCP fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch GCP accounts' });
  }
};

// ✅ Delete
export const deleteGCPAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await GcpConnection.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'GCP account not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'GCP account removed successfully'
    });
  } catch (err) {
    console.error('❌ GCP delete error:', err);
    res.status(500).json({ error: 'Failed to delete GCP account' });
  }
};
