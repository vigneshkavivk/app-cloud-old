import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'tailwindcss/tailwind.css';
import { FaGithub, FaGitlab, FaBitbucket, FaArrowLeft, FaSave, FaCloud } from 'react-icons/fa';
import { HiOutlineLockClosed } from 'react-icons/hi';
import api from '../interceptor/api.interceptor';

const providers = [
  {
    id: 'github',
    name: 'GitHub',
    icon: <FaGithub size={28} />,
    color: 'border-gray-800',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: <FaGitlab size={28} />,
    color: 'border-orange-500',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    icon: <FaBitbucket size={28} />,
    color: 'border-blue-500',
  },
];

const DEFAULT_GITHUB_TOKEN = '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'; // Hardcoded token for Default Account
const DEFAULT_GITHUB_OWNER = 'CloudMasa-Tech';

const SCMConnector = () => {
  const [mode, setMode] = useState(null); // null | 'default' | 'own'
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [accountName, setAccountName] = useState('');

  const handleDefaultConnect = async () => {
    try {
      // Fetch Repos using the default token
      const repoRes = await axios.get(`https://api.github.com/orgs/${DEFAULT_GITHUB_OWNER}/repos`, {
        headers: { Authorization: `token ${DEFAULT_GITHUB_TOKEN}` },
      });

      const repoNames = repoRes.data.map((repo) => ({
        name: repo.full_name,
        url: repo.html_url, // Add the repo link here
      }));
      setRepos(repoNames);
      toast.success('Repositories fetched successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch GitHub repos.');
    }
  };

  const handleOwnConnect = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('GitHub token is required!');
      return;
    }

    try {
      // Fetch Repos using user token
      const repoRes = await axios.get('https://api.github.com/user/repos', {
        headers: { Authorization: `token ${token}` },
      });

      const repoNames = repoRes.data.map((repo) => ({
        name: repo.full_name,
        url: repo.html_url, // Add the repo link here
      }));
      setRepos(repoNames);
      toast.success('Repositories fetched successfully!');

      // Save token to the server
      const saveRes = await api.post('/save-token', {
        token,
        platform: selectedProvider,
      });
      // const saveRes = await axios.post('http://localhost:3000/save-token', {
      //   token,
      //   platform: selectedProvider,
      // });

      toast.success('Token saved to database!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch GitHub repos.');
    }
  };

  const fetchFolders = async (repo) => {
    setSelectedRepo(repo);
    try {
      const res = await axios.get(`https://api.github.com/repos/${repo}/contents`, {
        headers: { Authorization: `token ${token || DEFAULT_GITHUB_TOKEN}` },
      });
      const dirs = res.data.filter((item) => item.type === 'dir').map((dir) => dir.name);
      setFolders(dirs);
    } catch (err) {
      toast.error('Failed to fetch folders.');
    }
  };

  const saveToMongoDB = async () => {
    if (selectedRepo && selectedFolder) {
      try {
        // Send selected repo and folder to the backend for storage
        const saveData = {
          repo: selectedRepo,
          folder: selectedFolder,
        };

        const response = await api.post('/save-default', saveData);
        // const response = await axios.post('http://localhost:3000/save-default', saveData);
        if (response.status === 200) {
          toast.success('Repository and folder saved to MongoDB!');
        } else {
          toast.error('Failed to save data.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error saving to MongoDB.');
      }
    } else {
      toast.error('Please select both a repository and a folder.');
    }
  };

  const handleBackButton = () => {
    setSelectedProvider(null);
    setMode(null);
    setRepos([]);
    setFolders([]);
    setToken('');
    setAccountName('');
  };

  return (
    <div className="min-h-screen px-6 py-10 bg-[#1E2633]">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-white">🚀 SCMConnector</h1>

        {!selectedProvider && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            {providers.map((provider) => {
              const hoverColors = {
                github: 'hover:bg-gray-700',
                gitlab: 'hover:bg-orange-600',
                bitbucket: 'hover:bg-blue-600',
              };

              return (
                <div
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`cursor-pointer p-6 bg-[#2A4C83] border-2 ${provider.color} rounded-xl shadow transition duration-200 text-center hover:shadow-lg ${hoverColors[provider.id]}`}
                >
                  {provider.icon}
                  <h2 className="text-xl font-semibold text-[#FFFFFF] mt-3">{provider.name}</h2>
                </div>
              );
            })}
          </div>
        )}

        {selectedProvider && (
          <div className="mt-8 bg-[#2A4C83] p-6 rounded-lg shadow border border-[#F26A2E]">
            <h2 className="text-2xl font-semibold mb-4 text-white">Connect to {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}</h2>

            {!mode && (
              <div className="flex justify-center gap-6 mt-6">
                <button
                  onClick={() => setMode('default')}
                  className="bg-[#F26A2E] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#D75A2C] flex items-center gap-2"
                >
                  <FaCloud /> CloudMasa-Tech Account
                </button>
                <button
                  onClick={() => setMode('own')}
                  className="bg-[#2A4C83] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#375A9E] flex items-center gap-2"
                >
                  <HiOutlineLockClosed /> Client Account
                </button>
              </div>
            )}

            {mode === 'default' && (
              <div>
                <button
                  onClick={handleDefaultConnect}
                  className="bg-[#F26A2E] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#D75A2C] flex items-center gap-2"
                >
                  <FaGithub /> Fetch Repositories
                </button>
                <div className="mt-4">
                  <button
                    onClick={handleBackButton}
                    className="text-[#FFFFFF] hover:underline flex items-center gap-2"
                  >
                    <FaArrowLeft /> Back
                  </button>
                </div>
              </div>
            )}

            {mode === 'own' && (
              <form onSubmit={handleOwnConnect} className="space-y-4">
                <div>
                  <label className="block text-[#FFFFFF] font-medium mb-1">GitHub Token</label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    placeholder="Enter your GitHub token"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    className="bg-[#F26A2E] text-white font-semibold px-6 py-2 rounded-md hover:bg-[#D75A2C] transition flex items-center gap-2"
                  >
                    <FaGithub /> Connect
                  </button>
                  <button
                    type="button"
                    onClick={handleBackButton}
                    className="text-[#FFFFFF] hover:underline flex items-center gap-2"
                  >
                    <FaArrowLeft /> Back
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {repos.length > 0 && (
          <div className="mt-6 bg-[#2A4C83] p-6 rounded-lg shadow">
            <label className="block text-[#FFFFFF] font-semibold mb-2">Select Repository</label>
            <select
              onChange={(e) => fetchFolders(e.target.value)}
              value={selectedRepo}
              className="w-full p-2 border border-gray-300 bg-white rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
            >
              <option value="">-- Select Repository --</option>
              {repos.map((repo, idx) => (
                <option key={idx} value={repo.name}>
                  {repo.name}
                </option>
              ))}
            </select>

            {selectedRepo && (
              <div className="mt-2 text-[#F26A2E] font-medium">
                <a href={repos.find((repo) => repo.name === selectedRepo)?.url} target="_blank" rel="noopener noreferrer">
                  {repos.find((repo) => repo.name === selectedRepo)?.url}
                </a>
              </div>
            )}
          </div>
        )}

        {folders.length > 0 && (
          <div className="mt-6 bg-[#2A4C83] p-6 rounded-lg shadow">
            <label className="block text-[#FFFFFF] font-semibold mb-2">Select Folder</label>
            <select
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full p-2 border border-gray-300 bg-white rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
            >
              <option value="">-- Select Folder --</option>
              {folders.map((folder, idx) => (
                <option key={idx} value={folder}>
                  {folder}
                </option>
              ))}
            </select>

            {selectedFolder && (
              <div className="mt-2">
                <button
                  onClick={saveToMongoDB}
                  className="bg-[#F26A2E] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#D75A2C] flex items-center gap-2"
                >
                  <FaSave /> Save
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default SCMConnector;
