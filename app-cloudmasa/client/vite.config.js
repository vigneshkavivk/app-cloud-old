// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve' || mode === 'development';

  return {
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.gif'],

    // ✅ Only apply server/proxy in dev
    ...(isDev && {
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
          // 🔑 Critical: Let HMR use current host/port (no hardcoded 5173)
          clientPort: 443,
          protocol: 'wss',
          host: 'app.cloudmasa.com',
          overlay: false,
        },
        proxy: {
          // API & Socket.IO — dev only
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
          '/socket.io': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
            ws: true,
          },
        },
        allowedHosts: ['app.cloudmasa.com'],
      }
    }),

    // ✅ Build optimizations — prod only
    build: {
      // 🚫 Avoid large chunk warning
      chunkSizeWarningLimit: 600, // optional; better to use manualChunks

      // ✅ Split big deps → faster load, better caching
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('socket.io')) return 'vendor-socket';
              if (id.includes('react') && id.includes('dom')) return 'vendor-react-dom';
              if (id.includes('react')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('argocd') || id.includes('kubectl')) return 'vendor-tools';
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
