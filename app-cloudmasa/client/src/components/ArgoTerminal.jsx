// src/components/ArgoTerminal.jsx
import React, { useState, useEffect, useRef } from "react";
import Terminal, { TerminalOutput, TerminalInput } from "react-terminal-ui";
import { ServerCog, X, Lock } from "lucide-react";
import io from "socket.io-client";
import { useAuth } from "../hooks/useAuth";

const ArgoTerminal = ({
  onClose,
  selectedCluster,
  selectedAccount,
  namespace,
  repoUrl,
  selectedFolder,
  gitHubUsername,
  gitHubToken,
}) => {
  const { hasPermission } = useAuth();
  const canUseArgoTerminal = hasPermission('Agent', 'Provision') && hasPermission('Credentials', 'View');

  // ✅ Socket management via ref
  const socketRef = useRef(null);

  // UI state
  const [terminalLines, setTerminalLines] = useState([]);
  const [isCommandRunning, setIsCommandRunning] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [argocdIp, setArgocdIp] = useState("");
  const [argocdPassword, setArgocdPassword] = useState("");
  const terminalEndRef = useRef(null);

  // Initialize socket on mount
  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []); // Runs once on mount

  const addTerminalOutput = (text, isError = false) => {
    setTerminalLines((prev) => [
      ...prev,
      <TerminalOutput
        key={Date.now() + Math.random()}
        style={{ color: isError ? "#f87171" : "#d1d5db" }}
      >
        {text}{" "}
      </TerminalOutput>,
    ]);
  };

  const executeCommand = (command) => {
    return new Promise((resolve, reject) => {
      if (!command.trim()) return;

      setIsCommandRunning(true);
      addTerminalOutput(`$ ${command}`);

      const socket = socketRef.current;
      if (!socket) {
        addTerminalOutput("Socket not connected", true);
        setIsCommandRunning(false);
        return reject(new Error("Socket not connected"));
      }

      socket.emit("command", command.trim());

      const handleOutput = (data) => {
        setIsCommandRunning(false);
        addTerminalOutput(data);
        socket.off("output", handleOutput);
        socket.off("command_error", handleError);
        resolve(data);
      };

      const handleError = (error) => {
        setIsCommandRunning(false);
        addTerminalOutput(`Command failed: ${error}`, true);
        socket.off("output", handleOutput);
        socket.off("command_error", handleError);
        reject(error);
      };

      socket.on("output", handleOutput);
      socket.on("command_error", handleError);
    });
  };

  const extractArgocdIp = (serviceOutput) => {
    const lines = serviceOutput.split("\n");
    if (lines.length > 1) {
      const columns = lines[1].split(/\s+/);
      if (columns.length > 4) {
        const externalIp = columns[3];
        if (externalIp && externalIp !== "<none>" && externalIp !== "<pending>") {
          return externalIp;
        }
        const clusterIp = columns[2];
        if (clusterIp) {
          return clusterIp;
        }
      }
    }
    return "localhost";
  };

  const handleUserCommand = (command) => {
    if (!command.trim()) return;

    if (isCommandRunning) {
      addTerminalOutput("Please wait for the current command to finish", true);
      return;
    }

    setTerminalLines((prev) => [
      ...prev,
      <TerminalInput key={`input-${Date.now()}`}>{command}</TerminalInput>,
    ]);

    if (command === "clear") {
      setTerminalLines([]);
      return;
    }

    executeCommand(command).catch((error) => {
      console.error("Command execution error:", error);
    });
  };

  // Global socket listeners (safe: cleaned up per command + here)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleOutput = (data) => {
      setIsCommandRunning(false);
      const isError = data.toLowerCase().includes("error");
      addTerminalOutput(data, isError);
    };

    const handleError = (error) => {
      setIsCommandRunning(false);
      addTerminalOutput(`Command failed: ${error}`, true);
    };

    socket.on("output", handleOutput);
    socket.on("command_error", handleError);

    return () => {
      socket.off("output", handleOutput);
      socket.off("command_error", handleError);
    };
  }, []);

  // Scroll to bottom on new output
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLines]);

  // Auto-run setup on first valid props
  useEffect(() => {
    const runInitCommands = async () => {
      if (
        hasInitialized ||
        !selectedCluster ||
        !selectedAccount?.awsRegion ||
        !namespace
      ) return;

      setHasInitialized(true);

      const updateKubeCmd = `aws eks update-kubeconfig --name ${selectedCluster} --region ${selectedAccount.awsRegion}`;
      setTerminalLines((prev) => [
        ...prev,
        <TerminalInput key={`input-1`}>{updateKubeCmd}</TerminalInput>,
      ]);
      try {
        await executeCommand(updateKubeCmd);
      } catch (err) {
        console.error("Failed to update kubeconfig:", err);
        return;
      }

      const createNamespaceCmd = `kubectl create namespace ${namespace}`;
      setTerminalLines((prev) => [
        ...prev,
        <TerminalInput key={`input-2`}>{createNamespaceCmd}</TerminalInput>,
      ]);
      try {
        await executeCommand(createNamespaceCmd);
      } catch (err) {
        console.error("Failed to create namespace:", err);
      }

      const checkArgoCmd = "kubectl get pods -n argocd";
      setTerminalLines((prev) => [
        ...prev,
        <TerminalInput key={`input-3`}>{checkArgoCmd}</TerminalInput>,
      ]);
      try {
        const output = await executeCommand(checkArgoCmd);

        if (output.includes("No resources found") || output.includes("Error")) {
          const installArgoCmd = `kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml`;
          setTerminalLines((prev) => [
            ...prev,
            <TerminalInput key={`input-4`}>{installArgoCmd}</TerminalInput>,
          ]);
          await executeCommand(installArgoCmd);
          addTerminalOutput("ArgoCD installed successfully!");

          addTerminalOutput("Waiting for ArgoCD pods to be ready...");
          await new Promise((resolve) => setTimeout(resolve, 10000));

          const getServiceCmd = "kubectl get svc argocd-server -n argocd";
          setTerminalLines((prev) => [
            ...prev,
            <TerminalInput key={`input-5`}>{getServiceCmd}</TerminalInput>,
          ]);
          const serviceOutput = await executeCommand(getServiceCmd);
          const ip = extractArgocdIp(serviceOutput);
          setArgocdIp(ip);

          const getPasswordCmd = "argocd admin initial-password -n argocd";
          setTerminalLines((prev) => [
            ...prev,
            <TerminalInput key={`input-6`}>{getPasswordCmd}</TerminalInput>,
          ]);

          try {
            const passwordOutput = await executeCommand(getPasswordCmd);
            if (passwordOutput) {
              const password = passwordOutput.trim().split("\n")[0];
              setArgocdPassword(password);
              addTerminalOutput("\n=== ARGOCD INITIAL PASSWORD ===");
              addTerminalOutput(password);
              addTerminalOutput("==============================");
            }
          } catch (err) {
            addTerminalOutput("Failed to get initial password. You can try running manually:", true);
            addTerminalOutput("argocd admin initial-password -n argocd", true);
          }

          addTerminalOutput("\nArgoCD setup complete!");
        } else {
          const versionCmd = "argocd version";
          setTerminalLines((prev) => [
            ...prev,
            <TerminalInput key={`input-4`}>{versionCmd}</TerminalInput>,
          ]);
          await executeCommand(versionCmd);

          const getServiceCmd = "kubectl get svc argocd-server -n argocd";
          setTerminalLines((prev) => [
            ...prev,
            <TerminalInput key={`input-5`}>{getServiceCmd}</TerminalInput>,
          ]);
          const serviceOutput = await executeCommand(getServiceCmd);
          const ip = extractArgocdIp(serviceOutput);
          setArgocdIp(ip);

          const getPasswordCmd = "argocd admin initial-password -n argocd";
          setTerminalLines((prev) => [
            ...prev,
            <TerminalInput key={`input-6`}>{getPasswordCmd}</TerminalInput>,
          ]);

          try {
            const passwordOutput = await executeCommand(getPasswordCmd);
            if (passwordOutput) {
              const password = passwordOutput.trim().split("\n")[0];
              setArgocdPassword(password);
              addTerminalOutput("\n=== ARGOCD INITIAL PASSWORD ===");
              addTerminalOutput(password);
              addTerminalOutput("==============================");
            }
          } catch (err) {
            addTerminalOutput("Note: Password may have been changed.", true);
          }
        }
      } catch (err) {
        console.error("Failed to check ArgoCD installation:", err);
      }
    };

    runInitCommands();
  }, [hasInitialized, selectedCluster, selectedAccount, namespace]);

  const handleLoginClick = () => {
    if (argocdIp && argocdPassword) {
      const loginCmd = `argocd login ${argocdIp} --username admin --password ${argocdPassword} --insecure`;
      setTerminalLines((prev) => [
        ...prev,
        <TerminalInput key={`input-login`}>{loginCmd}</TerminalInput>,
      ]);
      executeCommand(loginCmd).catch((error) => {
        console.error("Failed to log in to ArgoCD:", error);
        addTerminalOutput(`Failed to log in: ${error}`, true);
      });
    } else {
      addTerminalOutput("ArgoCD IP or Password not found!", true);
    }
  };

  const handleAddRepoClick = () => {
    if (!repoUrl || !gitHubUsername || !gitHubToken) {
      addTerminalOutput("Missing repository URL, GitHub username or token!", true);
      return;
    }

    const normalizedRepoUrl = repoUrl.replace(/\.git$/, "");
    const repoAddCmd = `argocd repo add ${normalizedRepoUrl} --username ${gitHubUsername} --password ${gitHubToken} --upsert`;

    setTerminalLines((prev) => [
      ...prev,
      <TerminalInput key={`input-repo-add`}>{repoAddCmd}</TerminalInput>,
    ]);

    executeCommand(repoAddCmd)
      .then(() => {
        if (!selectedFolder) {
          addTerminalOutput("No folder selected for application creation", true);
          return;
        }

        const parts = selectedFolder.split("/");
        if (parts.length < 2) {
          addTerminalOutput("Invalid selectedFolder format. Expected 'repoName/folderName'", true);
          return;
        }

        const folderName = parts[1];
        const appName = folderName.toLowerCase();

        const appCreateCmd = `argocd app create ${appName} --repo ${normalizedRepoUrl} --path ${folderName} --dest-server https://kubernetes.default.svc --dest-namespace ${namespace}`;
        setTerminalLines((prev) => [
          ...prev,
          <TerminalInput key={`input-app-create`}>{appCreateCmd}</TerminalInput>,
        ]);

        return executeCommand(appCreateCmd);
      })
      .catch((error) => {
        console.error("Failed to add repo or create app:", error);
        addTerminalOutput(`Failed: ${error}`, true);
      });
  };

  // Render permission-denied modal if needed
  if (!canUseArgoTerminal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-gray-950 rounded-xl border border-gray-800 shadow-2xl max-w-md w-full mx-auto p-6 text-center">
          <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-red-400 mb-2">Access Denied</h3>
          <p className="text-gray-300">
            You need <span className="font-mono">Agent.Provision</span> and <span className="font-mono">Credentials.View</span> permissions.
          </p>
          <button
            onClick={onClose}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-950 rounded-xl border border-gray-800 shadow-2xl max-w-3xl w-full mx-auto p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <ServerCog className="text-blue-400" size={20} />
            <h3 className="text-white font-medium">Manual ArgoCD Terminal</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="rounded-lg bg-black border border-gray-800 overflow-hidden max-h-[70vh]">
          <Terminal
            name="ArgoCD Terminal"
            height="400px"
            onInput={handleUserCommand}
            prompt="cloudmasa@argo:~$"
            theme={{ backgroundColor: "#121212", color: "#d1d5db" }}
            readOnly={isCommandRunning}
          >
            {terminalLines}
            <div ref={terminalEndRef} />
          </Terminal>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            onClick={handleLoginClick}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg"
          >
            Login to ArgoCD
          </button>
          <button
            onClick={handleAddRepoClick}
            className="bg-green-500 text-white py-2 px-4 rounded-lg"
          >
            Add Repo and Create App
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArgoTerminal;
