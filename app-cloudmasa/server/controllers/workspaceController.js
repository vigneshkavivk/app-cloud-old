// server/controllers/workspaceController.js
import mongoose from 'mongoose';
import Workspace from '../models/Workspace.js';
import Register from '../models/RegisterModel.js';
import Role from '../models/Roles.js';

// ✅ Create workspace + add admin as real member
export const createWorkspace = async (req, res) => {
  try {
    const { workspaceName, adminUser, adminEmail } = req.body;

    const adminUserDoc = await Register.findOne({ email: adminEmail });
    if (!adminUserDoc) {
      return res.status(400).json({
        message: 'Admin must be a registered user.'
      });
    }

    const existingWorkspace = await Workspace.findOne({
      name: { $regex: new RegExp(`^${workspaceName}$`, 'i') }
    });
    if (existingWorkspace) {
      return res.status(409).json({
        message: `Workspace "${workspaceName}" already exists.`
      });
    }

    const workspace = new Workspace({
      name: workspaceName,
      admin: adminUser,
      email: adminEmail,
      members: [{
        userId: adminUserDoc._id,
        role: adminUserDoc.role || 'user',
        joinedAt: new Date()
      }]
    });

    await workspace.save();
    res.status(201).json(workspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        message: `Workspace "${req.body.workspaceName || 'Unknown'}" already exists.`
      });
    }
    res.status(500).json({ message: 'Failed to create workspace' });
  }
};

// Get all workspaces
export const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find().sort({ createdAt: -1 });
    res.json(workspaces);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ message: 'Failed to fetch workspaces' });
  }
};

// Delete workspace
export const deleteWorkspace = async (req, res) => {
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

    await Workspace.findByIdAndDelete(id);
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ message: 'Failed to delete workspace' });
  }
};

// Get workspace members (with global role + real-time status)
export const getMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const memberIds = workspace.members.map(m => m.userId);
    const members = await Register.find({ _id: { $in: memberIds } })
      .select('name email role isActive lastActive');

    const formattedMembers = members.map(member => ({
      ...member.toObject(),
      status: member.isActive ? 'active' : 'inactive',
      lastSeen: member.lastActive ? new Date(member.lastActive).toLocaleString() : 'Never'
    }));

    res.json(formattedMembers);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Failed to load members' });
  }
};

// ✅ DYNAMIC ROLE UPDATE — NO HARDCODED ROLES
export const updateMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role: roleName } = req.body;

    if (!roleName || typeof roleName !== 'string') {
      return res.status(400).json({ message: 'Valid role name is required' });
    }

    const normalizedRole = roleName.trim().toLowerCase();

    const roleExists = await Role.exists({ name: normalizedRole });
    if (!roleExists) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const updatedUser = await Register.findByIdAndUpdate(
      userId,
      { role: normalizedRole },
      { new: true, select: 'name email role' }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
};

// 🔥 REMOVE MEMBER + DELETE USER FROM DATABASE ENTIRELY
export const removeMember = async (req, res) => {
  try {
    const { id: workspaceId, userId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const objectIdUserId = new mongoose.Types.ObjectId(userId);

    // Remove user from workspace members
    const workspaceUpdateResult = await Workspace.updateOne(
      { _id: workspaceId },
      { $pull: { members: { userId: objectIdUserId } } }
    );

    if (workspaceUpdateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    if (workspaceUpdateResult.modifiedCount === 0) {
      return res.status(404).json({ message: 'Member not found in workspace' });
    }

    // 🔥 PERMANENTLY DELETE USER FROM DATABASE
    const deletedUser = await Register.findByIdAndDelete(objectIdUserId);
    if (!deletedUser) {
      // Optional: still succeed if user was already deleted
      console.warn(`User ${userId} not found in Register during deletion`);
    }

    // Optional: Remove user from other workspaces (if they existed in multiple)
    // This is defensive cleanup, though your current logic may assume 1 workspace per user
    await Workspace.updateMany(
      { 'members.userId': objectIdUserId },
      { $pull: { members: { userId: objectIdUserId } } }
    );

    res.json({ message: 'Member removed and user deleted from database successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Failed to remove member and delete user' });
  }
};
