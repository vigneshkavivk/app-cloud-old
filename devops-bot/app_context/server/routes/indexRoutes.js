const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  res.send(`
    <a href='/auth/google'>Login With Google</a><br>
    <a href='/auth/github'>Login With GitHub</a>
  `);
});

module.exports = router;