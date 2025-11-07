const { executeCommand } = require('../utils/commandHandler');

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

module.exports = {
  handleCommand,
  setupSocketHandlers: (io) => {
    io.on("connection", require('../controllers/socketController').onConnection);
  }
};