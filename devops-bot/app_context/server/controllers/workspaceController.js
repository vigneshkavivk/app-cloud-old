const Workspace = require('../models/Workspace');

exports.createWorkspace = async (req, res) => {
  try {
    const { workspaceName, adminUser, adminEmail } = req.body;
    
    const workspace = new Workspace({
      name: workspaceName,
      admin: adminUser,
      email: adminEmail
    });

    await workspace.save();
    res.status(201).json(workspace);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find().sort({ createdAt: -1 });
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminUsername } = req.body;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (adminUsername.trim().toLowerCase() !== workspace.admin.trim().toLowerCase()) {
      return res.status(403).json({ message: 'Admin username does not match!' });
    }

    await workspace.remove();
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};