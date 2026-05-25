import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = process.env.VITE_SERVER_URL ?? env.VITE_SERVER_URL ?? 'http://localhost:3000';
  return {
    plugins: [react()],
    // Editor is served at /editor/ in production so built asset URLs must
    // resolve under that prefix. Dev (vite serve) ignores base.
    base: '/editor/',
    server: {
      port: 5174,
      proxy: {
        '/api': target,
        '/health': target,
      },
    },
  };
});
