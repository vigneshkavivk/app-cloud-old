// src/components/SCMConnector.jsx
import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "tailwindcss/tailwind.css";
import {
  FaGithub,
  FaGitlab,
  FaBitbucket,
  FaSave,
  FaCloud,
  FaTrash,
} from "react-icons/fa";
import { HiOutlineLockClosed } from "react-icons/hi";
import api from "../interceptor/api.interceptor";

// 🔑 HARDCODED CLOUDMASA TECH GITHUB TOKEN (for default mode only)
const CLOUDMASA_GITHUB_TOKEN = "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";

const providers = [
  {
    id: "github",
    name: "GitHub",
    icon: <FaGithub size={32} className="text-white" />,
    color: "border-[#24292F]",
    bg: "bg-[#1c2128]",
    hoverBg: "hover:bg-gradient-to-r hover:from-[#161b22] hover:to-[#24292f]",
    tokenLabel: "GitHub Personal Access Token",
    apiRepoEndpoint: "/api/scm/fetch-repos",
    apiFolderEndpoint: "/api/scm/fetch-folders",
    tokenField: "githubToken",
    baseUrl: "https://github.com",
    defaultOwner: "cloudmasa-tech",
    textColor: "text-white",
  },
  {
    id: "gitlab",
    name: "GitLab",
    icon: <FaGitlab size={32} className="text-[#FC6D26]" />,
    color: "border-[#FC6D26]",
    bg: "bg-[#1c2128]",
    hoverBg: "hover:bg-gradient-to-r hover:from-[#2A1A15] hover:to-[#3A2818]",
    tokenLabel: "GitLab Personal Access Token",
    apiRepoEndpoint: "/api/scm/fetch-gitlab-repos",
    apiFolderEndpoint: "/api/scm/fetch-gitlab-folders",
    tokenField: "gitlabToken",
    baseUrl: "https://gitlab.com",
    textColor: "text-[#FC6D26]",
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    icon: <FaBitbucket size={32} className="text-[#0052CC]" />,
    color: "border-[#0052CC]",
    bg: "bg-[#1c2128]",
    hoverBg: "hover:bg-gradient-to-r hover:from-[#1A1F2F] hover:to-[#2A3B5F]",
    tokenLabel: "Bitbucket App Password",
    apiRepoEndpoint: "/api/scm/fetch-bitbucket-repos",
    apiFolderEndpoint: "/api/scm/fetch-bitbucket-folders",
    tokenField: "bitbucketToken",
    baseUrl: "https://bitbucket.org",
    textColor: "text-[#0052CC]",
  },
];

const SCMConnector = () => {
  const { username } = useOutletContext();

  if (!username || typeof username !== "string" || username.trim() === "") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2 text-white">⚠️ User Session Missing</h2>
          <p className="mb-4 text-gray-300">Please log in again.</p>
        </div>
      </div>
    );
  }

  const [mode, setMode] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [tokenInput, setTokenInput] = useState("");
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [owner, setOwner] = useState("");
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [savedConnections, setSavedConnections] = useState([]);
  const [githubLogin, setGithubLogin] = useState(null); // ✅ NEW: stores real GitHub login

  const providerConfig = providers.find((p) => p.id === selectedProvider) || providers[0];

  const fetchUserData = async () => {
    try {
      const connRes = await api.get(`/api/connections?userId=${username}`);
      setSavedConnections(connRes.data || []);

      const userRes = await api.get("/api/users/me");
      const userData = userRes.data;

      if (userData.githubToken && selectedProvider === "github") {
        setTokenInput(userData.githubToken);
      } else if (userData.gitlabToken && selectedProvider === "gitlab") {
        setTokenInput(userData.gitlabToken);
      } else if (userData.bitbucketToken && selectedProvider === "bitbucket") {
        setTokenInput(userData.bitbucketToken);
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
      if (err.response?.status !== 404) {
        toast.error("❌ Failed to load your data.");
      }
    }
  };

  useEffect(() => {
    if (selectedProvider) {
      fetchUserData();
    }
  }, [username, selectedProvider]);

  // 🔹 Restore githubLogin from localStorage on mount (if token matches)
  useEffect(() => {
      const savedToken = localStorage.getItem("scm_github_token");
      const savedLogin = localStorage.getItem("scm_github_login");

      if (selectedProvider === "github" && savedToken && savedLogin) {
        // Optional: verify token is still the one in memory (or just trust local storage)
        // We'll revalidate only if user re-connects — for UX, show cached login
        setGithubLogin(savedLogin);
        // Don’t auto-set tokenInput — let user re-paste if needed (security)
      }
    }, [selectedProvider]);

  const handleOwnConnect = async (e) => {
    e.preventDefault();
    const finalToken = tokenInput.trim();
    if (!finalToken) return toast.error(`${providerConfig.name} token is required!`);

    try {
      // 🔹 For GitHub: Fetch user to get real login (e.g., "keerthusk20")
      let actualUsername = username;
      if (selectedProvider === "github") {
        try {
          const userRes = await fetch("https://api.github.com/user", {
            headers: { Authorization: `token ${finalToken}` },
          });
          const userData = await userRes.json();
          if (userRes.ok && userData?.login) {
            actualUsername = userData.login;
            setGithubLogin(actualUsername); // ✅ store real GitHub handle
            localStorage.setItem("scm_github_token", finalToken);
            localStorage.setItem("scm_github_login", actualUsername);
            toast.info(`Hello, @${actualUsername}!`, { autoClose: 2000 });
          } else {
            console.warn("GitHub user fetch failed:", userData);
          }
        } catch (err) {
          console.warn("GitHub user fetch error:", err);
        }
      }

      const payload = { [providerConfig.tokenField]: finalToken };
      const res = await api.post(providerConfig.apiRepoEndpoint, payload);

      let repoNames = [];
      if (providerConfig.id === "github") {
        repoNames = res.data.map((repo) => ({
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
        }));
      } else if (providerConfig.id === "gitlab") {
        repoNames = res.data.map((repo) => ({
          name: repo.name,
          fullName: repo.path_with_namespace,
          owner: repo.namespace?.name || repo.owner?.name || "unknown",
        }));
      } else if (providerConfig.id === "bitbucket") {
        repoNames = res.data.values.map((repo) => ({
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner?.username || "unknown",
        }));
      }

      setRepos(repoNames);
      toast.success(`✅ ${providerConfig.name} repositories fetched!`);
      await api.patch("/api/users/me", { [providerConfig.tokenField]: finalToken });
      toast.success(`🔒 ${providerConfig.name} token saved for future sessions.`);
    } catch (err) {
      console.error("Connection error:", err);
      toast.error(`❌ Invalid ${providerConfig.name} token or API error.`);
    }
  };

  const handleDefaultConnect = async () => {
    if (selectedProvider !== "github") {
      toast.error("⚠️ Default mode is only available for GitHub.");
      return;
    }
    if (!CLOUDMASA_GITHUB_TOKEN || CLOUDMASA_GITHUB_TOKEN.includes("YOUR_ACTUAL")) {
      toast.error("❌ CloudMasa token not configured!");
      return;
    }

    try {
      const payload = { githubToken: CLOUDMASA_GITHUB_TOKEN };
      const res = await api.post("/api/scm/fetch-repos", payload);
      const repoNames = res.data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
      }));
      setRepos(repoNames);
      setTokenInput(CLOUDMASA_GITHUB_TOKEN);
      setSelectedRepo("");
      setSelectedFolder("");
      setFolders([]);
      toast.success(`✅ Loaded ${repoNames.length} repos from CloudMasa Tech!`);
    } catch (err) {
      console.error("Fetch repos error:", err);
      toast.error("❌ Failed to fetch CloudMasa repos.");
      setRepos([]);
    }
  };

  const fetchFolders = async (repoFullName) => {
    const repo = repos.find((r) => r.fullName === repoFullName);
    if (!repo) return;

    setSelectedRepo(repoFullName);
    setOwner(repo.owner);
    setLoadingFolders(true);

    try {
      const finalToken = tokenInput.trim();
      if (!finalToken) {
        toast.error(`Please reconnect with your ${providerConfig.name} token.`);
        return;
      }

      const payload = {
        [providerConfig.tokenField]: finalToken,
        owner: repo.owner,
        repo: repo.name,
      };
      const res = await api.post(providerConfig.apiFolderEndpoint, payload);

      let items = [];
      if (providerConfig.id === "github") {
        items = res.data.map((item) => ({ name: item.name, path: item.path }));
      } else if (providerConfig.id === "gitlab") {
        items = res.data.map((item) => ({ name: item.name, path: item.path }));
      } else if (providerConfig.id === "bitbucket") {
        items = res.data.values.map((item) => ({
          name: item.path.split("/").pop(),
          path: item.path,
        }));
      }

      setFolders(items);
      setSelectedFolder("");
    } catch (err) {
      console.error("Fetch folders error:", err);
      toast.error("❌ Failed to fetch folders.");
    } finally {
      setLoadingFolders(false);
    }
  };

  const saveRepoAndAllFolders = async () => {
    if (!selectedRepo) return toast.error("Please select a repository first!");
    const repo = repos.find((r) => r.fullName === selectedRepo);
    if (!repo) return toast.error("Repository not found.");

    try {
      const finalToken = tokenInput.trim();
      if (!finalToken) {
        toast.error(`Please reconnect with your ${providerConfig.name} token.`);
        return;
      }

      const payload = {
        [providerConfig.tokenField]: finalToken,
        owner: repo.owner,
        repo: repo.name,
      };
      const res = await api.post(providerConfig.apiFolderEndpoint, payload);

      let allFolders = [];
      if (providerConfig.id === "github") {
        allFolders = res.data.map((item) => ({ name: item.name, path: item.path }));
      } else if (providerConfig.id === "gitlab") {
        allFolders = res.data.map((item) => ({ name: item.name, path: item.path }));
      } else if (providerConfig.id === "bitbucket") {
        allFolders = res.data.values.map((item) => ({
          name: item.path.split("/").pop(),
          path: item.path,
        }));
      }

      if (allFolders.length === 0) {
        toast.warn("No folders found in this repository.");
      }

      const isCloudMasaTech = tokenInput === CLOUDMASA_GITHUB_TOKEN;
      const accountType = isCloudMasaTech ? "CloudMasa Tech" : "Client Account";
      const effectiveName = githubLogin || username; // ✅ USE REAL GITHUB LOGIN HERE

      // 🔥 Save the repo itself
      const repoPayload = {
        userId: username,
        name: `${effectiveName} (Repo Only)`, // ✅ updated
        repo: selectedRepo,
        folder: null,
        status: "Repo Saved",
        lastSync: new Date().toISOString(),
        provider: selectedProvider,
        accountType,
      };

      const repoRes = await api.post("/api/connections/save-default", repoPayload);
      let newConnections = [{ ...repoPayload, _id: repoRes.data?._id || Date.now().toString() }];

      const skipFolders = [".github", "docs", "scripts", "tests", "test", "__pycache__"];
      for (const folder of allFolders) {
        if (skipFolders.some((skip) => folder.path.toLowerCase().includes(skip))) {
          continue;
        }

        const folderName = folder.path.split("/").pop() || folder.path;
        const folderUrl = `${providerConfig.baseUrl}/${selectedRepo}/tree/main/${encodeURIComponent(folder.path)}`;
        const folderPayload = {
          userId: username,
          name: `${effectiveName} - ${folderName}`, // ✅ updated
          repo: selectedRepo,
          folder: folderUrl,
          status: "Connected",
          lastSync: new Date().toISOString(),
          provider: selectedProvider,
          accountType,
        };

        try {
          const folderRes = await api.post("/api/connections/save-default", folderPayload);
          newConnections.push({
            ...folderPayload,
            _id: folderRes.data?._id || Date.now().toString(),
          });
        } catch (err) {
          console.warn(`Failed to save folder: ${folder.path}`, err);
        }
      }

      setSavedConnections((prev) => [...prev, ...newConnections]);
      toast.success(`✅ Saved repo + ${newConnections.length - 1} folders!`);
    } catch (err) {
      console.error("Save repo + folders error:", err);
      toast.error("❌ Failed to save repository and folders.");
    }
  };

  const saveFolderOnly = async () => {
    if (!selectedRepo || !selectedFolder) {
      return toast.error("Select both repo and folder!");
    }

    try {
      const folderName = selectedFolder.split("/").pop() || selectedFolder;
      const folderUrl = `${providerConfig.baseUrl}/${selectedRepo}/tree/main/${encodeURIComponent(selectedFolder)}`;
      const isCloudMasaTech = tokenInput === CLOUDMASA_GITHUB_TOKEN;
      const accountType = isCloudMasaTech ? "CloudMasa Tech" : "Client Account";
      const effectiveName = githubLogin || username; // ✅ USE REAL GITHUB LOGIN HERE

      const payload = {
        userId: username,
        name: `${effectiveName} - ${folderName}`, // ✅ updated
        repo: selectedRepo,
        folder: folderUrl,
        status: "Connected",
        lastSync: new Date().toISOString(),
        provider: selectedProvider,
        accountType,
      };

      const res = await api.post("/api/connections/save-default", payload);
      setSavedConnections((prev) => [
        ...prev,
        { ...payload, _id: res.data?._id || Date.now().toString() },
      ]);
      toast.success(`✅ Folder "${folderName}" saved!`);
    } catch (err) {
      console.error("Save folder error:", err);
      toast.error("❌ Failed to save folder.");
    }
  };

  const clearConnections = async () => {
    try {
      await api.delete(`/api/connections/clear?userId=${username}`);
      setSavedConnections([]);
      toast.success("🗑️ Cleared all saved connections!");
    } catch (err) {
      toast.error("❌ Failed to clear connections.");
    }
  };

  const handleBackButton = () => {
    setSelectedProvider(null);
    setMode(null);
    setRepos([]);
    setFolders([]);
    setSelectedRepo("");
    setSelectedFolder("");
    setTokenInput("");
    setOwner("");
    setGithubLogin(null); // ✅ reset on back
  };

  return (
    <div className="min-h-screen px-6 py-10 bg-[#0f172a] text-white relative overflow-hidden">
      <style>{`
        body {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          min-height: 100vh;
          margin: 0;
          overflow-x: hidden;
          transition: background 0.3s ease;
        }
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
        .red-orange-gradient-text {
          background: linear-gradient(to right, #ef4444, #f59e0b);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 600;
        }
      `}</style>

      <div className="dashboard-bg"></div>
      <div className="animated-gradient-bg"></div>

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
          border: 4px solid #cbd5e1;
          transition: opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1) 80ms,
            transform 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) 80ms;
        }
        .button:after {
          border: 4px solid #93c5fd;
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
          fill: none;
          stroke: #fff;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .button:hover .button-box,
        .button:focus .button-box {
          transition: 0.4s;
          transform: translateX(-56px);
        }
      `}</style>

      <div className="max-w-7xl mx-auto relative z-10">
        <h1 className="text-4xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            SCM Connector
          </span>
        </h1>

        {!selectedProvider && (
          <div className="mt-6">
            <div className="bg-[#1e293b]/80 backdrop-blur border border-blue-900/50 rounded-xl shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`cursor-pointer p-6 ${provider.bg} ${provider.hoverBg} rounded-xl shadow-lg text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                      provider.id === "github" ? `border-2 ${provider.color}` : ""
                    }`}
                  >
                    <div className="flex justify-center mb-3">{provider.icon}</div>
                    <h2 className={`text-xl font-semibold ${provider.textColor} mt-2`}>
                      {provider.name}
                    </h2>
                    <p className="text-sm text-blue-100 mt-1">Connect & manage repositories</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedProvider && (
          <>
            <div className="mb-4">
              <button
                onClick={handleBackButton}
                className="button"
                aria-label="Back to Providers"
              >
                <span className="button-box">
                  <svg className="button-elem" viewBox="0 0 24 24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-6 mt-6 mb-6">
              <button
                onClick={() => setMode("default")}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-md flex items-center gap-2"
              >
                <FaCloud /> CloudMaSa-Tech Account
              </button>
              <button
                onClick={() => setMode("own")}
                className="bg-[#1e293b] border border-gray-700 text-gray-200 px-6 py-3 rounded-md flex items-center gap-2 hover:bg-[#2d3748]"
              >
                <HiOutlineLockClosed /><span className="red-orange-gradient-text">Client Account</span>
              </button>
            </div>

            {mode && (
              <div className="mt-4 bg-[#1e293b]/80 backdrop-blur border border-blue-900/50 rounded-lg shadow-lg p-6">
                {mode === "default" && selectedProvider === "github" && (
                  <div className="mt-6">
                    <button
                      onClick={handleDefaultConnect}
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-md flex items-center gap-2"
                    >
                      <FaGithub /> Fetch Repositories
                    </button>
                  </div>
                )}

                {mode === "own" && (
                  <form onSubmit={handleOwnConnect} className="space-y-4 mt-6">
                    <div>
                      <label className="block text-gray-200 mb-1">{providerConfig.tokenLabel}</label>
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder={`Enter your ${providerConfig.name} token`}
                        className="w-full p-2 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-[#0f172a] text-white"
                      />
                    </div>
                    {selectedProvider === "github" && githubLogin && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-green-400 text-sm font-medium">✅ Connected as</span>
                      <span className="bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white text-sm font-bold px-2 py-1 rounded">
                        @{githubLogin}
                      </span>
                    </div>
                  )}
                    <div className="flex items-center gap-4">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-md flex items-center gap-2"
                      >
                        {providerConfig.icon} Connect
                      </button>
                    </div>
                  </form>
                )}

                {repos.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-gray-200 mb-2">Select Repository</label>
                    <select
                      onChange={(e) => fetchFolders(e.target.value)}
                      value={selectedRepo}
                      className="w-full p-2 border border-gray-600 bg-[#0f172a] text-white rounded-md"
                    >
                      <option value="">-- Select Repository --</option>
                      {repos.map((repo, idx) => (
                        <option key={idx} value={repo.fullName}>
                          {repo.fullName}
                        </option>
                      ))}
                    </select>

                    {selectedRepo && !selectedFolder && (
                      <div className="mt-3">
                        <button
                          onClick={saveRepoAndAllFolders}
                          className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                        >
                          <FaSave /> Save Repository Only
                        </button>
                      </div>
                    )}

                    {folders.length > 0 && (
                      <div className="mt-4">
                        <label className="block text-gray-200 mb-2">Select Folder</label>
                        <select
                          onChange={(e) => setSelectedFolder(e.target.value)}
                          value={selectedFolder}
                          className="w-full p-2 border border-gray-600 bg-[#0f172a] text-white rounded-md"
                        >
                          <option value="">-- Select Folder --</option>
                          {folders.map((f, idx) => (
                            <option key={idx} value={f.path}>
                              {f.name}
                            </option>
                          ))}
                        </select>

                        {loadingFolders && (
                          <div className="mt-4 text-orange-400">🔍 Loading folders...</div>
                        )}

                        {selectedRepo && selectedFolder && (
                          <div className="mt-4">
                            <button
                              onClick={saveFolderOnly}
                              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white px-6 py-3 rounded-md flex items-center gap-2 w-full"
                            >
                              <FaSave /> Save Folder
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Live Repository Preview */}
            <div className="bg-[#1e293b]/80 backdrop-blur border border-gray-700 rounded-lg shadow mt-8">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-2xl font-bold"><span className="red-orange-gradient-text">Live Repository Preview</span></h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    <tr>
                      <th className="p-3">Repository</th>
                      <th className="p-3">Folder Path</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Last Sync</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRepo && selectedFolder ? (
                      <tr className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="p-3">{selectedRepo}</td>
                        <td className="p-3 text-green-400">{selectedFolder}</td>
                        <td className="p-3">
                          <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                            Connected
                          </span>
                        </td>
                        <td className="p-3">{new Date().toLocaleString()}</td>
                        <td className="p-3">
                          <a
                            href={`${providerConfig.baseUrl}/${selectedRepo}/tree/main/${encodeURIComponent(selectedFolder)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-gray-500 italic">
                          Select a repository and folder to see live preview.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Saved Connections */}
            <div className="bg-[#1e293b]/80 backdrop-blur border border-gray-700 rounded-lg shadow mt-8">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold"><span className="red-orange-gradient-text">Saved Connections</span></h2>
                {savedConnections.length > 0 && (
                  <button
                    onClick={clearConnections}
                    className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-2"
                  >
                    <FaTrash /> Clear
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    <tr>
                      <th className="p-3">Connection Name</th>
                      <th className="p-3">Repository</th>
                      <th className="p-3">Account Type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Last Sync</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedConnections.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-gray-500 italic">
                          No saved connections yet.
                        </td>
                      </tr>
                    ) : (
                      savedConnections.map((conn) => (
                        <tr
                          key={`${conn._id}-${conn.name}`}
                          className="border-b border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="p-3">{conn.name}</td>
                          <td className="p-3">{conn.repo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                conn.accountType === "CloudMasa Tech"
                                  ? "bg-blue-900/50 text-blue-300"
                                  : "bg-orange-900/50 text-orange-300 red-orange-gradient-text"
                              }`}
                            >
                              {conn.accountType}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                              {conn.status}
                            </span>
                          </td>
                          <td className="p-3">{new Date(conn.lastSync).toLocaleString()}</td>
                          <td className="p-3">
                            {conn.folder ? (
                              <a
                                href={conn.folder}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                              >
                                Open
                              </a>
                            ) : (
                              <span className="text-gray-500 italic">No folder</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default SCMConnector;
