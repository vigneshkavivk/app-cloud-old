const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const executeCommand = (socket, command, currentDirectory, callback) => {
  // Handle 'cd' command
  if (command.startsWith("cd ")) {
    const targetDir = command.substring(3).trim();
    
    if (targetDir === "..") {
      try {
        process.chdir('..');
        const newDir = process.cwd();
        callback(newDir);
        socket.emit("output", `Changed directory to: ${newDir}`);
      } catch (err) {
        socket.emit("output", `Error: ${err.message}`);
      }
      return;
    }

    const newDir = path.resolve(currentDirectory, targetDir);
    try {
      if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory()) {
        process.chdir(newDir);
        const updatedDir = process.cwd();
        callback(updatedDir);
        socket.emit("output", `Changed directory to: ${updatedDir}`);
      } else {
        socket.emit("output", `Error: '${targetDir}' is not a valid directory`);
      }
    } catch (err) {
      socket.emit("output", `Error: ${err.message}`);
    }
    return;
  }

  // Handle 'ls' command
  if (command === "ls") {
    try {
      const files = fs.readdirSync(currentDirectory).join("\n");
      socket.emit("output", files);
    } catch (err) {
      socket.emit("output", `Error: ${err.message}`);
    }
    return;
  }

  // Handle 'clear' command
  if (command === "clear") {
    socket.emit("output", "\x1Bc");
    return;
  }

  // Handle special commands (git, terraform)
  if (command.startsWith("git ") || command.startsWith("terraform ")) {
    socket.emit("output", `Running command: ${command}`);
  }

  // Execute generic command
  const commandProcess = exec(command, { cwd: currentDirectory });

  commandProcess.stdout.on("data", (data) => {
    socket.emit("output", data.toString());
  });

  commandProcess.stderr.on("data", (data) => {
    socket.emit("output", `Error: ${data.toString()}`);
  });

  commandProcess.on("close", (code) => {
    if (code !== 0) {
      socket.emit("output", `Command finished with exit code ${code}`);
    } else {
      socket.emit("output", `Command completed successfully`);
    }
  });
};

module.exports = {
  executeCommand
};