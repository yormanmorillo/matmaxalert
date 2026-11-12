const mongoose = require('mongoose');

// Shared schema options: expose _id as id in JSON responses
const schemaOptions = {
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false }
};

// ─── User ────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:         { type: String, required: true, unique: true, trim: true },
  password:         { type: String, required: true },
  role:             { type: String, required: true, index: true },
  shiftId:          { type: String },
  assignedPressIds: [{ type: String }],
  allowedSections:  [{ type: String }]
}, { ...schemaOptions, timestamps: true });

// ─── Role ────────────────────────────────────────────────────────────────────
const roleSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true },
  displayName:  { type: String, required: true },
  isCore:       { type: Boolean, default: false },
  requiresAuth: { type: Boolean, default: true }
}, schemaOptions);

// ─── Shift ───────────────────────────────────────────────────────────────────
const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, schemaOptions);

// ─── Area ────────────────────────────────────────────────────────────────────
const areaSchema = new mongoose.Schema({
  name: { type: String, required: true }
}, schemaOptions);

// ─── Press ───────────────────────────────────────────────────────────────────
const pressSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  areaId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['Operational', 'Maintenance', 'Stopped', 'Offline'],
    default: 'Operational'
  }
}, schemaOptions);

// ─── Alert ───────────────────────────────────────────────────────────────────
const alertSchema = new mongoose.Schema({
  type:              { type: String, required: true },
  status:            { type: String, enum: ['ACTIVE', 'WORKING', 'RESOLVED', 'CANCELLED'], default: 'ACTIVE' },
  pressId:           { type: String, required: true },
  pressName:         { type: String },
  areaName:          { type: String },
  timestamp:         { type: Number, default: Date.now },
  workingTimestamp:  { type: Number },
  resolvedTimestamp: { type: Number },
  notes:             { type: String },
  reportedBy:        { type: String },
  assignedTo:        { type: String },
  statusHistory:     [{
    status:    { type: String },
    at:        { type: Number },
    by:        { type: String },
  }]
}, { ...schemaOptions, timestamps: true });

// Los paneles consultan por estado + fecha, y el histórico ordena por timestamp.
// Sin estos índices Mongo hace COLLSCAN sobre toda la colección.
alertSchema.index({ timestamp: -1 });
alertSchema.index({ status: 1, timestamp: -1 });
alertSchema.index({ pressId: 1, status: 1 });
alertSchema.index({ type: 1, status: 1 });

// ─── AlertButtonConfig ───────────────────────────────────────────────────────
const alertButtonConfigSchema = new mongoose.Schema({
  id:             { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  order:          { type: Number, default: 0, index: true },
  enabled:        { type: Boolean, default: true },
  allowedRoles:   [{ type: String }],
  allowedPressIds:[{ type: String }]
}, schemaOptions);

module.exports = {
  User:              mongoose.model('User',              userSchema),
  Role:              mongoose.model('Role',              roleSchema),
  Shift:             mongoose.model('Shift',             shiftSchema),
  Area:              mongoose.model('Area',              areaSchema),
  Press:             mongoose.model('Press',             pressSchema),
  Alert:             mongoose.model('Alert',             alertSchema),
  AlertButtonConfig: mongoose.model('AlertButtonConfig', alertButtonConfigSchema),
};
