// app.js
import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './config/dbConfig.js';
import errorHandler from './utils/errorHandler.js';
import authenticate from './middleware/auth.js';
import { trackUserActivity } from './middleware/trackActivity.js'; // Optional: keep if you plan to use it later

// Import routes
import indexRoutes from './routes/indexRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import awsRoutes from './routes/awsRoutes.js';
import clusterRoutes from './routes/clusterRoutes.js';
import cloudconnectRoutes from './routes/cloudconnectRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js'; // ✅ Now accepts io
import inviteRoutes from './routes/inviteRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import scmRoutes from './routes/scmRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import terraformRoutes from './routes/terraformRoutes.js';
import terraform from './routes/terraform.js';
import policiesRoutes from './routes/policiesRoutes.js';

// Dynamic import for default routes
const defaultRoutes = (await import('./routes/defaultRoutes.js')).default;

const app = express();

// 🔐 CORS Configuration — DYNAMIC from .env
const allowedOrigins = [
  'http://localhost:5173',
  'http://3.216.109.221:5173',
  'http://app.cloudmasa.com:5173',
  'https://app.cloudmasa.com' // ✅ Removed trailing spaces
].filter(origin => origin && origin.trim()).map(origin => origin.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Route logger
app.use('/api', (req, res, next) => {
  console.log(`[ROUTE] ${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});

connectToDatabase();

// 🔥 Demo activity store
let recentActivities = [];
setInterval(() => {
  const actions = [
    "Deployed frontend to staging",
    "Pipeline failed on main branch",
    "Cluster scaled up successfully",
    "GitHub webhook received",
    "AWS credentials rotated"
  ];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  recentActivities.unshift({
    action: randomAction,
    timestamp: new Date().toISOString(),
    status: Math.random() > 0.3 ? "success" : "failed"
  });
  if (recentActivities.length > 10) recentActivities.pop();
}, 60000);

// ✅ PUBLIC ROUTES
app.use('/api/database', terraform);

// ✅ PROTECTED ROUTES (mounted directly on `app`)
app.use('/', indexRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/aws', awsRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/cloud-connections', cloudconnectRoutes);

// ⚠️ deploymentRoutes will be mounted later AFTER io is available
// So we DON'T mount it here yet

// Remaining routes
app.use('/api/connections', connectionRoutes);
app.use('/api/github', githubRoutes);
app.use('/github', githubRoutes);
app.use('/api/scm', scmRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api', inviteRoutes);
app.use('/api/terraform', terraformRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/policies', policiesRoutes);

// Additional dashboard endpoints
app.get('/api/get-recent-activity', authenticate, (req, res) => {
  res.json(recentActivities);
});

app.get('/api/get-clusters', authenticate, (req, res) => res.json([]));
app.get('/api/get-repos', authenticate, (req, res) => res.json([]));
app.get('/api/get-databases', authenticate, (req, res) => res.json([]));
app.get('/api/get-aws-accounts', authenticate, (req, res) => res.json([]));

// ❗ Default route LAST
app.use('/api', defaultRoutes);

// Global error handler
app.use(errorHandler);

// Export app and recentActivities
export default app;
export { recentActivities };
