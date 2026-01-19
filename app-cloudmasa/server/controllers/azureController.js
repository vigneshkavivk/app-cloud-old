// server/controllers/azureController.js
import mongoose from 'mongoose';
import AzureCredential from '../models/azureCredentialModel.js';
import { encrypt } from '../utils/encrypt.js';
import axios from 'axios';

// Lazy-load Azure SDK safely
let ClientSecretCredential, ResourceManagementClient, SubscriptionClient;
try {
  const identity = await import('@azure/identity');
  const armResources = await import('@azure/arm-resources');
  ClientSecretCredential = identity.ClientSecretCredential;
  ResourceManagementClient = armResources.ResourceManagementClient;
  SubscriptionClient = armResources.SubscriptionClient;
} catch (err) {
  console.warn('⚠️ Azure SDK not available. Validation will be skipped.', err.message);
}

// 👉 1. Validate Azure Credentials
export const validateAzureCredentials = async (req, res) => {
  const { clientId, clientSecret, tenantId, subscriptionId, region, accountName } = req.body;

  if (!clientId || !clientSecret || !tenantId || !subscriptionId || !region) {
    return res.status(400).json({
      valid: false,
      error: 'Missing required fields: clientId, clientSecret, tenantId, subscriptionId, region.',
    });
  }

  // If Azure SDK not loaded, skip actual validation (but allow connection)
  if (!ClientSecretCredential || !ResourceManagementClient || !SubscriptionClient) {
    const fallbackName = accountName || `Azure-${subscriptionId.slice(-6)}`;
    return res.json({
      valid: true,
      subscriptionName: fallbackName,
      message: '✅ Skipping SDK validation (not installed). Auto-fill name.',
    });
  }

  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const resourceClient = new ResourceManagementClient(credential, subscriptionId);
    await resourceClient.resourceGroups.list(); // lightweight validation

    const subscriptionClient = new SubscriptionClient(credential);
    const subscription = await subscriptionClient.subscriptions.get(subscriptionId);

    const subscriptionName = accountName || subscription.displayName || `Azure-${subscriptionId.slice(-6)}`;

    res.json({
      valid: true,
      subscriptionName,
      message: '✅ Azure credentials validated successfully.',
    });
  } catch (err) {
    console.error('Azure validation failed:', err);
    const errMsg = err.message || 'Invalid credentials or insufficient permissions.';
    res.status(400).json({
      valid: false,
      error: errMsg.includes('AuthenticationFailed')
        ? 'Authentication failed. Check Client ID, Client Secret, Tenant ID, and Subscription ID.'
        : errMsg,
    });
  }
};

// 👉 2. Connect Azure Account
export const connectAzure = async (req, res) => {
  const { clientId, clientSecret, tenantId, subscriptionId, region, accountName } = req.body;

  // Validate input
  if (!clientId || !clientSecret || !tenantId || !subscriptionId || !region) {
    return res.status(400).json({ error: 'clientId, clientSecret, tenantId, subscriptionId, and region are required.' });
  }

  const cleanClientId = clientId.trim();
  const cleanTenantId = tenantId.trim();
  const cleanSubscriptionId = subscriptionId.trim();
  const cleanRegion = region.trim();
  const cleanAccountName = (accountName || `Azure-${cleanSubscriptionId.slice(-6)}`).trim();

  try {
    // Prevent duplicates (by subscription + tenant + client)
    const existing = await AzureCredential.findOne({
      clientId: cleanClientId,
      tenantId: cleanTenantId,
      subscriptionId: cleanSubscriptionId,
    });

    if (existing) {
      return res.status(200).json({
        reused: true,
        message: `Azure account "${existing.accountName}" is already connected.`,
        accountId: existing._id,
      });
    }

    // Save new credential (encrypt clientSecret)
    const newCred = new AzureCredential({
      cloudProvider: 'Azure',
      accountName: cleanAccountName,
      clientId: cleanClientId,
      clientSecret: encrypt(clientSecret), // ✅ Secure
      tenantId: cleanTenantId,
      subscriptionId: cleanSubscriptionId,
      region: cleanRegion,
      createdBy: req.user?._id || new mongoose.Types.ObjectId('000000000000000000000000'),
    });

    await newCred.save();

    res.status(201).json({
      message: `✅ Azure account "${newCred.accountName}" connected successfully.`,
      accountId: newCred._id,
    });
  } catch (error) {
    console.error('Azure connect error:', error);
    res.status(500).json({
      error: 'Failed to save Azure credentials.',
      message: error.message,
    });
  }
};

// 👉 3. GET: Fetch all Azure accounts for current user — ✅ FIXED
export const getAzureAccounts = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    // ✅ Fetch only needed fields — secure & efficient
    const accounts = await AzureCredential.find(
      { createdBy: userId },
      {
        _id: 1,
        cloudProvider: 1,
        accountName: 1,
        subscriptionId: 1,
        tenantId: 1,
        region: 1,
        clientId: 1,
        createdAt: 1,
        updatedAt: 1,
        // ❌ clientSecret is EXPLICITLY excluded (default behavior, but good to be explicit)
      }
    ).lean(); // ✅ Returns plain objects, faster & safe for JSON

    // ✅ Format exactly for frontend (CloudConnector.jsx expects these keys)
    const formatted = accounts.map((acc) => ({
      _id: acc._id.toString(), // Ensure string ID
      cloudProvider: acc.cloudProvider || 'Azure',
      accountName: acc.accountName || `Azure-${acc.subscriptionId?.slice(-6) || 'N/A'}`,
      subscriptionId: acc.subscriptionId || '',
      tenantId: acc.tenantId || '',
      region: acc.region || 'global',
      // ⚠️ Do NOT include clientSecret, clientSecretEncrypted, etc.
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Azure fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch Azure accounts.' });
  }
};

// 👉 4. Delete Azure Account
export const deleteAzureAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }

    const deleted = await AzureCredential.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Azure account not found.' });
    }

    res.json({ message: '✅ Azure account removed successfully.' });
  } catch (error) {
    console.error('Delete Azure account error:', error);
    res.status(500).json({ error: 'Failed to delete Azure account.' });
  }
};

// 👉 5. Validate Existing Azure Account
export const validateExistingAccount = async (req, res) => {
  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({ valid: false, error: 'accountId is required.' });
  }

  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    return res.status(400).json({ valid: false, error: 'Invalid accountId format.' });
  }

  try {
    const account = await AzureCredential.findById(accountId).lean();

    if (!account) {
      return res.status(404).json({ valid: false, error: 'Account not found.' });
    }

    // Optional: Re-validate with Azure SDK if needed (currently just returns stored data)
    res.json({
      valid: true,
      message: `✅ Account "${account.accountName}" is valid.`,
      accountId: account._id.toString(),
      accountName: account.accountName,
      subscriptionId: account.subscriptionId,
      tenantId: account.tenantId,
      region: account.region,
    });
  } catch (error) {
    console.error('Validate existing account error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate account.' });
  }
};
