// server/routes/homeRoutes.js
import express from 'express';

const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  res.send(`
    <a href='/auth/google'>Login With Google</a><br>
    <a href='/auth/github'>Login With GitHub</a>
  `);
});

export default router;