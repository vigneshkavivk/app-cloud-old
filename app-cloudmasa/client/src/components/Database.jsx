"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  List,
  Server,
  Database,
  Terminal,
  Cog,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  LinkIcon,
} from "lucide-react";

// Official logos — trailing spaces removed
const databases = [
  {
    name: "DocDB",
    logoUrl: "https://icon.icepanel.io/AWS/svg/Database/DocumentDB.svg",
    fallbackLogo: "",
    description: "AWS DocumentDB - MongoDB-compatible NoSQL database",
  },
  {
    name: "MySQL",
    logoUrl: "https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original-wordmark.svg",
    fallbackLogo: "🐬",
    description: "MySQL - Open-source relational database",
  },
  {
    name: "PostgreSQL",
    logoUrl: "https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original-wordmark.svg",
    fallbackLogo: "🐘",
    description: "PostgreSQL - Advanced open-source object-relational database",
  },
  {
    name: "InfluxDB",
    logoUrl: "https://raw.githubusercontent.com/devicons/devicon/master/icons/influxdb/influxdb-original.svg",
    fallbackLogo: "📊",
    description: "InfluxDB - Time series database for metrics and events",
  },
  {
    name: "VictoriaMetrics",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/VictoriaMetrics_logo.svg/330px-VictoriaMetrics_logo.svg.png",
    fallbackLogo: "📈",
    description: "VictoriaMetrics - Fast, cost-effective time-series database",
  },
  {
    name: "Couchbase",
    logoUrl: "https://cdn.worldvectorlogo.com/logos/couchbase.svg",
    fallbackLogo: "🛋️",
    description: "Couchbase - Distributed NoSQL cloud database",
  },
  {
    name: "MariaDB",
    logoUrl: "https://cdn.brandfetch.io/idxldSTiIy/theme/light/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1668081833091",
    fallbackLogo: "🦭",
    description: "MariaDB - Community-developed fork of MySQL",
  },
  {
    name: "Liquibase",
    logoUrl: "https://cdn.brandfetch.io/idhG2IokEH/theme/light/logo.svg?c=1bxid64Mup7aczewSAYMX&t=1757732366610",
    fallbackLogo: "💧",
    description: "Liquibase - Open-source database schema change management",
  },
];

const clusters = [
  { id: 1, name: "prod-cluster-us-east", status: "Active" },
  { id: 2, name: "dev-cluster-eu-west", status: "Active" },
  { id: 3, name: "staging-cluster-ap-south", status: "Maintenance" },
];

const DatabaseCards = () => {
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(null);
  const [awsAccounts, setAwsAccounts] = useState([]);
  const [selectedAwsAccount, setSelectedAwsAccount] = useState(null);
  const [deploymentType, setDeploymentType] = useState(null);
  const [existingDbs, setExistingDbs] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");
  const [finalOutput, setFinalOutput] = useState("");
  const [formData, setFormData] = useState({});
  const [tfvarsSchema, setTfvarsSchema] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [imageErrors, setImageErrors] = useState(new Set());

  // === PERSISTENT STATE: synced with backend ===
  const [createdDatabases, setCreatedDatabases] = useState([]);
  const [deletedDatabases, setDeletedDatabases] = useState([]);
  const [viewingDb, setViewingDb] = useState(null);

  // Load from backend on mount (with localStorage fallback)
  useEffect(() => {
    const loadActivity = async () => {
      try {
        const res = await fetch("/api/database/activity");
        if (res.ok) {
          const activities = await res.json();
          const created = activities.filter(a => a.action === 'create');
          const destroyed = activities.filter(a => a.action === 'destroy');
          setCreatedDatabases(created);
          setDeletedDatabases(destroyed);
          // Cache in localStorage
          localStorage.setItem("createdDatabases", JSON.stringify(created));
          localStorage.setItem("deletedDatabases", JSON.stringify(destroyed));
        } else {
          throw new Error("Backend returned non-OK status");
        }
      } catch (err) {
        console.warn("Failed to load from backend, falling back to localStorage");
        const savedCreated = localStorage.getItem("createdDatabases");
        const savedDeleted = localStorage.getItem("deletedDatabases");
        if (savedCreated) {
          try {
            setCreatedDatabases(JSON.parse(savedCreated));
          } catch (e) {
            console.error("Failed to parse createdDatabases from localStorage");
          }
        }
        if (savedDeleted) {
          try {
            setDeletedDatabases(JSON.parse(savedDeleted));
          } catch (e) {
            console.error("Failed to parse deletedDatabases from localStorage");
          }
        }
      }
    };

    loadActivity();
  }, []);

  // Track deployment state per DB index (including in-progress)
  const [deploymentHistory, setDeploymentHistory] = useState({});

  // Fetch AWS accounts
  const fetchAwsAccounts = async () => {
    try {
      const res = await fetch("/api/aws/get-aws-accounts");
      if (!res.ok) throw new Error("Failed to load AWS accounts");
      const data = await res.json();
      setAwsAccounts(data);
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to load AWS accounts.");
    }
  };

  // Fetch Terraform variable schema
  const fetchTfvarsSchema = async () => {
    setLoadingSchema(true);
    try {
      const dbType = databases[selected].name.toLowerCase();
      const res = await fetch(`/api/database/tfvars-schema?dbType=${dbType}`);
      if (!res.ok) throw new Error("Failed to load config schema");
      const data = await res.json();
      setTfvarsSchema(data);
      const initial = {};
      data.forEach((varDef) => {
        initial[varDef.name] = varDef.default !== undefined ? String(varDef.default) : "";
      });
      setFormData(initial);
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to load Terraform configuration.");
    } finally {
      setLoadingSchema(false);
    }
  };

  // Fetch existing databases
  const fetchExistingDbs = async () => {
    if (!selectedAwsAccount) return;
    setLoadingExisting(true);
    try {
      const dbType = databases[selected].name.toLowerCase();
      const res = await fetch(`/api/database/existing?dbType=${dbType}&awsAccountId=${selectedAwsAccount._id}`);
      if (!res.ok) throw new Error("Failed to load existing DBs");
      const data = await res.json();
      setExistingDbs(data || []);
      setStep("existing-dbs");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to load existing databases.");
    } finally {
      setLoadingExisting(false);
    }
  };

  // Reconnect to ongoing deployment stream
  const reconnectToStream = async (index) => {
    const history = deploymentHistory[index];
    if (!history || !history.isDeploying) return;

    setIsDeploying(true);
    try {
      const dbType = databases[index].name.toLowerCase();
      const payload = {
        dbType,
        awsAccountId: history.awsAccountId,
        actionType: history.actionType || "create",
        variables: history.variables || {},
      };

      const res = await fetch("/api/database/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) throw new Error("Failed to reconnect to deployment");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          try {
            const jsonData = JSON.parse(line);
            if (jsonData.message) setStatus(jsonData.message);
            if (jsonData.output) {
              setLogs((prev) => [...prev, jsonData.output]);
              const match = jsonData.output.match(/endpoint\s*=\s*"([^"]+)"/);
              if (match && !finalOutput) setFinalOutput(match[1]);
            }
            if (jsonData.status === "success" || jsonData.status === "failed") {
              setDeploymentHistory((prev) => ({
                ...prev,
                [index]: {
                  ...prev[index],
                  isDeploying: false,
                  status: jsonData.status === "success" ? "✅ Success" : "❌ Failed",
                },
              }));
              setIsDeploying(false);
            }
            continue;
          } catch (e) {
            // Not JSON — treat as raw log
          }
          setLogs((prev) => [...prev, line.trim()]);
        }
      }
    } catch (err) {
      console.error("Reconnect failed:", err);
      setLogs((prev) => [...prev, `❌ Reconnect error: ${err.message}`]);
      setIsDeploying(false);
    }
  };

  // Start real Terraform deployment
  const startTerraformDeployment = async (action) => {
    if (!selectedAwsAccount) return;

    if (selected !== null) {
      setDeploymentHistory((prev) => ({
        ...prev,
        [selected]: {
          ...(prev[selected] || {}),
          isDeploying: true,
          awsAccountId: selectedAwsAccount._id,
          actionType: action,
          variables: action === "create" ? formData : {},
        },
      }));
    }

    setIsDeploying(true);
    setLogs([]);
    setFinalOutput("");
    setStatus(`🚀 Initializing Terraform for ${databases[selected].name}...`);

    try {
      const dbType = databases[selected].name.toLowerCase();
      const payload = {
        dbType,
        awsAccountId: selectedAwsAccount._id,
        actionType: action,
        variables: action === "create" ? formData : {},
      };

      const res = await fetch("/api/database/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) throw new Error("Deployment failed to start");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          try {
            const jsonData = JSON.parse(line);
            if (jsonData.message) setStatus(jsonData.message);
            if (jsonData.output) {
              setLogs((prev) => [...prev, jsonData.output]);
              const match = jsonData.output.match(/endpoint\s*=\s*"([^"]+)"/);
              if (match && !finalOutput) setFinalOutput(match[1]);
            }
            if (jsonData.status === "success") {
              finished = true;

              // === LOG TO BACKEND ===
              const logPayload = {
                action,
                dbType: databases[selected].name,
                awsAccountId: selectedAwsAccount._id,
                awsAccountName: selectedAwsAccount.accountName || selectedAwsAccount.accountId,
              };

              if (action === "create") {
                logPayload.endpoint = finalOutput;
              }

              try {
                await fetch("/api/database/log-activity", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(logPayload),
                });

                // Refetch full activity to stay in sync
                const activityRes = await fetch("/api/database/activity");
                if (activityRes.ok) {
                  const allActivities = await activityRes.json();
                  const created = allActivities.filter(a => a.action === 'create');
                  const destroyed = allActivities.filter(a => a.action === 'destroy');
                  setCreatedDatabases(created);
                  setDeletedDatabases(destroyed);
                  localStorage.setItem("createdDatabases", JSON.stringify(created));
                  localStorage.setItem("deletedDatabases", JSON.stringify(destroyed));
                }
              } catch (logErr) {
                console.error("Failed to log activity:", logErr);
                // Fallback: update UI locally
                if (action === "create") {
                  setCreatedDatabases(prev => [...prev, { ...logPayload, id: Date.now(), createdAt: new Date().toISOString() }]);
                } else {
                  setDeletedDatabases(prev => [...prev, { ...logPayload, id: Date.now(), createdAt: new Date().toISOString() }]);
                }
              }

              setDeploymentHistory((prev) => ({
                ...prev,
                [selected]: {
                  ...prev[selected],
                  isDeploying: false,
                  status: "✅ Success",
                },
              }));
            } else if (jsonData.status === "failed") {
              finished = true;
              setDeploymentHistory((prev) => ({
                ...prev,
                [selected]: {
                  ...prev[selected],
                  isDeploying: false,
                  status: "❌ Failed",
                },
              }));
            }
            continue;
          } catch (e) {
            // Not JSON — treat as raw log
          }
          setLogs((prev) => [...prev, line.trim()]);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus(`❌ Deployment error: ${err.message}`);
      setLogs((prev) => [...prev, `❌ ERROR: ${err.message}`]);
    } finally {
      setIsDeploying(false);
      if (selected !== null) {
        setDeploymentHistory((prev) => ({
          ...prev,
          [selected]: {
            ...prev[selected],
            isDeploying: false,
          },
        }));
      }
    }
  };

  const handleImageError = (index) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  const openDatabase = (index) => {
    const history = deploymentHistory[index];
    if (history) {
      setSelected(index);
      setLogs(history.logs || []);
      setFinalOutput(history.finalOutput || "");
      setStatus(history.status || "");
      setSelectedAwsAccount(awsAccounts.find((acc) => acc._id === history.awsAccountId) || null);

      if (history.isDeploying) {
        setStep("deploying");
        reconnectToStream(index);
      } else {
        setStep("deploying");
      }
    } else {
      setSelected(index);
      setStep("aws-account");
      fetchAwsAccounts();
    }
  };

  const resetModal = () => {
    setSelected(null);
    setStep(null);
    setAwsAccounts([]);
    setSelectedAwsAccount(null);
    setDeploymentType(null);
    setExistingDbs([]);
    setIsDeploying(false);
    setLogs([]);
    setStatus("");
    setFinalOutput("");
    setFormData({});
    setTfvarsSchema([]);
    setLoadingSchema(false);
    setLoadingExisting(false);
    setViewingDb(null);
  };

  const startNewDeployment = () => {
    if (selected !== null) {
      setDeploymentHistory((prev) => {
        const updated = { ...prev };
        delete updated[selected];
        return updated;
      });
    }
    setStep("aws-account");
    fetchAwsAccounts();
  };

  // Handle click on a created DB card
  const openCreatedDb = (db) => {
    setViewingDb(db);
  };

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && resetModal();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center justify-start p-6 pt-8">
      {/* === HEADER === */}
      <div className="text-center mb-10 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2 mt-4 tracking-tight">
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Database Infrastructure
          </span>
        </h1>
        <p className="text-sm text-slate-400 font-light">
          Deploy and manage enterprise-grade databases with precision
        </p>
      </div>

      {/* === DATABASE CARDS GRID (TOP SECTION) === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-7xl mb-12">
        {databases.map((db, index) => (
          <div
            key={index}
            onClick={() => openDatabase(index)}
            className="group cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openDatabase(index)}
          >
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:scale-105 hover:bg-slate-800/80">
              <div className="w-24 h-24 mb-6 flex items-center justify-center bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl group-hover:scale-110 transition-transform duration-300 border border-slate-600/30">
                {!imageErrors.has(index) ? (
                  <img
                    src={db.logoUrl}
                    alt={`${db.name} logo`}
                    className="w-20 h-20 object-contain"
                    onError={() => handleImageError(index)}
                  />
                ) : (
                  <span className="text-4xl">{db.fallbackLogo}</span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">{db.name}</h2>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                {db.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* === CREATED DATABASES SECTION (BOTTOM) === */}
      {createdDatabases.length > 0 && (
        <div className="w-full max-w-7xl mt-6 mb-10">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-400 w-6 h-6" />
            Created Databases
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {createdDatabases.map((db) => (
              <div
                key={db._id || db.id}
                onClick={() => openCreatedDb(db)}
                className="group cursor-pointer bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-green-500 transition-all duration-300 hover:shadow-lg hover:bg-slate-800/80"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{db.dbType || db.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(db.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{db.awsAccountName}</p>
                  </div>
                  <LinkIcon className="w-4 h-4 text-slate-500 group-hover:text-green-400" />
                </div>
                {db.endpoint && (
                  <div className="mt-2 text-xs text-cyan-400 break-all font-mono bg-slate-900/50 p-2 rounded">
                    {db.endpoint}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === DELETED DATABASES SECTION (BOTTOM) === */}
      {deletedDatabases.length > 0 && (
        <div className="w-full max-w-7xl mt-6 mb-10">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Trash2 className="text-red-400 w-6 h-6" />
            Deleted Databases
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deletedDatabases.map((db) => (
              <div
                key={db._id || db.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 opacity-80"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{db.dbType || db.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(db.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">{db.awsAccountName}</p>
                  </div>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === MODAL FOR DEPLOYMENT FLOW === */}
      {selected !== null && step !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-10 relative border border-slate-700/50 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={resetModal}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-start gap-6 mb-8">
              <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl border border-slate-600/30">
                {!imageErrors.has(selected) ? (
                  <img
                    src={databases[selected].logoUrl}
                    alt={`${databases[selected].name} logo`}
                    className="w-20 h-20 object-contain"
                    onError={() => handleImageError(selected)}
                  />
                ) : (
                  <span className="text-6xl">{databases[selected].fallbackLogo}</span>
                )}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-white mb-2">{databases[selected].name}</h3>
                <p className="text-slate-400 text-base leading-relaxed">{databases[selected].description}</p>
              </div>
            </div>

            {/* All your existing step logic remains unchanged */}
            {step === "aws-account" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">Select AWS Account</h4>
                {awsAccounts.length === 0 ? (
                  <p className="text-slate-400">Loading AWS accounts...</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {awsAccounts.map((account) => (
                      <button
                        key={account._id}
                        onClick={() => {
                          setSelectedAwsAccount(account);
                          setStep("new-or-existing");
                        }}
                        className={`w-full p-3 rounded-lg text-left border transition-colors ${
                          selectedAwsAccount?._id === account._id
                            ? "border-blue-500 bg-slate-700/50"
                            : "border-slate-600 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Server className="mr-2 w-4 h-4" />
                            {account.accountName || account.accountId}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                            {account.awsRegion || "Unknown"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={resetModal}
                  className="mt-4 w-full px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            )}

            {step === "new-or-existing" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">How do you want to proceed?</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setDeploymentType("new");
                      setStep("deploy-method");
                      if (selected !== null) {
                        setDeploymentHistory((prev) => {
                          const updated = { ...prev };
                          delete updated[selected];
                          return updated;
                        });
                      }
                    }}
                    className="px-4 py-3 bg-green-600 rounded-lg font-medium text-white hover:bg-green-700 transition flex items-center justify-center"
                  >
                    <Plus className="mr-2 w-4 h-4" />
                    New
                  </button>
                  <button
                    onClick={() => {
                      setDeploymentType("existing");
                      fetchExistingDbs();
                    }}
                    className="px-4 py-3 bg-blue-600 rounded-lg font-medium text-white hover:bg-blue-700 transition flex items-center justify-center"
                  >
                    <List className="mr-2 w-4 h-4" />
                    Existing
                  </button>
                </div>
                <button
                  onClick={() => setStep("aws-account")}
                  className="w-full mt-2 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                >
                  Back
                </button>
              </div>
            )}

            {step === "existing-dbs" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">
                  Existing {databases[selected].name} Instances
                </h4>
                {loadingExisting ? (
                  <p className="text-slate-400">Loading...</p>
                ) : existingDbs.length === 0 ? (
                  <p className="text-yellow-400">No existing instances found.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {existingDbs.map((db, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-600 text-slate-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            <Database className="mr-2 w-4 h-4" />
                            {db.name || db.db_instance_identifier}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                            {db.status || "Available"}
                          </span>
                        </div>
                        <div className="mt-2 text-sm">
                          <code className="break-all block text-cyan-400">{db.endpoint}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setStep("new-or-existing")}
                  className="w-full mt-2 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                >
                  Back
                </button>
              </div>
            )}

            {step === "deploy-method" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">How do you want to deploy?</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setStep("terraform-action")}
                    className="px-4 py-3 bg-blue-600 rounded-lg font-medium text-white hover:bg-blue-700 transition flex items-center justify-center"
                  >
                    <Cog className="mr-2 w-4 h-4" />
                    Terraform (IaC)
                  </button>
                  <button
                    onClick={() => setStep("helm-cluster")}
                    className="px-4 py-3 bg-purple-600 rounded-lg font-medium text-white hover:bg-purple-700 transition flex items-center justify-center"
                  >
                    <Database className="mr-2 w-4 h-4" />
                    Database at K8s
                  </button>
                </div>
                <button
                  onClick={() => setStep("new-or-existing")}
                  className="w-full mt-2 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                >
                  Back
                </button>
              </div>
            )}

            {step === "helm-cluster" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">Choose Target Cluster</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {clusters.map((cluster) => (
                    <button
                      key={cluster.id}
                      onClick={() => {
                        alert(`Helm deployment to ${cluster.name} not implemented yet.`);
                        resetModal();
                      }}
                      className={`w-full p-3 rounded-lg text-left border transition-colors ${
                        cluster.status === "Active"
                          ? "border-green-500 hover:bg-green-900/30 text-green-300"
                          : "border-yellow-500 hover:bg-yellow-900/30 text-yellow-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Server className="mr-2 w-4 h-4" />
                          {cluster.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            cluster.status === "Active"
                              ? "bg-green-800/30 text-green-300"
                              : "bg-yellow-800/30 text-yellow-300"
                          }`}
                        >
                          {cluster.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setStep("deploy-method")}
                  className="mt-4 w-full px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                >
                  Back
                </button>
              </div>
            )}

            {step === "terraform-action" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">What do you want to do?</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to CREATE this database?")) {
                        setStep("terraform-form");
                        fetchTfvarsSchema();
                        if (selected !== null) {
                          setDeploymentHistory((prev) => {
                            const updated = { ...prev };
                            delete updated[selected];
                            return updated;
                          });
                        }
                      }
                    }}
                    className="px-4 py-2 bg-green-600 rounded-lg font-medium text-white hover:bg-green-700 transition flex items-center justify-center"
                  >
                    🚀 Create
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "⚠️ Are you sure you want to DESTROY this database? This cannot be undone."
                        )
                      ) {
                        startTerraformDeployment("destroy");
                        setStep("deploying");
                      }
                    }}
                    className="px-4 py-2 bg-red-600 rounded-lg font-medium text-white hover:bg-red-700 transition flex items-center justify-center"
                  >
                    🗑️ Destroy
                  </button>
                </div>
                <button
                  onClick={() => setStep("deploy-method")}
                  className="mt-4 w-full px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                >
                  Back
                </button>
              </div>
            )}

            {step === "terraform-form" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">
                  Configure {databases[selected].name}
                </h4>
                {loadingSchema ? (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                    <p className="text-slate-400">Loading configuration...</p>
                  </div>
                ) : tfvarsSchema.length === 0 ? (
                  <p className="text-yellow-400">No configurable parameters found.</p>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {tfvarsSchema.map((varDef, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                        <label className="block text-sm font-medium text-slate-200 mb-1">
                          {varDef.name}
                        </label>
                        {varDef.description && (
                          <p className="text-xs text-slate-400 mb-2">{varDef.description}</p>
                        )}
                        <input
                          type="text"
                          value={formData[varDef.name] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, [varDef.name]: e.target.value }))
                          }
                          className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Default: ${varDef.default ?? "None"}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => setStep("terraform-action")}
                    className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      startTerraformDeployment("create");
                      setStep("deploying");
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 rounded-lg font-medium text-white hover:bg-green-700 transition"
                  >
                    Deploy
                  </button>
                </div>
              </div>
            )}

            {step === "deploying" && (
              <div className="space-y-4">
                <div className="flex items-center text-lg font-medium text-blue-400">
                  <Terminal className="mr-2 w-5 h-5" />
                  Deployment Logs
                </div>
                <div className="p-3 bg-slate-900 text-green-400 rounded text-sm font-mono max-h-60 overflow-auto border border-slate-700">
                  {logs.length > 0 ? logs.map((log, i) => <div key={i}>{log}</div>) : "Initializing..."}
                </div>

                {finalOutput && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-500 rounded text-green-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="text-green-400 w-5 h-5" />
                      <strong>✅ Database Ready!</strong>
                    </div>
                    <div className="mt-2">
                      <code className="text-sm break-all block">{finalOutput}</code>
                    </div>
                  </div>
                )}

                {status && (
                  <p className="text-center font-medium">
                    {status.includes("❌") ? (
                      <span className="text-red-400 flex items-center justify-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {status}
                      </span>
                    ) : (
                      <span className="text-yellow-400">{status}</span>
                    )}
                  </p>
                )}

                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => {
                      if (selected !== null) {
                        setDeploymentHistory((prev) => {
                          const updated = { ...prev };
                          delete updated[selected];
                          return updated;
                        });
                      }
                      startNewDeployment();
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                  >
                    New Deployment
                  </button>
                  <button
                    onClick={resetModal}
                    className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === MODAL FOR VIEWING CREATED DB DETAILS === */}
      {viewingDb && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-md w-full p-8 relative border border-slate-700/50 shadow-2xl">
            <button
              onClick={() => setViewingDb(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-green-900/20 rounded-full border border-green-500/30">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{viewingDb.dbType || viewingDb.name}</h3>
              <p className="text-slate-400 text-sm">
                Created on {new Date(viewingDb.createdAt).toLocaleString()}
              </p>
              <p className="text-slate-500 text-sm mb-4">{viewingDb.awsAccountName}</p>

              {viewingDb.endpoint && (
                <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-cyan-500/30">
                  <p className="text-cyan-400 text-sm font-mono break-all">{viewingDb.endpoint}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setViewingDb(null)}
              className="mt-6 w-full px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseCards;
