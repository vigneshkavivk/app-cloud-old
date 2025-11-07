import React, { useState, useEffect, useRef } from "react";
import Terminal, { TerminalOutput, TerminalInput } from "react-terminal-ui";
import io from "socket.io-client";
import { TerminalSquare, X } from "lucide-react";
import { __API_URL__ } from "../config/env.config";

const socket = io(__API_URL__, { transports: ["websocket"] });
// const socket = io("http://localhost:3000", { transports: ["websocket"] });

const TerminalComponent = ({ account, onClose }) => {
  const [terminalLines, setTerminalLines] = useState([
    <TerminalOutput key="0">⚡ Initializing session for AWS Configure...</TerminalOutput>,
  ]);
  const terminalEndRef = useRef(null);

  const clusterName = "sanddy"; // Your cluster name

  useEffect(() => {
    if (account) {
      setupAwsConfigure(account);
    }
  }, [account]);

  useEffect(() => {
    socket.on("output", (data) => {
      console.log("Server:", data);
      const isError = /error|failed/i.test(data);
      setTerminalLines((prev) => [
        ...prev,
        <TerminalOutput key={Math.random()} style={{ color: isError ? "#f87171" : "#d1d5db" }}>
          {data}
        </TerminalOutput>,
      ]);
    });

    return () => socket.off("output");
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  const executeCommand = (command) => {
    setTerminalLines((prev) => [
      ...prev,
      <TerminalInput key={Math.random()}>{command}</TerminalInput>,
    ]);
    socket.emit("command", command);
  };

  const setupAwsConfigure = (acc) => {
    const cmds = [
      `aws configure set aws_access_key_id ${acc.awsAccessKey}`,
      `aws configure set aws_secret_access_key ${acc.awsSecretKey}`,
      `aws configure set region ${acc.awsRegion}`,
      `aws configure set output json`,
    ];
    cmds.forEach((cmd) => executeCommand(cmd));
  };

  const handleCommand = (cmd) => {
    executeCommand(cmd);
  };

  const handleTerraformPlan = () => {
    executeCommand(`terraform plan -var="cluster_name=${clusterName}"`);
  };

  const handleTerraformApply = () => {
    executeCommand(`terraform apply -var="cluster_name=${clusterName}" -auto-approve`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="w-full max-w-5xl h-[600px] bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <TerminalSquare className="w-5 h-5 text-green-400" />
            AWS Terminal
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition"
            title="Close terminal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Command Buttons */}
        <div className="flex flex-wrap gap-2 mb-4 px-1">
          {[
            { label: "List Clusters", cmd: "aws eks list-clusters" },
            { label: "Terraform Init", cmd: "terraform init" },
            { label: "Terraform Plan", cmd: handleTerraformPlan },
            { label: "Terraform Apply", cmd: handleTerraformApply },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() =>
                typeof btn.cmd === "function" ? btn.cmd() : handleCommand(btn.cmd)
              }
              className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700 text-sm"
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Terminal */}
        <div className="flex-1 overflow-y-auto">
          <Terminal name="AWS Terminal" onInput={handleCommand}>
            {terminalLines}
            <div ref={terminalEndRef} />
          </Terminal>
        </div>
      </div>
    </div>
  );
};

export default TerminalComponent;
