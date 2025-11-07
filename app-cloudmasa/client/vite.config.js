import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // ✅ ADD THIS LINE 👇
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.gif'],

  server: {
    host: 'app.cloudmasa.com',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 5173,
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'https://app.cloudmasa.com:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: ['app.cloudmasa.com'],
  },
});
