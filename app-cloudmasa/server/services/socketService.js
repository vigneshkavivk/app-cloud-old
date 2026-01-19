// server/services/socketService.js
import { executeCommand } from '../utils/commandHandler.js';

let currentDirectory = process.cwd();

const handleCommand = (socket, cmd) => {
  const commands = cmd.split("\n");
  
  commands.forEach((command) => {
    const trimmedCommand = command.trim();
    if (trimmedCommand.length === 0) return;

    executeCommand(socket, trimmedCommand, currentDirectory, (newDir) => {
      if (newDir) currentDirectory = newDir;
    });
  });
};

const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    import('../controllers/socketController.js').then(({ onConnection }) => {
      onConnection(socket);
    });
  });
};

export {
  handleCommand,
  setupSocketHandlers
};