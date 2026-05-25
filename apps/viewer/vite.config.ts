import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Read VITE_* from .env, .env.local, .env.[mode].local etc. in this app's
  // directory. process.env still wins over file values, so a one-shot
  // `VITE_SERVER_URL=... npm run dev` still works.
  const env = loadEnv(mode, process.cwd(), '');
  const target = process.env.VITE_SERVER_URL ?? env.VITE_SERVER_URL ?? 'http://localhost:3000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': target,
        '/health': target,
      },
    },
  };
});
