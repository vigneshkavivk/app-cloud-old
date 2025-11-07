const express = require('express');
const tokenController = require('../controllers/tokenController');

const router = express.Router();

// Token routes
router.post('/save-token', tokenController.saveToken);
router.get('/get-tokens', tokenController.getTokens);

module.exports = router;