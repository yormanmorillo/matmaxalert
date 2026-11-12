const express = require('express');
const { Alert, Press, Area } = require('../models');
const {
  authenticateToken,
  optionalAuth,
  authenticateKiosk,
  requireRole,
} = require('../middleware/auth');

const router = express.Router();

// Inyectamos io desde el index para emitir eventos WebSocket
let io;
router.setIo = (socketIo) => { io = socketIo; };

const VALID_STATUSES = ['ACTIVE', 'WORKING', 'RESOLVED', 'CANCELLED'];
const SOS_TYPE = 'SOS';

// Máquina de estados: solo se permite avanzar, nunca reabrir una alerta cerrada.
const ALLOWED_TRANSITIONS = {
  ACTIVE:   ['WORKING', 'CANCELLED'],
  WORKING:  ['RESOLVED', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
};

const normalizeStatus = (value) => String(value || '').toUpperCase();

const sanitizeText = (value, maxLength) =>
  (value === undefined || value === null ? undefined : String(value).trim().slice(0, maxLength));

// GET /api/alerts — paginación acotada y filtros validados
router.get('/', async (req, res, next) => {
  try {
    const { status, pressId, limit, startDate, endDate } = req.query;
    const filter = {};

    if (status) {
      const normalized = normalizeStatus(status);
      if (!VALID_STATUSES.includes(normalized)) {
        return res.status(400).json({ message: 'status inválido' });
      }
      filter.status = normalized;
    }
    if (pressId) filter.pressId = String(pressId);

    if (startDate !== undefined || endDate !== undefined) {
      filter.timestamp = {};
      if (startDate !== undefined) {
        const from = Number(startDate);
        if (!Number.isFinite(from)) return res.status(400).json({ message: 'startDate inválido' });
        filter.timestamp.$gte = from;
      }
      if (endDate !== undefined) {
        const to = Number(endDate);
        if (!Number.isFinite(to)) return res.status(400).json({ message: 'endDate inválido' });
        filter.timestamp.$lte = to;
      }
    }

    // Sin límite explícito se devuelven las 2000 más recientes: evita que cada
    // kiosko descargue años de historial en cada reconexión.
    let limitNum = 2000;
    if (limit !== undefined) {
      const parsed = Number(limit);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return res.status(400).json({ message: 'limit debe ser un número positivo' });
      }
      limitNum = Math.min(parsed, 10_000);
    }

    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ timestamp: -1 }).limit(limitNum).lean(),
      Alert.countDocuments(filter),
    ]);

    return res.json({ alerts, total, limit: limitNum });
  } catch (err) {
    return next(err);
  }
});

// GET /api/alerts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alerta no encontrada' });
    return res.json(alert);
  } catch (err) {
    return next(err);
  }
});

// POST /api/alerts — paneles de planta autenticados con la clave de kiosko
router.post('/', authenticateKiosk, async (req, res, next) => {
  try {
    const type = sanitizeText(req.body?.type, 80);
    const pressId = sanitizeText(req.body?.pressId, 64);

    if (!type || !pressId) {
      return res.status(400).json({ message: 'type y pressId son requeridos' });
    }

    const press = await Press.findById(pressId);
    if (!press) return res.status(404).json({ message: 'Prensa no encontrada' });

    // Evita duplicados y SOS dobles por doble toque / dos kioskos.
    const duplicate = await Alert.findOne({
      pressId,
      type,
      status: { $in: ['ACTIVE', 'WORKING'] },
    }).lean();
    if (duplicate) {
      return res.status(409).json({
        message: 'Ya hay una alerta activa de este tipo para esta prensa',
        alertId: String(duplicate._id),
      });
    }

    let areaName = null;
    if (press.areaId) {
      const area = await Area.findById(press.areaId).lean();
      areaName = area ? area.name : null;
    }

    const now = Date.now();
    const alert = new Alert({
      type,
      pressId,
      pressName: press.name,
      areaName,
      notes: sanitizeText(req.body?.notes, 500),
      reportedBy: sanitizeText(req.body?.reportedBy, 80),
      timestamp: now,
      statusHistory: [{ status: 'ACTIVE', at: now, by: sanitizeText(req.body?.reportedBy, 80) || 'kiosk' }],
    });
    await alert.save();

    if (io) io.emit('alert:created', alert);
    return res.status(201).json(alert);
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/alerts/:id — transiciones validadas y SOS solo para supervisor/admin
router.patch('/:id', optionalAuth, authenticateKiosk, async (req, res, next) => {
  try {
    const current = await Alert.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Alerta no encontrada' });

    const { status, notes, assignedTo } = req.body || {};
    const update = {};
    let statusChanged = false;

    if (notes !== undefined) update.notes = sanitizeText(notes, 500);
    if (assignedTo !== undefined) update.assignedTo = sanitizeText(assignedTo, 100);

    if (status !== undefined) {
      const normalized = normalizeStatus(status);
      if (!VALID_STATUSES.includes(normalized)) {
        return res.status(400).json({ message: 'Estado inválido' });
      }

      if (normalized !== current.status) {
        const allowed = ALLOWED_TRANSITIONS[current.status] || [];
        if (!allowed.includes(normalized)) {
          return res.status(409).json({
            message: `Transición no permitida: ${current.status} → ${normalized}`,
          });
        }

        // Una emergencia no la puede cerrar (ni "tomar") un kiosko anónimo.
        if (current.type === SOS_TYPE && !['admin', 'supervisor'].includes(req.user?.role)) {
          return res.status(403).json({
            message: 'Solo un supervisor o administrador puede gestionar un SOS',
          });
        }

        update.status = normalized;
        statusChanged = true;

        const now = Date.now();
        if (normalized === 'WORKING' && !current.workingTimestamp) update.workingTimestamp = now;
        if (['RESOLVED', 'CANCELLED'].includes(normalized) && !current.resolvedTimestamp) {
          update.resolvedTimestamp = now;
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
    }

    const mongoUpdate = statusChanged
      ? {
          $set: update,
          $push: {
            statusHistory: {
              status: update.status,
              at: Date.now(),
              by: req.user?.username || update.assignedTo || 'kiosk',
            },
          },
        }
      : { $set: update };

    const alert = await Alert.findByIdAndUpdate(req.params.id, mongoUpdate, { new: true });
    if (io) io.emit('alert:updated', alert);

    return res.json(alert);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/alerts/:id — solo admin
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alerta no encontrada' });
    if (io) io.emit('alert:deleted', { id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
