const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const setupSocketServer = (server) => {
    const io = socketIo(server, { cors: { origin: "*" } });

    // Define the current working directory
    let currentDirectory = process.cwd();

    io.on("connection", (socket) => {
        console.log("New client connected");

        socket.on("command", (cmd) => {
            // Handle multi-line commands (paste)
            const commands = cmd.split("\n"); // Split the input by newline

            // Iterate through each line of the pasted commands
            commands.forEach((command) => {
                // Trim any extra spaces
                const trimmedCommand = command.trim();
                if (trimmedCommand.length === 0) return; // Skip empty lines

                // Handle 'cd' command
                if (trimmedCommand.startsWith("cd ")) {
                    const targetDir = trimmedCommand.substring(3).trim(); // Get the folder name or path
                    
                    if (targetDir === "..") {
                        try {
                            process.chdir('..'); // Move up one directory
                            currentDirectory = process.cwd(); // Update current working directory
                            if (socket.connected) {
                                socket.emit("output", `Changed directory to: ${currentDirectory}`);
                            }
                        } catch (err) {
                            if (socket.connected) {
                                socket.emit("output", `Error: ${err.message}`);
                            }
                        }
                    } else {
                        const newDir = path.resolve(currentDirectory, targetDir);

                        try {
                            if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory()) {
                                process.chdir(newDir); // Change to the folder
                                currentDirectory = process.cwd(); // Update current working directory
                                if (socket.connected) {
                                    socket.emit("output", `Changed directory to: ${currentDirectory}`);
                                }
                            } else {
                                if (socket.connected) {
                                    socket.emit("output", `Error: '${targetDir}' is not a valid directory`);
                                }
                            }
                        } catch (err) {
                            if (socket.connected) {
                                socket.emit("output", `Error: ${err.message}`);
                            }
                        }
                    }
                    return;
                }

                // Handle 'ls' command (List files in the current directory)
                if (trimmedCommand === "ls") {
                    try {
                        const files = fs.readdirSync(currentDirectory).join("\n");
                        if (socket.connected) {
                            socket.emit("output", files);
                        }
                    } catch (err) {
                        if (socket.connected) {
                            socket.emit("output", `Error: ${err.message}`);
                        }
                    }
                    return;
                }

                // Handle 'clear' command (Clear terminal output)
                if (trimmedCommand === "clear") {
                    if (socket.connected) {
                        socket.emit("output", "\x1Bc"); // Clear the terminal output
                    }
                    return;
                }

                // Handle Git commands
                if (trimmedCommand.startsWith("git ")) {
                    if (socket.connected) {
                        socket.emit("output", `Running git command: ${trimmedCommand}`);
                    }
                    
                    const commandProcess = exec(trimmedCommand, { cwd: currentDirectory });

                    // Emit stdout logs
                    commandProcess.stdout.on("data", (data) => {
                        if (socket.connected) {
                            socket.emit("output", data.toString()); // Emit each line of stdout
                        }
                    });

                    // Emit stderr logs
                    commandProcess.stderr.on("data", (data) => {
                        if (socket.connected) {
                            socket.emit("output", `Error: ${data.toString()}`); // Emit error logs
                        }
                    });

                    // Emit when the command finishes
                    commandProcess.on("close", (code) => {
                        if (socket.connected) {
                            if (code !== 0) {
                                socket.emit("output", `Command finished with exit code ${code}`);
                            } else {
                                socket.emit("output", `Command completed successfully`);
                            }
                        }
                    });
                    return;
                }

                // Handle Terraform commands
                if (trimmedCommand.startsWith("terraform ")) {
                    if (socket.connected) {
                        socket.emit("output", `Running terraform command: ${trimmedCommand}`);
                    }
                    
                    const commandProcess = exec(trimmedCommand, { cwd: currentDirectory });

                    // Emit stdout logs
                    commandProcess.stdout.on("data", (data) => {
                        if (socket.connected) {
                            socket.emit("output", data.toString()); // Emit each line of stdout
                        }
                    });

                    // Emit stderr logs
                    commandProcess.stderr.on("data", (data) => {
                        if (socket.connected) {
                            socket.emit("output", `Error: ${data.toString()}`); // Emit error logs
                        }
                    });

                    // Emit when the command finishes
                    commandProcess.on("close", (code) => {
                        if (socket.connected) {
                            if (code !== 0) {
                                socket.emit("output", `Command finished with exit code ${code}`);
                            } else {
                                socket.emit("output", `Command completed successfully`);
                            }
                        }
                    });
                    return;
                }

                // Default: execute any other command
                if (socket.connected) {
                    socket.emit("output", `Running command: ${trimmedCommand}`);
                }

                const commandProcess = exec(trimmedCommand, { cwd: currentDirectory });

                // Emit stdout logs
                commandProcess.stdout.on("data", (data) => {
                    if (socket.connected) {
                        socket.emit("output", data.toString()); // Emit each line of stdout
                    }
                });

                // Emit stderr logs
                commandProcess.stderr.on("data", (data) => {
                    if (socket.connected) {
                        socket.emit("output", `Error: ${data.toString()}`); // Emit error logs
                    }
                });

                // Emit when the command finishes
                commandProcess.on("close", (code) => {
                    if (socket.connected) {
                        if (code !== 0) {
                            socket.emit("output", `Command finished with exit code ${code}`);
                        } else {
                            socket.emit("output", `Command completed successfully`);
                        }
                    }
                });
            });
        });

        socket.on("disconnect", () => console.log("Client disconnected"));
    });
};

module.exports = setupSocketServer;
