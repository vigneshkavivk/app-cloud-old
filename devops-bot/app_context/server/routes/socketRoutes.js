const { setupSocketHandlers } = require('../services/socketService');

module.exports = (io) => {
  setupSocketHandlers(io);
};