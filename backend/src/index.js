require('dotenv').config();

// Fail fast if critical env vars are missing
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET es demasiado corto (<32 caracteres). Rótalo en producción.');
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const initSocket = require('./socket');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimit } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const alertRoutes = require('./routes/alerts');
const roleRoutes = require('./routes/roles');
const shiftRoutes = require('./routes/shifts');
const areaRoutes = require('./routes/areas');
const pressRoutes = require('./routes/presses');
const alertConfigRoutes = require('./routes/alertConfig');

const app = express();
const httpServer = http.createServer(app);

// nginx está delante: confiar en X-Forwarded-For para rate limit y logs.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── CORS ─────────────────────────────────────────────────────────────────────
// Sin fallback a '*': si no hay orígenes configurados, solo se permite
// el mismo origen (nginx) y clientes sin cabecera Origin (curl, salud).
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, false);
    return callback(null, allowedOrigins.includes(origin));
  },
  credentials: true,
};

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    credentials: true,
  },
  maxHttpBufferSize: 1e6,
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Cabeceras de seguridad (nginx también las añade; esto protege el :3000 interno).
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Log de requests en desarrollo (sin cuerpos ni tokens)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`  ${req.method} ${req.path}`);
    next();
  });
}

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  prefix: 'login',
  keyGenerator: (req) => `${req.ip}:${String(req.body?.username || '').toLowerCase()}`,
  message: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.',
}));
app.use('/api', rateLimit({ windowMs: 60_000, max: 300, prefix: 'api' }));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/presses', pressRoutes);
app.use('/api/alert-config', alertConfigRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// Global error handler (debe ir al final)
app.use(errorHandler);

// ── Inyectar `io` en el router de alertas ────────────────────────────────────
alertRoutes.setIo(io);

// ── Socket.io ────────────────────────────────────────────────────────────────
initSocket(io);

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();

  if (process.env.SEED_ON_START !== 'false') {
    const { seedDatabase } = require('./seed');
    await seedDatabase();
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 WebSocket escuchando en ws://localhost:${PORT}`);
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Kiosk API key: ${process.env.KIOSK_API_KEY ? 'configurada' : 'NO configurada (solo desarrollo)'}\n`);
  });
};

const shutdown = async (signal) => {
  console.log(`\n${signal} recibido, cerrando…`);
  io.close();
  httpServer.close(async () => {
    try { await mongoose.disconnect(); } catch { /* noop */ }
    process.exit(0);
  });
  // Failsafe si alguna conexión queda colgada
  setTimeout(() => process.exit(0), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  console.error('❌ No se pudo iniciar el servidor:', err);
  process.exit(1);
});
