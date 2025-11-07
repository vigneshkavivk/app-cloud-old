// routes/policiesroutes.js
import express from 'express';
import Role from '../models/Roles.js'; // ⚠️ Fix typo: 'Roles' → 'Role'

const router = express.Router();

// ✅ Only super-admin is fully protected
const PROTECTED_FROM_DELETION = ['super-admin'];
const PROTECTED_FROM_MODIFICATION = ['super-admin']; // only super-admin can't be edited

// GET /api/policies/roles
router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (err) {
    console.error('Fetch roles error:', err);
    res.status(500).json({ error: 'Failed to load roles' });
  }
});

// POST /api/policies/roles
router.post('/roles', async (req, res) => {
  const { name, permissions = {} } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Valid role name is required' });
  }

  const normalizedName = name.trim().toLowerCase();

  // ✅ Allow creating 'admin', 'user', etc. — no reserved names
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

// PUT /api/policies/roles/:roleName
router.put('/roles/:roleName', async (req, res) => {
  const roleName = req.params.roleName.toLowerCase();
  const { permissions } = req.body;

  // ✅ Only block modification of 'super-admin'
  if (PROTECTED_FROM_MODIFICATION.includes(roleName)) {
    return res.status(403).json({ error: 'Cannot modify super-admin role' });
  }

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

// DELETE /api/policies/roles/:roleName
router.delete('/roles/:roleName', async (req, res) => {
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