// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const session = require('express-session');
// const passport = require('passport');
// const { connectToDatabase } = require('./config/dbConfig');
// const { configurePassport } = require('./config/passportConfig');
// const errorHandler = require('./utilities/errorHandler');

// // Import routes
// const indexRoutes = require('./routes/indexRoutes');
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const awsRoutes = require('./routes/awsRoutes');
// const clusterRoutes = require('./routes/clusterRoutes');
// const deploymentRoutes = require('./routes/deploymentRoutes');
// const emailRoutes = require('./routes/emailRoutes');
// const githubRoutes = require('./routes/githubRoutes');
// const metricsRoutes = require('./routes/metricsRoutes');
// const tokenRoutes = require('./routes/tokenRoutes');

// // Initialize app
// const app = express();

// // Connect to database
// connectToDatabase();

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || 'defaultSecret',
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// // Configure passport
// app.use(passport.initialize());
// app.use(passport.session());
// configurePassport(passport);

// // Routes
// app.use('/', indexRoutes);
// app.use('/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api', awsRoutes);
// app.use('/api', clusterRoutes);
// app.use('/api', deploymentRoutes);
// app.use('/', emailRoutes);
// app.use('/github', githubRoutes);
// app.use('/api', metricsRoutes);
// app.use('/', tokenRoutes);

// // Error handler
// app.use(errorHandler);

// module.exports = app;



// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const session = require('express-session');
// const passport = require('passport');
// const { connectToDatabase } = require('./config/dbConfig');
// const { configurePassport } = require('./config/passportConfig');
// const errorHandler = require('./utils/errorHandler');

// // Import routes
// const indexRoutes = require('./routes/indexRoutes');
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const awsRoutes = require('./routes/awsRoutes');
// const clusterRoutes = require('./routes/clusterRoutes');
// const deploymentRoutes = require('./routes/deploymentRoutes');
// const inviteRoutes = require('./routes/inviteRoutes');
// const githubRoutes = require('./routes/githubRoutes');
// const metricsRoutes = require('./routes/metricsRoutes');
// const tokenRoutes = require('./routes/tokenRoutes');
// const workspaceRoutes = require('./routes/workspaceRoutes');
// const { envConfig } = require('./config/env.config');


// // Initialize app
// const app = express();

// // Connect to database
// connectToDatabase();

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());
// app.use(
//   session({
//     secret: envConfig.auth.secret || 'defaultSecret',
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// // Configure passport
// app.use(passport.initialize());
// app.use(passport.session());
// configurePassport(passport);

// // Routes
// app.use('/', indexRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api', awsRoutes);
// app.use('/api', clusterRoutes);
// app.use('/api', deploymentRoutes);

// app.use('/github', githubRoutes);
// app.use('/api', metricsRoutes);
// app.use('/', tokenRoutes);
// app.use('/api/invited-users', inviteRoutes);

// app.use('/api', inviteRoutes);
// app.use('/api/workspaces', workspaceRoutes);

// // Error handler
// app.use(errorHandler);

// module.exports = app;



const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const { connectToDatabase } = require('./config/dbConfig');
const { configurePassport } = require('./config/passportConfig');
const errorHandler = require('./utils/errorHandler');

// Import routes
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const awsRoutes = require('./routes/awsRoutes');
const clusterRoutes = require('./routes/clusterRoutes');
const deploymentRoutes = require('./routes/deploymentRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const githubRoutes = require('./routes/githubRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const { envConfig } = require('./config/env.config');


// Initialize app
const app = express();

// Connect to database
connectToDatabase();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(
  session({
    secret: envConfig.auth.secret || 'defaultSecret',
    resave: false,
    saveUninitialized: true,
  })
);

// Configure passport
app.use(passport.initialize());
app.use(passport.session());
configurePassport(passport);

// Routes
app.use('/', indexRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', awsRoutes);
app.use('/api', clusterRoutes);
app.use('/api', deploymentRoutes);

app.use('/github', githubRoutes);
app.use('/api', metricsRoutes);
app.use('/', tokenRoutes);
app.use('/api/invited-users', inviteRoutes);

app.use('/api', inviteRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/', authRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;