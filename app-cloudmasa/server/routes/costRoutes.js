import express from 'express';
import {
  getCostData,
  getTrend,
  getForecast,
  getResourceCount,
  getAccountBudgets,
} from '../controllers/costController.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// ✅ Existing (backward-compatible)
router.get('/', authenticate, getCostData); // → /api/costs

// ✅ NEW endpoints
router.get('/summary', authenticate, getCostData);     // alias for /
router.get('/trend', authenticate, getTrend);
router.get('/forecast', authenticate, getForecast);
router.get('/resources', authenticate, getResourceCount);
router.get('/budgets', authenticate, getAccountBudgets);

export default router;
