import { useState } from 'react';

export default function Modules() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Modules');

  const modules = [
    {
      id: 1,
      name: 'VPC',
      description: 'Create VPC, subnets, route tables',
      icon: 'cloud-upload',
      category: 'Networking'
    },
    {
      id: 2,
      name: 'EC2',
      description: 'Launch AWS EC2 instances',
      icon: 'cpu',
      category: 'Compute'
    },
    {
      id: 3,
      name: 'S3',
      description: 'Provision S3 bucket',
      icon: 'database',
      category: 'Storage'
    },
    {
      id: 4,
      name: 'EKS',
      description: 'Provision EKS cluster',
      icon: 'hexagon',
      category: 'Containers'
    },
    {
      id: 5,
      name: 'RDS',
      description: 'Provision databases',
      icon: 'hard-drive',
      category: 'Database'
    },
    {
      id: 6,
      name: 'IAM',
      description: 'Provision roles, policies, users',
      icon: 'user',
      category: 'Security'
    }
  ];

  const filteredModules = modules.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-900 text-white">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Modules</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search modules by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map(module => (
          <div key={module.id} className="bg-gray-800 rounded-lg p-5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center mr-3">
                {/* Simple SVG icons as placeholders */}
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  {module.icon === 'cloud-upload' && <path d="M12 16a4 4 0 100-8 4 4 0 000 8z"/>}
                  {module.icon === 'cpu' && <path d="M5 8h14v8H5z"/>}
                  {module.icon === 'database' && <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/>}
                  {module.icon === 'hexagon' && <path d="M12 2L2 7l10 5 10-5zM2 12l10 5 10-5M2 12h20v6H2z"/>}
                  {module.icon === 'hard-drive' && <path d="M5 8h14v8H5z"/>}
                  {module.icon === 'user' && <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>}
                </svg>
              </div>
              <h3 className="text-xl font-semibold">{module.name}</h3>
            </div>
            <p className="text-gray-300 mb-4">{module.description}</p>
            <button className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded font-medium transition-colors">
              Deploy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}