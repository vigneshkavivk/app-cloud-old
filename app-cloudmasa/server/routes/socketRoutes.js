// server/routes/socketRoutes.js
import { setupSocketHandlers } from '../services/socketService.js';

export default (io) => {
  setupSocketHandlers(io);
};