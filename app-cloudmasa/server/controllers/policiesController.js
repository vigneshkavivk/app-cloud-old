// server/controllers/policiesController.js
import Role from '../models/Roles.js';

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, permissions = {} } = req.body;

    const existing = await Role.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Role already exists' });

    const role = new Role({ name, permissions });
    await role.save();
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create role' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;
    const role = await Role.findByIdAndUpdate(roleId, { permissions }, { new: true });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await Role.findByIdAndDelete(roleId);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ message: 'Role deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
};