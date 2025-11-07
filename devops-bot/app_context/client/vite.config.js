import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",   // expose to LAN if needed
    port: 5173,        // keep frontend on 5173
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000", // backend API
        ws: true,                        // enable WebSocket proxying
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3000", // (optional) if you call REST APIs
        changeOrigin: true,
      },
    },
  },
})
