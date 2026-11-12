/**
 * Socket.io handler
 * Recibe `io` desde index.js y registra todos los eventos WebSocket.
 *
 * Nota de seguridad: el socket es de solo lectura (el servidor emite; el
 * cliente no escribe en BD por aquí), y nginx es el único punto de entrada.
 * Los eventos de escritura pasan siempre por la API REST validada.
 */
const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🟢 Cliente conectado: ${socket.id}`);

    socket.on('join:room', (room) => {
      if (typeof room !== 'string' || room.length === 0 || room.length > 64) return;
      socket.join(room);
    });

    socket.on('leave:room', (room) => {
      if (typeof room !== 'string') return;
      socket.leave(room);
    });

    socket.on('ping', () => socket.emit('pong', { time: Date.now() }));

    socket.on('disconnect', (reason) => {
      console.log(`🔴 Cliente desconectado: ${socket.id} (${reason})`);
    });
  });
};

module.exports = initSocket;
