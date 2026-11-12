const bcrypt = require('bcryptjs');
const { User, Role, Shift, Area, Press, AlertButtonConfig } = require('./models');

const INITIAL_ROLES = [
  { id: 'admin',      displayName: 'Administrador',     isCore: true, requiresAuth: true  },
  { id: 'supervisor', displayName: 'Supervisor',        isCore: true, requiresAuth: true  },
  { id: 'technical',  displayName: 'Técnico',           isCore: true, requiresAuth: false },
  { id: 'driver',     displayName: 'Montacarguista',    isCore: true, requiresAuth: false },
  { id: 'press',      displayName: 'Operador de Prensa', isCore: true, requiresAuth: false },
];

const INITIAL_SHIFTS = ['Turno Mañana', 'Turno Tarde', 'Turno Noche'];

const INITIAL_AREAS = ['Sección A', 'Sección B', 'Sección C'];

const INITIAL_PRESSES = [
  { name: 'Prensa Alpha',   areaName: 'Sección A', status: 'Operational' },
  { name: 'Prensa Beta',    areaName: 'Sección A', status: 'Operational' },
  { name: 'Prensa Gamma',   areaName: 'Sección B', status: 'Maintenance' },
  { name: 'Prensa Delta',   areaName: 'Sección B', status: 'Operational' },
  { name: 'Prensa Epsilon', areaName: 'Sección C', status: 'Operational' },
];

const INITIAL_ALERT_CONFIG = [
  { id: 'mechanical',  name: 'Mecánica',                order: 1, enabled: true, allowedRoles: ['supervisor', 'technical', 'press'], allowedPressIds: [] },
  { id: 'electrical',  name: 'Eléctrica',               order: 2, enabled: true, allowedRoles: ['supervisor', 'technical', 'press'], allowedPressIds: [] },
  { id: 'material',    name: 'Falta de Material',       order: 3, enabled: true, allowedRoles: ['supervisor', 'driver', 'press'],    allowedPressIds: [] },
  { id: 'quality',     name: 'Problema de Calidad',     order: 4, enabled: true, allowedRoles: ['supervisor', 'press'],             allowedPressIds: [] },
  { id: 'maintenance', name: 'Mantenimiento Preventivo', order: 5, enabled: true, allowedRoles: ['supervisor', 'technical'],        allowedPressIds: [] },
  { id: 'other',       name: 'Otro',                    order: 6, enabled: true, allowedRoles: ['supervisor', 'press'],             allowedPressIds: [] },
];

const upsertMany = async (Model, docs, filterKey = 'id') => {
  for (const doc of docs) {
    await Model.updateOne(
      { [filterKey]: doc[filterKey] },
      { $setOnInsert: doc },
      { upsert: true }
    );
  }
};

/**
 * Seed idempotente: crea lo que falte y no pisa datos existentes.
 * El admin inicial SOLO se crea si no existe ningún admin y hay
 * ADMIN_INITIAL_PASSWORD en el entorno (nunca una contraseña por defecto).
 */
const seedDatabase = async () => {
  await upsertMany(Role, INITIAL_ROLES);

  await Shift.bulkWrite(
    INITIAL_SHIFTS.map((name) => ({
      updateOne: { filter: { name }, update: { $setOnInsert: { name } }, upsert: true },
    }))
  );

  const areasByName = new Map();
  for (const name of INITIAL_AREAS) {
    const area = await Area.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, new: true }
    );
    areasByName.set(name, area);
  }

  for (const press of INITIAL_PRESSES) {
    const area = areasByName.get(press.areaName);
    await Press.updateOne(
      { name: press.name },
      {
        $setOnInsert: {
          name: press.name,
          areaId: area ? String(area._id) : '',
          status: press.status,
        },
      },
      { upsert: true }
    );
  }

  await AlertButtonConfig.bulkWrite(
    INITIAL_ALERT_CONFIG.map((config) => ({
      updateOne: { filter: { id: config.id }, update: { $setOnInsert: config }, upsert: true },
    }))
  );

  const adminExists = await User.exists({ role: 'admin' });
  if (!adminExists) {
    const password = process.env.ADMIN_INITIAL_PASSWORD;
    if (!password || password.length < 12) {
      console.warn('⚠️  No hay ningún admin y ADMIN_INITIAL_PASSWORD no está definida (o es <12 chars). No se crea el admin.');
    } else {
      await User.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: await bcrypt.hash(password, 12),
        role: 'admin',
      });
      console.log('✅ Usuario admin inicial creado (contraseña definida por entorno).');
    }
  }

  console.log('🌱 Seed idempotente verificado.');
};

module.exports = { seedDatabase };
