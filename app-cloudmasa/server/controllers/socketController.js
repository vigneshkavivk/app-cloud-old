// server/controllers/socketController.js
import { handleCommand } from '../services/socketService.js';

export const onConnection = (socket) => {
  console.log("New client connected");

  socket.on("command", (cmd) => handleCommand(socket, cmd));
  socket.on("disconnect", () => console.log("Client disconnected"));
};