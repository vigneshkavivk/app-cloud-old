// routes/policies.routes.js
import express from 'express';
import authenticate from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.middleware.js'; // ✅ RBAC middleware
import Role from '../models/Roles.js'; // ✅ CORRECTED: Was 'Roles.js', now 'Role.js'

const router = express.Router();

// ✅ Only super-admin is fully protected
const PROTECTED_FROM_DELETION = ['super-admin'];
const PROTECTED_FROM_MODIFICATION = ['super-admin'];

// GET /api/policies/roles (requires Read permission)
router.get('/roles', authenticate, requirePermission('Overall', 'Read'), async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (err) {
    console.error('Fetch roles error:', err);
    res.status(500).json({ error: 'Failed to load roles' });
  }
});

// GET /api/policies/roles/permissions?role=:roleName
// This is the endpoint your frontend needs for login.
router.get('/roles/permissions', authenticate, async (req, res) => {
  try {
    const { role } = req.query;

    if (!role) {
      return res.status(400).json({ error: 'Role parameter is required' });
    }

    // Find the role in the database
    const roleDoc = await Role.findOne({ name: role });

    if (!roleDoc) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Return the permissions object
    res.json({ permissions: roleDoc.permissions });
  } catch (err) {
    console.error('Fetch role permissions error:', err);
    res.status(500).json({ error: 'Failed to load permissions' });
  }
});

// POST /api/policies/roles (requires Administer permission)
router.post('/roles', authenticate, requirePermission('Overall', 'Administer'), async (req, res) => {
  const { name, permissions = {} } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Valid role name is required' });
  }

  const normalizedName = name.trim().toLowerCase();

  try {
    const existing = await Role.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ error: 'Role already exists' });
    }

    const newRole = new Role({ name: normalizedName, permissions });
    await newRole.save();
    res.status(201).json(newRole);
  } catch (err) {
    console.error('Create role error:', err);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// PUT /api/policies/roles/:roleName (requires Administer permission)
router.put('/roles/:roleName', authenticate, requirePermission('Overall', 'Administer'), async (req, res) => {
  const roleName = req.params.roleName.toLowerCase();

  // ✅ Only block modification of 'super-admin'
  if (PROTECTED_FROM_MODIFICATION.includes(roleName)) {
    return res.status(403).json({ error: 'Cannot modify super-admin role' });
  }

  const { permissions } = req.body;

  try {
    const updated = await Role.findOneAndUpdate(
      { name: roleName },
      { permissions },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/policies/roles/:roleName (requires Administer permission)
router.delete('/roles/:roleName', authenticate, requirePermission('Overall', 'Administer'), async (req, res) => {
  const roleName = req.params.roleName.toLowerCase();

  // ✅ Only block deletion of 'super-admin'
  if (PROTECTED_FROM_DELETION.includes(roleName)) {
    return res.status(403).json({ error: 'Cannot delete super-admin role' });
  }

  try {
    const result = await Role.deleteOne({ name: roleName });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete role error:', err);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;