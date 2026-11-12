const express = require('express');
const { Role } = require('../models');
const { authenticateToken, requireRole, requireSection } = require('../middleware/auth');

const router = express.Router();

const ROLE_ID_PATTERN = /^[a-z][a-z0-9_-]{1,30}$/;

// GET público: la home necesita los roles para pintar los portales.
router.get('/', async (_req, res, next) => {
  try { res.json(await Role.find().lean()); }
  catch (err) { next(err); }
});

router.post(
  '/',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('roles'),
  async (req, res, next) => {
    try {
      const id = String(req.body?.id || '').trim().toLowerCase();
      const displayName = String(req.body?.displayName || '').trim();
      const requiresAuth = req.body?.requiresAuth !== false;

      if (!ROLE_ID_PATTERN.test(id)) {
        return res.status(400).json({ message: 'ID de rol inválido (minúsculas, números, guion o _)' });
      }
      if (!displayName) return res.status(400).json({ message: 'displayName es requerido' });

      // Los roles personalizados no tienen portal implementado: avisar en vez de crear algo inutilizable.
      const role = await Role.create({ id, displayName, isCore: false, requiresAuth });
      return res.status(201).json(role);
    } catch (err) { next(err); }
  }
);

router.patch(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('roles'),
  async (req, res, next) => {
    try {
      const role = await Role.findOne({ id: req.params.id });
      if (!role) return res.status(404).json({ message: 'Rol no encontrado' });

      // Los roles del sistema definen rutas y accesos: no se editan.
      if (role.isCore) {
        return res.status(400).json({ message: 'Los roles del sistema no se pueden modificar' });
      }

      const update = {};
      if (req.body.displayName !== undefined) {
        update.displayName = String(req.body.displayName).trim();
        if (!update.displayName) return res.status(400).json({ message: 'displayName es requerido' });
      }
      if (req.body.requiresAuth !== undefined) update.requiresAuth = Boolean(req.body.requiresAuth);

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
      }

      const updated = await Role.findOneAndUpdate({ id: req.params.id }, { $set: update }, { new: true });
      return res.json(updated);
    } catch (err) { next(err); }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('roles'),
  async (req, res, next) => {
    try {
      const role = await Role.findOne({ id: req.params.id });
      if (!role) return res.status(404).json({ message: 'Rol no encontrado' });
      if (role.isCore) return res.status(400).json({ message: 'No se puede eliminar un rol del sistema' });

      // No dejar usuarios apuntando a un rol inexistente.
      const { User } = require('../models');
      const usersWithRole = await User.countDocuments({ role: role.id });
      if (usersWithRole > 0) {
        return res.status(409).json({ message: `Hay ${usersWithRole} usuario(s) con este rol` });
      }

      await Role.findOneAndDelete({ id: req.params.id });
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
