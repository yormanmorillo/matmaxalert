/**
 * Rate limiter en memoria (ventana fija). Suficiente para una sola instancia.
 * Para varias réplicas, sustituir por Redis.
 */
const buckets = new Map();

const rateLimit = ({
  windowMs = 60_000,
  max = 60,
  prefix = 'global',
  keyGenerator = (req) => req.ip,
  message = 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
} = {}) => (req, res, next) => {
  const now = Date.now();
  const key = `${prefix}:${keyGenerator(req) || 'unknown'}`;
  const current = buckets.get(key);

  if (!current || now > current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= max) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ message });
  }

  current.count += 1;
  return next();
};

// Limpieza periódica para que el Map no crezca sin límite.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 60_000);
cleanup.unref();

module.exports = { rateLimit };
