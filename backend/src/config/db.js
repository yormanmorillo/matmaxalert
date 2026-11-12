const mongoose = require('mongoose');

/**
 * Conexión con reintentos exponenciales. El proceso NO muere si Mongo tarda
 * en arrancar (docker-compose puede levantar los servicios en cualquier orden);
 * el endpoint /api/health refleja el estado real.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definida');

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      });
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      attempt += 1;
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
      console.error(`❌ MongoDB connection error (intento ${attempt}): ${err.message}. Reintento en ${delay / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
