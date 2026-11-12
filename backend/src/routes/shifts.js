const express = require('express');
const { Shift, User } = require('../models');
const { authenticateToken, requireRole, requireSection } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try { res.json(await Shift.find().lean()); }
  catch (err) { next(err); }
});

router.post(
  '/',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('shifts'),
  async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ message: 'El nombre del turno es requerido' });
      const shift = await Shift.create({ name });
      return res.status(201).json(shift);
    } catch (err) { next(err); }
  }
);

router.patch(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('shifts'),
  async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ message: 'El nombre del turno es requerido' });
      const shift = await Shift.findByIdAndUpdate(req.params.id, { name }, { new: true });
      if (!shift) return res.status(404).json({ message: 'Turno no encontrado' });
      return res.json(shift);
    } catch (err) { next(err); }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('shifts'),
  async (req, res, next) => {
    try {
      const shift = await Shift.findById(req.params.id);
      if (!shift) return res.status(404).json({ message: 'Turno no encontrado' });

      const users = await User.countDocuments({ shiftId: req.params.id });
      if (users > 0) {
        return res.status(409).json({ message: `Hay ${users} usuario(s) asignados a este turno` });
      }

      await Shift.findByIdAndDelete(req.params.id);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
