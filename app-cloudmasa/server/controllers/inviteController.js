import { sendInvitationEmail } from '../services/inviteService.js';
import InviteUser from '../models/inviteUser.js';
import Workspace from '../models/Workspace.js';
import Role from '../models/Roles.js';
import Register from '../models/RegisterModel.js'; // ✅ ADD THIS IMPORT

// ✅ Blocklist of public email domains
const PUBLIC_EMAIL_DOMAINS = new Set([
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.in',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'inbox.com',
  'rediffmail.com',
  'msn.com',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'sina.cn',
  'sohu.com',
  'foxmail.com',
  'tutanota.com',
  'fastmail.com',
  'hey.com',
  'disroot.org',
  'mail.ru',
  'rambler.ru',
  'bk.ru',
  'list.ru',
  'uol.com.br',
  'terra.com.br',
  'ig.com.br',
]);

const sendInvite = async (req, res) => {
  try {
    const { name, email, role, workspaceId } = req.body;

    console.log(`[sendInvite] Request: ${email} to workspace ${workspaceId}, role ${role}`);

    // Validate required fields
    if (!name || !email || !role || !workspaceId) {
      return res.status(400).json({
        message: 'Name, email, role, and workspaceId are required'
      });
    }

    // ✅ Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

    // ✅ BLOCK public email domains (allow all company domains)
    const domain = email.split('@')[1].toLowerCase();
    if (PUBLIC_EMAIL_DOMAINS.has(domain)) {
      return res.status(400).json({
        message: `Public email providers (e.g., Gmail, Yahoo) are not allowed. Please use your company email.`
      });
    }

    // Validate workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        message: 'Workspace not found'
      });
    }

    // Validate role exists by NAME
    const validRole = await Role.findOne({ name: role });
    if (!validRole) {
      return res.status(400).json({
        message: 'Invalid role selected'
      });
    }

    // ✅ FIXED: Check if user is already a member (by email) - CORRECTED LOGIC
    const userEmail = email.toLowerCase();
    console.log(`[sendInvite] Checking if user ${userEmail} is already a member of workspace ${workspaceId}`);

    const userDoc = await Register.findOne({ email: userEmail }).select('_id');
    if (userDoc) {
      console.log(`[sendInvite] User ${userEmail} found with ID: ${userDoc._id}`);

      // ✅ CORRECTED: Use findOne and explicitly convert to boolean
      const existingWorkspace = await Workspace.findOne({
        _id: workspaceId,
        'members.userId': userDoc._id
      }).select('_id');

      const isAlreadyMember = !!existingWorkspace; // Convert to boolean

      console.log(`[sendInvite] User ${userDoc._id} is already member: ${isAlreadyMember}`);

      if (isAlreadyMember) {
        console.log(`[sendInvite] DENYING: User ${userEmail} is already a member of workspace ${workspaceId}`);
        return res.status(409).json({
          message: 'User is already a member of this workspace'
        });
      }
    } else {
      console.log(`[sendInvite] User ${userEmail} not found in Register model, proceeding...`);
    }

    // Check for existing pending invite
    console.log(`[sendInvite] Checking for existing pending invite for ${userEmail} in workspace ${workspaceId}`);
    const existingPendingInvite = await InviteUser.findOne({
      email: userEmail,
      workspace: workspaceId,
      status: 'pending'
    });
    if (existingPendingInvite) {
      console.log(`[sendInvite] DENYING: Existing pending invite found for ${userEmail} in workspace ${workspaceId}`);
      return res.status(409).json({
        message: 'Invitation already pending for this user'
      });
    }

    // ✅ Save invitation with lowercase email and status
    console.log(`[sendInvite] Creating new invite for ${userEmail} to workspace ${workspaceId}`);
    const newInvite = new InviteUser({
      name,
      email: email.toLowerCase(),
      role,
      workspace: workspaceId,
      status: 'pending'
    });

    await newInvite.save();

    // ✅ Send email
    await sendInvitationEmail({
      name,
      email,
      role,
      workspaceName: workspace.name,
      invitedBy: req.user?.name || req.user?.email?.split('@')[0] || 'Admin'
    });

    console.log(`[sendInvite] Invite created successfully for ${userEmail} to workspace ${workspaceId}`);
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

// ✅ FIXED: Return array directly (for frontend .map() compatibility)
const getAllInvitedUsers = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const userRole = req.user.role;

    if (userRole === 'super-admin') {
      // Super-admin: see all pending invites
      const invites = await InviteUser.find({ status: 'pending' })
        .populate('workspace', 'name')
        .select('name email role invitedAt workspace status');
      // ✅ Return array directly instead of { invites: [...] }
      return res.status(200).json(invites);
    } else {
      // Regular user: only invites for their workspaces
      const userWorkspaces = await Workspace.find({
        'members.userId': userId
      }).select('_id');
      const workspaceIds = userWorkspaces.map(ws => ws._id);

      if (workspaceIds.length === 0) {
        // ✅ Return empty array directly
        return res.status(200).json([]);
      }

      const invites = await InviteUser.find({
        workspace: { $in: workspaceIds },
        status: 'pending'
      })
      .populate('workspace', 'name')
      .select('name email role invitedAt workspace status');

      // ✅ Return array directly instead of { invites: [...] }
      return res.status(200).json(invites);
    }
  } catch (error) {
    console.error('Error in getAllInvitedUsers:', error);
    // ✅ Return empty array on error to prevent .map() crash
    return res.status(500).json([]);
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

  const acceptInvite = async (req, res) => {
  try {
    const { token } = req.query;

    const invite = await InviteUser.findOne({ token });
    if (!invite) {
      return res.status(400).json({ message: 'Invalid invite token' });
    }

    if (invite.status === 'accepted') {
      return res.status(400).json({ message: 'Invite already accepted' });
    }

    // ✅ MARK AS ACCEPTED
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    await invite.save();

    res.json({ message: 'Invite accepted successfully' });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ message: 'Failed to accept invite' });
  }
};

export { sendInvite, getAllInvitedUsers, deleteInvitedUser, acceptInvite };

