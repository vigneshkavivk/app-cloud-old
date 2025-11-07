import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeploymentForm from './DeploymentForm';
import Terminal from 'react-terminal-ui';
import axios from 'axios';
import api from '../interceptor/api.interceptor';

const ToolsUI = () => {
  const [deployingTool, setDeployingTool] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deployedTools, setDeployedTools] = useState({});
  const [clickedTools, setClickedTools] = useState({});
  const [terminalLines, setTerminalLines] = useState([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toolToDelete, setToolToDelete] = useState(null);
  

  useEffect(() => {
    const storedDeployed = localStorage.getItem('deployedTools');
    if (storedDeployed) {
      setDeployedTools(JSON.parse(storedDeployed));
    }
  }, []);

  const saveToLocalStorage = (data) => {
    localStorage.setItem('deployedTools', JSON.stringify(data));
  };

  const handleDeployClick = (toolName) => {
    setSelectedTool(toolName);
    setClickedTools((prev) => ({ ...prev, [toolName]: true }));

    // Optimistically update deployed state with placeholder cluster
    const updatedTools = {
      ...deployedTools,
      [toolName]: {
        cluster: '(pending)',
        timestamp: new Date().toLocaleString(),
      },
    };

    setDeployedTools(updatedTools);
    saveToLocalStorage(updatedTools);

    setShowModal(true);
  };

  const handleDeployConfirm = async (toolName, clusterName) => {
    if (!clusterName.trim()) {
      toast.error('Please enter a cluster name!');
      return;
    }

    setShowModal(false);
    setDeployingTool(toolName);
    toast.info(`Deploying ${toolName} to ${clusterName}...`);

    setTimeout(async () => {
      toast.success(`${toolName} deployed successfully to ${clusterName}!`);
      setDeployingTool(null);
      setShowTerminal(true);

      const updatedTools = {
        ...deployedTools,
        [toolName]: {
          cluster: clusterName,
          timestamp: new Date().toLocaleString(),
        },
      };

      setDeployedTools(updatedTools);
      saveToLocalStorage(updatedTools);

      try {
        await api.post('/deploy', {
          toolName,
          cluster: clusterName,
          status: 'Deployed',
        });
        // await axios.post('http://localhost:3000/deploy', {
        //   toolName,
        //   cluster: clusterName,
        //   status: 'Deployed',
        // });
      } catch (error) {
        toast.error('Failed to save deployment to the database.');
      }
    }, 2000);
  };

  const handleDeleteClick = (toolName) => {
    setToolToDelete(toolName);
    setShowDeleteConfirm(true);
  };

const confirmDelete = async () => {
  if (!toolToDelete) return;

  try {
    // Call backend to delete deployment by tool name
    const response = await api.delete(`/deploy/${toolToDelete}`);
    
    toast.success(response.data.message || `${toolToDelete} removed from database.`);

    // Update frontend state
    const updated = { ...deployedTools };
    delete updated[toolToDelete];
    setDeployedTools(updated);
    saveToLocalStorage(updated);

    // Show terminal feedback
    setTerminalLines(prev => [
      ...prev,
      <div key="delete-msg">🧹 Uninstalling {toolToDelete}...</div>,
      <div key="delete-success">✅ {toolToDelete} successfully uninstalled.</div>,
      <div key="delete-prompt">💡 You can run additional cleanup commands if needed.</div>,
    ]);
    
    // Close the delete confirmation modal
    setShowDeleteConfirm(false);
    setToolToDelete(null);
    
  } catch (error) {
    console.error('Delete error:', error);
    toast.error(`Failed to delete ${toolToDelete}`);
    setTerminalLines(prev => [
      ...prev,
      <div key="delete-error">❌ Failed to uninstall {toolToDelete}: {error.response?.data?.message || error.message}</div>
    ]);
    
    // Close the delete confirmation modal even if there's an error
    setShowDeleteConfirm(false);
    setToolToDelete(null);
  }
};

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setToolToDelete(null);
  };

  const handleCloseTerminal = () => {
    setShowTerminal(false);
  };

  const handleTerminalInput = (input) => {
    // Add the command to terminal output
    setTerminalLines(prev => [...prev, <div key={`cmd-${Date.now()}`}>$ {input}</div>]);
    
    // Here you could add logic to process specific commands
    if (input.trim() === 'clear') {
      setTerminalLines([]);
    } else {
      // Simulate command execution
      setTerminalLines(prev => [...prev, <div key={`res-${Date.now()}`}>Command executed: {input}</div>]);
    }
    
    setTerminalInput('');
  };

  const featuredTools = [
    { name: 'GitLab', category: 'Version Control', description: 'A web-based DevOps lifecycle tool providing Git repository management.', url: 'https://gitlab.com', image: '/src/assets/images.png' },
    { name: 'SonarQube', category: 'Code Quality', description: 'An open-source platform for continuous inspection of code quality.', url: 'https://www.sonarqube.org', image: '/src/assets/sonarqube.png' },
    { name: 'Argo', category: 'GitOps', description: 'A Kubernetes-native continuous deployment and workflow engine.', url: 'https://argoproj.github.io', image: '/src/assets/argo logo.png' },
    { name: 'Jenkins', category: 'CI/CD', description: 'An open-source automation server that helps automate software development.', url: 'https://www.jenkins.io', image: '/src/assets/jenkins logo.png' },
    { name: 'Kubernetes', category: 'Container Orchestration', description: 'An open-source system for automating deployment, scaling, and management of containerized applications.', url: 'https://kubernetes.io', image: '/src/assets/kubernetes logo.jpg' },
    { name: 'OPA Gatekeeper', category: 'Policy Enforcement', description: 'A policy controller for Kubernetes.', url: 'https://openpolicyagent.org', image: '/src/assets/opa logo.png' },
    { name: 'Sourcegraph', category: 'Code Search', description: 'A code search and intelligence tool.', url: 'https://sourcegraph.com', image: '/src/assets/source logo.png' },
    { name: 'ReportPortal', category: 'Test Reporting', description: 'An AI-powered test reporting and analysis tool.', url: 'https://reportportal.io', image: '/src/assets/report logo.png' },
    { name: 'AWS Cost Estimation Tool', category: 'Cloud Cost Management', description: 'A tool to estimate AWS service costs.', url: 'https://aws.amazon.com/calculator', image: '/src/assets/aws logo.png' },
    { name: 'Prometheus', category: 'Monitoring', description: 'A monitoring system and time series database.', url: 'https://prometheus.io', image: '/src/assets/promithis logo.png' },
    { name: 'Grafana', category: 'Monitoring', description: 'An open-source analytics and monitoring solution.', url: 'https://grafana.com', image: '/src/assets/grafana logo.png' },
    { name: 'HashiCorp Vault', category: 'Secrets Management', description: 'A tool for securely managing secrets.', url: 'https://www.vaultproject.io', image: '/src/assets/hashicorp logo.png' },
    { name: 'Loki', category: 'Logging', description: 'A log aggregation system by Grafana.', url: 'https://grafana.com/oss/loki', image: '/src/assets/loki logo.png' },
    { name: 'Keycloak', category: 'Identity Management', description: 'An identity and access management solution.', url: 'https://www.keycloak.org', image: '/src/assets/keycloak logo.png' },
    { name: 'Velero', category: 'Backup & Restore', description: 'A tool to backup and migrate Kubernetes resources.', url: 'https://velero.io', image: '/src/assets/velaro logo.jpg' },
    { name: 'Thanos', category: 'Monitoring', description: 'A set of components for highly available monitoring.', url: 'https://thanos.io', image: '/src/assets/thanos logo.png' },
    { name: 'NGINX', category: 'Web Server', description: 'A high-performance web server and reverse proxy.', url: 'https://nginx.org', image: '/src/assets/nginx logo.png' },
    { name: 'OAuth2', category: 'Authentication', description: 'An open standard for access delegation.', url: 'https://oauth.net/2/', image: '/src/assets/0Auth2 logo.webp' },
    { name: 'KEDA', category: 'Event-Driven Autoscaling', description: 'A Kubernetes-based event-driven autoscaler.', url: 'https://keda.sh', image: '/src/assets/keda logo.png' },
    { name: 'Jaeger', category: 'Tracing', description: 'An open-source end-to-end distributed tracing system.', url: 'https://www.jaegertracing.io', image: '/src/assets/jaeger logo.png' },
    { name: 'Nexus', category: 'Artifact Repository', description: 'A repository manager to store and retrieve build artifacts.', url: 'https://www.sonatype.com/nexus-repository-oss', image: '/src/assets/nexus.png' },
  ];

  const filteredTools = featuredTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isToolDeployed = (toolName) => deployedTools.hasOwnProperty(toolName);

  return (
    <div className="p-8 bg-gradient-to-br from-[#151D2A] to-[#1E2633] min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-white">App Store</h1>

      <div className="relative w-full md:w-1/2 mb-8">
        <input
          type="text"
          placeholder="Search tools by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white placeholder:text-gray-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all duration-300"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-red-400 transition"
          >
            ✖
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool, index) => {
          const isDeployed = isToolDeployed(tool.name);
          const wasClicked = clickedTools[tool.name];
          const deploymentInfo = deployedTools[tool.name];

          let buttonText = 'Deploy';
          if (deployingTool === tool.name) buttonText = 'Deploying...';
          else if (isDeployed) buttonText = 'Deployed';
          else if (wasClicked) buttonText = 'Deployed';

          let buttonClasses = `
            mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
            ${deployingTool === tool.name
              ? 'bg-orange-400 cursor-not-allowed'
              : isDeployed
              ? 'bg-green-600 cursor-default'
              : wasClicked
              ? 'bg-green-500 hover:bg-yellow-600'
              : 'bg-[#F26A2E] hover:bg-orange-500'
            }
          `;

          return (
            <div
              key={index}
              className="relative group overflow-hidden rounded-2xl p-[2px] bg-gradient-to-br from-[#2A4C83] to-[#1E2633] shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              <div className="absolute inset-0 rounded-2xl z-0 pointer-events-none">
                <div className="w-full h-full rounded-2xl animate-border-shine bg-[linear-gradient(120deg,_#F26A2E,_#2A4C83,_#F26A2E)] bg-[length:400%_400%] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              </div>

              <div className="relative z-10 bg-gradient-to-br from-[#2A4C83] to-[#1E2633] rounded-2xl p-5 border border-[#F26A2E]/30 text-white">
                <h2 className="text-xl font-semibold mb-2 text-[#F26A2E] hover:underline">
                  <Link to={`/sidebar/toolsUI/${tool.name.toLowerCase()}`}>{tool.name}</Link>
                </h2>
                <img
                  src={tool.image}
                  alt={tool.name}
                  className="w-12 h-12 mb-3 rounded-md shadow-md border border-gray-200 bg-white object-contain"
                />
                <p className="text-xs text-gray-300 font-medium mb-1">{tool.category}</p>
                <p className="text-white text-sm mb-2">{tool.description}</p>

                <div className="flex items-center justify-between">
                  <button
                    className={buttonClasses}
                    onClick={() => handleDeployClick(tool.name)}
                    disabled={deployingTool === tool.name || isDeployed}
                  >
                    {buttonText}
                  </button>

                  {isDeployed && (
                    <button
                      onClick={() => handleDeleteClick(tool.name)}
                      className="ml-2 text-red-400 hover:text-red-600 transition text-xl"
                      title="Delete Deployment"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {isDeployed && (
                  <div className="mt-2 text-xs text-green-300">
                    <div className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Deployed to {deploymentInfo?.cluster} at {deploymentInfo?.timestamp}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 backdrop-blur-md">
          <DeploymentForm
            selectedTool={selectedTool}
            closeModal={() => setShowModal(false)}
            handleDeployConfirm={handleDeployConfirm}
          />
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 backdrop-blur-md">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-red-500">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the deployment of <span className="font-semibold text-white">{toolToDelete}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}



      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default ToolsUI;