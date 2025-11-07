const { handleCommand } = require('../services/socketService');

module.exports = {
  onConnection: (socket) => {
    console.log("New client connected");

    socket.on("command", (cmd) => handleCommand(socket, cmd));
    socket.on("disconnect", () => console.log("Client disconnected"));
  }
};