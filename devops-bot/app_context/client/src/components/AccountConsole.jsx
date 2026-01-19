import React, { useState, useEffect, useRef } from "react";
import Terminal, { TerminalOutput, TerminalInput } from "react-terminal-ui";
import io from "socket.io-client";
import { ServerCog, X } from "lucide-react";
import { __API_URL__ } from "../config/env.config";

// Connect to socket server
const socket = io(__API_URL__, { transports: ["websocket"] });
// const socket = io("http://localhost:3000", { transports: ["websocket"] });

const AccountComponent = ({ awsConfig }) => {
  const [terminalLines, setTerminalLines] = useState([
    <TerminalOutput key="1">⚡ Initializing AWS CLI...</TerminalOutput>,
  ]);
  const terminalEndRef = useRef(null);
  const [usedCommands, setUsedCommands] = useState(new Set());
  const [awsConfigured, setAwsConfigured] = useState(false);
  const [clusterName, setClusterName] = useState(awsConfig?.clusterName || "");
  const [isVisible, setIsVisible] = useState(true); // Toggle terminal visibility

  useEffect(() => {
    socket.on("output", (data) => {
      const isError = data.toLowerCase().includes("error") || data.toLowerCase().includes("failed");

      setTerminalLines((prevLines) => [
        ...prevLines,
        <TerminalOutput
          key={Math.random()}
          style={{ color: isError ? "#f87171" : "#d1d5db" }}
        >
          {data}
        </TerminalOutput>,
      ]);
    });

    return () => {
      socket.off("output");
    };
  }, []);

  useEffect(() => {
    if (awsConfig && !awsConfigured) {
      executeAwsConfigure();
      setAwsConfigured(true);
    }
  }, [awsConfig]);

  const executeCommand = (command) => {
    if (usedCommands.has(command)) return;

    setUsedCommands((prev) => new Set(prev).add(command));
    setTerminalLines((prevLines) => [
      ...prevLines,
      <TerminalInput key={`input-${command}`}>{command}</TerminalInput>,
    ]);
    socket.emit("command", command);
  };

  const executeAwsConfigure = () => {
    if (!awsConfig) return;
    const { awsAccessKey, awsSecretKey, awsRegion, outputFormat } = awsConfig;

    if (!awsAccessKey || !awsSecretKey || !awsRegion || !outputFormat) {
      setTerminalLines((prevLines) => [
        ...prevLines,
        <TerminalOutput key="error" style={{ color: "#f87171" }}>
           Error: AWS configuration is incomplete.
        </TerminalOutput>,
      ]);
      return;
    }

    setUsedCommands((prev) => new Set(prev).add("aws configure"));

    setTimeout(() => executeAwsConfigureCommand(awsAccessKey, awsSecretKey, awsRegion, outputFormat), 1000);
  };

  const executeAwsConfigureCommand = (awsAccessKey, awsSecretKey, awsRegion, outputFormat) => {
    executeCommand(`aws configure set aws_access_key_id ${awsAccessKey}`);
    setTimeout(() => executeCommand(`aws configure set aws_secret_access_key ${awsSecretKey}`), 800);
    setTimeout(() => executeCommand(`aws configure set region ${awsRegion}`), 1600);
    setTimeout(() => executeCommand(`aws configure set output ${outputFormat}`), 2400);
    setTimeout(() => executeUpdateKubeConfig(clusterName, awsRegion), 3200);
  };

  const executeUpdateKubeConfig = (clusterName, awsRegion) => {
    if (!clusterName || !awsRegion) return;
    executeCommand(`aws eks update-kubeconfig --region ${awsRegion} --name ${clusterName}`);
  };

  const handleClusterChange = (e) => {
    const newClusterName = e.target.value;
    setClusterName(newClusterName);
    executeUpdateKubeConfig(newClusterName, awsConfig.awsRegion || "us-east-1");
  };

  const handleCommand = (command) => {
    executeCommand(command);
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  if (!isVisible) return null;

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 shadow-2xl max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-white text-lg font-semibold">
          <ServerCog className="w-5 h-5 text-blue-400" />
          AWS Terminals
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-red-500 transition"
          title="Close Terminal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <label className="text-sm text-gray-400">Select Cluster:</label>
        <select
          onChange={handleClusterChange}
          value={clusterName}
          className="text-sm text-gray-100 bg-gray-800 border border-gray-700 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a cluster</option>
          <option value="dev-cluster">dev-cluster</option>
          <option value="staging-cluster">staging-cluster</option>
          <option value="prod-cluster">prod-cluster</option>
        </select>
      </div>

      <div className="rounded-lg bg-black border border-gray-800 overflow-hidden max-h-[360px]">
        <Terminal name="Account Console" height="320px" onInput={handleCommand}>
          {terminalLines}
          <div ref={terminalEndRef} />
        </Terminal>
      </div>
    </div>
  );
};

export default AccountComponent;
























