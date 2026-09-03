/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // The single-bundle build was ~2.7 MB. Split the heavy, rarely-changing
      // vendor libraries into their own chunks so the browser can cache them
      // across deploys and the initial parse cost drops.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
            if (id.includes('node_modules/lucide-react')) return 'icons';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      // Node-side unit/API tests (server helpers, integrations, rbac...).
      environment: 'node',
      include: ['test/**/*.test.ts'],
      // Force the DB off so `createApp()` runs fully in-memory and hermetically
      // (dotenv won't override an already-present key, even an empty one).
      env: { DATABASE_URL: '', DATABASE_SSL: 'false', REMINDER_ENABLED: 'false', AI_ENABLED: 'false' },
    },
  };
});
