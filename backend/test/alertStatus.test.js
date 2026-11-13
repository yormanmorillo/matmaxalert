const test = require('node:test');
const assert = require('node:assert/strict');
const { ALERT_STATUSES, canTransition } = require('../src/domain/alertStatus');

test('los estados válidos son los cuatro del modelo', () => {
  assert.deepEqual(ALERT_STATUSES, ['ACTIVE', 'WORKING', 'RESOLVED', 'CANCELLED']);
});

test('ACTIVE puede pasar a WORKING o CANCELLED', () => {
  assert.equal(canTransition('ACTIVE', 'WORKING'), true);
  assert.equal(canTransition('ACTIVE', 'CANCELLED'), true);
  assert.equal(canTransition('ACTIVE', 'RESOLVED'), false);
});

test('WORKING puede pasar a RESOLVED o CANCELLED', () => {
  assert.equal(canTransition('WORKING', 'RESOLVED'), true);
  assert.equal(canTransition('WORKING', 'CANCELLED'), true);
  assert.equal(canTransition('WORKING', 'ACTIVE'), false);
});

test('una alerta cerrada no se reabre', () => {
  assert.equal(canTransition('RESOLVED', 'ACTIVE'), false);
  assert.equal(canTransition('CANCELLED', 'WORKING'), false);
});

test('mismo estado es idempotente', () => {
  for (const status of ALERT_STATUSES) assert.equal(canTransition(status, status), true);
});
