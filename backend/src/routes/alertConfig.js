const express = require('express');
const { AlertButtonConfig } = require('../models');
const { authenticateToken, requireRole, requireSection } = require('../middleware/auth');

const router = express.Router();

const sanitizeConfig = (raw) => {
  const config = {
    id: String(raw?.id || '').trim(),
    name: String(raw?.name || '').trim().slice(0, 80),
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : 0,
    enabled: raw?.enabled !== false,
    allowedRoles: Array.isArray(raw?.allowedRoles)
      ? raw.allowedRoles.map((role) => String(role).trim()).filter(Boolean)
      : [],
    allowedPressIds: Array.isArray(raw?.allowedPressIds)
      ? raw.allowedPressIds.map((pressId) => String(pressId).trim()).filter(Boolean)
      : [],
  };
  return config;
};

// GET /api/alert-config
router.get('/', async (_req, res, next) => {
  try {
    res.json(await AlertButtonConfig.find().sort({ order: 1 }).lean());
  } catch (err) { next(err); }
});

// PUT /api/alert-config — reemplazo atómico por documento (sin transacciones:
// Mongo standalone no las soporta y esta colección son ~6 documentos).
router.put(
  '/',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('alertConfig'),
  async (req, res, next) => {
    try {
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: 'Se esperaba un array de configuraciones' });
      }
      if (req.body.length === 0) {
        return res.status(400).json({ message: 'Debe haber al menos una configuración' });
      }

      const configs = req.body.map(sanitizeConfig);
      if (configs.some((config) => !config.id || !config.name)) {
        return res.status(400).json({ message: 'Cada configuración requiere id y name' });
      }

      const ids = configs.map((config) => config.id);
      if (new Set(ids).size !== ids.length) {
        return res.status(400).json({ message: 'IDs de configuración duplicados' });
      }
      if (configs.some((config) => config.name.toUpperCase() === 'SOS')) {
        return res.status(400).json({ message: '"SOS" es un tipo reservado del sistema' });
      }

      // Upsert de todas + borrado de las que ya no están. Nunca deja la
      // colección vacía (a diferencia de deleteMany + insertMany).
      await AlertButtonConfig.bulkWrite([
        ...configs.map((config) => ({
          updateOne: { filter: { id: config.id }, update: { $set: config }, upsert: true },
        })),
        { deleteMany: { filter: { id: { $nin: ids } } } },
      ]);

      const saved = await AlertButtonConfig.find().sort({ order: 1 }).lean();
      return res.json(saved);
    } catch (err) {
      return next(err);
    }
  }
);

// PATCH /api/alert-config/:id — `id` es el campo de negocio, no el ObjectId
router.patch(
  '/:id',
  authenticateToken,
  requireRole('admin', 'supervisor'),
  requireSection('alertConfig'),
  async (req, res, next) => {
    try {
      const update = {};
      if (req.body.name !== undefined) update.name = String(req.body.name).trim().slice(0, 80);
      if (req.body.order !== undefined && Number.isFinite(Number(req.body.order))) update.order = Number(req.body.order);
      if (req.body.enabled !== undefined) update.enabled = Boolean(req.body.enabled);
      if (Array.isArray(req.body.allowedRoles)) {
        update.allowedRoles = req.body.allowedRoles.map((role) => String(role).trim()).filter(Boolean);
      }
      if (Array.isArray(req.body.allowedPressIds)) {
        update.allowedPressIds = req.body.allowedPressIds.map((pressId) => String(pressId).trim()).filter(Boolean);
      }
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
      }

      const config = await AlertButtonConfig.findOneAndUpdate(
        { id: req.params.id },
        { $set: update },
        { new: true }
      );
      if (!config) return res.status(404).json({ message: 'Configuración no encontrada' });
      return res.json(config);
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;
