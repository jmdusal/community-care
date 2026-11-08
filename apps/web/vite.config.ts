/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Fixed port so the Herd proxy (http://community-care.test → this server) always finds it.
    port: 5180,
    strictPort: true,
    allowedHosts: ['community-care.test'],
    // Hot reload connects straight to Vite, so it works through the Herd proxy too.
    hmr: { host: 'localhost', clientPort: 5180, protocol: 'ws' },
    // The Laravel API is served by Herd. Proxying keeps the web app and API on one origin in dev.
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET ?? 'http://communitycare-api.test', changeOrigin: true },
      '/sanctum': { target: process.env.VITE_API_TARGET ?? 'http://communitycare-api.test', changeOrigin: true },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
