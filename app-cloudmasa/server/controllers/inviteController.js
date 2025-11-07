// server/controllers/inviteController.js
import { sendInvitationEmail } from '../services/inviteService.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';
import Role from '../models/Roles.js'; // ✅ Import Role model

const sendInvite = async (req, res) => {
  try {
    const { name, email, role, workspaceId } = req.body;

    // Validate required fields
    if (!name || !email || !role || !workspaceId) {
      return res.status(400).json({ 
        message: 'Name, email, role, and workspaceId are required' 
      });
    }

    // ✅ Validate workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ 
        message: 'Workspace not found' 
      });
    }

    // ✅ CRITICAL: Validate role exists by NAME
    const validRole = await Role.findOne({ name: role });
    if (!validRole) {
      return res.status(400).json({
        message: 'Invalid role selected'
      });
    }

    // ✅ Save invitation
    const newInvite = new InviteUser({
      name,
      email,
      role,              // string (e.g., "devops")
      workspace: workspaceId // ObjectId
    });

    await newInvite.save();

    // ✅ Send email
    await sendInvitationEmail({ 
      name, 
      email, 
      role, 
      workspace: workspace.name
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent and saved successfully',
      invite: {
        id: newInvite._id,
        name: newInvite.name,
        email: newInvite.email,
        role: newInvite.role,
        workspace: workspace.name,
        invitedAt: newInvite.invitedAt
      }
    });
  } catch (error) {
    console.error('Error in sendInvite controller:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to send invitation' 
    });
  }
};

const getAllInvitedUsers = async (req, res) => {
  try {
    // ✅ Populate workspace name for better UI display
    const users = await InviteUser.find().populate('workspace', 'name');
    res.json(users);
  } catch (error) {
    console.error('Error fetching invited users:', error);
    res.status(500).json({ error: 'Failed to fetch invited users' });
  }
};

const deleteInvitedUser = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await InviteUser.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Invited user not found' });
    }
    return res.status(200).json({ message: 'Invited user deleted successfully' });
  } catch (error) {
    console.error('Error deleting invited user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export { sendInvite, getAllInvitedUsers, deleteInvitedUser };