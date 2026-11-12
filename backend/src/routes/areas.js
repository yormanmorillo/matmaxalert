const express = require('express');
const { Area, Press } = require('../models');
const { authenticateToken, requireRole, requireSection } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try { res.json(await Area.find().lean()); }
  catch (err) { next(err); }
});

router.post(
  '/',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('areas'),
  async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ message: 'El nombre del área es requerido' });
      const area = await Area.create({ name });
      return res.status(201).json(area);
    } catch (err) { next(err); }
  }
);

router.patch(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('areas'),
  async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ message: 'El nombre del área es requerido' });
      const area = await Area.findByIdAndUpdate(req.params.id, { name }, { new: true });
      if (!area) return res.status(404).json({ message: 'Área no encontrada' });
      return res.json(area);
    } catch (err) { next(err); }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('areas'),
  async (req, res, next) => {
    try {
      const area = await Area.findById(req.params.id);
      if (!area) return res.status(404).json({ message: 'Área no encontrada' });

      const presses = await Press.countDocuments({ areaId: req.params.id });
      if (presses > 0) {
        return res.status(409).json({ message: `Hay ${presses} prensa(s) en esta área` });
      }

      await Area.findByIdAndDelete(req.params.id);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
