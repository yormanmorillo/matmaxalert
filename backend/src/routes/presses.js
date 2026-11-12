const express = require('express');
const { Press, Area, Alert, User } = require('../models');
const { authenticateToken, requireRole, requireSection } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['Operational', 'Maintenance', 'Stopped', 'Offline'];
const ACTIVE_STATUSES = ['ACTIVE', 'WORKING'];

router.get('/', async (req, res, next) => {
  try {
    const { areaId } = req.query;
    const filter = areaId ? { areaId: String(areaId) } : {};
    res.json(await Press.find(filter).lean());
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const press = await Press.findById(req.params.id).lean();
    if (!press) return res.status(404).json({ message: 'Prensa no encontrada' });
    res.json(press);
  } catch (err) { next(err); }
});

router.post(
  '/',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('presses'),
  async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      const areaId = String(req.body?.areaId || '').trim();
      const status = req.body?.status || 'Operational';

      if (!name || !areaId) {
        return res.status(400).json({ message: 'name y areaId son requeridos' });
      }
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Estado de prensa inválido' });
      }

      const area = await Area.findById(areaId);
      if (!area) return res.status(400).json({ message: 'El área no existe' });

      const press = await Press.create({ name, areaId, status });
      return res.status(201).json(press);
    } catch (err) { next(err); }
  }
);

router.patch(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('presses'),
  async (req, res, next) => {
    try {
      const update = {};
      if (req.body.name !== undefined) {
        update.name = String(req.body.name).trim();
        if (!update.name) return res.status(400).json({ message: 'El nombre es requerido' });
      }
      if (req.body.areaId !== undefined) {
        const area = await Area.findById(req.body.areaId);
        if (!area) return res.status(400).json({ message: 'El área no existe' });
        update.areaId = String(req.body.areaId);
      }
      if (req.body.status !== undefined) {
        if (!VALID_STATUSES.includes(req.body.status)) {
          return res.status(400).json({ message: 'Estado de prensa inválido' });
        }
        update.status = req.body.status;
      }
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
      }

      const press = await Press.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!press) return res.status(404).json({ message: 'Prensa no encontrada' });
      return res.json(press);
    } catch (err) { next(err); }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('presses'),
  async (req, res, next) => {
    try {
      const press = await Press.findById(req.params.id);
      if (!press) return res.status(404).json({ message: 'Prensa no encontrada' });

      const activeAlerts = await Alert.countDocuments({
        pressId: req.params.id,
        status: { $in: ACTIVE_STATUSES },
      });
      if (activeAlerts > 0) {
        return res.status(409).json({ message: `Hay ${activeAlerts} alerta(s) activas en esta prensa` });
      }

      await User.updateMany(
        { assignedPressIds: req.params.id },
        { $pull: { assignedPressIds: req.params.id } }
      );
      await Press.findByIdAndDelete(req.params.id);
      return res.json({ success: true });
    } catch (err) { next(err); }
  }
);

module.exports = router;
