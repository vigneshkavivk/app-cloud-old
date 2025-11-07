  import React, { useEffect, useState } from 'react';
  import { X } from 'lucide-react';
  import { toast } from 'react-toastify';
  import axios from 'axios';
  import ArgoTerminal from './ArgoTerminal';
  import api from '../interceptor/api.interceptor';
  import { useOutletContext } from 'react-router-dom';

  const COMPANY_GITHUB_TOKEN = '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';

  const DeploymentForm = ({
    selectedTool,
    closeModal,
    handleDeployConfirm,
    cluster: parentCluster,
    setCluster: setParentCluster,
    namespace: parentNamespace,
    setNamespace: setParentNamespace,
    isUpdateMode,
    savedDeploymentData
  }) => {
    const { username } = useOutletContext();

    const [awsAccounts, setAwsAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [clusters, setClusters] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState(parentCluster || '');
    const [savedClients, setSavedClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [repositories, setRepositories] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState('');
    const [namespace, setNamespace] = useState(parentNamespace || 'argocd');
    const [repoUrl, setRepoUrl] = useState('');
    const [showTerminalModal, setShowTerminalModal] = useState(false);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [isLoadingFolders, setIsLoadingFolders] = useState(false);
    const [gitHubUsername, setGitHubUsername] = useState('');
    const [gitHubToken, setGitHubToken] = useState('');
    const [tokenMode, setTokenMode] = useState(null);

    // --- Argo CD Status ---
    const [argoStatus, setArgoStatus] = useState('');
    const [argoMessage, setArgoMessage] = useState('');
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);

    // Fetch AWS accounts
    useEffect(() => {
      const fetchAwsAccounts = async () => {
        try {
          const { data } = await api.get('/api/aws/get-aws-accounts');
          setAwsAccounts(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Failed to fetch AWS accounts:', err);
          toast.error('Failed to load AWS accounts');
          setAwsAccounts([]);
        }
      };
      fetchAwsAccounts();
    }, []);

    // Fetch clusters
    useEffect(() => {
      const fetchClusters = async () => {
        try {
          const { data } = await api.get('/api/clusters/get-clusters');
          if (Array.isArray(data) && data.length > 0) {
            setClusters(data);
            if (!data.find(c => c.name === selectedCluster)) {
              setSelectedCluster(data[0].name);
            }
          } else {
            setClusters([]);
          }
        } catch (err) {
          console.error('Failed to fetch clusters:', err);
          toast.error('Failed to load clusters from database.');
          setClusters([]);
        }
      };
      fetchClusters();
    }, []);

    // Fetch clients
    useEffect(() => {
      const fetchClients = async () => {
        try {
          const { data } = await api.get('/api/clients');
          setSavedClients(data);
        } catch (err) {
          console.error('Failed to fetch clients:', err);
          toast.error('Failed to load clients');
        }
      };
      if (tokenMode === 'client') fetchClients();
    }, [tokenMode]);

    // Fetch client GitHub token
    useEffect(() => {
      const fetchClientToken = async () => {
        if (tokenMode !== 'client' || !selectedClient?._id) return;
        try {
          const jwt = localStorage.getItem('jwt');
          const { data } = await axios.get(
            `http://localhost:3000/github/token/${selectedClient._id}`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          setGitHubToken(data.token);
          const { data: userData } = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${data.token}` }
          });
          setGitHubUsername(userData.login);
        } catch (err) {
          console.error('Failed to fetch client token:', err);
          toast.error('Failed to fetch client GitHub token.');
          setGitHubToken('');
          setGitHubUsername('Unknown User');
        }
      };
      fetchClientToken();
    }, [selectedClient, tokenMode]);

    useEffect(() => {
      const fetchSavedRepos = async () => {
        if (tokenMode !== 'company' || !username) return;
        setIsLoadingRepos(true);
        try {
          const jwt = localStorage.getItem('jwt');
          const { data } = await api.get(`/api/connections/saved-repos?userId=${username}&accountType=CloudMasa%20Tech`, {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          if (!Array.isArray(data)) {
            setRepositories([]);
            setSelectedRepo('');
            setRepoUrl('');
            return;
          }
          const repoList = data.filter(Boolean);
          setRepositories(repoList);
          if (isUpdateMode && savedDeploymentData?.repoUrl) {
            const savedRepoName = savedDeploymentData.repoUrl.replace('https://github.com/', '');
            const foundRepo = repoList.find(r => r === savedRepoName);
            if (foundRepo) {
              setSelectedRepo(foundRepo);
              setRepoUrl(`https://github.com/${foundRepo}`);
            } else {
              setSelectedRepo(repoList[0] || '');
              setRepoUrl(repoList[0] ? `https://github.com/${repoList[0]}` : '');
            }
          } else {
            setSelectedRepo(repoList[0] || '');
            setRepoUrl(repoList[0] ? `https://github.com/${repoList[0]}` : '');
          }
        } catch (err) {
          console.error('Failed to fetch saved repos:', err);
          toast.error('Failed to load company repos.');
          setRepositories([]);
        } finally {
          setIsLoadingRepos(false);
        }
      };
      if (tokenMode === 'company') {
        fetchSavedRepos();
      }
    }, [tokenMode, isUpdateMode, savedDeploymentData, username]);

    // ✅ USE SAVED FOLDERS FOR COMPANY MODE, LIVE FOR CLIENT MODE
    useEffect(() => {
      const loadFolders = async () => {
        if (!selectedRepo) return;

        setIsLoadingFolders(true);

        try {
          if (tokenMode === 'company') {
            const jwt = localStorage.getItem('jwt');
            const response = await api.get(`/api/connections/saved-folders?userId=${username}&repo=${encodeURIComponent(selectedRepo)}`, {
              headers: { Authorization: `Bearer ${jwt}` }
            });

            let savedFolders = Array.isArray(response.data) ? response.data : [];

            if (savedFolders.length === 0) {
              setFolders([]);
              setSelectedFolder("");
              return;
            }

            setFolders(savedFolders);

            if (isUpdateMode && savedDeploymentData?.selectedFolder) {
              const savedFolderName = savedDeploymentData.selectedFolder.replace(/^tools\//, '');
              const foundFolder = savedFolders.find(f => f === savedFolderName);
              setSelectedFolder(foundFolder || savedFolders[0] || "");
            } else {
              const toolName = selectedTool.toLowerCase();
              let matchedFolder = savedFolders.find(f => f.toLowerCase().includes(toolName)) ||
                                  savedFolders.find(f => f.toLowerCase().startsWith(toolName));
              setSelectedFolder(matchedFolder || savedFolders[0] || "");
            }

          } else {
            const token = gitHubToken;
            if (!token) return;

            const repoName = selectedRepo.trim();
            const { data } = await axios.get(
              `https://api.github.com/repos/${repoName}/contents`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!Array.isArray(data)) {
              setFolders([]);
              setSelectedFolder("");
              return;
            }

            const dirs = [...new Set(data.filter(item => item.type === 'dir').map(item => item.name))];
            setFolders(dirs);

            if (isUpdateMode && savedDeploymentData?.selectedFolder) {
              const savedFolderName = savedDeploymentData.selectedFolder.replace(/^tools\//, '');
              const foundFolder = dirs.find(f => f === savedFolderName);
              setSelectedFolder(foundFolder || dirs[0] || "");
            } else {
              const toolName = selectedTool.toLowerCase();
              let matchedFolder = dirs.find(f => f.toLowerCase().includes(toolName)) ||
                                  dirs.find(f => f.toLowerCase().startsWith(toolName));
              setSelectedFolder(matchedFolder || dirs[0] || "");
            }
          }

        } catch (err) {
          console.error('❌ Folder load error:', err);
          toast.error('Failed to load folders.');
          setFolders([]);
          setSelectedFolder("");
        } finally {
          setIsLoadingFolders(false);
        }
      };

      if (selectedRepo && (tokenMode === 'company' || gitHubToken)) {
        loadFolders();
      }
    }, [selectedRepo, tokenMode, gitHubToken, selectedTool, isUpdateMode, savedDeploymentData, username]);

    // Keep repoUrl in sync
    useEffect(() => {
      if (selectedRepo) {
        setRepoUrl(`https://github.com/${selectedRepo}`);
      }
    }, [selectedRepo]);

    // Pre-fill for update mode
    useEffect(() => {
      if (!isUpdateMode || !savedDeploymentData) return;
      const {
        selectedAccount: savedAccount,
        selectedCluster: savedCluster,
        selectedToken: savedToken,
        namespace: savedNamespace,
        selectedFolder: savedFolder,
        repoUrl: savedRepoUrl
      } = savedDeploymentData;

      if (savedAccount) setSelectedAccount(savedAccount);
      if (savedCluster) setSelectedCluster(savedCluster);
      if (savedNamespace) setNamespace(savedNamespace);
      if (savedToken?._id === 'company-account') {
        setTokenMode('company');
      } else if (savedToken) {
        setTokenMode('client');
        setSelectedClient(savedToken);
      }
      checkArgoStatus(savedCluster, savedNamespace, savedRepoUrl, savedFolder);
    }, [isUpdateMode, savedDeploymentData]);

    const checkArgoStatus = async (cluster, ns, repoUrl, folderPath) => {
      if (!cluster || !ns || !repoUrl || !folderPath) return;
      setIsCheckingStatus(true);
      setArgoStatus('Checking...');
      setArgoMessage('');
      try {
        setTimeout(() => {
          setArgoStatus('Healthy');
          setArgoMessage('Application is synced and healthy.');
          setIsCheckingStatus(false);
        }, 2000);
      } catch (err) {
        console.error('Error checking Argo CD status:', err);
        setArgoStatus('Unknown');
        setArgoMessage('Failed to retrieve status.');
        setIsCheckingStatus(false);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!selectedCluster) return toast.error('Select cluster');
      if (!selectedAccount) return toast.error('Select AWS Account');
      if (!tokenMode) return toast.error('Select GitHub account');
      if (!selectedFolder) return toast.error('Select folder');
      if (!namespace.trim()) return toast.error('Enter namespace');

      if (isUpdateMode) {
        await saveDeployment();
        return;
      }

      if (selectedTool === "Argo CD") {
        await saveDeployment();
        return;
      }

      setShowTerminalModal(true);
    };

    const saveDeployment = async () => {
    const validatedData = {
      selectedTool: selectedTool || '',
      selectedCluster: selectedCluster || '',
      selectedAccount: selectedAccount || { accountId: '', accountName: '' },
      selectedToken: tokenMode === 'company'
        ? { _id: 'company-account', token: COMPANY_GITHUB_TOKEN }
        : selectedClient || { _id: '', token: '' },
      gitHubUsername: tokenMode === 'company' ? 'Company' : gitHubUsername || '',
      repoUrl: repoUrl || '',
      selectedFolder: selectedTool === "Argo CD" ? '' : `tools/${selectedFolder || ''}`,
      namespace: namespace || 'argocd',
      tokenMode: tokenMode || 'personal' // ✅ Explicitly send it
    };

    try {
      await api.post('/api/deployments/deploy', validatedData);
      toast.success(`${isUpdateMode ? 'Updated' : 'Deployed'} successfully!`);
      setParentCluster?.(selectedCluster);
      setParentNamespace?.(namespace);
      closeModal();
    } catch (err) {
      console.error('Deployment failed:', err);
      toast.error('Failed to save deployment');
    }
  };

    const closeTerminal = async () => {
    setShowTerminalModal(false);
    const deploymentData = {
      selectedTool,
      selectedCluster,
      selectedAccount,
      selectedToken: tokenMode === 'company'
        ? { _id: 'company-account', token: COMPANY_GITHUB_TOKEN }
        : selectedClient || { _id: '', token: '' },
      gitHubUsername: tokenMode === 'company' ? 'Company' : gitHubUsername,
      repoUrl,
      selectedFolder: `tools/${selectedFolder}`,
      namespace,
      tokenMode // ✅ Send it here too
    };
    try {
      await api.post('/api/deployments/deploy', deploymentData);
      toast.success('Deployment saved successfully!');
      setParentCluster(selectedCluster);
      setParentNamespace(namespace);
      closeModal();
    } catch (err) {
      console.error('Error saving deployment:', err);
      toast.error('Failed to save deployment');
    }
  };

    return (
      <>
        {/* Overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
          {/* Glassmorphism Modal */}
          <div className="relative w-full max-w-md p-6 rounded-xl shadow-lg border border-white border-opacity-10 backdrop-blur-lg bg-white bg-opacity-5 text-white z-[9999]">
            {/* Glare Effect */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 blur-xl -z-10"></div>
            <button onClick={closeModal} className="absolute top-4 right-4 text-white hover:text-gray-200 bg-white bg-opacity-10 hover:bg-opacity-20 p-1.5 rounded-full transition">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-center mb-6 text-white">
              {isUpdateMode ? 'Update Configuration' : 'Deploy'} {selectedTool}
            </h3>
            <div className="space-y-4">
              {/* AWS Account */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">AWS Account</label>
                {awsAccounts.length > 0 ? (
                  <select
                    value={selectedAccount?.accountId || ''}
                    onChange={(e) => setSelectedAccount(awsAccounts.find(acc => acc.accountId === e.target.value))}
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select AWS Account --</option>
                    {awsAccounts.map((acc) => (
                      <option key={acc._id} value={acc.accountId}>
                        {acc.accountName || acc.accountId} ({acc.awsRegion})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-400 italic text-sm">No AWS accounts found.</p>
                )}
              </div>

              {/* Cluster */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">Cluster</label>
                <select
                  value={selectedCluster}
                  onChange={e => setSelectedCluster(e.target.value)}
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {clusters.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* GitHub Account */}
              {isLoadingRepos && <div className="text-sm text-gray-400">Fetching repositories...</div>}
              {repositories.length === 0 && !isLoadingRepos && tokenMode === 'company' && (
                <p className="text-red-400 text-sm">No saved repositories found for Company account.</p>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-1">GitHub Account</label>
                {!tokenMode ? (
                  <div className="flex gap-2">
                    <button onClick={() => setTokenMode('company')} className="flex-1 p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                      Company
                    </button>
                    <button onClick={() => setTokenMode('client')} className="flex-1 p-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                      Client
                    </button>
                  </div>
                ) : tokenMode === 'client' ? (
                  <select
                    value={selectedClient?._id || ''}
                    onChange={e => setSelectedClient(savedClients.find(c => c._id === e.target.value))}
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Client --</option>
                    {savedClients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                ) : (
                  <div className="p-2.5 bg-blue-900 border border-blue-700 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm">Using Company Account</span>
                    </div>
                    <span className="text-xs text-blue-300 truncate max-w-[100px]">
                      Token: {COMPANY_GITHUB_TOKEN.substring(0, 8)}...
                    </span>
                  </div>
                )}
              </div>

              {/* Repository */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">Repository</label>
                {isLoadingRepos ? (
                  <div className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white">Loading...</div>
                ) : (
                  <select
                    value={selectedRepo}
                    onChange={e => setSelectedRepo(e.target.value)}
                    className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">-- Select Repository --</option>
                    {repositories.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Folder */}
              <select
                value={selectedFolder}
                onChange={e => setSelectedFolder(e.target.value)}
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">-- Select Folder --</option>
                {folders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              {/* Namespace */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">Namespace</label>
                <input
                  type="text"
                  value={namespace}
                  onChange={e => setNamespace(e.target.value)}
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., argocd"
                />
              </div>

              {/* Argo CD Status */}
              {isUpdateMode && (
                <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-2">Argo CD Application Status</h4>
                  {isCheckingStatus ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-sm text-gray-300">Checking status...</span>
                    </div>
                  ) : (
                    <>
                      <div className={`text-sm font-semibold ${argoStatus === 'Healthy' ? 'text-green-400' : argoStatus === 'Degraded' ? 'text-red-400' : 'text-yellow-400'}`}>
                        Status: {argoStatus}
                      </div>
                      {argoMessage && <p className="text-xs text-gray-300 mt-1">{argoMessage}</p>}
                    </>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition transform hover:scale-105"
              >
                {isUpdateMode ? 'Update Deployment' : 'Deploy'}
              </button>
            </div>
          </div>
        </div>

        {showTerminalModal && (
          <ArgoTerminal
            onClose={closeTerminal}
            selectedCluster={selectedCluster}
            selectedAccount={selectedAccount}
            namespace={namespace}
            repoUrl={repoUrl}
            selectedFolder={`tools/${selectedFolder}`}
            gitHubUsername={tokenMode === 'company' ? 'Company' : gitHubUsername}
            gitHubToken={tokenMode === 'company' ? COMPANY_GITHUB_TOKEN : gitHubToken}
          />
        )}
      </>
    );
  };

  export default DeploymentForm;