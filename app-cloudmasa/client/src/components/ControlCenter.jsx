import { useState, useEffect } from "react";
import axios from "axios"; // Import Axios for making HTTP requests
import api from "../interceptor/api.interceptor";



const ControlCenter = () => {
  const [version, setVersion] = useState("latest");
  const [repo, setRepo] = useState("repo1");
  const [repos, setRepos] = useState([]); // State to store repositories
  const [actions, setActions] = useState({
    init: false,
    plan: false,
    apply: false,
  });
  const [loading, setLoading] = useState(false); // To show loading state
  const [error, setError] = useState(""); // To show error messages
  const {repo:gitRepos} = useGitRepoContext();
  const currentVersion = "1.10.4"; // Static Current Version


  useEffect(()=>{
    setRepos(gitRepos);
  },[gitRepos])

  const handleRun = async () => {
    setLoading(true);
    setError(""); // Clear previous error
    try {
      const response = await api.post("/run-terraform", {
        actions,
      });
      // const response = await axios.post("http://localhost:3000/run-terraform", {
      //   actions,
      // });
      console.log("Terraform commands executed successfully:", response.data);
    } catch (err) {
      console.error("Error executing Terraform commands:", err);
      setError("Failed to execute Terraform commands. Please check the console.");
    } finally {
      setLoading(false); // Stop loading after the request completes
    }
  };

  const handleActionChange = (e) => {
    const { name, checked } = e.target;

    setActions((prevActions) => ({
      ...prevActions,
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
          {loading ? (
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
                  <option key={repoItem.id} value={repoItem.name}>
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
              Terraform Inits
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

        {error && <p style={{ color: "red" }}>{error}</p>} {/* Error message */}

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
          }}
          disabled={loading} // Disable while loading
        >
          {loading ? "Running..." : "Run"} {/* Display loading state */}
        </button>
      </div>
    </div>
  );
};

export default ControlCenter;

