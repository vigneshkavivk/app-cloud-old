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
// const saltRounds = 10;const 
// jwt = require('jsonwebtoken');
// const cloudwatch = new AWS.CloudWatch();

// require('dotenv').config();

// const app = express();
// const server = http.createServer(app); // Create HTTP server
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Allow all origins (change this for security)
//     methods: ["GET", "POST"],
//   },
// });

// const port = process.env.PORT || 3000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

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

// const clusterSchema = new mongoose.Schema({
//   awsAccessKey: { type: String, required: true },
//   awsSecretKey: { type: String, required: true },
//   clusterName: { type: String, required: true },
//   awsRegion: { type: String, required: true },
//   outputFormat: { type: String, required: true },

//   awsAccountNumber: { type: String, required: true }, // Store the AWS Account number
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
// const Token = mongoose.model('Token', tokenSchema, 'scmmanager');

// // POST endpoint to save the token and platform


// const registerSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
// });
// const Register = mongoose.model('Register', registerSchema);


// // Create model for Cluster
// const Cluster = mongoose.model('Cluster', clusterSchema);


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

// const Deployment = mongoose.model('Deployment', deploymentSchema, 'delete'); 

// const defaultSchema = new mongoose.Schema(
//   {
//     repo: String,
//     folder: String,
//   },
//   { collection: 'default' } // specify the collection name here
// );

// const Default = mongoose.model('Default', defaultSchema);


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


// // Create model for CloudConnection
// const CloudConnection = mongoose.model('CloudConnection', cloudConnectionSchema);
// app.get('/api/get-argocd-details', (req, res) => {
//   // Run kubectl commands to get ArgoCD details
//   exec('kubectl get svc -n argocd -o jsonpath="{.items[0].status.loadBalancer.ingress[0].ip}"', (err, ipStdout) => {
//     if (err) {
//       return res.status(500).json({ error: 'Failed to fetch ArgoCD IP' });
//     }
//     const argoIp = ipStdout.trim();

//     exec('kubectl -n argocd get secret argocd-initial-admin-password -o jsonpath="{.data.password}" | base64 --decode', (err, passwordStdout) => {
//       if (err) {
//         return res.status(500).json({ error: 'Failed to fetch ArgoCD password' });
//       }
//       const argoPassword = passwordStdout.trim();
//       res.json({ argoIp, argoPassword });
//     });
//   });
// });

// app.post('/api/validate-aws-credentials', async (req, res) => {
//   const { accessKey, secretKey, region } = req.body;

//   if (!accessKey || !secretKey) {
//     return res.status(400).json({ error: 'Access Key and Secret Key are required' });
//   }

//   try {
//     // Create temporary AWS credentials
//     const awsConfig = {
//       accessKeyId: accessKey,
//       secretAccessKey: secretKey,
//       region: region || 'us-east-1'
//     };

//     // Test credentials by listing S3 buckets (a simple read operation)
//     const s3 = new AWS.S3(awsConfig);
//     const data = await s3.listBuckets().promise();

//     // If successful, return some basic account info
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


// // Express route (Node.js example)
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
// // Login endpoint
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     // Basic validation
//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required' });
//     }

//     // Find user by email
//     const user = await Register.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Compare passwords
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     // Return success response with user data (excluding password)
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
//   const { token } = req.query; // GitHub token from query params

//   if (!token) {
//     return res.status(400).json({ error: 'GitHub token is required' });
//   }

//   try {
//     // Fetch all repositories using the provided GitHub token
//     const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
//       headers: {
//         Authorization: `Bearer ${token}`, // Bearer token authentication
//       },
//     });

//     // Filter out the 'tools' repository
//     const toolsRepo = response.data.find(repo => repo.name === 'tools');

//     if (!toolsRepo) {
//       return res.status(404).json({ error: 'tools repository not found' });
//     }

//     // Return only the 'tools' repository full name
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
//     // Configure AWS with provided credentials
//     awsConfig = {
//       accessKeyId: accessKey,
//       secretAccessKey: secretKey,
//       region: region || 'us-east-1'
//     };

//     // Create STS client to get account information
//     const sts = new AWS.STS(awsConfig);
//     const s3 = new AWS.S3(awsConfig);

//     // Get caller identity (account info)
//     const identity = await sts.getCallerIdentity().promise();

//     // List S3 buckets
//     const buckets = await s3.listBuckets().promise();

//     // Save the AWS connection details in the MongoDB database
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
//     const accounts = await CloudConnection.find(); // Get all saved accounts
//     res.json(accounts);
//   } catch (err) {
//     console.error('Error fetching accounts:', err);
//     res.status(500).json({ error: 'Failed to fetch AWS accounts' });
//   }
// });

// // Fetch EKS clusters for a specific account
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

//     // Set AWS credentials using the saved account
//     const awsConfig = {
//       accessKeyId: account.awsAccessKey,
//       secretAccessKey: account.awsSecretKey,
//       region: account.awsRegion || 'us-east-1',
//     };

//     const eks = new AWS.EKS(awsConfig); // Create an EKS instance

//     // Fetch clusters from EKS
//     const clustersData = await eks.listClusters().promise();

//     res.json({
//       clusters: clustersData.clusters,
//     });
//   } catch (err) {
//     console.error('Error fetching EKS clusters:', err);
//     res.status(500).json({ error: 'Failed to fetch EKS clusters' });
//   }
// });




// // Endpoint to fetch CPU usage for a cluster
// app.post('/api/get-cluster-metrics', async (req, res) => {
//   const { awsAccessKey, awsSecretKey, awsRegion } = req.body;

//   // Configure AWS SDK with provided credentials
//   AWS.config.update({
//     accessKeyId: awsAccessKey,
//     secretAccessKey: awsSecretKey,
//     region: awsRegion,
//   });

//   try {
//     // Fetch CPU usage
//     const cpuParams = {
//       Namespace: 'AWS/EC2',
//       MetricName: 'CPUUtilization',
//       Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }], // Replace with your instance ID
//       StartTime: new Date(Date.now() - 300000), // 5 minutes ago
//       EndTime: new Date(),
//       Period: 300,
//       Statistics: ['Average'],
//     };

//     const cpuData = await cloudwatch.getMetricStatistics(cpuParams).promise();
//     const cpuUsage = cpuData.Datapoints.length > 0 ? cpuData.Datapoints[0].Average : 0;

//     // Fetch memory usage (requires custom CloudWatch metrics)
//     const memoryParams = {
//       Namespace: 'System/Linux',
//       MetricName: 'MemoryUtilization',
//       Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }], // Replace with your instance ID
//       StartTime: new Date(Date.now() - 300000), // 5 minutes ago
//       EndTime: new Date(),
//       Period: 300,
//       Statistics: ['Average'],
//     };

//     const memoryData = await cloudwatch.getMetricStatistics(memoryParams).promise();
//     const memoryUsage = memoryData.Datapoints.length > 0 ? memoryData.Datapoints[0].Average : 0;

//     // Fetch storage usage (requires custom CloudWatch metrics)
//     const storageParams = {
//       Namespace: 'System/Linux',
//       MetricName: 'DiskSpaceUtilization',
//       Dimensions: [{ Name: 'InstanceId', Value: 'YOUR_INSTANCE_ID' }], // Replace with your instance ID
//       StartTime: new Date(Date.now() - 300000), // 5 minutes ago
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
// // Endpoint to verify and configure AWS credentials
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

//     // Ensure .aws directory exists
//     const awsDir = path.dirname(awsCredentialsPath);

//     // Write AWS credentials
//     fs.writeFileSync(awsCredentialsPath, credentialsContent.trim());

//     // Write AWS config
//     fs.writeFileSync(awsConfigPath, configContent.trim());

//     res.json({ message: "AWS credentials and config saved successfully!" });
//   } catch (error) {
//     console.error("AWS Credential Verification/Configuration Error:", error);
//     res.status(400).json({ error: "Invalid AWS credentials or configuration failed" });
//   }
// });

// // Endpoint to update a cluster
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
//       { new: true } // Return the updated document
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

//   // Configure AWS SDK with provided credentials
//   const credentials = new AWS.Credentials(awsAccessKey, awsSecretKey);
//   AWS.config.update({ credentials });

//   const sts = new AWS.STS();

//   try {
//     // Call STS to get the AWS account info
//     const response = await sts.getCallerIdentity().promise();

//     // Return the account info
//     res.json({
//       valid: true,
//       data: {
//         Account: response.Account,  // This will be the AWS Account Number
//         Arn: response.Arn
//       }
//     });
//   } catch (error) {
//     console.error('Error verifying AWS credentials:', error);
//     res.status(400).json({ valid: false, error: 'Invalid credentials' });
//   }
// });
// // Endpoint to save the cluster data along with AWS Account number
// app.post('/api/save-data', async (req, res) => {
//   try {
//     const { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat, status } = req.body;

//     if (!awsAccessKey || !awsSecretKey || !clusterName || !awsRegion || !outputFormat) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     // Verifying the AWS credentials to fetch the Account number
//     AWS.config.update({
//       accessKeyId: awsAccessKey,
//       secretAccessKey: awsSecretKey,
//       region: awsRegion || "us-east-1",
//       outputFormat: outputFormat || "json",
//     });

//     const sts = new AWS.STS();

//     // Fetching AWS account number
//     const identityData = await sts.getCallerIdentity({}).promise();
//     const awsAccountNumber = identityData.Account; // Extract the account number

//     // Saving the cluster data including the AWS Account number
//     const newCluster = new Cluster({
//       awsAccessKey,
//       awsSecretKey,
//       clusterName,
//       awsRegion,
//       outputFormat,
//       status: status || 'Active',
//       awsAccountNumber: awsAccountNumber, // Store the AWS Account number here
//     });

//     await newCluster.save();
//     res.status(201).json({ message: 'Cluster data saved successfully', cluster: newCluster });
//   } catch (error) {
//     console.error('Error saving cluster data:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });


// // Endpoint to get all clusters
// app.get('/api/get-clusters', async (req, res) => {
//   try {
//     const { clusterName } = req.query;

//     let filter = {};
//     if (clusterName) {
//       filter.clusterName = { $regex: clusterName, $options: 'i' };  // Case-insensitive search
//     }

//     const clusters = await Cluster.find(filter);
//     res.status(200).json(clusters);
//   } catch (error) {
//     console.error('Error fetching cluster data:', error);
//     res.status(500).json({ message: 'Error fetching cluster data', error: error.message });
//   }
// });

// // Endpoint to get a single cluster by ID

// // Endpoint to verify and configure AWS credentials
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

//     // Ensure .aws directory exists
//     const awsDir = path.dirname(awsCredentialsPath);
//     if (!fs.existsSync(awsDir)) {
//       fs.mkdirSync(awsDir, { recursive: true });
//     }

//     // Write AWS credentials
//     fs.writeFileSync(awsCredentialsPath, credentialsContent.trim());

//     // Write AWS config
//     fs.writeFileSync(awsConfigPath, configContent.trim());

//     res.json({ message: "AWS credentials and config saved successfully!" });
//   } catch (error) {
//     console.error("AWS Credential Verification/Configuration Error:", error);
//     res.status(400).json({ error: "Invalid AWS credentials or configuration failed" });
//   }
// });

// // Endpoint to update a cluster
// app.put('/api/update-cluster/:id', async (req, res) => {
//   const { id } = req.params;
//   const { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat, status } = req.body;

//   if (!isValidObjectId(id)) {
//     return res.status(400).json({ message: 'Invalid cluster ID' });
//   }

//   try {
//     const updatedCluster = await Cluster.findByIdAndUpdate(
//       id,
//       { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat, status },
//       { new: true } // Return the updated document
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

// // Endpoint to verify AWS credentials
// app.post('/api/verify-credentials', async (req, res) => {
//   const { awsAccessKey, awsSecretKey } = req.body;

//   // Configure AWS SDK with provided credentials
//   const credentials = new AWS.Credentials(awsAccessKey, awsSecretKey);
//   AWS.config.update({ credentials });

//   const sts = new AWS.STS();

//   try {
//     // Call STS to get the AWS account info
//     const response = await sts.getCallerIdentity().promise();

//     // Return the account info
//     res.json({
//       valid: true,
//       data: {
//         Account: response.Account,  // This will be the AWS Account Number
//         Arn: response.Arn
//       }
//     });
//   } catch (error) {
//     console.error('Error verifying AWS credentials:', error);
//     res.status(400).json({ valid: false, error: 'Invalid credentials' });
//   }
// });

// // Endpoint to save the cluster data along with AWS Account number
// app.post('/api/save-data', async (req, res) => {
//   try {
//     const { awsAccessKey, awsSecretKey, clusterName, awsRegion, outputFormat, status } = req.body;

//     if (!awsAccessKey || !awsSecretKey || !clusterName || !awsRegion || !outputFormat) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     // Verifying the AWS credentials to fetch the Account number
//     AWS.config.update({
//       accessKeyId: awsAccessKey,
//       secretAccessKey: awsSecretKey,
//       region: awsRegion || "us-east-1",
//       outputFormat: outputFormat || "json",
//     });

//     const sts = new AWS.STS();

//     // Fetching AWS account number
//     const identityData = await sts.getCallerIdentity({}).promise();
//     const awsAccountNumber = identityData.Account; // Extract the account number

//     // Saving the cluster data including the AWS Account number
//     const newCluster = new Cluster({
//       awsAccessKey,
//       awsSecretKey,
//       clusterName,
//       awsRegion,
//       outputFormat,
//       status: status || 'Active',
//       awsAccountNumber: awsAccountNumber, // Store the AWS Account number here
//     });

//     await newCluster.save();
//     res.status(201).json({ message: 'Cluster data saved successfully', cluster: newCluster });
//   } catch (error) {
//     console.error('Error saving cluster data:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });


// // Endpoint to get all clusters
// app.get('/api/get-clusters', async (req, res) => {
//   try {
//     const { clusterName } = req.query;

//     let filter = {};
//     if (clusterName) {
//       filter.clusterName = { $regex: clusterName, $options: 'i' };  // Case-insensitive search
//     }

//     const clusters = await Cluster.find(filter);
//     res.status(200).json(clusters);
//   } catch (error) {
//     console.error('Error fetching cluster data:', error);
//     res.status(500).json({ message: 'Error fetching cluster data', error: error.message });
//   }
// });

// // Endpoint to get a single cluster by ID
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

// // Endpoint to delete a cluster
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

// // Route to run the kubectl installation script
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

// // Endpoint to get cluster credentials by name
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

//     // Execute the commands in shell
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

// io.on("connection", (socket) => {
//   console.log("🔌 New client connected");

//   socket.on("command", (cmd) => {
//     console.log(`💻 Executing command: ${cmd}`);

//     // Use OS-appropriate shell
//     const shell = os.platform() === "win32" ? process.env.ComSpec || "cmd.exe" : "/bin/bash";

//     exec(cmd, { shell: shell, env: process.env }, (error, stdout, stderr) => {
//       if (error) {
//         console.error(" Execution Error:", error.message);
//         socket.emit("output", ` Error: ${stderr?.trim() || error.message}`);
//         return;
//       }

//       // Send stdout if available
//       if (stdout?.trim()) {
//         socket.emit("output", stdout.trim());
//       }

//       // Send stderr if available (as warning)
//       if (stderr?.trim()) {
//         socket.emit("output", `⚠️ Warning: ${stderr.trim()}`);
//       }

//       // No output at all
//       if (!stdout?.trim() && !stderr?.trim()) {
//         socket.emit("output", "✅ Command executed successfully.");
//       }
//     });
//   });

//   socket.on("disconnect", () => {
//     console.log("🔌 Client disconnected");
//   });
// });









// // Store ongoing commands
// io.on('connection', (socket) => {
//   console.log('A user connected');

//   // Handle command input from frontend
//   socket.on('command', (command) => {
//     console.log(`Received command: ${command}`);

//     // Execute the command using the child_process module
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`exec error: ${error}`);
//         socket.emit('command_error', error.message);
//         return;
//       }
//       if (stderr) {
//         console.error(`stderr: ${stderr}`);
//         socket.emit('command_error', stderr);
//         return;
//       }
//       console.log(`stdout: ${stdout}`);
//       socket.emit('output', stdout);
//     });
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected');
//   });
// });

// // Start the server


// const startServer = () => {
//   server.listen(port, () => {
//     console.log(`Server running on port ${port}`);
//   });
// };

// module.exports = { startServer };
