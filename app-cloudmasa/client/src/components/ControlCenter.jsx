// src/components/ControlCenter.jsx
import { useState, useEffect } from "react";
import api from "../interceptor/api.interceptor";
import { useAuth } from "../hooks/useAuth"; // ✅ RBAC hook
import { Lock } from "lucide-react";

// 👇 Only import context if you use it — safely guarded below
let useGitRepoContext;
try {
  // eslint-disable-next-line import/no-unresolved
  useGitRepoContext = require("../context/GitRepoContext").useGitRepoContext;
} catch {
  useGitRepoContext = null;
}

const ControlCenter = () => {
  const { hasPermission } = useAuth();
  const canRunTerraform = hasPermission('Job', 'Create');

  // 🔒 Block access if user lacks permission
  if (!canRunTerraform) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f7fafc",
          padding: "16px",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            padding: "20px",
            backgroundColor: "white",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <Lock size={48} className="text-red-500 mx-auto mb-4" />
          <h3 style={{ color: "#e53e3e", marginBottom: "8px" }}>Access Denied</h3>
          <p>
            You need <span style={{ fontFamily: "monospace" }}>Job.Create</span> permission to run Terraform.
          </p>
        </div>
      </div>
    );
  }

  const [version, setVersion] = useState("latest");
  const [repo, setRepo] = useState("repo1");
  const [repos, setRepos] = useState([]);
  const [actions, setActions] = useState({
    init: false,
    plan: false,
    apply: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currentVersion = "1.10.4";

  // 👇 Try to use context if available
  const hasContext = useGitRepoContext !== null;
  const gitContext = hasContext ? useGitRepoContext() : null;

  useEffect(() => {
    if (hasContext && gitContext?.repo) {
      setRepos(gitContext.repo);
      if (gitContext.repo.length > 0) {
        setRepo(gitContext.repo[0].name);
      }
    } else {
      // 👇 Fallback to API fetch
      const fetchRepos = async () => {
        try {
          const res = await api.get('/api/github/repos');
          const repoList = Array.isArray(res.data) ? res.data : [];
          setRepos(repoList);
          if (repoList.length > 0) {
            setRepo(repoList[0].name);
          }
        } catch (err) {
          console.error('Failed to fetch repos:', err);
        }
      };
      fetchRepos();
    }
  }, [hasContext, gitContext?.repo]);

  const handleRun = async () => {
    if (!actions.init && !actions.plan && !actions.apply) {
      setError("Please select at least one action.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/run-terraform", { actions, repo });
      console.log("Terraform commands executed:", response.data);
    } catch (err) {
      console.error("Error executing Terraform:", err);
      setError("Failed to run Terraform. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleActionChange = (e) => {
    const { name, checked } = e.target;
    setActions((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f7fafc",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "20px",
          backgroundColor: "white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          borderRadius: "10px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ marginBottom: "8px" }}>
            Terraform Default Version <strong>1.10.3</strong>
          </h3>
          <div
            style={{
              padding: "8px",
              backgroundColor: "#edf2f7",
              borderRadius: "4px",
              marginBottom: "8px",
            }}
          >
            <strong>Current Version: </strong>
            <strong>{currentVersion}</strong>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>
            Source GitHub Repo
          </label>
          {repos.length === 0 && loading ? (
            <p>Loading repositories...</p>
          ) : (
            <select
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            >
              {repos.length > 0 ? (
                repos.map((repoItem) => (
                  <option key={repoItem.id || repoItem.name} value={repoItem.name}>
                    {repoItem.name}
                  </option>
                ))
              ) : (
                <option value="">No repositories available</option>
              )}
            </select>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>
            Terraform Actions
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label>
              <input
                type="checkbox"
                name="init"
                checked={actions.init}
                onChange={handleActionChange}
              />
              Terraform Init
            </label>
            <label>
              <input
                type="checkbox"
                name="plan"
                checked={actions.plan}
                disabled={!actions.init}
                onChange={handleActionChange}
              />
              Terraform Plan
            </label>
            <label>
              <input
                type="checkbox"
                name="apply"
                checked={actions.apply}
                disabled={!actions.plan}
                onChange={handleActionChange}
              />
              Terraform Apply
            </label>
          </div>
        </div>

        {error && <p style={{ color: "red", marginTop: "12px" }}>{error}</p>}

        <button
          onClick={handleRun}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#3182ce",
            color: "white",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
        >
          {loading ? "Running..." : "Run Terraform"}
        </button>
      </div>
    </div>
  );
};

export default ControlCenter;