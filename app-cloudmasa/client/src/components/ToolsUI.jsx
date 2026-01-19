import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Terminal from 'react-terminal-ui';
import DeploymentForm from './DeploymentForm';
import { useAuth } from '../hooks/useAuth';
import api from '../interceptor/api.interceptor';
import DeleteForm from './DeleteForm';
// 🔶 Lucide Icons
import {
  ExternalLink,
  Edit3,
  Trash2,
  X,
  Zap,
  Search,
} from 'lucide-react';

const ToolsUI = () => {
  const navigate = useNavigate();
  const { canWrite, canDelete } = useAuth();

  // ✅ State
  const [awsAccounts, setAwsAccounts] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [selectedAwsAccount, setSelectedAwsAccount] = useState('');
  const [deployingTool, setDeployingTool] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'deploying', 'not_configured'
  const [deployedTools, setDeployedTools] = useState({});
  const [clickedTools, setClickedTools] = useState({});
  const [terminalLines, setTerminalLines] = useState([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All'); // 🎯 New: Category filter state

  // ✅ Font & Theme Setup — enhanced with CloudConnect bg
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      body {
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        min-height: 100vh;
        margin: 0;
        overflow-x: hidden;
      }

      /* === Dashboard Grid === */
      .dashboard-bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -2;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
        background-size: 30px 30px;
      }

      /* === Animated Gradient === */
      .animated-gradient-bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        opacity: 0.1;
        background: conic-gradient(from 0deg, #0ea5e9, #0f172a, #60a5fa, #0f172a, #0ea5e9);
        background-size: 400% 400%;
        animation: gradientShift 20s ease infinite;
        filter: blur(60px);
      }

      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      /* Gradient helpers */
      .red-orange-gradient-text {
        background: linear-gradient(to right, #ef4444, #f59e0b);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ✅ localStorage & API logic
useEffect(() => {
  const storedDeployed = localStorage.getItem('deployedTools');
  if (storedDeployed) {
    try {
      let parsed = JSON.parse(storedDeployed);
      
      // ✅ ✅ ✅ CRITICAL FIX: Remove all '(pending)' entries on load
      Object.keys(parsed).forEach(toolName => {
        if (parsed[toolName]?.cluster === '(pending)') {
          delete parsed[toolName];
        }
      });
      
      setDeployedTools(parsed);
    } catch (e) {
      console.warn("Failed to parse deployedTools, resetting.");
      localStorage.removeItem('deployedTools');
    }
  }
}, []);
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

  // ✅ Handlers
const handleDeployClick = (toolName) => {
  if (!canWrite()) return;
  setSelectedTool(toolName);
  setClickedTools((prev) => ({ ...prev, [toolName]: true }));
  setShowModal(true); // ✅ Only open modal — NO state change
};
const handleConfigureClick = (tool) => {
  if (!canWrite()) return;
  const { name } = tool;
  setSelectedTool(name);
  setClickedTools((prev) => ({ ...prev, [name]: true }));
  // ✅ DO NOT set state here — let handleDeployConfirm handle it
  setShowModal(true);
};

const handleDeployConfirm = async (toolName, clusterName, namespaceName, isUpdate = false) => {
  if (!clusterName || !namespaceName.trim()) {
    toast.error('Please select a cluster and enter a namespace!');
    return;
  }

  // ✅ STEP 1: Mark as deploying (UI will show "Deploying…")
  const deployingState = {
    ...deployedTools,
    [toolName]: { 
      cluster: '(pending)', 
      namespace: namespaceName, 
      timestamp: new Date().toLocaleString() 
    },
  };
  setDeployedTools(deployingState);
  saveToLocalStorage(deployingState);

  setShowModal(false);
  setDeployingTool(toolName);
  toast.info(`Deploying ${toolName} to ${clusterName}...`);

  // ✅ STEP 2: After "deployment", mark as running
  setTimeout(async () => {
    toast.success(`${toolName} ${isUpdate ? 'configuration updated' : 'deployed'} successfully to ${clusterName}!`);
    
    // ✅ REAL status update:
    const updatedTools = {
      ...deployedTools,
      [toolName]: { 
        cluster: clusterName, 
        namespace: namespaceName, 
        timestamp: new Date().toLocaleString() 
      },
    };
    setDeployedTools(updatedTools);
    saveToLocalStorage(updatedTools);
    setShowTerminal(true);
    setDeployingTool(null);

    try {
      await api.post('/deploy', {
        toolName, cluster: clusterName, namespace: namespaceName,
        status: isUpdate ? 'Updated' : 'Deployed',
      });
    } catch (error) {
      toast.error('Failed to save deployment to database.');
    }
  }, 2000);
};  const handleDeleteClick = (toolName) => {
    if (!canDelete()) return;
    setSelectedTool(toolName);
    setShowModal(false);
    setShowDeleteForm(true);
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

  // ✅ Tool List
  const featuredTools = [
    {
      name: 'Argo-CD',
      category: 'GitOps',
      description: 'A Kubernetes-native continuous deployment and workflow engine for GitOps.',
      url: 'https://argoproj.github.io',
      image: '/src/assets/argo-logo.png'
    },
    {
      name: 'GitLab',
      category: 'Version Control',
      description: 'A web-based DevOps lifecycle tool for Git repo management, CI/CD, and incident response.',
      url: 'https://gitlab.com',
      image: '/src/assets/gitlab-logo.jpeg'
    },
    {
      name: 'Jenkins',
      category: 'CI/CD',
      description: 'An extensible open-source automation server for continuous integration and delivery.',
      url: 'https://www.jenkins.io',
      image: '/src/assets/jenkins-logo.png'
    },
    {
      name: 'Prometheus',
      category: 'Monitoring',
      description: 'A monitoring system and time series database for real-time metrics and alerting.',
      url: 'https://prometheus.io',
      image: '/src/assets/prometheus-logo.png'
    },
    {
      name: 'Grafana',
      category: 'Monitoring',
      description: 'An open-source analytics and monitoring solution — visualize metrics, logs, and traces in dashboards.',
      url: 'https://grafana.com',
      image: '/src/assets/grafana-logo.png'
    },
    {
      name: 'HashiCorp Vault',
      category: 'Secrets Management',
      description: 'A tool for securely managing secrets, encryption keys, and identity-based access.',
      url: 'https://www.vaultproject.io',
      image: '/src/assets/hashicorp-logo.png'
    },
    {
      name: 'Nexus',
      category: 'Artifact Repository',
      description: 'A repository manager to store, retrieve, and manage build artifacts and dependencies.',
      url: 'https://www.sonatype.com/nexus-repository-oss',
      image: '/src/assets/nexus-logo.png'
    },
    {
      name: 'Loki',
      category: 'Logging',
      description: 'A horizontally-scalable, highly-available log aggregation system by Grafana — optimized for cost and performance.',
      url: 'https://grafana.com/oss/loki',
      image: '/src/assets/loki-logo.png'
    },
    {
      name: 'Harbor',
      category: 'Container Registry',
      description: 'A trusted cloud-native registry for storing, signing, and scanning container images — CNCF graduated project.',
      url: 'https://goharbor.io',
      image: '/src/assets/harbor-logo.png'
    },
    {
      name: 'SonarQube',
      category: 'Code Quality',
      description: 'An open-source platform for continuous inspection of code quality, security, and maintainability.',
      url: 'https://www.sonarqube.org',
      image: '/src/assets/sonarqube.png'
    },
    {
      name: 'InfluxDB',
      category: 'Monitoring',
      description: 'A time-series database optimized for high write/query loads — ideal for metrics, events, and real-time analytics.',
      url: 'https://www.influxdata.com',
      image: '/src/assets/influxDB.jpeg'
    },
    {
      name: 'Ghost',
      category: 'Content Management',
      description: 'A modern, open-source publishing platform for professional bloggers, newsletters, and paid subscriptions.',
      url: 'https://ghost.org',
      image: '/src/assets/ghostblog-logo.jpeg'
    },
    {
      name: 'WordPress',
      category: 'Content Management',
      description: 'The world’s most popular open-source CMS — flexible, extensible, powers millions of websites.',
      url: 'https://wordpress.org',
      image: '/src/assets/wordpress-logo.jpeg'
    },
    {
      name: 'Karpenter',
      category: 'Cluster Autoscaling',
      description: 'A Kubernetes-native node autoscaler that dynamically provisions just-in-time compute resources.',
      url: 'https://karpenter.sh',
      image: '/src/assets/karpenter logo.png'
    },
    {
      name: 'Percona Everest',
      category: 'Database Management',
      description: 'An open-source database-as-a-service platform for managing MySQL, PostgreSQL, and MongoDB on Kubernetes.',
      url: 'https://www.percona.com/everest',
      image: '/src/assets/perconaeverest.jpeg'
    },
    {
      name: 'Velero',
      category: 'Backup & Restore',
      description: 'A tool to backup, restore, and migrate Kubernetes resources and persistent volumes.',
      url: 'https://velero.io',
      image: '/src/assets/velero-logo.jpg'
    },
    {
      name: 'Jaeger',
      category: 'Tracing',
      description: 'An open-source, end-to-end distributed tracing platform to monitor and troubleshoot microservices.',
      url: 'https://www.jaegertracing.io',
      image: '/src/assets/jaeger-logo.png'
    },
    {
      name: 'KEDA',
      category: 'Event-Driven Autoscaling',
      description: 'A Kubernetes-based Event Driven Autoscaler — scale containers based on event queue depth, metrics, and more.',
      url: 'https://keda.sh',
      image: '/src/assets/keda-logo.png'
    },
    {
      name: 'Keycloak',
      category: 'Identity Management',
      description: 'An open-source identity and access management solution for modern applications and services.',
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
      name: 'NGINX',
      category: 'Web Server',
      description: 'A high-performance web server, reverse proxy, and load balancer.',
      url: 'https://nginx.org',
      image: '/src/assets/nginx-logo.png'
    },
    {
      name: 'OAuth2',
      category: 'Authentication',
      description: 'An open standard for access delegation and authorization.',
      url: 'https://oauth.net/2/',
      image: '/src/assets/0Auth2-logo.png'
    },
    {
      name: 'OPA Gatekeeper',
      category: 'Policy Enforcement',
      description: 'A policy controller for Kubernetes — enforce compliance, security, and operational standards.',
      url: 'https://openpolicyagent.org',
      image: '/src/assets/opa-logo.png'
    },
    {
      name: 'ReportPortal',
      category: 'Test Reporting',
      description: 'An AI-powered test reporting and analytics platform for QA and DevOps teams.',
      url: 'https://reportportal.io',
      image: '/src/assets/reportportal-logo.png'
    },
    {
      name: 'Sourcegraph',
      category: 'Code Search',
      description: 'A universal code search and intelligence platform for large-scale codebases.',
      url: 'https://sourcegraph.com',
      image: '/src/assets/sourcegraph-logo.png'
    },
    {
      name: 'Thanos',
      category: 'Monitoring',
      description: 'A set of components to create a highly available, long-term Prometheus monitoring system.',
      url: 'https://thanos.io',
      image: '/src/assets/thanos-logo.png'
    }
  ];

  // ✅ Get unique categories (for filter bar)
  const categories = Array.from(
    new Set(featuredTools.map(tool => tool.category))
  ).sort();
  categories.unshift('All'); // Ensure "All" is first

  // ✅ Status helper
  const isToolDeployed = (toolName) => deployedTools.hasOwnProperty(toolName);
  const getToolStatus = (toolName) => {
    if (!isToolDeployed(toolName)) return 'not_configured';
    const info = deployedTools[toolName];
    if (info.cluster === '(pending)') return 'deploying';
    return 'running';
  };
// ✅ Filtered Tools: search + status (now with 'deployed') + category
const filteredTools = featuredTools.filter((tool) => {
  const matchesSearch =
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase());

  const toolStatus = getToolStatus(tool.name);
  
  // ✅ Updated status matching: 'deployed' = NOT 'not_configured'
  const matchesStatus =
    statusFilter === 'all' ||
    (statusFilter === 'deployed' && toolStatus !== 'not_configured') ||
    (statusFilter === 'deploying' && toolStatus === 'deploying') ||
    (statusFilter === 'not_configured' && toolStatus === 'not_configured');

  const matchesCategory =
    activeCategory === 'All' ||
    tool.category === activeCategory;

  return matchesSearch && matchesStatus && matchesCategory;
});

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 text-white relative">
      {/* 🔷 Dashboard Background Layers */}
      <div className="dashboard-bg"></div>
      <div className="animated-gradient-bg"></div>

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

      <main className="max-w-7xl mx-auto relative z-10">
        {/* 🔷 Header */}
        <div className="flex justify-start mb-6">
          <div 
            className="relative bg-gradient-to-r from-[#161b22] via-[#1e252d] to-[#24292f]
                       rounded-2xl px-7 py-6 text-white shadow-lg overflow-hidden 
                       group transition-all duration-300 ease-out backdrop-blur-sm 
                       min-w-[350px] max-w-[520px] h-[110px]
                       hover:scale-[1.03] hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl"></div>

            <div className="flex items-center z-10 relative gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent group-hover:from-cyan-300 group-hover:via-blue-300 group-hover:to-cyan-400 transition-all">
                  Tools
                </h1>
                <p className="text-base mt-1 md:text-lg leading-snug bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-300 bg-clip-text text-transparent opacity-90 group-hover:opacity-100 transition-opacity">
                  DevOps tools and services management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 CATEGORY FILTER BAR — SMALL FONT, SINGLE ROW */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 text-[0.72rem] font-medium rounded-full whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-700/70 text-gray-300 hover:bg-gray-600/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ✅ Search Bar + Status Dropdown — Side-by-Side (Left-Aligned) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 w-full">
          {/* Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#121a25] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Status Dropdown — WITHOUT "Running", WITH "Deployed" */}
        <div className="relative w-full sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-[#121a25] border border-white/10 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="deployed"> Deployed</option>
            <option value="not_configured"> Not Configured</option>
          </select>
          {/* Custom Arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10l5 5 5-5"/>
            </svg>
          </div>
        </div>
        </div>

        {/* Tool Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map((tool) => {
            const isDeployed = isToolDeployed(tool.name);
            const status = getToolStatus(tool.name);

            return (
              <div
                key={tool.name}
                className="relative bg-gradient-to-r from-[#161b22] via-[#1e252d] to-[#24292f]
                           rounded-xl p-5 text-white shadow-lg overflow-hidden 
                           group transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/10 
                           border border-white/10 backdrop-blur-sm"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-xl"></div>

                <div className="flex items-start space-x-3 mb-3">
                  <img
                    src={tool.image}
                    alt={`${tool.name} logo`}
                    className="w-10 h-10 object-contain rounded"
                    onError={(e) => {
                      e.target.src = '/assets/default-icon.svg';
                    }}
                  />
                  <div className="flex-1">
                    <h2 
                      className="text-xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-red-500 to-rose-500"
                    >
                      {tool.name}
                    </h2>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[0.65rem] rounded-full font-medium mt-1 ${
                      status === 'running' ? 'bg-emerald-500/20 text-emerald-300' :
                      status === 'deploying' ? 'bg-blue-500/20 text-blue-300' :
                      status === 'failed' ? 'bg-rose-500/20 text-rose-300' :
                      'bg-gray-600/30 text-gray-400'
                    }`}>
                      {status === 'not_configured' ? 'Not Configured' : 
                       status === 'deploying' ? 'Deploying…' :
                       status === 'failed' ? 'Failed' :
                       '✅ Running'}
                    </span>
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                  {tool.description}
                </p>

                <div className="mb-3">
                  <span className="px-2 py-0.5 text-xs rounded bg-white/5 text-gray-300">
                    {tool.category}
                  </span>
                </div>

                <p className="text-gray-500 text-xs mb-4">
                  URL: <a href={tool.url.trim()} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                    {tool.url.trim().replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => window.open(tool.url.trim(), '_blank')}
                    className="w-full px-4 py-2 rounded-lg text-cyan-300 text-sm font-medium flex items-center justify-center gap-2 bg-[#121a25] hover:bg-[#161e2b] border border-white/10 transition-colors"
                  >
                    <ExternalLink size={16} />
                    Open
                  </button>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      onClick={() => handleConfigureClick(tool)}
                      disabled={!canWrite()}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                        !canWrite()
                          ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-teal-700 via-cyan-800 to-blue-900 text-white hover:from-teal-600 hover:via-cyan-700 hover:to-blue-800 hover:shadow-lg'
                      }`}
                    >
                      <Edit3 size={14} />
                      Configure
                    </button>

                    <button
                      onClick={isDeployed && canDelete() ? () => handleDeleteClick(tool.name) : undefined}
                      disabled={!isDeployed || !canDelete()}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                        isDeployed && canDelete()
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg'
                          : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Trash2 size={14} />
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

        {showDeleteForm && selectedTool && (
          <DeleteForm
            toolName={selectedTool}
            closeModal={() => setShowDeleteForm(false)}
          />
        )}

        {/* Terminal */}
        {showTerminal && (
          <div className="fixed bottom-6 left-6 right-6 md:left-8 md:right-8 bg-gray-900/90 backdrop-blur-md rounded-xl border border-white/10 p-4 z-40 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-white font-medium flex items-center gap-2">
                <Zap size={16} className="text-cyan-400" />
                Deployment Terminal
              </h4>
              <button
                onClick={handleCloseTerminal}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <Terminal
              name="Deployment Terminal"
              colorMode="dark"
              onInput={handleTerminalInput}
              input={terminalInput}
              setInput={setTerminalInput}
              height="180px"
              allowInput={true}
            >
              {terminalLines}
            </Terminal>
          </div>
        )}
      </main>
    </div>
  );
};

export default ToolsUI;

