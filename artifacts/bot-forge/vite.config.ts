import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;
if (!rawPort) throw new Error('PORT environment variable is required.');
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const basePath = process.env.BASE_PATH ?? '/bot-forge/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    // runtimeErrorOverlay disabled — infinite-loop overlay blocks the view during debugging
    // runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, '..') })
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
        ]
      : []),
  ],
  define: {
    'process.env': {
      TRANSLATIONS_CDN_URL: JSON.stringify(process.env.TRANSLATIONS_CDN_URL ?? ''),
      R2_PROJECT_NAME: JSON.stringify(process.env.R2_PROJECT_NAME ?? ''),
      CROWDIN_BRANCH_NAME: JSON.stringify(process.env.CROWDIN_BRANCH_NAME ?? ''),
      TRACKJS_TOKEN: JSON.stringify(process.env.TRACKJS_TOKEN ?? ''),
      APP_ENV: JSON.stringify(process.env.APP_ENV ?? 'production'),
      REF_NAME: JSON.stringify(process.env.REF_NAME ?? ''),
      REMOTE_CONFIG_URL: JSON.stringify(process.env.REMOTE_CONFIG_URL ?? ''),
      GD_CLIENT_ID: JSON.stringify(process.env.GD_CLIENT_ID ?? ''),
      GD_APP_ID: JSON.stringify(process.env.GD_APP_ID ?? ''),
      GD_API_KEY: JSON.stringify(process.env.GD_API_KEY ?? ''),
      DATADOG_SESSION_REPLAY_SAMPLE_RATE: JSON.stringify(process.env.DATADOG_SESSION_REPLAY_SAMPLE_RATE ?? ''),
      DATADOG_SESSION_SAMPLE_RATE: JSON.stringify(process.env.DATADOG_SESSION_SAMPLE_RATE ?? ''),
      DATADOG_APPLICATION_ID: JSON.stringify(process.env.DATADOG_APPLICATION_ID ?? ''),
      DATADOG_CLIENT_TOKEN: JSON.stringify(process.env.DATADOG_CLIENT_TOKEN ?? ''),
      RUDDERSTACK_KEY: JSON.stringify(process.env.RUDDERSTACK_KEY ?? ''),
      GROWTHBOOK_CLIENT_KEY: JSON.stringify(process.env.GROWTHBOOK_CLIENT_KEY ?? ''),
      GROWTHBOOK_DECRYPTION_KEY: JSON.stringify(process.env.GROWTHBOOK_DECRYPTION_KEY ?? ''),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@/external': path.resolve(import.meta.dirname, 'src/external'),
      '@/components': path.resolve(import.meta.dirname, 'src/components'),
      '@/hooks': path.resolve(import.meta.dirname, 'src/hooks'),
      '@/utils': path.resolve(import.meta.dirname, 'src/utils'),
      '@/constants': path.resolve(import.meta.dirname, 'src/constants'),
      '@/stores': path.resolve(import.meta.dirname, 'src/stores'),
      '@/analytics': path.resolve(import.meta.dirname, 'src/analytics'),
      '@/pages': path.resolve(import.meta.dirname, 'src/pages'),
      '@/types': path.resolve(import.meta.dirname, 'src/types'),
      // Legacy webpack-style absolute store imports
      'Stores': path.resolve(import.meta.dirname, 'src/stores'),
      // Replace @deriv-com/auth-client with a React-19-compatible shim
      '@deriv-com/auth-client': path.resolve(import.meta.dirname, 'src/utils/auth-client-shim.tsx'),
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        loadPaths: [path.resolve(import.meta.dirname, 'src')],
      },
    },
  },
  assetsInclude: ['**/*.xml'],
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { strict: false },
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'mobx', 'mobx-react-lite', 'blockly'],
  },
});
