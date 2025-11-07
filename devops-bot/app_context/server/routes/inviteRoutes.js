const express = require('express');
const {
  sendInvite,

  getAllInvitedUsers,
  deleteInvitedUser
} = require('../controllers/inviteController');

const router = express.Router();

// POST - Send invitation email
router.post('/send-email', sendInvite);



// GET - Get all invited users
router.get('/invited-users', getAllInvitedUsers);

// DELETE - Delete invited user by ID
router.delete('/invited-users/:id', deleteInvitedUser);

module.exports = router;
