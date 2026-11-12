import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          // Redirige todas las llamadas /api al backend en puerto 3000
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
          // Redirige el WebSocket de Socket.io
          '/socket.io': {
            target: env.VITE_WS_URL || 'http://localhost:3000',
            ws: true,
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
