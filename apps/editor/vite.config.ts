import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = process.env.VITE_SERVER_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  // The editor is served at /editor/ in production so its built assets must
  // resolve under that prefix. In dev (vite serve), there's no prefix.
  base: '/editor/',
  server: {
    port: 5174,
    proxy: {
      '/api': target,
      '/health': target,
    },
  },
});
