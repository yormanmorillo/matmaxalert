/**
 * Máquina de estados de una alerta. Vive fuera de la ruta para poder testearla
 * y para que cualquier otro consumidor use exactamente las mismas reglas.
 */
const ALERT_STATUSES = ['ACTIVE', 'WORKING', 'RESOLVED', 'CANCELLED'];

const ALLOWED_TRANSITIONS = {
  ACTIVE:    ['WORKING', 'CANCELLED'],
  WORKING:   ['RESOLVED', 'CANCELLED'],
  RESOLVED:  [],
  CANCELLED: [],
};

const canTransition = (from, to) =>
  from === to || (ALLOWED_TRANSITIONS[from] || []).includes(to);

module.exports = { ALERT_STATUSES, ALLOWED_TRANSITIONS, canTransition };
