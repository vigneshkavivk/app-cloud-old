// server/controllers/scmConnectionController.js
import Connection from '../models/ConnectionModel.js';

export const getConnections = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  try {
    const connections = await Connection.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(connections);
  } catch (err) {
    console.error('Error fetching connections:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};

export const saveDefaultConnection = async (req, res) => {
  const { 
    userId, 
    name, 
    repo, 
    folder, 
    status, 
    provider, 
    accountType,
    githubUsername // ✅ extracted
  } = req.body;

  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  if (!repo) return res.status(400).json({ error: 'Repository is required' });

  // ✅ Build repoUrl
  const providerBaseUrl = provider === 'gitlab' 
    ? 'https://gitlab.com'
    : provider === 'bitbucket'
    ? 'https://bitbucket.org'
    : 'https://github.com'; // default to GitHub

  const repoUrl = `${providerBaseUrl}/${repo}`;

  const validStatuses = ['Repo Saved', 'Connected'];
  const finalStatus = validStatuses.includes(status) ? status : 'Connected';

  try {
    const newConnection = new Connection({
      userId,
      name: name || `${repo} (${finalStatus === 'Repo Saved' ? 'Repo Only' : 'With Folder'})`,
      repo,
      repoUrl,
      folder: folder || null,
      status: finalStatus,
      lastSync: new Date(),
      provider: provider || 'github',
      accountType: accountType || 'Unknown',
      ...(githubUsername && { githubUsername }) // ✅ only add if truthy (optional field)
    });

    const saved = await newConnection.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ Save Connection Error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.message });
    }
    res.status(500).json({ error: 'Failed to save connection' });
  }
};

export const createConnection = async (req, res) => {
  const { userId, name, repo, folder, status, provider, accountType } = req.body;

  if (!userId || !repo) {
    return res.status(400).json({ error: 'User ID and Repository are required' });
  }

  const validStatuses = ['Repo Saved', 'Connected', 'Not Added'];
  const finalStatus = validStatuses.includes(status) ? status : 'Not Added';

  try {
    const newConnection = new Connection({
      userId,
      name: name || repo,
      repo,
      folder: folder || null,
      status: finalStatus,
      lastSync: new Date(),
      provider: provider || 'github',
      accountType: accountType || 'Unknown',
      githubUsername,
    });

    const saved = await newConnection.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ Create Connection Error:', err);
    res.status(500).json({ error: 'Failed to create connection' });
  }
};

// Get latest GitHub username (e.g., from user profile or connection history)
export const getLatestGithubUsername = async (req, res) => {
  try {
    // ✅ Adjust based on your data model.
    // Example 1: From authenticated user object (if stored)
    const githubUsername = req.user?.githubUsername;

    // Example 2: From DB — pseudo-code; replace with real DB logic
    // const user = await User.findById(req.user.id).select('githubUsername');
    // const githubUsername = user?.githubUsername;

    if (!githubUsername) {
      return res.status(404).json({ error: 'GitHub username not found' });
    }

    res.json({ username: githubUsername });
  } catch (error) {
    console.error('Error fetching GitHub username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteConnection = async (req, res) => {
  const { userId } = req.query;
  const { id } = req.params;

  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  if (!id) return res.status(400).json({ error: 'Connection ID is required' });

  try {
    const connection = await Connection.findById(id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });

    if (connection.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this connection' });
    }

    await Connection.findByIdAndDelete(id);
    res.status(200).json({ message: 'Connection deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Connection Error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};
