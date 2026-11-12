const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const extractToken = (req) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
};

const toRequestUser = (user) => ({
  id: String(user._id),
  username: user.username,
  role: user.role,
  shiftId: user.shiftId,
  assignedPressIds: user.assignedPressIds || [],
  allowedSections: user.allowedSections || [],
});

/**
 * Verifica el JWT y recarga el usuario desde la BD.
 * Recargar evita que un rol/permiso revocado siga vigente hasta que expire el token.
 */
const authenticateToken = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub || payload.id).select('-password').lean();
    if (!user) return res.status(401).json({ message: 'Sesión inválida' });
    req.user = toRequestUser(user);
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

/** Igual que authenticateToken pero nunca rechaza: deja req.user = null si no hay token válido. */
const optionalAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub || payload.id).select('-password').lean();
    req.user = user ? toRequestUser(user) : null;
  } catch {
    req.user = null;
  }
  return next();
};

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Autoriza a los paneles de planta (kioskos) con una clave de dispositivo.
 * La clave la inyecta nginx en la cabecera X-Kiosk-Key: no viaja en el bundle
 * y el backend no está publicado directamente (solo red interna de Docker).
 * Si KIOSK_API_KEY no está definida (desarrollo), se permite el paso.
 */
const authenticateKiosk = (req, res, next) => {
  const expected = process.env.KIOSK_API_KEY;
  if (!expected) return next();

  const provided = req.headers['x-kiosk-key'];
  if (provided && safeEqual(provided, expected)) {
    req.isKiosk = true;
    return next();
  }
  return res.status(401).json({ message: 'Dispositivo no autorizado' });
};

/** Debe usarse después de authenticateToken. */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No autenticado' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Permisos insuficientes' });
  }
  return next();
};

/**
 * Permisos por sección para supervisores (además del rol).
 * El admin siempre pasa. Las secciones se cargan frescas desde la BD en authenticateToken.
 */
const requireSection = (...sections) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No autenticado' });
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'supervisor') {
    const allowed = req.user.allowedSections || [];
    if (sections.some((section) => allowed.includes(section))) return next();
  }
  return res.status(403).json({ message: 'No tienes permisos para esta sección' });
};

module.exports = { authenticateToken, optionalAuth, authenticateKiosk, requireRole, requireSection };
