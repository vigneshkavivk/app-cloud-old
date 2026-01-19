import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import ArgoTerminal from './ArgoTerminal';
import api from '../interceptor/api.interceptor';

const DeploymentForm = ({ selectedTool, closeModal }) => {
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [savedTokens, setSavedTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [namespace, setNamespace] = useState('argocd');
  const [repoUrl, setRepoUrl] = useState('');
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [gitHubUsername, setGitHubUsername] = useState('');
  const [gitHubToken, setGitHubToken] = useState('');
  const [tokenMode, setTokenMode] = useState(null); // 'company' or 'client'
  const [isLoadingGitHubDetails, setIsLoadingGitHubDetails] = useState(false);

  // Default company account details
  const COMPANY_ACCOUNT = {
    token: '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',
    username: 'CloudMasa-Tech',
    _id: 'company-account'
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await api.get('/api/get-aws-accounts');
        // const { data } = await axios.get('http://localhost:3000/api/get-aws-accounts');
        setSavedAccounts(data);
        if (data.length === 1) setSelectedAccount(data[0]);
      } catch {
        toast.error('Failed to load AWS accounts');
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const { data } = await api.get('/get-tokens');
        // const { data } = await axios.get('http://localhost:3000/get-tokens');
        setSavedTokens(data);
        // If there's only one token, select it automatically
        if (data.length === 1) {
          setSelectedToken(data[0]);
        }
      } catch {
        toast.error('Failed to load GitHub tokens');
      }
    };
    if (tokenMode === 'client') {
      fetchTokens();
    }
  }, [tokenMode]);

  useEffect(() => {
    const fetchGitHubDetails = async () => {
      if (tokenMode === 'company') {
        setGitHubToken(COMPANY_ACCOUNT.token);
        setGitHubUsername(COMPANY_ACCOUNT.username);
        return;
      }

      if (!selectedToken) return;
      
      setIsLoadingGitHubDetails(true);
      try {
        setGitHubToken(selectedToken.token);
        
        // Fetch GitHub username using the token
        const { data } = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `token ${selectedToken.token}` },
        });
        setGitHubUsername(data.login);
        
        // Verify the token is valid by making a test request
        await axios.get('https://api.github.com/user/repos', {
          headers: { Authorization: `token ${selectedToken.token}` },
          params: { per_page: 1 }
        });
      } catch (error) {
        toast.error('Failed to fetch GitHub details. The token might be invalid.');
        console.error(error);
        setGitHubUsername('');
        setGitHubToken('');
      } finally {
        setIsLoadingGitHubDetails(false);
      }
    };
    fetchGitHubDetails();
  }, [selectedToken, tokenMode]);

  useEffect(() => {
    const fetchRepos = async () => {
      if (!tokenMode) return;
      
      setIsLoadingRepos(true);
      try {
        if (tokenMode === 'company') {
          // For company account, use the predefined tools repo
          setRepositories(['CloudMasa-Tech/tools']);
          setSelectedRepo('CloudMasa-Tech/tools');
          setRepoUrl('https://github.com/CloudMasa-Tech/tools');
        } else {
          // For client account, use the selected token
          if (!selectedToken) return;
          
          // Fetch repositories using the backend endpoint
          const { data } = await api.get('/github/repos', {
            params: { token: selectedToken.token }
          });
          // const { data } = await axios.get('http://localhost:3000/github/repos', {
          //   params: { token: selectedToken.token }
          // });
          
          if (data.repositories && data.repositories.length > 0) {
            setRepositories(data.repositories);
            setSelectedRepo(data.repositories[0]);
            setRepoUrl(`https://github.com/${data.repositories[0]}`);
          } else {
            toast.error('No repositories found for this token');
            setRepositories([]);
            setSelectedRepo('');
            setRepoUrl('');
          }
        }
      } catch (error) {
        toast.error('Failed to fetch GitHub repositories');
        console.error(error);
      } finally {
        setIsLoadingRepos(false);
      }
    };
    fetchRepos();
  }, [selectedToken, tokenMode]);

  useEffect(() => {
    const fetchFolders = async () => {
      if (!selectedRepo || !gitHubToken) return;
      
      setIsLoadingFolders(true);
      try {
        const { data } = await axios.get(
          `https://api.github.com/repos/${selectedRepo}/contents`,
          { headers: { Authorization: `token ${gitHubToken}` } }
        );

        const foldersInRepo = data
          .filter(item => item.type === 'dir')
          .map(item => item.name);

        setFolders(foldersInRepo);

        if (foldersInRepo.length > 0) {
          // Try to find a folder that matches the tool name
          const toolName = selectedTool.toLowerCase();
          let matchedFolder = foldersInRepo.find(folder => 
            folder.toLowerCase().includes(toolName)
          );
          
          // If no exact match, try partial matches
          if (!matchedFolder) {
            const toolWords = toolName.split(/[-_\s]/);
            matchedFolder = foldersInRepo.find(folder => {
              const folderName = folder.toLowerCase();
              return toolWords.some(word => folderName.includes(word));
            });
          }
          
          setSelectedFolder(matchedFolder || foldersInRepo[0]);
        }
      } catch (error) {
        toast.error('Failed to fetch folders in repository');
        console.error(error);
        setFolders([]);
      } finally {
        setIsLoadingFolders(false);
      }
    };
    fetchFolders();
  }, [selectedRepo, gitHubToken, selectedTool]);

  useEffect(() => {
    const fetchClusters = async () => {
      if (!selectedAccount) return;
      try {
        const { data } = await api.post('/api/get-eks-clusters', {
          accountId: selectedAccount.accountId,
        });
        // const { data } = await axios.post('http://localhost:3000/api/get-eks-clusters', {
        //   accountId: selectedAccount.accountId,
        // });
        setClusters(data.clusters || []);
        if (selectedCluster && data.clusters.includes(selectedCluster)) return;
        if (data.clusters.length > 0) setSelectedCluster(data.clusters[0]);
      } catch {
        toast.error('Failed to fetch clusters');
        setClusters([]);
      }
    };
    fetchClusters();
  }, [selectedAccount, selectedCluster]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedCluster) return toast.error('Please select a cluster');
    if (!tokenMode) return toast.error('Please select a GitHub account type');
    if (!selectedFolder) return toast.error('Please select a folder');
    if (!namespace.trim()) return toast.error('Please enter a namespace');

    setShowTerminalModal(true);
  };

  const closeTerminal = async () => {
    setShowTerminalModal(false);

    const deploymentData = {
      selectedTool,
      selectedCluster,
      selectedAccount,
      selectedToken: tokenMode === 'company' ? COMPANY_ACCOUNT : selectedToken,
      gitHubUsername,
      repoUrl,
      selectedFolder: `tools/${selectedFolder}`, // Include the tools folder in the path
      namespace,
    };

    try {
      await api.post('/api/save-deployment', deploymentData);
      // await axios.post('http://localhost:3000/api/save-deployment', deploymentData);
      toast.success('Deployment data saved successfully!');
      closeModal();
    } catch (error) {
      toast.error('Error saving deployment data.');
      console.error(error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-gray-800 text-white p-8 rounded-xl shadow-xl w-full max-w-md relative">
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-white bg-white bg-opacity-10 hover:bg-opacity-20 p-1.5 rounded-full transition"
          >
            <X size={20} />
          </button>

          <h3 className="text-2xl font-semibold text-gray-200 mb-6 text-center">
            Deploy {selectedTool}
          </h3>

          {/* AWS Account Selection */}
          <div className="mb-4">
            <h4 className="text-sm text-gray-300 mb-2 font-medium">Select AWS Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {savedAccounts.map((account) => (
                <div
                  key={account.accountId}
                  onClick={() => setSelectedAccount(account)}
                  className={`p-2 border rounded-lg cursor-pointer transition ${
                    selectedAccount?.accountId === account.accountId
                      ? 'bg-gray-700 border-indigo-500'
                      : 'border-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <p className="text-sm text-indigo-300 font-semibold">{account.accountId}</p>
                  <p className="text-xs text-gray-400">Region: {account.awsRegion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cluster & Token Selection */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedAccount && (
              <div>
                <h4 className="text-sm text-gray-300 mb-1 font-medium">Select Cluster</h4>
                <select
                  value={selectedCluster}
                  onChange={(e) => setSelectedCluster(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">-- Select a Cluster --</option>
                  {clusters.map((cluster, idx) => (
                    <option key={idx} value={cluster}>
                      {cluster}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <h4 className="text-sm text-gray-300 mb-1 font-medium">Select GitHub Account</h4>
              {!tokenMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setTokenMode('company')}
                    className="flex-1 p-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white"
                  >
                    Company Account
                  </button>
                  <button
                    onClick={() => setTokenMode('client')}
                    className="flex-1 p-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white"
                  >
                    Client Account
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="p-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    {tokenMode === 'company' ? 'Company Account' : 'Client Account'}
                    <button 
                      onClick={() => {
                        setTokenMode(null);
                        setSelectedToken(null);
                        setGitHubUsername('');
                        setGitHubToken('');
                        setRepositories([]);
                        setSelectedRepo('');
                        setFolders([]);
                        setSelectedFolder('');
                      }}
                      className="absolute right-2 top-2 text-gray-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {tokenMode === 'client' && selectedToken && (
                    <div className="mt-2 p-2 bg-gray-700 rounded border border-gray-600">
                      <p className="text-xs text-gray-400">Token ID:</p>
                      <p className="text-sm text-blue-300">{selectedToken._id}</p>
                      <p className="text-xs text-gray-400 mt-1">Username:</p>
                      <p className="text-sm text-blue-300">
                        {isLoadingGitHubDetails ? 'Loading...' : gitHubUsername || 'Not available'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {isLoadingRepos && <p className="text-xs text-gray-400 mt-1">Loading repositories...</p>}
            </div>
          </div>

          {/* GitHub PAT Display */}
          {gitHubToken && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
              <h4 className="text-sm text-gray-300 mb-2 font-medium">GitHub Personal Access Token</h4>
              <div className="flex items-center">
                <p className="text-sm text-blue-300 flex-1 truncate">
                  {gitHubToken ? '••••••••' + gitHubToken.slice(-4) : 'Not available'}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(gitHubToken);
                    toast.success('Token copied to clipboard');
                  }}
                  className="ml-2 text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {tokenMode === 'company' ? 'Company token' : 'Client token'}
              </p>
            </div>
          )}

          {/* Repository URL Display */}
          {selectedRepo && (
            <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
              <h4 className="text-sm text-gray-300 mb-1 font-medium">Selected Repository</h4>
              <p className="text-sm text-blue-300 break-all">{repoUrl}</p>
            </div>
          )}

          {/* Folder and Namespace */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {folders.length > 0 && (
              <div>
                <h4 className="text-sm text-gray-300 mb-1 font-medium">
                  Select Folder {isLoadingFolders && '(Loading...)'}
                </h4>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  disabled={isLoadingFolders}
                >
                  {folders.map((folder, idx) => (
                    <option key={idx} value={folder}>
                      tools/{folder}
                    </option>
                  ))}
                </select>
                {selectedFolder && (
                  <p className="text-xs text-gray-400 mt-1">
                    Selected folder: <span className="text-green-300">tools/{selectedFolder}</span>
                  </p>
                )}
              </div>
            )}

            <div>
              <h4 className="text-sm text-gray-300 mb-1 font-medium">Namespace</h4>
              <input
                type="text"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Enter Kubernetes namespace"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition"
            disabled={!selectedFolder || isLoadingRepos || isLoadingFolders || !tokenMode}
          >
            Deploy
          </button>
        </div>
      </div>

      {showTerminalModal && (
        <ArgoTerminal
          onClose={closeTerminal}
          selectedCluster={selectedCluster}
          selectedAccount={selectedAccount}
          namespace={namespace}
          repoUrl={repoUrl}
          selectedFolder={`tools/${selectedFolder}`} // Pass the full path to the terminal
          gitHubUsername={tokenMode === 'company' ? COMPANY_ACCOUNT.username : gitHubUsername}
          gitHubToken={tokenMode === 'company' ? COMPANY_ACCOUNT.token : gitHubToken}
        />
      )}
    </>
  );
};

export default DeploymentForm;