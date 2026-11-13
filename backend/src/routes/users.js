const express = require('express');
const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
const { authenticateToken, optionalAuth, requireRole, requireSection } = require('../middleware/auth');

const router = express.Router();

const PUBLIC_FIELDS = 'username role shiftId assignedPressIds';
const isArrayOfStrings = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

// GET /api/users — público y mínimo: solo lo que necesitan los selectores de kiosko.
// No expone secciones permitidas, hashes ni timestamps.
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // Los paneles de administración necesitan allowedSections; los kioskos
    // anónimos reciben solo los campos del selector.
    const canSeeAll = req.user && (
      req.user.role === 'admin'
      || (req.user.role === 'supervisor' && (req.user.allowedSections || []).includes('users'))
    );
    // Sin sesión solo se listan los roles de kiosko: nunca admin/supervisor.
    const KIOSK_ROLES = ['technical', 'driver', 'press'];
    const query = canSeeAll
      ? User.find().select('-password')
      : User.find({ role: { $in: KIOSK_ROLES } }).select(PUBLIC_FIELDS);
    res.json(await query.lean());
  } catch (err) { next(err); }
});

// GET /api/users/:id — admin/supervisor con sección, o el propio usuario
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const isSelf = String(req.user.id) === String(req.params.id);
    const canSeeAll = req.user.role === 'admin'
      || (req.user.role === 'supervisor' && (req.user.allowedSections || []).includes('users'));
    if (!isSelf && !canSeeAll) {
      return res.status(403).json({ message: 'No tienes permisos para ver este usuario' });
    }

    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json(user);
  } catch (err) { next(err); }
});

// POST /api/users — admin o supervisor con sección
router.post(
  '/',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('users'),
  async (req, res, next) => {
    try {
      const username = String(req.body?.username || '').trim();
      const password = req.body?.password ? String(req.body.password) : '';
      const { role, shiftId } = req.body || {};
      const assignedPressIds = req.body?.assignedPressIds ?? [];
      const allowedSections = req.body?.allowedSections ?? [];

      if (!username || !role) {
        return res.status(400).json({ message: 'username y role son requeridos' });
      }
      if (username.length < 3 || username.length > 40) {
        return res.status(400).json({ message: 'El usuario debe tener entre 3 y 40 caracteres' });
      }
      if (!isArrayOfStrings(assignedPressIds) || !isArrayOfStrings(allowedSections)) {
        return res.status(400).json({ message: 'assignedPressIds y allowedSections deben ser arrays de texto' });
      }

      // Anti-escalación
      if (req.user.role !== 'admin') {
        if (role === 'admin') {
          return res.status(403).json({ message: 'No puedes crear usuarios administradores' });
        }
        if (allowedSections.length > 0) {
          return res.status(403).json({ message: 'No puedes asignar permisos de secciones' });
        }
      }

      const roleDoc = await Role.findOne({ id: role });
      if (!roleDoc) return res.status(400).json({ message: 'Rol inválido' });

      if (roleDoc.requiresAuth && password.length < 8) {
        return res.status(400).json({ message: 'La contraseña es requerida (mínimo 8 caracteres) para este rol' });
      }

      const user = new User({
        username,
        password: password ? await bcrypt.hash(password, 12) : '*unauthenticated*',
        role,
        shiftId: shiftId || undefined,
        assignedPressIds,
        allowedSections,
      });
      await user.save();

      const { password: _ignored, ...userWithoutPassword } = user.toObject();
      return res.status(201).json(userWithoutPassword);
    } catch (err) { next(err); }
  }
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('users', 'driverPressAssignment'),
  async (req, res, next) => {
    try {
      const target = await User.findById(req.params.id);
      if (!target) return res.status(404).json({ message: 'Usuario no encontrado' });

      const { password, role } = req.body || {};
      const roleChanged = role !== undefined && role !== target.role;
      const sectionsChanged = req.body?.allowedSections !== undefined
        && JSON.stringify(req.body.allowedSections) !== JSON.stringify(target.allowedSections || []);

      if (req.user.role !== 'admin') {
        if (target.role === 'admin') {
          return res.status(403).json({ message: 'No puedes modificar administradores' });
        }
        if (roleChanged) {
          return res.status(403).json({ message: 'No puedes cambiar roles' });
        }
        if (sectionsChanged) {
          return res.status(403).json({ message: 'No puedes cambiar permisos de secciones' });
        }
        if (String(target._id) === String(req.user.id)) {
          return res.status(403).json({ message: 'No puedes modificarte a ti mismo' });
        }
      }

      const updateData = {};
      if (req.body.username !== undefined) {
        const username = String(req.body.username).trim();
        if (username.length < 3) return res.status(400).json({ message: 'Usuario demasiado corto' });
        updateData.username = username;
      }
      if (req.body.shiftId !== undefined) updateData.shiftId = req.body.shiftId || undefined;
      if (req.body.assignedPressIds !== undefined) {
        if (!isArrayOfStrings(req.body.assignedPressIds)) {
          return res.status(400).json({ message: 'assignedPressIds debe ser un array de texto' });
        }
        updateData.assignedPressIds = req.body.assignedPressIds;
      }

      if (req.user.role === 'admin') {
        if (roleChanged) {
          const roleDoc = await Role.findOne({ id: role });
          if (!roleDoc) return res.status(400).json({ message: 'Rol inválido' });

          // No dejar el sistema sin administradores.
          if (target.role === 'admin' && role !== 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
              return res.status(400).json({ message: 'No puedes quitar el rol al último administrador' });
            }
          }

          // Un rol con login obligatorio necesita una contraseña utilizable.
          if (roleDoc.requiresAuth && !password && String(target.password).startsWith('*')) {
            return res.status(400).json({ message: 'Asigna una contraseña al pasar a un rol con login' });
          }
          updateData.role = role;
        }
        if (req.body.allowedSections !== undefined) {
          if (!isArrayOfStrings(req.body.allowedSections)) {
            return res.status(400).json({ message: 'allowedSections debe ser un array de texto' });
          }
          updateData.allowedSections = req.body.allowedSections;
        }
      }

      if (password) {
        if (String(password).length < 8) {
          return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }
        updateData.password = await bcrypt.hash(String(password), 12);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
      }

      const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
      return res.json(user);
    } catch (err) { next(err); }
  }
);

// DELETE /api/users/:id — solo admin, sin poder borrarse a sí mismo ni al último admin
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (target.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'No se puede eliminar el último administrador' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
