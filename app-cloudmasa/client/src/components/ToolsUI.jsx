import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Terminal from 'react-terminal-ui';
import DeploymentForm from './DeploymentForm';
import { useAuth } from '../hooks/useAuth';
import api from '../interceptor/api.interceptor'; // ✅ Real API with auth

const ToolsUI = () => {
  const navigate = useNavigate();

  // ✅ AWS & Cluster State
  const [awsAccounts, setAwsAccounts] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [selectedAwsAccount, setSelectedAwsAccount] = useState('');
  const { canWrite, canDelete } = useAuth();
  const [deployingTool, setDeployingTool] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [deployedTools, setDeployedTools] = useState({});
  const [clickedTools, setClickedTools] = useState({});
  const [terminalLines, setTerminalLines] = useState([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toolToDelete, setToolToDelete] = useState(null);

  // Load deployed tools from localStorage
  useEffect(() => {
    const storedDeployed = localStorage.getItem('deployedTools');
    if (storedDeployed) {
      try {
        setDeployedTools(JSON.parse(storedDeployed));
      } catch (e) {
        console.warn("Failed to parse deployedTools, resetting.");
        localStorage.removeItem('deployedTools');
      }
    }
  }, []);

  // ✅ Fetch AWS Accounts — using api interceptor
  useEffect(() => {
    const fetchAwsAccounts = async () => {
      try {
        const res = await api.get('/api/cloud-connections');
        setAwsAccounts(res.data || []);
      } catch (err) {
        console.error('Failed to load AWS accounts', err);
        toast.error('Failed to load AWS accounts');
      }
    };
    fetchAwsAccounts();
  }, []);

  // ✅ Fetch Clusters — using api interceptor
  useEffect(() => {
    if (!selectedAwsAccount) {
      setClusters([]);
      return;
    }
    const fetchClusters = async () => {
      try {
        const res = await api.get(`/api/clusters?account=${encodeURIComponent(selectedAwsAccount)}`);
        setClusters(res.data || []);
      } catch (err) {
        console.error('Failed to load clusters', err);
        toast.error('Failed to load clusters');
      }
    };
    fetchClusters();
  }, [selectedAwsAccount]);

  const saveToLocalStorage = (data) => {
    try {
      localStorage.setItem('deployedTools', JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  };

  const handleDeployClick = (toolName) => {
    if (!canWrite()) return;
    setSelectedTool(toolName);
    setClickedTools((prev) => ({ ...prev, [toolName]: true }));

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

  const handleConfigureClick = (tool) => {
    if (!canWrite()) return;
    const { name } = tool;
    setSelectedTool(name);
    setClickedTools((prev) => ({ ...prev, [name]: true }));

    if (!deployedTools[name]) {
      const updatedTools = {
        ...deployedTools,
        [name]: {
          cluster: '(pending)',
          timestamp: new Date().toLocaleString(),
        },
      };
      setDeployedTools(updatedTools);
      saveToLocalStorage(updatedTools);
    }

    setShowModal(true);
  };

  const handleDeployConfirm = async (toolName, clusterName, namespaceName, isUpdate = false) => {
    if (!clusterName || !namespaceName.trim()) {
      toast.error('Please select a cluster and enter a namespace!');
      return;
    }

    setShowModal(false);
    setDeployingTool(toolName);
    toast.info(`Deploying ${toolName} to ${clusterName}...`);

    setTimeout(async () => {
      toast.success(`${toolName} ${isUpdate ? 'configuration updated' : 'deployed'} successfully to ${clusterName}!`);
      setDeployingTool(null);
      setShowTerminal(true);

      const updatedTools = {
        ...deployedTools,
        [toolName]: {
          cluster: clusterName,
          namespace: namespaceName,
          timestamp: new Date().toLocaleString(),
        },
      };

      setDeployedTools(updatedTools);
      saveToLocalStorage(updatedTools);

      try {
        await api.post('/deploy', {
          toolName,
          cluster: clusterName,
          namespace: namespaceName,
          status: isUpdate ? 'Updated' : 'Deployed',
        });
      } catch (error) {
        toast.error('Failed to save deployment to database.');
      }
    }, 2000);
  };

  const handleDeleteClick = (toolName) => {
    if (!canDelete()) return;
    setToolToDelete(toolName);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!toolToDelete) return;

    try {
      await api.delete(`/deploy/${toolToDelete}`);
      toast.success(`${toolToDelete} removed successfully.`);

      const updated = { ...deployedTools };
      delete updated[toolToDelete];
      setDeployedTools(updated);
      saveToLocalStorage(updated);

      setTerminalLines((prev) => [
        ...prev,
        <div key="delete-msg">🧹 Uninstalling {toolToDelete}...</div>,
        <div key="delete-success">✅ {toolToDelete} successfully uninstalled.</div>,
      ]);

      setShowDeleteConfirm(false);
      setToolToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete ${toolToDelete}`);
      setTerminalLines((prev) => [
        ...prev,
        <div key="delete-error">
          ❌ Failed to uninstall {toolToDelete}: {error.response?.data?.message || error.message}
        </div>,
      ]);
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
    setTerminalLines((prev) => [...prev, <div key={`cmd-${Date.now()}`}>$ {input}</div>]);

    if (input.trim() === 'clear') {
      setTerminalLines([]);
    } else {
      setTerminalLines((prev) => [...prev, <div key={`res-${Date.now()}`}>Command executed: {input}</div>]);
    }

    setTerminalInput('');
  };

  const featuredTools = [
    {
      name: 'Argo-CD',
      category: 'GitOps',
      description: 'A Kubernetes-native continuous deployment and workflow engine.',
      url: 'https://argoproj.github.io',
      image: '/src/assets/argo-logo.png'
    },
    {
      name: 'Grafana',
      category: 'Monitoring',
      description: 'An open-source analytics and monitoring solution.',
      url: 'https://grafana.com',
      image: '/src/assets/grafana-logo.png'
    },
    {
      name: 'GitLab',
      category: 'Version Control',
      description: 'A web-based DevOps lifecycle tool providing Git repository management.',
      url: 'https://gitlab.com',
      image: '/src/assets/gitlab-logo.jpeg'
    },
    {
      name: 'Ghost',
      category: 'Content Management',
      description: 'A modern, open-source publishing platform for professional bloggers and newsletters.',
      url: 'https://ghost.org',
      image: '/src/assets/ghostblog-logo.jpeg'
    },
    {
      name: 'Harbor',
      category: 'Container Registry',
      description: 'An open-source trusted cloud-native registry for storing, signing, and scanning container images.',
      url: 'https://goharbor.io',
      image: '/src/assets/harbor-logo.png'
    },
    {
      name: 'HashiCorp Vault',
      category: 'Secrets Management',
      description: 'A tool for securely managing secrets.',
      url: 'https://www.vaultproject.io',
      image: '/src/assets/hashicorp-logo.png'
    },
    {
      name: 'Jaeger',
      category: 'Tracing',
      description: 'An open-source end-to-end distributed tracing system.',
      url: 'https://www.jaegertracing.io',
      image: '/src/assets/jaeger-logo.png'
    },
    {
      name: 'Jenkins',
      category: 'CI/CD',
      description: 'An open-source automation server that helps automate software development.',
      url: 'https://www.jenkins.io',
      image: '/src/assets/jenkins-logo.png'
    },
    {
      name: 'KEDA',
      category: 'Event-Driven Autoscaling',
      description: 'A Kubernetes-based event-driven autoscaler.',
      url: 'https://keda.sh',
      image: '/src/assets/keda-logo.png'
    },
    {
      name: 'Keycloak',
      category: 'Identity Management',
      description: 'An identity and access management solution.',
      url: 'https://www.keycloak.org',
      image: '/src/assets/keycloak-logo.png'
    },
    {
      name: 'Kubernetes',
      category: 'Container Orchestration',
      description: 'An open-source system for automating deployment, scaling, and management of containerized applications.',
      url: 'https://kubernetes.io',
      image: '/src/assets/kubernetes-logo.jpg'
    },
    {
      name: 'Loki',
      category: 'Logging',
      description: 'A log aggregation system by Grafana.',
      url: 'https://grafana.com/oss/loki',
      image: '/src/assets/loki-logo.png'
    },
    {
      name: 'NGINX',
      category: 'Web Server',
      description: 'A high-performance web server and reverse proxy.',
      url: 'https://nginx.org',
      image: '/src/assets/nginx-logo.png'
    },
    {
      name: 'Nexus',
      category: 'Artifact Repository',
      description: 'A repository manager to store and retrieve build artifacts.',
      url: 'https://www.sonatype.com/nexus-repository-oss',
      image: '/src/assets/nexus-logo.png'
    },
    {
      name: 'OAuth2',
      category: 'Authentication',
      description: 'An open standard for access delegation.',
      url: 'https://oauth.net/2/',
      image: '/src/assets/0Auth2-logo.png'
    },
    {
      name: 'OPA Gatekeeper',
      category: 'Policy Enforcement',
      description: 'A policy controller for Kubernetes.',
      url: 'https://openpolicyagent.org',
      image: '/src/assets/opa-logo.png'
    },
    {
      name: 'Prometheus',
      category: 'Monitoring',
      description: 'A monitoring system and time series database.',
      url: 'https://prometheus.io',
      image: '/src/assets/prometheus-logo.png'
    },
    {
      name: 'ReportPortal',
      category: 'Test Reporting',
      description: 'An AI-powered test reporting and analysis tool.',
      url: 'https://reportportal.io',
      image: '/src/assets/reportportal-logo.png'
    },
    {
      name: 'SonarQube',
      category: 'Code Quality',
      description: 'An open-source platform for continuous inspection of code quality.',
      url: 'https://www.sonarqube.org',
      image: '/src/assets/sonarqube.png'
    },
    {
      name: 'Sourcegraph',
      category: 'Code Search',
      description: 'A code search and intelligence tool.',
      url: 'https://sourcegraph.com',
      image: '/src/assets/sourcegraph-logo.png'
    },
    {
      name: 'Thanos',
      category: 'Monitoring',
      description: 'A set of components for highly available monitoring.',
      url: 'https://thanos.io',
      image: '/src/assets/thanos-logo.png'
    },
    {
      name: 'Velero',
      category: 'Backup & Restore',
      description: 'A tool to backup and migrate Kubernetes resources.',
      url: 'https://velero.io',
      image: '/src/assets/velero-logo.jpg'
    },
    {
      name: 'WordPress',
      category: 'Content Management',
      description: 'An open-source content management system for building websites and blogs.',
      url: 'https://wordpress.org',
      image: '/src/assets/wordpress-logo.jpeg'
    }
  ];

  const filteredTools = featuredTools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? tool.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const isToolDeployed = (toolName) => deployedTools.hasOwnProperty(toolName);

  const getToolStatus = (toolName) => {
    if (!isToolDeployed(toolName)) return 'not_configured';
    const info = deployedTools[toolName];
    if (info.cluster === '(pending)') return 'deploying';
    return 'running';
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category === 'All' ? '' : category);
    setSearchQuery('');
  };

  const getCategoryColor = (category) => {
    return 'bg-gray-800 text-white';
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Custom Back Button + Unified Glass Neon Border Styles */}
      <style>{`
        .button {
          display: block;
          position: relative;
          width: 56px;
          height: 56px;
          margin: 0;
          overflow: hidden;
          outline: none;
          background-color: transparent;
          cursor: pointer;
          border: 0;
        }
        .button:before,
        .button:after {
          content: "";
          position: absolute;
          border-radius: 50%;
          inset: 7px;
        }
        .button:before {
          border: 4px solid #f0eeef;
          transition: opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1) 80ms,
            transform 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) 80ms;
        }
        .button:after {
          border: 4px solid #96daf0;
          transform: scale(1.3);
          transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
            transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          opacity: 0;
        }
        .button:hover:before,
        .button:focus:before {
          opacity: 0;
          transform: scale(0.7);
          transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
            transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .button:hover:after,
        .button:focus:after {
          opacity: 1;
          transform: scale(1);
          transition: opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1) 80ms,
            transform 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) 80ms;
        }
        .button-box {
          display: flex;
          position: absolute;
          top: 0;
          left: 0;
        }
        .button-elem {
          display: block;
          width: 20px;
          height: 20px;
          margin: 17px 18px 0 18px;
          transform: rotate(360deg);
          fill: #f0eeef;
        }
        .button:hover .button-box,
        .button:focus .button-box {
          transition: 0.4s;
          transform: translateX(-56px);
        }

        .tool-card {
          background: rgba(20, 20, 30, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 1rem;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border: 1px solid transparent;
        }
        .tool-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #ffa500, #3b82f6, #9333ea);
          z-index: -1;
          border-radius: 1rem;
          padding: 2px;
          background-clip: content-box;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        .tool-card:hover {
          transform: translateY(-4px);
          box-shadow: 
            0 8px 20px rgba(255, 165, 0, 0.25),
            0 0 25px rgba(59, 130, 246, 0.3),
            0 0 35px rgba(147, 51, 234, 0.25);
        }
      `}</style>

      <main className="p-6 w-full mx-auto max-w-7xl">
        {/* Header */}
        <header className="flex items-center mb-6 gap-4">
          <button
            className="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <div className="button-box">
              <svg className="button-elem" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
              <svg className="button-elem" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </div>
          </button>

          <div className="relative bg-gradient-to-br from-orange-500 via-blue-600 to-purple-700 rounded-2xl px-6 py-5 text-white shadow-lg overflow-hidden group transition-transform hover:scale-[1.02] duration-300 ease-out backdrop-blur-sm min-w-[320px] max-w-[500px]">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="flex items-center z-10 relative gap-3">
              <svg className="w-6 h-6 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.707.707A1 1 0 0015 4.924V11a1 1 0 102 0v-6.076a1 1 0 00-.293-.707l-.707-.707a2 2 0 012.828-2.828z"/>
                <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <div>
                <h1 className="text-xl font-bold">Tools</h1>
                <p className="text-white/80 text-sm mt-0.5">DevOps tools and services management</p>
              </div>
            </div>
          </div>
        </header>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['All', 'CI/CD', 'Monitoring', 'GitOps', 'Code Quality', 'Logging', 'Security', 'Version Control', 'Content Management', 'Container Registry', 'Artifact Repository', 'Web Server', 'Authentication', 'Identity Management', 'Backup & Restore', 'Event-Driven Autoscaling', 'Tracing'].map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat === 'All' ? '' : cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                (cat === 'All' && !selectedCategory) || selectedCategory === cat
                  ? 'bg-gradient-to-r from-orange-500 via-blue-500 to-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-1/2 mb-8">
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400"
            >
              ✖
            </button>
          )}
        </div>

        {/* Tool Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          {filteredTools.map((tool) => {
            const isDeployed = isToolDeployed(tool.name);
            const status = getToolStatus(tool.name);

            return (
              <div
                key={tool.name}
                className="tool-card p-5 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={tool.image}
                    alt={`${tool.name} logo`}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      e.target.src = '/assets/default-icon.svg';
                    }}
                  />
                  <h2 className="text-lg font-semibold text-white">{tool.name}</h2>

                  <span className={`px-2 py-1 text-[0.6rem] rounded-full font-small ${
                    status === 'running' ? 'bg-green-600 text-white' :
                    status === 'deploying' ? 'bg-blue-600 text-white' :
                    status === 'failed' ? 'bg-red-600 text-white' :
                    'bg-gray-600 text-gray-300'
                  }`}>
                    {status === 'not_configured' ? 'Not Configured' : 
                     status === 'deploying' ? 'Deploying...' :
                     status === 'failed' ? 'Failed' :
                     'Running'}
                  </span>
                </div>

                <p className="text-gray-300 text-sm mb-3">{tool.description}</p>

                <div className="mb-3">
                  <span className={`px-3 py-1 text-xs rounded font-medium ${getCategoryColor(tool.category)}`}>
                    {tool.category}
                  </span>
                </div>

                <p className="text-gray-500 text-xs mb-4">
                  URL: <a href={tool.url.trim()} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                    {tool.url.trim().replace('https://', '').replace('http://', '').split('/')[0]}
                  </a>
                </p>

                <div className="space-y-2">
                  <button
                    className="w-full px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-300 flex items-center justify-center
                              border border-white/20
                              bg-white/5 backdrop-blur-sm hover:bg-white/10
                              shadow-[0_0_8px_rgba(255,255,255,0.1)]
                              hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                    onClick={() => window.open(tool.url.trim(), '_blank')}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0l-6 6m6-6V14" />
                    </svg>
                    Open
                  </button>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      className={`w-full px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center
                                border border-white/20
                                bg-white/5 backdrop-blur-sm hover:bg-white/10
                                shadow-[0_0_8px_rgba(255,255,255,0.1)]
                                hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]
                                ${!canWrite() ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => handleConfigureClick(tool)}
                      disabled={!canWrite()}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.638 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configure
                    </button>

                    <button
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center
                                  border border-white/20
                                  bg-white/5 backdrop-blur-sm
                                  shadow-[0_0_8px_rgba(255,255,255,0.1)]
                                  ${
                                    isDeployed && canDelete()
                                      ? 'text-white hover:bg-white/10 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] cursor-pointer'
                                      : 'text-gray-500 bg-white/3 cursor-not-allowed opacity-70'
                                  }`}
                      onClick={isDeployed && canDelete() ? () => handleDeleteClick(tool.name) : undefined}
                      disabled={!isDeployed || !canDelete()}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Stop Service
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modals */}
        {showModal && selectedTool && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 backdrop-blur-md">
            <DeploymentForm
              selectedTool={selectedTool}
              closeModal={() => setShowModal(false)}
              handleDeployConfirm={handleDeployConfirm}
              awsAccounts={awsAccounts}
              clusters={clusters}
              selectedAwsAccount={selectedAwsAccount}
              setSelectedAwsAccount={setSelectedAwsAccount}
              isUpdateMode={!!deployedTools[selectedTool]}
              savedDeploymentData={deployedTools[selectedTool]}
            />
          </div>
        )}

        {showDeleteConfirm && toolToDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 backdrop-blur-md">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-red-500">
              <h3 className="text-xl font-bold text-white mb-4">Confirm Deletion</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete the deployment of{' '}
                <span className="font-semibold text-white">{toolToDelete}</span>?
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

        {/* Terminal */}
        {showTerminal && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4 z-50">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-white font-medium">Deployment Terminal</h4>
              <button
                onClick={handleCloseTerminal}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✖
              </button>
            </div>
            <Terminal
              name="Deployment Terminal"
              colorMode="dark"
              onInput={handleTerminalInput}
              input={terminalInput}
              setInput={setTerminalInput}
              height="200px"
              allowInput={true}
            >
              {terminalLines}
            </Terminal>
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
          theme="colored"
        />
      </main>
    </div>
  );
};

export default ToolsUI;