const inviteService = require('../services/inviteService');
const InviteUser = require('../models/inviteUser');

const sendInvite = async (req, res) => {
  try {
    const message = await inviteService.sendInvitationEmail(req.body);
    res.status(200).json({ message });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: 'Failed to send invitation.' });
  }
};
const getAllInvitedUsers = async (req, res) => {
  try {
    const users = await InviteUser.find();
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

module.exports = { sendInvite,getAllInvitedUsers,deleteInvitedUser };
