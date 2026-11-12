const isProduction = () => process.env.NODE_ENV === 'production';

const errorHandler = (err, req, res, _next) => {
  const status = Number(err.status) || 500;
  console.error(`❌ ${req.method} ${req.originalUrl} → ${err.name || 'Error'}: ${err.message || err}`);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({ message: 'Error de validación', errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ message: `El campo '${field}' ya existe.` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'ID inválido' });
  }

  // No filtrar detalles internos (nombres de colecciones, queries, etc.) en producción.
  const message = status >= 500 && isProduction()
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');

  return res.status(status).json({ message });
};

module.exports = { errorHandler };
