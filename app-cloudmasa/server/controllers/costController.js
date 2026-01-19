import {
  getCostSummary as getCostBreakdown,
  getCostTrend,
  getCostForecast,
  getResourceCounts,
  getBudgets,
} from '../services/costexplorerService.js';

// ✅ Helper: Safe string extraction
const getString = (val) => (val && typeof val === 'string' ? val.trim() : '');

// ✅ Existing fallback handler (for /api/costs)
export const getCostData = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    const data = await getCostBreakdown(accountId);
    return res.json(data);
  } catch (err) {
    console.error(`[COST SUMMARY] Account: ${req.query.accountId}`, err);
    const msg = err.message || 'Cost summary fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    if (msg.includes('Invalid AWS account ID')) return res.status(400).json({ error: msg });
    return res.status(500).json({ error: 'Cost summary unavailable' });
  }
};

// ✅ getTrend — handles granularity safely
export const getTrend = async (req, res) => {
  try {
    const { accountId, granularity } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    const gran = getString(granularity) || 'DAILY';
    const data = await getCostTrend(accountId, gran);
    return res.json(data);
  } catch (err) {
    console.error(`[TREND] Account: ${req.query.accountId}`, err);
    const msg = err.message || 'Trend fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    if (msg.includes('Invalid granularity')) return res.status(400).json({ error: msg });
    return res.status(500).json({ error: 'Trend data unavailable' });
  }
};

// ✅✅✅ getForecast — now resilient (won’t crash if budgets fail)
export const getForecast = async (req, res) => {
  const { accountId } = req.query;
  if (!accountId) {
    return res.status(400).json({ error: 'accountId is required' });
  }

  try {
    // 🔹 Forecast (critical path)
    let forecastData;
    try {
      forecastData = await getCostForecast(accountId);
    } catch (forecastErr) {
      console.warn(`[FORECAST] Partial failure for ${accountId}:`, forecastErr.message);
      // Still allow response (e.g., show trend + resources even if forecast missing)
      forecastData = {
        accountId: accountId.toString().padStart(12, '0').slice(-12),
        accountName: `Account ${accountId.toString().slice(-4)}`,
        forecast: [],
        timePeriod: { start: '', end: '' },
      };
    }

    // 🔹 Budgets (optional — don’t break if missing)
    let budgetsData = [];
    try {
      const budgets = await getBudgets(accountId);
      budgetsData = budgets.budgets || [];
    } catch (budgetsErr) {
      console.warn(`[BUDGETS] Skipped for ${accountId}:`, budgetsErr.message);
      // Silent fail — budgets are optional in forecast response
    }

    // ✅ Unified response
    return res.json({
      success: true,
      forecast: forecastData.forecast,
      forecastPeriod: forecastData.timePeriod,
      budgets: budgetsData,
      accountName: forecastData.accountName,
      accountId: forecastData.accountId,
    });

  } catch (err) {
    console.error(`[FORECAST API] Critical error for ${accountId}:`, err);
    const msg = err.message || 'Unexpected error';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: 'Forecast service unavailable' });
  }
};

// ✅ getAccountBudgets — standalone budgets endpoint
export const getAccountBudgets = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    const data = await getBudgets(accountId);
    return res.json(data);
  } catch (err) {
    console.error(`[BUDGETS API] Account: ${req.query.accountId}`, err);
    const msg = err.message || 'Budgets fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: 'Budget data unavailable' });
  }
};

// ✅ getResourceCount
export const getResourceCount = async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    const data = await getResourceCounts(accountId);
    return res.json(data);
  } catch (err) {
    console.error(`[RESOURCES] Account: ${req.query.accountId}`, err);
    const msg = err.message || 'Resource count fetch failed';
    if (msg.includes('not found')) return res.status(404).json({ error: msg });
    if (msg.includes('lacks permission')) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: 'Resource data unavailable' });
  }
};
