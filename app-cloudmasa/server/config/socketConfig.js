// server/config/socketConfig.js
export const socketOptions = {
  path: '/socket.io', // ← Critical: must match frontend & ALB routing
  cors: {
    origin: [
      "https://app.cloudmasa.com",
      "http://localhost:5173",     // dev only — keep if needed
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // fallback to polling if WS blocked
  // ✅ ALB-compatible ping settings:
  pingInterval: 10000,  // Send ping every 10s
  pingTimeout: 20000,   // Wait max 20s for pong → ALB idle timeout (120s) >> 20s ✅
};
