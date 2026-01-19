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
  Lock,
  Copy,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

// === LOCAL IMAGE IMPORTS FOR src/assets ===
import docDBLogo from '../assets/DocumentDB.svg';
import mysqlLogo from '../assets/mysql.svg';
import postgresqlLogo from '../assets/postgresql.svg';
import influxdbLogo from '../assets/influxDB.jpeg';
import victoriaMetricsLogo from '../assets/VictoriaMetrics.png';
import couchbaseLogo from '../assets/couchbase.png';
import mariadbLogo from '../assets/mariadb.png';
import liquibaseLogo from '../assets/liquibase.svg';

const databases = [
  {
    name: "docDB",
    logoUrl: docDBLogo,
    fallbackLogo: "",
    description: "AWS DocumentDB - MongoDB-compatible NoSQL database",
  },
  {
    name: "MySQL",
    logoUrl: mysqlLogo,
    fallbackLogo: "🐬",
    description: "MySQL - Open-source relational database",
  },
  {
    name: "PostgreSQL",
    logoUrl: postgresqlLogo,
    fallbackLogo: "🐘",
    description: "PostgreSQL - Advanced open-source object-relational database",
  },
  {
    name: "InfluxDB",
    logoUrl: influxdbLogo,
    fallbackLogo: "📊",
    description: "InfluxDB - Time series database for metrics and events",
  },
  {
    name: "VictoriaMetrics",
    logoUrl: victoriaMetricsLogo,
    fallbackLogo: "📈",
    description: "VictoriaMetrics - Fast, cost-effective time-series database",
  },
  {
    name: "Couchbase",
    logoUrl: couchbaseLogo,
    fallbackLogo: "🛋️",
    description: "Couchbase - Distributed NoSQL cloud database",
  },
  {
    name: "MariaDB",
    logoUrl: mariadbLogo,
    fallbackLogo: "🦭",
    description: "MariaDB - Community-developed fork of MySQL",
  },
  {
    name: "Liquibase",
    logoUrl: liquibaseLogo,
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
  const { hasPermission } = useAuth();
  const canDeploy = hasPermission('Job', 'Create');
  const canDestroy = hasPermission('Job', 'Delete');
  const canView = hasPermission('Job', 'Read') || hasPermission('Job', 'Discover');

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 text-white">
        <div className="text-center p-8 max-w-md">
          <Lock className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Job.Read</span> permission to view databases.
          </p>
        </div>
      </div>
    );
  }

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
  // ✅ NEW: State for custom form data (replaces tfvarsSchema)
  const [formData, setFormData] = useState({
    name: "",
    dbname: "",
    db_username: "",
    db_password: "",
    vpc_id: "",
    subnet_ids: [],
  });
  // ✅ NEW: States for VPC and Subnet selection
  const [vpcs, setVpcs] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [loadingVpcs, setLoadingVpcs] = useState(false);
  const [loadingSubnets, setLoadingSubnets] = useState(false);

  const [imageErrors, setImageErrors] = useState(new Set());

  // ✅ Updated: track selected created DB + action mode
  const [selectedCreatedDb, setSelectedCreatedDb] = useState(null);
  const [createdDatabases, setCreatedDatabases] = useState([]);
  const [deploymentHistory, setDeploymentHistory] = useState({});
  const [copiedField, setCopiedField] = useState('');
  const [destroyingDeploymentId, setDestroyingDeploymentId] = useState(null);

  // Load from backend on mount - REMOVED deletedDatabases loading
  useEffect(() => {
    const loadActivity = async () => {
      try {
        const res = await fetch("/api/database/activity");
        if (res.ok) {
          const activities = await res.json();
          // Only filter for 'create' actions
          const created = activities.filter(a => a.action === 'create');
          setCreatedDatabases(created);
          localStorage.setItem("createdDatabases", JSON.stringify(created));
        }
      } catch (err) {
        console.warn("Falling back to localStorage for created databases");
        const savedCreated = localStorage.getItem("createdDatabases");
        if (savedCreated) {
          try { setCreatedDatabases(JSON.parse(savedCreated)); } catch {}
        }
      }
    };
    loadActivity();
  }, []);

  // Fetch AWS accounts
  const fetchAwsAccounts = async () => {
    try {
      const res = await fetch("/api/aws/get-aws-accounts");
      if (!res.ok) throw new Error("Failed to load AWS accounts");
      const data = await res.json();
      setAwsAccounts(data);
    } catch (err) {
      setStatus("❌ Failed to load AWS accounts.");
    }
  };

  // ✅ NEW: Fetch VPCs for selected AWS account
  const fetchVpcs = async () => {
    if (!selectedAwsAccount) return;
    setLoadingVpcs(true);
    try {
      // ✅ Use your existing API endpoint for VPCs
      const res = await fetch(`/api/database/vpcs?awsAccountId=${selectedAwsAccount._id}`);
      if (!res.ok) throw new Error("Failed to fetch VPCs");
      const data = await res.json();
      // ✅ Process VPCs to include Name tag if available
      const vpcsWithNames = data.map(vpc => ({
        ...vpc,
        name: vpc.tags?.Name || vpc.id, // Prefer Name tag, fallback to ID
      }));
      setVpcs(vpcsWithNames);
      // Reset VPC/subnet selection when VPCs load
      setFormData(prev => ({ ...prev, vpc_id: "", subnet_ids: [] }));
      setSubnets([]);
    } catch (err) {
      setStatus(`❌ Failed to load VPCs: ${err.message}`);
    } finally {
      setLoadingVpcs(false);
    }
  };

  // ✅ NEW: Fetch subnets for selected VPC
  const fetchSubnets = async (vpcId) => {
    if (!vpcId || !selectedAwsAccount) return;
    setLoadingSubnets(true);
    try {
      // ✅ Use your existing API endpoint for subnets
      const res = await fetch(`/api/database/subnets?awsAccountId=${selectedAwsAccount._id}&vpcId=${vpcId}`);
      if (!res.ok) throw new Error("Failed to fetch subnets");
      const data = await res.json();
      // ✅ Process subnets to include Name tag if available
      const subnetsWithNames = data.map(subnet => ({
        ...subnet,
        name: subnet.tags?.Name || subnet.id, // Prefer Name tag, fallback to ID
      }));
      setSubnets(subnetsWithNames);
      // Reset subnet selection when subnets load
      setFormData(prev => ({ ...prev, subnet_ids: [] }));
    } catch (err) {
      setStatus(`❌ Failed to load subnets: ${err.message}`);
    } finally {
      setLoadingSubnets(false);
    }
  };

  // ✅ NEW: Handle VPC selection
  const handleVpcChange = (vpcId) => {
    const newVpcId = vpcId || "";
    setFormData(prev => ({ ...prev, vpc_id: newVpcId, subnet_ids: [] }));
    setSubnets([]);
    if (newVpcId) {
      fetchSubnets(newVpcId);
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
      if (!res.ok || !res.body) throw new Error("Failed to reconnect");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.trim() !== ""); // Fixed newline split
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
          } catch (e) {
            setLogs((prev) => [...prev, line.trim()]);
          }
        }
      }
    } catch (err) {
      setLogs((prev) => [...prev, `❌ Reconnect error: ${err.message}`]);
      setIsDeploying(false);
    }
  };

  // Start real Terraform deployment
  const startTerraformDeployment = async (action) => {
    if (!selectedAwsAccount || selected === null) return;
    if (action === "create" && !canDeploy) {
      alert("You don't have permission to deploy databases.");
      return;
    }
    if (action === "destroy" && !canDestroy) {
      alert("You don't have permission to destroy databases.");
      return;
    }

    // ✅ VALIDATE required fields for custom form
    const { name, dbname, db_username, db_password, vpc_id, subnet_ids } = formData;
    if (!name || !dbname || !db_username || !db_password || !vpc_id || subnet_ids.length === 0) {
      alert("⚠️ Please fill all required fields: name, dbname, username, password, VPC, and at least one subnet.");
      return;
    }

    setDeploymentHistory((prev) => ({
      ...prev,
      [selected]: {
        ...(prev[selected] || {}),
        isDeploying: true,
        awsAccountId: selectedAwsAccount._id,
        actionType: action,
        variables: action === "create" ? formData : {}, // ✅ Send only our custom form data
      },
    }));
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
        const lines = text.split("\n").filter((line) => line.trim() !== ""); // Fixed newline split
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
              const logPayload = {
                action,
                dbType: databases[selected].name,
                awsAccountId: selectedAwsAccount._id,
                awsAccountName: selectedAwsAccount.accountName || selectedAwsAccount.accountId,
              };
              if (action === "create") {
                logPayload.endpoint = finalOutput;
                logPayload.deploymentId = jsonData.deploymentId; // from SSE
              }
              try {
                await fetch("/api/database/log-activity", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(logPayload),
                });
                const activityRes = await fetch("/api/database/activity");
                if (activityRes.ok) {
                  const allActivities = await activityRes.json();
                  // Only filter for 'create' actions after success
                  const created = allActivities.filter(a => a.action === 'create');
                  setCreatedDatabases(created);
                  localStorage.setItem("createdDatabases", JSON.stringify(created));
                }
              } catch (logErr) {
                console.error("Failed to log activity:", logErr);
                if (action === "create") {
                  setCreatedDatabases(prev => [...prev, { ...logPayload, id: Date.now(), createdAt: new Date().toISOString() }]);
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
          } catch (e) {
            setLogs((prev) => [...prev, line.trim()]);
          }
        }
      }
    } catch (err) {
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
    // ✅ Reset custom form data
    setFormData({
      name: "",
      dbname: "",
      db_username: "",
      db_password: "",
      vpc_id: "",
      subnet_ids: [],
    });
    setVpcs([]);
    setSubnets([]);
    setLoadingVpcs(false);
    setLoadingSubnets(false);
    setSelectedCreatedDb(null);
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

  // NEW: Handle destroy for created DB
  const destroyCreatedDb = async (db) => {
    if (!db || !canDestroy) {
      alert("You lack permission to destroy databases.");
      return;
    }
    const name = db.dbName || db.dbType || db.name;
    if (!window.confirm(`⚠️ Destroy database?
"${name}"
This action cannot be undone!`)) {
      return;
    }
    setDestroyingDeploymentId(db._id);
    try {
      const res = await fetch("/api/database/destroy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId: db.deploymentId }),
      });
      if (res.ok) {
        // ✅ Update UI: Remove from created list
        setCreatedDatabases(prev => {
        const updatedList = prev.filter(d => d._id !== db._id);
        localStorage.setItem("createdDatabases", JSON.stringify(updatedList));
        return updatedList;
         });
        alert("✅ Database destroyed successfully.");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error("Destroy failed:", err);
      alert(`❌ Destroy failed: ${err.message}`);
    } finally {
      setDestroyingDeploymentId(null);
      setSelectedCreatedDb(null);
    }
  };

  // NEW: Copy to clipboard utility
  const copyToClipboard = (text, label = '') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label || text);
    setTimeout(() => setCopiedField(''), 2000);
  };

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && resetModal();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // NEW: Modal for Database Details
  const DatabaseDetailsModal = ({ db, onClose }) => {
    if (!db) return null;
    const displayName = db.dbName || db.dbType || db.name;
    let vars = {};
    try {
      vars = JSON.parse(db.variables || '{}');
    } catch {}
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-3 sm:p-4 z-50">
        <div className="bg-gradient-to-b from-[#1a1f2b] to-[#151924] text-gray-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-800 shadow-2xl">
          <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center text-xl font-bold">
                DB
              </div>
              <div>
                {/* ✅ Use db.dbName which now comes from backend with correct name */}
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-100">{displayName}</h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                  {db.dbType} • {db.awsAccountName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4 sm:p-6 pb-0">
            <div className="space-y-5">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-blue-800/30 text-blue-400 px-2.5 py-1 rounded text-xs font-bold">
                      DATABASE
                    </div>
                    {/* ✅ Use db.dbName which now comes from backend with correct name */}
                    <h3 className="font-medium text-gray-100 truncate max-w-[200px]">{displayName}</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(db.endpoint, 'endpoint')}
                    className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition"
                    title="Copy Endpoint"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type</span>
                    <span>{db.dbType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account</span>
                    <span>{db.awsAccountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created At</span>
                    <span>{new Date(db.createdAt).toLocaleString()}</span>
                  </div>
                  {db.endpoint && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Endpoint</span>
                      <span className="font-mono text-xs text-cyan-400 break-all">{db.endpoint}</span>
                    </div>
                  )}
                  {db.vpcId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">VPC</span>
                      <span className="font-mono text-xs text-cyan-400 break-all">{db.vpcId}</span>
                    </div>
                  )}
                  {db.deploymentId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Deployment ID</span>
                      <span className="font-mono text-xs text-gray-500 break-all">{db.deploymentId}</span>
                    </div>
                  )}
                </div>
                {/* Configuration Section */}
                {Object.keys(vars).length > 0 && (
                  <>
                    <h4 className="font-medium text-gray-100 mt-6 mb-3">Configuration</h4>
                    <div className="space-y-2.5 text-sm border-t border-gray-700/50 pt-3">
                      {Object.entries(vars).map(([key, value]) => {
                        if (key.includes('password') || key.includes('secret')) return null;
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-400">{key}</span>
                            <span className="truncate max-w-[60%]">{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6 border-t border-gray-800 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 hover:bg-gray-700 transition"
            >
              Close
            </button>
            <button
              onClick={() => destroyCreatedDb(db)}
              disabled={destroyingDeploymentId === db._id}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-white transition ${
                destroyingDeploymentId === db._id
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              <AlertTriangle className="mr-2 h-4 w-4 inline" />
              {destroyingDeploymentId === db._id ? 'Deleting...' : 'Destroy Database'}
            </button>
          </div>
          {copiedField && (
            <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg">
              <span>✓ Copied {copiedField}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

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
      {/* === ✅ CREATED DATABASES — TOP === */}
      {createdDatabases.length > 0 && (
        <div className="w-full max-w-7xl mt-4 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-400 w-6 h-6" />
            Created Databases
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {createdDatabases.map((db) => (
              <div
                key={db._id || db.id}
                className="rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.015] bg-gradient-to-b from-[#1a1f2b] to-[#151924] border-gray-800"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center text-sm font-bold">
                        DB
                      </div>
                      <div>
                        {/* ✅ Use db.dbName which now comes from backend with correct name */}
                        <h3 className="text-base font-semibold text-gray-100">{db.dbName || db.dbType || db.name}</h3>
                        <p className="text-xs text-gray-400">Database</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-400 space-y-1">
                    <div>📍 {db.awsAccountName}</div>
                    <div>📅 {new Date(db.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => setSelectedCreatedDb(db)}
                      className="flex-1 bg-gray-800 hover:bg-gray-700/80 text-gray-200 font-medium border border-gray-700 rounded-lg py-2 text-sm"
                    >
                      <Eye size={14} className="mr-1.5 inline" /> View
                    </button>
                    <button
                      onClick={() => destroyCreatedDb(db)}
                      disabled={destroyingDeploymentId === db._id}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                        destroyingDeploymentId === db._id
                          ? "bg-gray-700 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {destroyingDeploymentId === db._id ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting
                        </span>
                      ) : (
                        <Trash2 size={14} className="mx-auto" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* === 8 DB TYPES === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-7xl mb-8">
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
              <h2 className="text-xl font-semibold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                {db.name}
              </h2>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                {db.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      {/* === MAIN DEPLOYMENT MODAL === */}
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
                        setDeploymentHistory(prev => {
                          const updated = { ...prev };
                          delete updated[selected];
                          return updated;
                        });
                      }
                    }}
                    className={`px-4 py-3 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg flex items-center justify-center ${
                      "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 shadow-orange-500/25"
                    }`}
                  >
                    <Plus className="mr-2 w-4 h-4" />
                    New
                  </button>
                  <button
                    onClick={() => {
                      setDeploymentType("existing");
                      fetchExistingDbs();
                    }}
                    className={`px-4 py-3 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg flex items-center justify-center ${
                      "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 shadow-blue-500/25"
                    }`}
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
                    className={`px-4 py-3 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg flex items-center justify-center ${
                      "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 shadow-orange-500/25"
                    }`}
                  >
                    <Cog className="mr-2 w-4 h-4" />
                    Terraform (IaC)
                  </button>
                  <button
                    onClick={() => setStep("helm-cluster")}
                    className={`px-4 py-3 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg flex items-center justify-center ${
                      "bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 shadow-blue-500/25"
                    }`}
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
                <div className="grid grid-cols-1 gap-2"> {/* ✅ Only Create shown */}
                  <button
                    onClick={() => {
                      if (!canDeploy) {
                        alert("You don't have permission to deploy databases.");
                        return;
                      }
                      if (confirm("Are you sure you want to CREATE this database?")) {
                        setStep("custom-form"); // ✅ Go to new custom form
                        // ✅ Fetch VPCs when starting the custom form
                        if (selectedAwsAccount) {
                          fetchVpcs();
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg flex items-center justify-center ${
                      !canDeploy
                        ? "bg-gradient-to-r from-gray-700/80 to-gray-800/80 opacity-60 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 shadow-orange-500/25"
                    }`}
                  >
                    🚀 Create
                  </button>
                  {/* 🔴 Destroy button REMOVED per request */}
                </div>
                <button
                  onClick={() => setStep("deploy-method")}
                  className="mt-4 w-full px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                >
                  Back
                </button>
              </div>
            )}
            {/* ✅ NEW: CUSTOM FORM STEP (replaces tfvarsSchema form) */}
            {step === "custom-form" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">
                  Configure {databases[selected].name}
                </h4>
                {/* Step 1: Name */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. dev-abi-influxdb"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Logical name for this deployment</p>
                </div>

                {/* Step 2: DB Name */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Database Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.dbname}
                    onChange={(e) => setFormData(prev => ({ ...prev, dbname: e.target.value }))}
                    className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. abi_metrics"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1">Actual DB name inside the instance</p>
                </div>

                {/* Step 3: Username */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.db_username}
                    onChange={(e) => setFormData(prev => ({ ...prev, db_username: e.target.value }))}
                    className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. admin"
                    required
                  />
                </div>

                {/* Step 4: Password */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.db_password}
                    onChange={(e) => setFormData(prev => ({ ...prev, db_password: e.target.value }))}
                    className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {/* Step 5: VPC */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    VPC <span className="text-red-500">*</span>
                  </label>
                  {loadingVpcs ? (
                    <div className="flex items-center py-2">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Loading VPCs...</span>
                    </div>
                  ) : (
                    <select
                      value={formData.vpc_id}
                      onChange={(e) => handleVpcChange(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">— Select VPC —</option>
                      {vpcs.map((vpc) => (
                        <option key={vpc.id} value={vpc.id}>
                          {/* ✅ Display Name tag first, fallback to ID, include CIDR */}
                          {vpc.name} ({vpc.cidr})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 6: Subnets */}
                {formData.vpc_id && (
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Subnet(s) <span className="text-red-500">*</span>
                    </label>
                    {loadingSubnets ? (
                      <div className="flex items-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Loading subnets...</span>
                      </div>
                    ) : subnets.length === 0 ? (
                      <p className="text-yellow-400">No subnets found in this VPC.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {subnets.map((subnet) => (
                          <label key={subnet.id} className="flex items-center space-x-3 p-2 hover:bg-slate-800 rounded">
                            <input
                              type="checkbox"
                              checked={formData.subnet_ids.includes(subnet.id)}
                              onChange={(e) => {
                                const id = subnet.id;
                                setFormData(prev => {
                                  const ids = new Set(prev.subnet_ids);
                                  if (e.target.checked) ids.add(id);
                                  else ids.delete(id);
                                  return { ...prev, subnet_ids: Array.from(ids) };
                                });
                              }}
                              className="rounded text-blue-500"
                            />
                            <span className="text-sm">
                              {/* ✅ Display Subnet Name tag first, fallback to ID, include AZ and CIDR */}
                              {subnet.name} • {subnet.availabilityZone} • {subnet.cidr}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Select at least one subnet for high availability.
                    </p>
                  </div>
                )}

                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => setStep("terraform-action")}
                    className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 shadow-blue-500/25"
                  >
                    Review
                  </button>
                </div>
              </div>
            )}

            {/* ✅ NEW: REVIEW STEP */}
            {step === "review" && (
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-slate-100">Review Your Configuration</h4>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Database Type:</span>
                    <span className="font-medium">{databases[selected].name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Name:</span>
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">DB Name:</span>
                    <span className="font-medium">{formData.dbname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Username:</span>
                    <span className="font-medium">{formData.db_username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Password:</span>
                    <span className="font-medium">••••••••</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">VPC:</span>
                    {/* ✅ Display VPC Name (or ID) and CIDR from the selected VPC object */}
                    <span className="font-medium">
                      {vpcs.find(v => v.id === formData.vpc_id)?.name || formData.vpc_id} ({vpcs.find(v => v.id === formData.vpc_id)?.cidr || 'N/A'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Subnets:</span>
                    <span className="font-medium">
                      {/* ✅ Display Subnet Names (or IDs) and AZs from the selected subnet objects */}
                      {formData.subnet_ids.map(id => {
                        const subnet = subnets.find(s => s.id === id);
                        return subnet ? `${subnet.name} (${subnet.availabilityZone})` : id;
                      }).join(", ")}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => setStep("custom-form")}
                    className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-600 transition"
                  >
                    ← Edit
                  </button>
                  <button
                    onClick={() => {
                      if (!canDeploy) {
                        alert("You don't have permission to deploy databases.");
                        return;
                      }
                      startTerraformDeployment("create");
                      setStep("deploying");
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.98] shadow-lg ${
                      "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 shadow-orange-500/25"
                    }`}
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
                        setDeploymentHistory(prev => {
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
      {/* Database Details Modal */}
      {selectedCreatedDb && (
        <DatabaseDetailsModal
          db={selectedCreatedDb}
          onClose={() => setSelectedCreatedDb(null)}
        />
      )}
    </div>
  );
};

export default DatabaseCards;

