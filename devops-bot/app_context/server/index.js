// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const AWS = require('aws-sdk');
// const fs = require("fs");
// const path = require("path");
// const http = require("http");
// const { Server } = require('socket.io');
// const { isValidObjectId } = require('mongoose');
// const exec = require('child_process').exec;
// const axios = require('axios');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
// const jwt = require('jsonwebtoken');
// const cloudwatch = new AWS.CloudWatch();
// const passport = require('passport');
// const session = require('express-session');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const GitHubStrategy = require('passport-github2').Strategy;
// const nodemailer = require('nodemailer');
// const os = require('os');
// const { spawn } = require('child_process');

// require('dotenv').config();

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//   },
// });
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// const port = process.env.PORT || 3000;

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
// app.use(passport.initialize());
// app.use(passport.session());

// // MongoDB Connection
// const mongoURI = process.env.MONGO_URI;

// if (!mongoURI) {
//   console.error('Mongo URI is not defined in the environment variables.');
//   process.exit(1);
// }

// mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('MongoDB connected successfully'))
//   .catch((err) => {
//     console.error('MongoDB connection error:', err);
//     process.exit(1);
//   });

// // Schemas and Models
// const clusterSchema = new mongoose.Schema({
//   awsAccessKey: { type: String, required: true },
//   awsSecretKey: { type: String, required: true },
//   clusterName: { type: String, required: true },
//   awsRegion: { type: String, required: true },
//   outputFormat: { type: String, required: true },
//   awsAccountNumber: { type: String, required: true },
// }, { collection: 'sandy' });

// const cloudConnectionSchema = new mongoose.Schema({
//   awsAccessKey: { type: String, required: true },
//   awsSecretKey: { type: String, required: true },
//   awsRegion: { type: String, required: true },
//   accountId: { type: String, required: true },
//   userId: { type: String, required: true },
//   arn: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
// }, { collection: 'cloudconnection' });

// const tokenSchema = new mongoose.Schema({
//   token: { type: String, required: true },
//   platform: { type: String, enum: ['github', 'gitlab', 'bitbucket'], required: true },
//   createdAt: { type: Date, default: Date.now },
// });

// const registerSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
// });

// const deploymentSchema = new mongoose.Schema({
//   selectedTool: { type: String, required: true },
//   selectedCluster: { type: String, required: true },
//   selectedAccount: { type: Object, required: true },
//   selectedToken: { type: Object, required: true },
//   gitHubUsername: { type: String, required: true },
//   repoUrl: { type: String, required: true },
//   selectedFolder: { type: String, required: true },
//   namespace: { type: String, required: true },
// }, { timestamps: true });

// const defaultSchema = new mongoose.Schema({
//   repo: String,
//   folder: String,
// }, { collection: 'default' });

// // Models
// const Cluster = mongoose.model('Cluster', clusterSchema);
// const CloudConnection = mongoose.model('CloudConnection', cloudConnectionSchema);
// const Token = mongoose.model('Token', tokenSchema, 'scmmanager');
// const Register = mongoose.model('Register', registerSchema);
// const Deployment = mongoose.model('Deployment', deploymentSchema, 'delete');
// const Default = mongoose.model('Default', defaultSchema);

// // Passport Strategies



// console.log("Google Client ID:", process.env.GOOGLE_CLIENT_ID);
// console.log("Google Secret Key:", process.env.GOOGLE_CLIENT_SECRET);
// console.log("GitHub Client ID:", process.env.GITHUB_CLIENT_ID);
// console.log("GitHub Secret Key:", process.env.GITHUB_CLIENT_SECRET);
// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//  callbackURL: 'https://app.cloudmasa.com/auth/google/callback',
//       scope: ['profile', 'email'],
//     },
//     (accessToken, refreshToken, profile, done) => {
//       return done(null, profile);
//     }
//   )
// );

// passport.use(
//   new GitHubStrategy(
//     {
//       clientID: process.env.GITHUB_CLIENT_ID,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET,
//       callbackURL: 'http://localhost:3000/auth/github/callback',
//       scope: ['user:email'],
//     },
//     (accessToken, refreshToken, profile, done) => {
//       return done(null, profile);
//     }
//   )
// );

// passport.serializeUser((user, done) => done(null, user));
// passport.deserializeUser((user, done) => done(null, user));

// // Routes
// app.get('/', (req, res) => {
//   res.send(`
//         <a href='/auth/google'>Login With Google</a><br>
//         <a href='/auth/github'>Login With GitHub</a>
//     `);
// });

// app.get(
//   '/auth/google',
//   passport.authenticate('google', { scope: ['profile', 'email'] })
// );

// app.get(
//   '/auth/google/callback',
//   passport.authenticate('google', { failureRedirect: '/' }),
//   (req, res) => {
//     res.redirect('https://api.cloudmasa.com/sidebar');
//   }
// );

// app.get(
//   '/auth/github',
//   passport.authenticate('github', { scope: ['user:email'] })
// );

// // GitHub Callback Route
// app.get(
//   '/auth/github/callback',
//   passport.authenticate('github', { failureRedirect: '/' }),
//   (req, res) => {
//     res.redirect('https://api.cloudmasa.com/sidebar');
//   }
// );

// app.get('/profile', (req, res) => {
//   if (req.isAuthenticated()) {
//     res.send(`Welcome ${req.user.displayName || req.user.username}`);
//   } else {
//     res.redirect('/');
//   }
// });

// app.get('/logout', (req, res, next) => {
//   req.logout((err) => {
//     if (err) return next(err);
//     req.session.destroy(() => {
//       res.clearCookie('connect.sid');
//       res.redirect('/');
//     });
//   });
// });

// // API Routes
// app.post('/api/validate-aws-credentials', async (req, res) => {
//   const { accessKey, secretKey, region } = req.body;

//   if (!accessKey || !secretKey) {
//     return res.status(400).json({ error: 'Access Key and Secret Key are required' });
//   }

//   try {
//     const awsConfig = {
//       accessKeyId: accessKey,
//       secretAccessKey: secretKey,
//       region: region || 'us-east-1'
//     };

//     const s3 = new AWS.S3(awsConfig);
//     const data = await s3.listBuckets().promise();

//     const sts = new AWS.STS(awsConfig);
//     const identity = await sts.getCallerIdentity().promise();

//     res.json({
//       success: true,
//       message: 'AWS credentials validated successfully',
//       accountId: identity.Account,
//       userId: identity.UserId,
//       arn: identity.Arn,
//       buckets: data.Buckets.map(b => b.Name)
//     });
//   } catch (error) {
//     console.error('AWS Credential Validation Error:', error);
//     res.status(401).json({
//       success: false,
//       error: 'Invalid AWS credentials',
//       details: error.message
//     });
//   }
// });

// app.post('/send-email', (req, res) => {
//   const { name, email, role } = req.body;

//   if (!name || !email || !role) {
//     return res.status(400).json({ message: 'Name, email and role are required.' });
//   }

//   const subject = `You've been given access to CloudMaSa`;
//   const message = `
//     <div style="font-family: Arial, sans-serif; line-height: 1.6;">
//       <p>You've been given access to CloudMaSa.</p>
      
//       <p><strong>${name}</strong> has given you ${role} access to the CloudMaSa account with WebSpaceKit.</p>
      
//       <p>To accept the invite, please click on the link below:</p>
      
//       <p><a href="https://cloudmasa.com/accept-invite" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Accept invitation</a></p>
      
//       <p>Invitations are valid for 7 days from the time of issue. After that time, you will need to request a new invite from the account administrator.</p>
//     </div>
//   `;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: subject,
//     html: message,
//   };

//   transporter.sendMail(mailOptions, (error, info) => {
//     if (error) {
//       console.error('Error sending email:', error);
//       return res.status(500).json({ message: 'Failed to send email.' });
//     }
//     res.status(200).json({ message: 'Invitation sent successfully!' });
//   });
// });

// app.post('/api/save-deployment', async (req, res) => {
//   const {
//     selectedTool,
//     selectedCluster,
//     selectedAccount,
//     selectedToken,
//     gitHubUsername,
//     repoUrl,
//     selectedFolder,
//     namespace,
//   } = req.body;

//   const newDeployment = new Deployment({
//     selectedTool,
//     selectedCluster,
//     selectedAccount,
//     selectedToken,
//     gitHubUsername,
//     repoUrl,
//     selectedFolder,
//     namespace,
//   });

//   try {
//     await newDeployment.save();
//     res.status(200).json({ message: 'Deployment data saved successfully!' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error saving deployment data', error });
//   }
// });


// app.post('/registers', async (req, res) => {
//   const { name, email, password } = req.body;
//   try {
//     const existingUser = await Register.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Email already registered' });
//     }

//     const hashedPassword = await bcrypt.hash(password, saltRounds);
//     const newUser = new Register({ name, email, password: hashedPassword });
//     await newUser.save();

//     res.status(200).json({
//       message: 'User registered successfully',
//       name: newUser.name,
//       email: newUser.email,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Failed to register user');
//   }
// });

// app.post('/api/auth/login', async (req, res) => {
//   console.log("Sending to backend:", { email, password });
//   const { email, password } = req.body;

//   try {
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     const user = await Register.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     res.status(200).json({
//       message: 'Login successful',
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         createdAt: user.createdAt
//       }
//     });
//   } catch (err) {
//     console.error('Login error:', err);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });

// app.delete('/api/remove-aws-account/:accountId', async (req, res) => {
//   const { accountId } = req.params;

//   console.log(`Received request to delete account with ID: ${accountId}`);

//   try {
//     const deletedAccount = await AWSAccount.findOneAndDelete({ accountId });

//     if (!deletedAccount) {
//       console.log('Account not found for deletion');
//       return res.status(404).json({ error: 'Account not found' });
//     }

//     console.log('Account deleted:', deletedAccount);
//     res.json({ message: 'Account successfully removed' });
//   } catch (error) {
//     console.error('Error during account deletion:', error);
//     res.status(500).json({ error: 'Failed to remove account' });
//   }
// });

// app.post('/save-token', async (req, res) => {
//   const { token, platform } = req.body;

//   try {
//     let accountName = '';

//     if (platform === 'github') {
//       const githubUser = await axios.get('https://api.github.com/user', {
//         headers: { Authorization: `token ${token}` },
//       });
//       accountName = githubUser.data.login;
//     }

//     const newToken = new Token({ token, platform, accountName });
//     await newToken.save();

//     res.status(200).json({ message: 'Token saved successfully', accountName });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Failed to save token or fetch account name');
//   }
// });

// app.get('/get-tokens', async (req, res) => {
//   try {
//     const tokens = await Token.find();
//     res.status(200).json(tokens);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Failed to fetch tokens');
//   }
// });

// app.get('/github/repos', async (req, res) => {
//   const { token } = req.query;

//   if (!token) {
//     return res.status(400).json({ error: 'GitHub token is required' });
//   }

//   try {
//     const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     const toolsRepo = response.data.find(repo => repo.name === 'tools');

//     if (!toolsRepo) {
//       return res.status(404).json({ error: 'tools repository not found' });
//     }

//     res.json({ repositories: [toolsRepo.full_name] });
//   } catch (error) {
//     console.error('Error fetching GitHub repositories:', error);
//     res.status(500).json({ error: 'Failed to fetch repositories from GitHub' });
//   }
// });

// app.post('/connect-to-aws', async (req, res) => {
//   const { accessKey, secretKey, region } = req.body;

//   if (!accessKey || !secretKey) {
//     return res.status(400).json({ error: 'Access key and secret key are required' });
//   }

//   try {
//     const awsConfig = {
//       accessKeyId: accessKey,
//       secretAccessKey: secretKey,
//       region: region || 'us-east-1'
//     };

//     const sts = new AWS.STS(awsConfig);
//     const s3 = new AWS.S3(awsConfig);

//     const identity = await sts.getCallerIdentity().promise();
//     const buckets = await s3.listBuckets().promise();

//     const cloudConnection = new CloudConnection({
//       awsAccessKey: accessKey,
//       awsSecretKey: secretKey,
//       awsRegion: region || 'us-east-1',
//       accountId: identity.Account,
//       userId: identity.UserId,
//       arn: identity.Arn
//     });

//     await cloudConnection.save();

//     res.json({
//       message: 'Successfully connected to AWS and saved connection details',
//       buckets: buckets.Buckets,
//       accountInfo: {
//         accountId: identity.Account,
//         userId: identity.UserId,
//         arn: identity.Arn
//       }
//     });
//   } catch (error) {
//     console.error('AWS Error:', error);
//     res.status(500).json({
//       error: error.message || 'Failed to connect to AWS',
//       awsErrorCode: error.code
//     });
//   }
// });

// app.get('/api/get-aws-accounts', async (req, res) => {
//   try {
//     const accounts = await CloudConnection.find();
//     res.json(accounts);
//   } catch (err) {
//     console.error('Error fetching accounts:', err);
//     res.status(500).json({ error: 'Failed to fetch AWS accounts' });
//   }
// });

// app.post('/api/get-eks-clusters', async (req, res) => {
//   const { accountId } = req.body;

//   if (!accountId) {
//     return res.status(400).json({ error: 'Account ID is required' });
//   }

//   try {
//     const account = await CloudConnection.findOne({ accountId });

//     if (!account) {
//       return res.status(404).json({ error: 'Account not found' });
//     }

//     const awsConfig = {
//       accessKeyId: account.awsAccessKey,
//       secretAccessKey: account.awsSecretKey,
//       region: account.awsRegion || 'us-east-1',
//     };

//     const eks = new AWS.EKS(awsConfig);
//     const clustersData = await eks.listClusters().promise();

//     res.json({
//       clusters: clustersData.clusters,
//     });
//   } catch (err) {
//     console.error('Error fetching EKS clusters:', err);
//     res.status(500).json({ error: 'Failed to fetch EKS clusters' });
//   }
// });

// app.post('/api/get-cluster-metrics', async (req, res) => {
//   const { awsAccessKey, awsSecretKey, awsRegion } = req.body;

//   AWS.config.update({
//     accessKeyId: awsAccessKey,
//     secretAccessKey: awsSecretKey,
//     region: awsRegion,
//   });

//   try {
//     const cpuParams = {
//       Namespace: 'AWS/EC2',
//       MetricName: 'CPUUtilization',
//       Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }],
//       StartTime: new Date(Date.now() - 300000),
//       EndTime: new Date(),
//       Period: 300,
//       Statistics: ['Average'],
//     };

//     const cpuData = await cloudwatch.getMetricStatistics(cpuParams).promise();
//     const cpuUsage = cpuData.Datapoints.length > 0 ? cpuData.Datapoints[0].Average : 0;

//     const memoryParams = {
//       Namespace: 'System/Linux',
//       MetricName: 'MemoryUtilization',
//       Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }],
//       StartTime: new Date(Date.now() - 300000),
//       EndTime: new Date(),
//       Period: 300,
//       Statistics: ['Average'],
//     };

//     const memoryData = await cloudwatch.getMetricStatistics(memoryParams).promise();
//     const memoryUsage = memoryData.Datapoints.length > 0 ? memoryData.Datapoints[0].Average : 0;

//     const storageParams = {
//       Namespace: 'System/Linux',
//       MetricName: 'DiskSpaceUtilization',
//       Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }],
//       StartTime: new Date(Date.now() - 300000),
//       EndTime: new Date(),
//       Period: 300,
//       Statistics: ['Average'],
//     };

//     const storageData = await cloudwatch.getMetricStatistics(storageParams).promise();
//     const storageUsage = storageData.Datapoints.length > 0 ? storageData.Datapoints[0].Average : 0;

//     res.status(200).json({
//       cpuUsage,
//       memoryUsage,
//       storageUsage,
//     });
//   } catch (error) {
//     console.error('Error fetching metrics:', error);
//     res.status(500).json({ error: 'Failed to fetch metrics' });
//   }
// });

// app.post("/api/configure-aws", async (req, res) => {
//   const { awsAccessKey, awsSecretKey, awsRegion, outputFormat } = req.body;

//   AWS.config.update({
//     accessKeyId: awsAccessKey,
//     secretAccessKey: awsSecretKey,
//     region: awsRegion || "us-east-1",
//   });

//   const sts = new AWS.STS();

//   try {
//     await sts.getCallerIdentity({}).promise();

//     const awsCredentialsPath = path.join(require('os').homedir(), ".aws", "credentials");
//     const awsConfigPath = path.join(require('os').homedir(), ".aws", "config");

//     const credentialsContent = `
// [default]
// aws_access_key_id = ${awsAccessKey}
// aws_secret_access_key = ${awsSecretKey}
//     `;

//     const configContent = `
// [default]
// region = ${awsRegion}
// output = ${outputFormat}
//     `;

//     const awsDir = path.dirname(awsCredentialsPath);
//     if (!fs.existsSync(awsDir)) {
//       fs.mkdirSync(awsDir, { recursive: true });
//     }

//     fs.writeFileSync(awsCredentialsPath, credentialsContent.trim());
//     fs.writeFileSync(awsConfigPath, configContent.trim());

//     res.json({ message: "AWS credentials and config saved successfully!" });
//   } catch (error) {
//     console.error("AWS Credential Verification/Configuration Error:", error);
//     res.status(400).json({ error: "Invalid AWS credentials or configuration failed" });
//   }
// });

// app.put('/api/update-cluster/:id', async (req, res) => {
//   const { id } = req.params;
//   const { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat } = req.body;

//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: 'Invalid cluster ID' });
//   }

//   try {
//     const updatedCluster = await Cluster.findByIdAndUpdate(
//       id,
//       { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat },
//       { new: true }
//     );

//     if (!updatedCluster) {
//       return res.status(404).json({ message: 'Cluster not found' });
//     }

//     res.status(200).json(updatedCluster);
//   } catch (error) {
//     console.error('Error updating cluster:', error);
//     res.status(500).json({ message: 'Error updating cluster', error: error.message });
//   }
// });

// app.post('/api/verify-credentials', async (req, res) => {
//   const { awsAccessKey, awsSecretKey } = req.body;

//   const credentials = new AWS.Credentials(awsAccessKey, awsSecretKey);
//   AWS.config.update({ credentials });

//   const sts = new AWS.STS();

//   try {
//     const response = await sts.getCallerIdentity().promise();
//     res.json({
//       valid: true,
//       data: {
//         Account: response.Account,
//         Arn: response.Arn
//       }
//     });
//   } catch (error) {
//     console.error('Error verifying AWS credentials:', error);
//     res.status(400).json({ valid: false, error: 'Invalid credentials' });
//   }
// });

// app.post('/api/save-data', async (req, res) => {
//   try {
//     const { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat, status } = req.body;

//     if (!awsAccessKey || !awsSecretKey || !clusterName || !awsRegion || !outputFormat) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     AWS.config.update({
//       accessKeyId: awsAccessKey,
//       secretAccessKey: awsSecretKey,
//       region: awsRegion || "us-east-1",
//       outputFormat: outputFormat || "json",
//     });

//     const sts = new AWS.STS();
//     const identityData = await sts.getCallerIdentity({}).promise();
//     const awsAccountNumber = identityData.Account;

//     const newCluster = new Cluster({
//       awsAccessKey,
//       awsSecretKey,
//       clusterName,
//       awsRegion,
//       outputFormat,
//       status: status || 'Active',
//       awsAccountNumber: awsAccountNumber,
//     });

//     await newCluster.save();
//     res.status(201).json({ message: 'Cluster data saved successfully', cluster: newCluster });
//   } catch (error) {
//     console.error('Error saving cluster data:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// app.get('/api/get-clusters', async (req, res) => {
//   try {
//     const { clusterName } = req.query;

//     let filter = {};
//     if (clusterName) {
//       filter.clusterName = { $regex: clusterName, $options: 'i' };
//     }

//     const clusters = await Cluster.find(filter);
//     res.status(200).json(clusters);
//   } catch (error) {
//     console.error('Error fetching cluster data:', error);
//     res.status(500).json({ message: 'Error fetching cluster data', error: error.message });
//   }
// });

// app.get('/api/get-cluster/:id', async (req, res) => {
//   const { id } = req.params;

//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: 'Invalid cluster ID' });
//   }

//   try {
//     const cluster = await Cluster.findById(id);
//     if (!cluster) {
//       return res.status(404).json({ message: 'Cluster not found' });
//     }
//     res.status(200).json(cluster);
//   } catch (error) {
//     console.error('Error fetching cluster data by ID:', error);
//     res.status(500).json({ message: 'Error fetching cluster data', error: error.message });
//   }
// });

// app.delete('/api/delete-cluster/:id', async (req, res) => {
//   const { id } = req.params;

//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: 'Invalid cluster ID' });
//   }

//   try {
//     const cluster = await Cluster.findByIdAndDelete(id);

//     if (!cluster) {
//       return res.status(404).json({ message: 'Cluster not found' });
//     }

//     return res.status(200).json({ message: 'Cluster deleted successfully' });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// app.get('/api/install-kubectl', (req, res) => {
//   exec('./install_kubectl.sh', (error, stdout, stderr) => {
//     if (error) {
//       console.error(`exec error: ${error}`);
//       return res.status(500).send(`Error: ${stderr}`);
//     }
//     console.log(`stdout: ${stdout}`);
//     res.send(`kubectl installation output: ${stdout}`);
//   });
// });

// app.get('/api/get-cluster-credentials/:clusterName', async (req, res) => {
//   const { clusterName } = req.params;

//   try {
//     const cluster = await Cluster.findOne({ clusterName });
//     if (!cluster) {
//       return res.status(404).json({ message: 'Cluster not found' });
//     }

//     res.status(200).json({
//       awsAccessKey: cluster.awsAccessKey,
//       awsSecretKey: cluster.awsSecretKey,
//       awsRegion: cluster.awsRegion,
//       outputFormat: cluster.outputFormat,
//     });
//   } catch (error) {
//     console.error('Error fetching cluster credentials:', error);
//     res.status(500).json({ message: 'Error fetching cluster credentials', error: error.message });
//   }
// });

// app.post('/api/tools/deploy', async (req, res) => {
//   const { accountId, clusterName, repo, folder, namespace, tool } = req.body;

//   if (!accountId || !clusterName || !repo || !folder || !namespace || !tool) {
//     return res.status(400).json({ message: 'Missing required fields.' });
//   }

//   try {
//     const shellCommands = [
//       `echo "🔧 Starting deployment for tool: ${tool}"`,
//       `aws eks update-kubeconfig --name ${clusterName} --region us-east-1`,
//       `rm -rf ${repo} && git clone https://github.com/YOUR_ORG/${repo}.git`,
//       `cd ${repo}/${folder}`,
//       `kubectl create namespace ${namespace}`,
//       `kubectl apply -n ${namespace} -f .`,
//       `echo "✅ Deployment complete."`
//     ];

//     const fullCommand = shellCommands.join(' && ');

//     const deployProcess = spawn(fullCommand, {
//       shell: true,
//       env: process.env,
//     });

//     deployProcess.stdout.on('data', (data) => {
//       const message = data.toString();
//       console.log('[stdout]', message);
//       if (currentSocket) currentSocket.emit('deploy-logs', message);
//     });

//     deployProcess.stderr.on('data', (data) => {
//       const message = data.toString();
//       console.error('[stderr]', message);
//       if (currentSocket) currentSocket.emit('deploy-logs', message);
//     });

//     deployProcess.on('close', (code) => {
//       const status = code === 0 ? 'Deployment completed successfully.' : 'Deployment failed.';
//       if (currentSocket) currentSocket.emit('deploy-logs', `\n🚀 ${status}`);
//     });

//     res.json({ message: 'Deployment started. Streaming logs via WebSocket.' });
//   } catch (err) {
//     console.error('Error:', err);
//     res.status(500).json({ message: 'Deployment failed.', error: err.message });
//   }
// });

// app.post('/save-default', async (req, res) => {
//   const { repo, folder } = req.body;

//   try {
//     const newEntry = new Default({ repo, folder });
//     await newEntry.save();
//     res.status(200).send('Repository and folder saved!');
//   } catch (err) {
//     res.status(500).send('Error saving data');
//   }
// });

// app.post('/save-config', (req, res) => {
//   const { accessKey, secretKey, region } = req.body;
//   const config = { accessKey, secretKey, region };

//   try {
//     const configFilePath = path.join(__dirname, 'config.json');
//     let currentConfigs = [];
//     if (fs.existsSync(configFilePath)) {
//       const data = fs.readFileSync(configFilePath, 'utf8');
//       currentConfigs = JSON.parse(data);
//     }
//     currentConfigs.push(config);
//     fs.writeFileSync(configFilePath, JSON.stringify(currentConfigs, null, 2));
//     res.json({ message: 'Configuration saved successfully!', currentConfigs });
//   } catch (error) {
//     console.error('Error saving configuration:', error);
//     res.status(500).json({ error: 'Failed to save configuration' });
//   }
// });

// // Socket.IO
// let currentSocket = null;

// io.on("connection", (socket) => {
//   console.log("🔌 New client connected");
//   currentSocket = socket;

//   socket.on("command", (cmd) => {
//     console.log(`💻 Executing command: ${cmd}`);

//     const shell = os.platform() === "win32" ? process.env.ComSpec || "cmd.exe" : "/bin/bash";

//     exec(cmd, { shell: shell, env: process.env }, (error, stdout, stderr) => {
//       if (error) {
//         console.error(" Execution Error:", error.message);
//         socket.emit("output", ` Error: ${stderr?.trim() || error.message}`);
//         return;
//       }

//       if (stdout?.trim()) {
//         socket.emit("output", stdout.trim());
//       }

//       if (stderr?.trim()) {
//         socket.emit("output", `⚠️ Warning: ${stderr.trim()}`);
//       }

//       if (!stdout?.trim() && !stderr?.trim()) {
//         socket.emit("output", "✅ Command executed successfully.");
//       }
//     });
//   });

//   socket.on('disconnect', () => {
//     console.log('🔌 Client disconnected');
//     currentSocket = null;
//   });
// });

// // Start server
// const startServer = () => {
//   server.listen(port, '0.0.0.0', () => {
//     console.log(`Server running on port ${port}`);
//   });
// };

// startServer();






// /*This is a refactored version of the original code. The refactoring includes:*/

// require('dotenv').config();
// const app = require('./app');
// const http = require('http');
// const { Server } = require('socket.io');


// const port = process.env.PORT || 3000;

// // Create HTTP server
// const server = http.createServer(app);

// // Setup Socket.io
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//   },
// });

// // Configure socket handlers


// // Start server
// server.listen(port, '0.0.0.0', () => {
//   console.log(`Server running on port ${port}`);
// });








require('dotenv').config();
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const socketConfig = require('./config/socketConfig');
const setupSocketRoutes = require('./routes/socketRoutes');
const { envConfig } = require('./config/env.config');


const port = envConfig.app.port

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, socketConfig.socketOptions);

// Configure socket routes
setupSocketRoutes(io);

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});