import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // ✅ RBAC hook
import { toast } from 'react-toastify';

/**
 * Modules Dashboard Component
 * 
 * Displays a grid of deployable infrastructure modules.
 * Enforces RBAC: only users with 'Job.Create' can view/deploy.
 * Includes search, responsive layout, and icon mapping.
 */
export default function Modules() {
  // 🔐 RBAC Permission Check
  const { hasPermission } = useAuth();
  const canDeploy = hasPermission('Job', 'Create');
  const navigate = useNavigate();

  // 🔒 Block access if user lacks permission
  if (!canDeploy) {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-red-900/30 shadow-lg">
          <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Job.Create</span> permission to deploy modules.
          </p>
        </div>
      </div>
    );
  }

  // 🧠 State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Modules');
  const [isLoading, setIsLoading] = useState(false);

  // 📦 Module Data (can be fetched from API later)
  const modules = [
    {
      id: 1,
      name: 'VPC',
      description: 'Create VPC, subnets, route tables, and internet gateways',
      icon: 'cloud-upload',
      category: 'Networking',
      keywords: ['network', 'vpc', 'aws']
    },
    {
      id: 2,
      name: 'EC2',
      description: 'Launch and configure AWS EC2 instances with security groups',
      icon: 'cpu',
      category: 'Compute',
      keywords: ['vm', 'instance', 'server']
    },
    {
      id: 3,
      name: 'S3',
      description: 'Provision secure S3 buckets with lifecycle and access policies',
      icon: 'database',
      category: 'Storage',
      keywords: ['bucket', 'object', 'storage']
    },
    {
      id: 4,
      name: 'EKS',
      description: 'Provision fully managed EKS cluster with node groups',
      icon: 'hexagon',
      category: 'Containers',
      keywords: ['kubernetes', 'cluster', 'eks']
    },
    {
      id: 5,
      name: 'RDS',
      description: 'Deploy managed relational databases (PostgreSQL, MySQL)',
      icon: 'hard-drive',
      category: 'Database',
      keywords: ['sql', 'database', 'rds']
    },
    {
      id: 6,
      name: 'IAM',
      description: 'Provision roles, policies, and users with least-privilege access',
      icon: 'user',
      category: 'Security',
      keywords: ['identity', 'access', 'policy']
    },
    {
      id: 7,
      name: 'Argo CD',
      description: 'Deploy GitOps-based continuous delivery using Argo CD',
      icon: 'git-branch',
      category: 'GitOps',
      keywords: ['gitops', 'argocd', 'ci/cd']
    },
    {
      id: 8,
      name: 'Jenkins',
      description: 'Set up Jenkins CI/CD pipeline on Kubernetes or EC2',
      icon: 'settings',
      category: 'CI/CD',
      keywords: ['jenkins', 'pipeline', 'automation']
    }
  ];

  // 🔍 Filter modules based on search term
  const filteredModules = modules.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (module.keywords?.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // 🚀 Handle Deploy Click
  const handleDeploy = (module) => {
    if (!canDeploy) {
      toast.warn('You do not have permission to deploy modules.');
      return;
    }
    // Navigate to deployment form with module context
    navigate('/deploy', { state: { selectedTool: module.name } });
  };

  // 🖼️ Helper: Render Icon by Name
  const renderIcon = (iconName) => {
    const iconMap = {
      'cloud-upload': (
        <path d="M12 16a4 4 0 100-8 4 4 0 000 8z" />
      ),
      'cpu': (
        <path d="M5 8h14v8H5z" />
      ),
      'database': (
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" />
      ),
      'hexagon': (
        <path d="M12 2L2 7l10 5 10-5zM2 12l10 5 10-5M2 12h20v6H2z" />
      ),
      'hard-drive': (
        <path d="M5 8h14v8H5z" />
      ),
      'user': (
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      ),
      'git-branch': (
        <path d="M20 12a4 4 0 10-8 0m-4 0a4 4 0 10-8 0m12 0H8m8 0v4a4 4 0 11-8 0m0-8V4a4 4 0 118 0" />
      ),
      'settings': (
        <path d="M12.6 2.8a1 1 0 00-1.2 0l-.76.51c-.3.2-.67.26-1.02.16l-.9-.24a1 1 0 00-.83.18L7.2 4.2a1 1 0 00-.18.83l.24.9c.1.35.04.72-.16 1.02L6.6 7.7a1 1 0 000 1.6l.5.76c.2.3.26.67.16 1.02l-.24.9a1 1 0 00.18.83l.79.69c.28.24.37.64.22 1l-.3.85a1 1 0 00.27.87l.7.7a1 1 0 00.87.27l.85-.3c.36-.15.76-.06 1 .22l.69.79a1 1 0 00.83.18l.9-.24c.35-.1.72-.04 1.02.16l.76.5a1 1 0 001.6 0l.5-.76c.2-.3.26-.67.16-1.02l-.24-.9a1 1 0 00-.83-.83l-.9.24c-.35.1-.72.04-1.02-.16l-.76-.5a1 1 0 00-.22-1.38l.3-.85a1 1 0 00-.27-.87l-.7-.7a1 1 0 00-.87-.27l-.85.3a1 1 0 00-.3.76l-.5.76a1 1 0 00-.16 1.02l.24.9a1 1 0 00.83.83l.9-.24a1 1 0 001.02-.16l.76-.5a1 1 0 000-1.6l-.76-.51zM12 8a4 4 0 100 8 4 4 0 000-8z" />
      )
    };

    return (
      <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
        {iconMap[iconName] || <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />}
      </svg>
    );
  };

  // 🎨 UI Rendering
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-900 text-white">
      {/* Header */}
      <header className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Infrastructure Modules</h1>
          <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-sm">
            {filteredModules.length} available
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search modules by name, category, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F26A2E] focus:border-transparent transition-all placeholder:text-gray-500"
            aria-label="Search modules"
          />
        </div>
      </header>

      {/* Navigation Tabs (Placeholder for Future Expansion) */}
      <div className="flex mb-6 border-b border-gray-700">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'Modules'
              ? 'text-[#F26A2E] border-b-2 border-[#F26A2E]'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('Modules')}
        >
          Modules
        </button>
        {/* Future: <button>Templates</button>, <button>History</button> */}
      </div>

      {/* Empty State */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No modules match your search.</div>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-2 text-[#F26A2E] hover:text-[#F26A2E]/80 font-medium"
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Modules Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredModules.map((module) => (
            <div
              key={module.id}
              className="bg-gray-800 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-700/50 hover:border-[#F26A2E]/30 flex flex-col"
            >
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-md flex items-center justify-center mr-3 flex-shrink-0">
                  {renderIcon(module.icon)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{module.name}</h3>
                  <span className="text-xs text-gray-400 bg-gray-900/50 px-2 py-0.5 rounded">
                    {module.category}
                  </span>
                </div>
              </div>
              <p className="text-gray-300 mb-4 flex-grow">{module.description}</p>
              <button
                onClick={() => handleDeploy(module)}
                className="bg-[#F26A2E] hover:bg-[#F26A2E]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F26A2E]/50"
                aria-label={`Deploy ${module.name} module`}
              >
                Deploy
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>
          Select a module to deploy infrastructure with CloudMaSa. Requires{' '}
          <span className="font-mono">Job.Create</span> permission.
        </p>
      </div>
    </div>
  );
}