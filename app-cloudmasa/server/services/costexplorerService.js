import AWS from 'aws-sdk';
import CloudAccount from '../models/CloudConnectionModel.js';

// �� CRITICAL: Force AWS SDK to use ~/.aws/credentials (local dev safe)
if (!AWS.config.credentials) {
  AWS.config.update({
    region: 'us-east-1',
    credentials: new AWS.SharedIniFileCredentials({ profile: 'default' })
  });
} else {
  AWS.config.update({ region: 'us-east-1' });
}

// 🔍 DEBUG: Log credentials ONCE at startup (remove in prod)
console.log('\n🚀 [COST SERVICE INIT]');
console.log('➡️ Using AWS region:', AWS.config.region);
console.log('➡️ Credential source:', AWS.config.credentials?.credentialSource);
console.log('➡️ AccessKeyId (masked):', 
  AWS.config.credentials?.accessKeyId?.slice(0,6) + '***' 
  || '❌ MISSING');

// 🔧 Helper: Normalize & validate AWS account ID
const normalizeAccountId = (input) => {
  let clean = String(input).replace(/\D/g, '');
  if (clean.length > 12) clean = clean.slice(-12);
  else clean = clean.padStart(12, '0');
  if (!/^\d{12}$/.test(clean)) {
    throw new Error('Invalid AWS account ID: must resolve to 12 digits');
  }
  return clean;
};

// 🔍 Helper: Find account robustly (string or number)
const findAccountByAccountId = async (accountId) => {
  const cleanId = normalizeAccountId(accountId);
  const account = await CloudAccount.findOne({
    $or: [
      { accountId: cleanId },
      { accountId: Number(cleanId) }
    ]
  }).lean();

  if (!account) {
    throw new Error(`AWS account ${cleanId} not found in database`);
  }
  if (!account.roleArn) {
    console.warn(`⚠️ RoleArn missing for ${cleanId}. Using direct access (dev mode).`);
    return { account, cleanId, useDirectAccess: true };
  }
  return { account, cleanId, useDirectAccess: false };
};

// Helper: Format service names consistently
const formatServiceName = (raw) => {
  return (raw || 'Other')
    .replace(/Amazon\s*|\s*AWS\s*/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-\s]+|[-\s]+$/g, '') || 'Other';
};

// ✅ UTC-safe date helper: returns 'YYYY-MM-DD'
const getUTCDateStr = (date = new Date()) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

// ✅ Unified credential loader (direct or assumed)
const getCredentialsForAccount = async (accountId, cleanId, useDirectAccess, roleArn) => {
  if (useDirectAccess) {
    console.log(`🔹 Using direct credentials for account ${cleanId}`);
    return AWS.config.credentials;
  }

  console.log(`🔹 Assuming role for account ${cleanId}: ${roleArn}`);
  const sts = new AWS.STS();
  try {
    const assumedRole = await sts.assumeRole({
      RoleArn: roleArn,
      RoleSessionName: 'CloudMasaSession',
      DurationSeconds: 900,
    }).promise();

    return new AWS.Credentials({
      accessKeyId: assumedRole.Credentials.AccessKeyId,
      secretAccessKey: assumedRole.Credentials.SecretAccessKey,
      sessionToken: assumedRole.Credentials.SessionToken,
    });
  } catch (err) {
    console.error(`[STS ASSUME FAILED] Account: ${cleanId}`, {
      code: err.code,
      message: err.message,
      roleArn
    });
    if (err.code === 'AccessDenied') {
      throw new Error('Backend lacks permission to assume the target role.');
    }
    if (err.code === 'NoSuchEntity') {
      throw new Error('The IAM role does not exist in the target AWS account.');
    }
    throw new Error(`Role assumption failed: ${err.message}`);
  }
};

// ✅ 1. getCostSummary
export const getCostSummary = async (accountId) => {
  const { account, cleanId, useDirectAccess } = await findAccountByAccountId(accountId);
  const credentials = await getCredentialsForAccount(accountId, cleanId, useDirectAccess, account.roleArn);

  const ce = new AWS.CostExplorer({ credentials, region: 'us-east-1' });

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const params = {
    TimePeriod: { 
      Start: getUTCDateStr(start), 
      End: getUTCDateStr(end) 
    },
    Metrics: ['UnblendedCost'],
    Granularity: 'MONTHLY',
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
  };

  let data;
  try {
    data = await ce.getCostAndUsage(params).promise();
  } catch (err) {
    console.error(`[COST EXPLORER ERROR] Account: ${cleanId}`, err);
    if (err.code === 'DataUnavailableException') {
      throw new Error('Cost data is not available yet. Enable Cost Explorer in AWS.');
    }
    if (err.code === 'AccessDeniedException') {
      throw new Error('The IAM role lacks permission to call ce:GetCostAndUsage.');
    }
    throw new Error(`Failed to retrieve cost data: ${err.message}`);
  }

  const results = data?.ResultsByTime?.[0];
  let total = 0;
  const breakdown = [];

  if (results?.Groups && results.Groups.length > 0) {
    for (const group of results.Groups) {
      const service = formatServiceName(group.Keys?.[0]);
      const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount) || 0;
      total += amount;
      breakdown.push({ service, cost: parseFloat(amount.toFixed(2)) });
    }
  }

  if (breakdown.length === 0) {
    const totalAmount = parseFloat(results?.Total?.UnblendedCost?.Amount) || 0;
    total = totalAmount;
    breakdown.push({ service: 'Other', cost: parseFloat(totalAmount.toFixed(2)) });
  }

  const currency = results?.Total?.UnblendedCost?.Unit || 'USD';
  const accountName = account.accountName || `Account ${cleanId.slice(-4)}`;

  return {
    accountId: cleanId,
    accountName,
    total: parseFloat(total.toFixed(2)),
    currency,
    breakdown,
    month: getUTCDateStr(start).slice(0, 7),
  };
};

// ✅ 2. getCostTrend
export const getCostTrend = async (accountId, granularity = 'DAILY') => {
  const { account, cleanId, useDirectAccess } = await findAccountByAccountId(accountId);
  const gran = granularity.toUpperCase();
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(gran)) {
    throw new Error('Invalid granularity. Use DAILY, WEEKLY, or MONTHLY');
  }

  const credentials = await getCredentialsForAccount(accountId, cleanId, useDirectAccess, account.roleArn);
  const ce = new AWS.CostExplorer({ credentials, region: 'us-east-1' });

  const endDate = new Date();
  const startDate = new Date(endDate);
  const daysBack = gran === 'MONTHLY' ? 365 : (gran === 'WEEKLY' ? 84 : 30);
  startDate.setDate(endDate.getDate() - daysBack);

  const params = {
    TimePeriod: {
      Start: getUTCDateStr(startDate),
      End: getUTCDateStr(endDate),
    },
    Metrics: ['UnblendedCost'],
    Granularity: gran,
    GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
  };

  let data;
  try {
    data = await ce.getCostAndUsage(params).promise();
  } catch (err) {
    if (err.code === 'DataUnavailableException') {
      throw new Error('Trend data unavailable. Ensure Cost Explorer is enabled.');
    }
    if (err.code === 'AccessDeniedException') {
      throw new Error('Role lacks permission for ce:GetCostAndUsage.');
    }
    throw new Error(`Cost trend fetch failed: ${err.message}`);
  }

  const points = [];
  for (const result of data.ResultsByTime || []) {
    const date = result.TimePeriod.Start;
    let total = 0;
    const serviceBreakdown = {};
    for (const group of result.Groups || []) {
      const service = formatServiceName(group.Keys?.[0]);
      const amt = parseFloat(group.Metrics.UnblendedCost?.Amount) || 0;
      serviceBreakdown[service] = parseFloat(amt.toFixed(2));
      total += amt;
    }
    points.push({
      date,
      total: parseFloat(total.toFixed(2)),
      breakdown: serviceBreakdown,
    });
  }

  return {
    accountId: cleanId,
    accountName: account.accountName || `Account ${cleanId.slice(-4)}`,
    trend: points,
    granularity: gran,
  };
};

// ✅✅✅ FIXED: getCostForecast — SAFE, WORKING (No future dates!)
export const getCostForecast = async (accountId) => {
  const { account, cleanId, useDirectAccess } = await findAccountByAccountId(accountId);
  const credentials = await getCredentialsForAccount(accountId, cleanId, useDirectAccess, account.roleArn);
  const ce = new AWS.CostExplorer({ credentials, region: 'us-east-1' });

  // ✅ CORRECT: Start = TODAY (AWS requires start ≤ today)
  const today = new Date();
  const startDate = new Date(today); // ← DO NOT add +1

  // Forecast next 60 days (max for DAILY granularity is 62 — 60 is safe)
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 60);

  let start = getUTCDateStr(startDate);
  let end = getUTCDateStr(endDate);

  // 🔐 Enforce AWS constraints: start ≤ today ≤ end
  const todayStr = getUTCDateStr(today);
  if (start > todayStr) {
    console.warn(`⚠️ Adjusted forecast start from ${start} to ${todayStr}`);
    start = todayStr;
  }
  if (end <= start) {
    console.warn(`⚠️ Adjusted end to be after start`);
    const fallbackEnd = new Date(startDate);
    fallbackEnd.setDate(startDate.getDate() + 1);
    end = getUTCDateStr(fallbackEnd);
  }

  console.log(`📊 Forecast period: ${start} → ${end}`);

  const params = {
    TimePeriod: { Start: start, End: end },
    Metric: 'UNBLENDED_COST',
    Granularity: 'DAILY', // ✅ Supported for ≤ 62 days
  };

  let data;
  try {
    data = await ce.getCostForecast(params).promise();
  } catch (err) {
    console.error(`[FORECAST ERROR] Account: ${cleanId} | Period: ${start}→${end}`, {
      code: err.code,
      message: err.message,
      stack: err.stack?.substring(0, 200)
    });

    if (err.code === 'DataUnavailableException') {
      throw new Error('Forecasting not enabled or insufficient historical cost data.');
    }
    if (err.code === 'AccessDeniedException') {
      throw new Error('Role lacks permission for ce:GetCostForecast. Add: "ce:GetCostForecast".');
    }
    // ✅ Handle date/validation errors clearly
    if (err.code === 'ValidationException') {
      if (err.message.includes('Start')) {
        throw new Error(`Forecast start must be ≤ today (${todayStr}). Got: ${start}`);
      }
      if (err.message.includes('End')) {
        throw new Error(`Forecast end must be > start and ≤ 12 months ahead.`);
      }
      throw new Error(`Invalid forecast parameters: ${err.message}`);
    }

    throw new Error(`Forecast failed: ${err.message}`);
  }

  const forecast = (data.ForecastResultsByTime || []).map(f => ({
    date: f.TimePeriod.Start,
    mean: parseFloat((f.MeanValue || 0).toFixed(2)),
    min: parseFloat((f.PredictionIntervalLowerBound || 0).toFixed(2)),
    max: parseFloat((f.PredictionIntervalUpperBound || 0).toFixed(2)),
  }));

  return {
    accountId: cleanId,
    accountName: account.accountName || `Account ${cleanId.slice(-4)}`,
    forecast,
    timePeriod: { start, end },
  };
};

// ✅ Updated getResourceCounts (scans multiple regions)
export const getResourceCounts = async (accountId) => {
  const { account, cleanId, useDirectAccess } = await findAccountByAccountId(accountId);
  const credentials = await getCredentialsForAccount(accountId, cleanId, useDirectAccess, account.roleArn);

  // ✅ List of regions to scan (add more if needed)
  const regionsToScan = [
    'us-east-1',
    'us-west-2',
    'eu-west-1',
    'ap-south-1',
    'ap-northeast-1',
    'ap-southeast-1',
    'ca-central-1',
    'eu-central-1',
    'sa-east-1'
  ];

  const counts = { EC2: 0, S3: 0, RDS: 0, Lambda: 0, Others: 0 };

  for (const region of regionsToScan) {
    try {
      const tagging = new AWS.ResourceGroupsTaggingAPI({
        credentials,
        region: region,
      });

      let paginationToken = null;
      do {
        const params = paginationToken ? { PaginationToken: paginationToken } : {};
        const data = await tagging.getResources(params).promise();

        for (const res of data.ResourceTagMappingList || []) {
          const arn = res.ResourceARN;
          if (!arn) continue;

          // ✅ Check service type from ARN
          if (arn.includes(':ec2:')) counts.EC2++;
          else if (arn.includes(':s3:::')) counts.S3++;
          else if (arn.includes(':rds:')) counts.RDS++;
          else if (arn.includes(':lambda:')) counts.Lambda++;
          else counts.Others++;
        }

        paginationToken = data.PaginationToken;
      } while (paginationToken);

    } catch (err) {
      console.warn(`[TAGGING SCAN] Region ${region} failed:`, err.message);
      // Continue to next region — don't crash
    }
  }

  return {
    accountId: cleanId,
    accountName: account.accountName || `Account ${cleanId.slice(-4)}`,
    counts,
    timestamp: new Date().toISOString(),
  };
};

// ✅ 5. getBudgets
export const getBudgets = async (accountId) => {
  const { account, cleanId, useDirectAccess } = await findAccountByAccountId(accountId);
  const credentials = await getCredentialsForAccount(accountId, cleanId, useDirectAccess, account.roleArn);
  const budgetsSvc = new AWS.Budgets({ credentials, region: 'us-east-1' });

  let data;
  try {
    data = await budgetsSvc.describeBudgets({
      AccountId: cleanId,
      MaxResults: 10
    }).promise();
  } catch (err) {
    if (err.code === 'AccessDeniedException') {
      throw new Error('Role lacks permission for budgets:DescribeBudgets. Add: "budgets:DescribeBudgets".');
    }
    throw new Error(`Budgets fetch failed: ${err.message}`);
  }

  const budgets = (data.Budgets || []).map(b => ({
    name: b.BudgetName,
    type: b.BudgetType,
    amount: parseFloat(b.BudgetLimit?.Amount) || 0,
    currency: b.BudgetLimit?.Unit || 'USD',
    actual: parseFloat(b.CalculatedSpend?.ActualSpend?.Amount) || 0,
    forecast: parseFloat(b.CalculatedSpend?.ForecastedSpend?.Amount) || 0,
    status: b.BudgetStatus || 'OK',
  }));

  return {
    accountId: cleanId,
    accountName: account.accountName || `Account ${cleanId.slice(-4)}`,
    budgets,
  };
};

// 🔁 Alias for backward compatibility
export const getCostBreakdown = getCostSummary;

