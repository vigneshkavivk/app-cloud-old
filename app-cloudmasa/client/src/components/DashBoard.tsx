"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers,
  DollarSign,
  Github,
  Server,
  Database,
  Zap,
  TrendingUp,
  Lock,
  Link2,
  PieChart as PieChartIcon,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
} from "lucide-react";
import api from "../interceptor/api.interceptor";
import { useAuth } from "../hooks/useAuth";
import SupportTicketModal from './SupportTicketModal';

// 🔁 Reuse same service name formatting as backend for consistency
const formatServiceName = (raw: string): string => {
  return (raw || 'Other')
    .replace(/Amazon\s*|\s*AWS\s*/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[-\s]+|[-\s]+$/g, '') || 'Other';
};

// === Types (unchanged) ===
interface ActivityLog { action: string; timestamp: string; status: "success" | "failed"; }
interface CloudAccount { _id?: string; accountId: string; accountName: string; awsRegion: string; iamUserName: string; arn: string; }
interface Cluster { _id?: string; name?: string; clusterName?: string; status?: string; region?: string; nodeCount?: number | string | null; version?: string; accountId?: string; liveNodeCount?: number; }
interface GithubDetails { orgs: { id: string; login: string; avatar_url?: string }[]; repos: { id: number; name: string; full_name: string; private: boolean }[]; installation?: { id: number; account: { login: string; type: string }; created_at: string; updated_at: string; }; }
interface DeployedTool { _id?: string; selectedTool: string; selectedCluster: string; status: string; createdAt: string; }
interface CostBreakdownItem { service: string; cost: number; }
interface CostData { total: number; currency: string; breakdown: CostBreakdownItem[]; accountName: string; month: string; }
interface TrendPoint { date: string; total: number; breakdown: Record<string, number>; }
interface ForecastPoint { date: string; mean: number; min: number; max: number; }
interface ResourceCounts { EC2: number; S3: number; RDS: number; Lambda: number; Others: number; }
interface BudgetItem { name: string; type: string; amount: number; currency: string; actual: number; forecast: number; status: string;liveNodeCount?: number; }

const formatTimeAgo = (isoString: string) => {
  if (!isoString) return "Unknown";
  const now = new Date();
  const past = new Date(isoString);
  if (isNaN(past.getTime())) return "Invalid date";
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? "s" : ""} ago`;
};

const parseNodeCount = (count: unknown): string | number => {
  if (count == null) return 1;
  if (typeof count === 'number' && !isNaN(count)) return count;
  if (typeof count === 'string') {
    const trimmed = count.trim();
    if (trimmed === '') return 1;
    const parsed = Number(trimmed);
    return isNaN(parsed) ? 1 : parsed;
  }
  return 1;
};

// ✅ Enhanced SVG Line Chart
const SVGLineChart = ({ data, width = 200, height = 40, color = "#3b82f6" }: { data: number[]; width?: number; height?: number; color?: string }) => {
  if (data.length === 0) return <div className="text-gray-500 text-sm">No trend data</div>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="mt-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="0" y="0" width={width} height={height} fill="none" stroke="#374151" strokeWidth="1" />
    </svg>
  );
};

// ✅ SVG Pie Chart
const SVGPieChart = ({ data, size = 200 }: { data: { name: string; value: number }[], size?: number }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-gray-500 text-sm">No data</div>;
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;
  let cumulativePercent = 0;
  const slices = data.map((item, index) => {
    const percent = item.value / total;
    const startAngle = cumulativePercent * 2 * Math.PI;
    const endAngle = (cumulativePercent + percent) * 2 * Math.PI;
    cumulativePercent += percent;
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    const largeArcFlag = percent > 0.5 ? 1 : 0;
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');
    const COLORS = ['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return (
      <path
        key={index}
        d={pathData}
        fill={COLORS[index % COLORS.length]}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />
    );
  });
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
        <circle cx={centerX} cy={centerY} r={radius * 0.4} fill="#0f172a" />
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="14"
          fontWeight="600"
        >
          {Math.round(total * 100) / 100}
        </text>
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {data.map((item, i) => {
          const COLORS = ['#3b82f6', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
          const percent = ((item.value / total) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center">
              <div
                className="w-3 h-3 rounded-sm mr-1"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-gray-300">
                {formatServiceName(item.name)}: {percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ✅ Unified Info Tooltip Component
const InfoTooltip = ({ metricKey, show, onClose }: { metricKey: string; show: boolean; onClose: () => void }) => {
  const metricInfo: Record<string, string> = {
    'Active Clusters': 'Number of Kubernetes clusters currently running in your cloud (e.g., EKS, GKE).',
    'Databases': 'Total databases (e.g., RDS, DynamoDB) actively provisioned across your accounts.',
    'Resources': 'Combined count of core cloud resources — EC2, S3, RDS, Lambda, and others.',
    'Tools in Use': 'Number of DevOps or observability tools (e.g., Prometheus, ArgoCD) deployed on your clusters.',
    'GitHub Status': 'Indicates whether your GitHub account is connected and authorized. Green = ready to go.',
    'Connected Accounts': 'How many cloud provider accounts (e.g., AWS prod, staging, dev) are linked.',
  };
  const content = metricInfo[metricKey] || 'No information available.';
  if (!show) return null;
  return (
    <div
      className="absolute z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-sm text-gray-200"
      style={{
        top: '-125px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    >
      <div className="font-medium text-cyan-300 mb-1">{metricKey}</div>
      <div>{content}</div>
    </div>
  );
};

const DashBoard = ({ user }: { user?: { name?: string } }) => {
  const { hasPermission } = useAuth();
  const canViewDashboard = hasPermission("Overall", "Read");
  if (!canViewDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0b14] to-[#06070f] text-white">
        <div className="text-center p-8 max-w-md">
          <Lock className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">🔒 Access Denied</h2>
          <p className="text-gray-300">
            You need <span className="font-mono">Overall.Read</span> permission to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  // === States ===
  const [cpuUtilization, setCpuUtilization] = useState<number[]>(Array(10).fill(40));
  const [networkTraffic, setNetworkTraffic] = useState<number>(1.8);
  const [networkChange, setNetworkChange] = useState<number>(13);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [databases, setDatabases] = useState(0);
  const [awsAccounts, setAwsAccounts] = useState<CloudAccount[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [githubDetails, setGithubDetails] = useState<GithubDetails>({
    orgs: [],
    repos: [],
    installation: null,
  });
  const [deployedToolsCount, setDeployedToolsCount] = useState<number>(0);
  const [deployedTools, setDeployedTools] = useState<DeployedTool[]>([]);
  const [activeClustersModalOpen, setActiveClustersModalOpen] = useState(false);
  const [cloudServicesModalOpen, setCloudServicesModalOpen] = useState(false);
  const [githubDetailsModalOpen, setGithubDetailsModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [databasesModalOpen, setDatabasesModalOpen] = useState(false);
  const [databaseDetails, setDatabaseDetails] = useState<any[]>([]);
  const [latestGithubUsername, setLatestGithubUsername] = useState<string | null>(null);

  // ✅ Cost & Resource States
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [costSummary, setCostSummary] = useState<CostData | null>(null);
  const [costTrend, setCostTrend] = useState<TrendPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint | null>(null);
  const [resourceCounts, setResourceCounts] = useState<ResourceCounts | null>(null);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [costLoading, setCostLoading] = useState(false);
  const [costSummaryLoading, setCostSummaryLoading] = useState(false);
  const [costTrendLoading, setCostTrendLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [hasCostPermission, setHasCostPermission] = useState<boolean | null>(null);
  const [resourcesModalOpen, setResourcesModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // ✅ Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // ✅ Unified Tooltip State
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // ✅ Click-away handler for tooltip
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeTooltip) setActiveTooltip(null);
    };
    if (activeTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTooltip]);

  const handleTicketSubmit = async (data: {
    type: string;
    subject: string;
    description: string;
  }) => {
    try {
      await api.post("/api/support/ticket", data);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || "Failed to submit ticket.");
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const cachedGithubLogin = localStorage.getItem("scm_github_login");
    if (cachedGithubLogin) setLatestGithubUsername(cachedGithubLogin);
    try {
      const [
        clustersRes,
        accountsRes,
        activityRes,
        githubStatusRes,
        databasesRes,
        deploymentsCountRes,
        deploymentsListRes,
      ] = await Promise.all([
        api.get("/api/clusters/get-clusters").catch(() => ({ data: [] })),
        api.get("/api/aws/get-aws-accounts").catch(() => ({ data: [] })),
        api.get("/api/get-recent-activity").catch(() => ({ data: [] })),
        api.get("/api/github/status").catch(() => ({ data: { connected: false } })),
        api.get("/api/get-databases").catch(() => ({ data: [] })),
        api.get("/api/deployments/count").catch(() => ({ data: { count: 0 } })),
        api.get("/api/deployments/list").catch(() => ({ data: [] })),
      ]);
      const accounts = Array.isArray(accountsRes.data) ? accountsRes.data : [];
      setAwsAccounts(accounts);
      setClusters(Array.isArray(clustersRes.data) ? clustersRes.data : []);
      setDatabases(Array.isArray(databasesRes.data) ? databasesRes.data.length : 0);
      setRecentActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
      setGithubConnected(githubStatusRes.data?.connected ?? false);
      setDeployedToolsCount(deploymentsCountRes?.data?.count ?? 0);
      setDeployedTools(Array.isArray(deploymentsListRes.data) ? deploymentsListRes.data : []);
      try {
        const dbActivityRes = await api.get("/api/database/activity").catch(() => ({ data: [] }));
        const liveDBs = dbActivityRes.data.filter((db: any) => db.action === 'create' && !db.isDeploying);
        setDatabaseDetails(liveDBs);
      } catch (dbErr) {
        console.warn("DB activity fetch failed:", dbErr);
      }
      if (user?.name) {
        try {
          const ghUserRes = await api.get(`/api/scm/connections/latest-github-username?userId=${encodeURIComponent(user.name)}`).catch(() => null);
          const fetchedLogin = ghUserRes?.data?.githubUsername || null;
          if (fetchedLogin) {
            setLatestGithubUsername(fetchedLogin);
            localStorage.setItem("scm_github_login", fetchedLogin);
          }
        } catch (ghErr) {
          console.warn("GitHub username fetch failed:", ghErr);
        }
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.name]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await api.get("/api/notifications");
      const data = Array.isArray(res.data.notifications) ? res.data.notifications : [];
      setNotifications(data);
      setHasUnreadNotifications(data.some((n: any) => !n.read));
    } catch (err) {
      console.warn("Failed to fetch notifications");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const notifInterval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(notifInterval);
  }, [fetchNotifications]);

  const fetchAllCostData = async (accountId: string) => {
    if (!accountId || costLoading) return;
    setHasCostPermission(null);
    setCostLoading(true);
    setCostError(null);
    setCostSummary(null);
    setCostTrend([]);
    setForecast(null);
    setResourceCounts(null);
    setBudgets([]);
    try {
      await api.get(`/api/costs/summary?accountId=${encodeURIComponent(accountId)}`, { timeout: 8000 });
      setHasCostPermission(true);
      const [
        summaryRes,
        trendRes,
        forecastRes,
        resourcesRes,
        budgetsRes,
      ] = await Promise.allSettled([
        api.get(`/api/costs/summary?accountId=${accountId}`),
        api.get(`/api/costs/trend?accountId=${accountId}&granularity=DAILY`),
        api.get(`/api/costs/forecast?accountId=${accountId}`),
        api.get(`/api/costs/resources?accountId=${accountId}`),
        api.get(`/api/costs/budgets?accountId=${accountId}`),
      ]);
      if (summaryRes.status === 'fulfilled') setCostSummary(summaryRes.value.data);
      if (trendRes.status === 'fulfilled') setCostTrend(trendRes.value.data.trend || []);
      if (forecastRes.status === 'fulfilled') {
        const data = forecastRes.value.data.forecast;
        setForecast(data && data.length > 0 ? data[0] : null);
      }
      if (resourcesRes.status === 'fulfilled') setResourceCounts(resourcesRes.value.data.counts || null);
      if (budgetsRes.status === 'fulfilled') setBudgets(budgetsRes.value.data.budgets || []);
    } catch (err: any) {
      console.warn(`[Dashboard] Account ${accountId} access check:`, err.message);
      if (err.response?.status === 403) {
        setHasCostPermission(false);
        setCostError("🔒 You don’t have permission to view cost or resource data for this account.");
      } else {
        setHasCostPermission(null);
        setCostError(`⚠️ Data unavailable: ${err.message}`);
      }
    } finally {
      setCostLoading(false);
      setCostSummaryLoading(false);
      setCostTrendLoading(false);
      setForecastLoading(false);
      setResourcesLoading(false);
      setBudgetsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) {
      fetchAllCostData(selectedAccountId);
      const interval = setInterval(() => fetchAllCostData(selectedAccountId), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const prevCpu = cpuUtilization[cpuUtilization.length - 1];
      const delta = (Math.random() > 0.5 ? 1 : -1) * 2;
      const newCpu = Math.max(30, Math.min(60, prevCpu + delta));
      setCpuUtilization(prev => [...prev.slice(1), newCpu]);

      const prevNet = networkTraffic;
      const netDelta = (Math.random() > 0.5 ? 0.1 : -0.1);
      const newNet = Math.max(0.5, Math.min(3.0, prevNet + netDelta));
      setNetworkTraffic(newNet);
      const change = ((newNet - prevNet) / prevNet) * 100;
      setNetworkChange(change);
    }, 3000);
    return () => clearInterval(interval);
  }, [cpuUtilization, networkTraffic]);

  const pieData = useMemo(() => {
    if (!costSummary?.breakdown) return [];
    return costSummary.breakdown.map(item => ({
      name: formatServiceName(item.service),
      value: item.cost,
    }));
  }, [costSummary]);

  const trendValues = useMemo(() => costTrend.map(p => p.total), [costTrend]);

  const budgetStatusColor = (status: string) => {
    switch (status) {
      case 'ALARM': return 'text-red-400';
      case 'OK': return 'text-green-400';
      default: return 'text-yellow-400';
    }
  };

  // ✅ GlassCard Reusable
  const GlassCard = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div
      className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );

  // ✅ Modal Reusable
  const Modal = ({
    open,
    onClose,
    title,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => {
    if (!open) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-gradient-to-br from-[#0f172a] to-[#060a14] border border-white/10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl font-bold transition-colors ml-4"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-white font-bold text-xl mb-6 uppercase tracking-wide">
      {children}
    </h2>
  );

  const resolvedGithubUsername = latestGithubUsername ||
    githubDetails?.installation?.account?.login ||
    'unknown';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0b1421;
          color: white;
          min-height: 100vh;
          margin: 0;
          overflow-x: hidden;
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
          opacity: 0.15;
          background: conic-gradient(
            from 0deg,
            #ff6b6b,
            #4ecdc4,
            #45b7d1,
            #96ceb4,
            #feca57,
            #ff9ff3,
            #ff6b6b
          );
          background-size: 400% 400%;
          animation: gradientShift 20s ease infinite;
          filter: blur(80px);
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .blue-cyan-gradient-text {
          background: linear-gradient(to right, #3b82f6, #22d3ee, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 700;
        }
        .red-orange-gradient-text {
          background: linear-gradient(to right, #ef4444, #f59e0b);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 600;
        }
        .metric-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          line-height: 1.1;
        }
        .icon-wrapper {
          padding: 0.5rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
       .info-btn {
      /* REMOVE ALL VISUAL CONTAINER STYLES */
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      width: auto;
      height: auto;
      border-radius: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .info-btn:hover {
      transform: scale(1.2);
      background: none !important;
      box-shadow: none !important;
    }
      `}</style>
      <div className="dashboard-bg" />
      <div className="animated-gradient-bg" />
      <div className="min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* ✅ Header */}
          <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                <span className="blue-cyan-gradient-text">
                  CLOUD INFRASTRUCTURE DASHBOARD
                </span>
                {user?.name && (
                  <span className="ml-3 text-white/80 font-normal text-lg md:text-xl">
                    {user.name}
                  </span>
                )}
              </h1>
              {lastUpdated && (
                <p className="text-sm mt-2 text-gray-400">Last updated: {lastUpdated}</p>
              )}
              {error && <p className="text-red-400 mt-2">{error}</p>}
            </div>
            {/* 🔔 & ❓ Icons */}
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              {/* �� Bell → /notifications */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = "/notifications";
                }}
                className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 flex items-center justify-center"
                aria-label="Notifications"
                title="View notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <defs>
                    <linearGradient id="bellGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <path stroke="url(#bellGradient)" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path stroke="url(#bellGradient)" d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {hasUnreadNotifications && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0b1421]"></span>
                )}
              </button>
              {/* ❓ Support Ticket */}
              <button
                onClick={() => setSupportModalOpen(true)}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 flex items-center justify-center"
                aria-label="Raise Support Ticket"
                title="Raise a support ticket"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <defs>
                    <linearGradient id="supportGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="10" stroke="url(#supportGradient)" />
                  <path stroke="url(#supportGradient)" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12" y2="17" stroke="url(#supportGradient)" />
                </svg>
              </button>
            </div>
          </header>

          {/* === METRICS OVERVIEW === */}
          <section className="mb-12">
            <SectionHeading>
              <span className="blue-cyan-gradient-text">METRICS OVERVIEW</span>
            </SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Active Clusters */}
              <GlassCard onClick={() => setActiveClustersModalOpen(true)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="red-orange-gradient-text flex items-center gap-1">
                      Active Clusters
                      <div className="relative">
                        <button
                          onMouseEnter={() => setActiveTooltip('Active Clusters')}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={(e) => e.stopPropagation()}
                          className="info-btn group"
                          aria-label="Info"
                        >
                          <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                        </button>
                        <InfoTooltip
                          metricKey="Active Clusters"
                          show={activeTooltip === 'Active Clusters'}
                          onClose={() => setActiveTooltip(null)}
                        />
                      </div>
                    </div>
                    <div className="metric-value">{loading ? "..." : clusters.length}</div>
                  </div>
                  <div className="icon-wrapper">
                    <Server size={20} className="text-cyan-300" />
                  </div>
                </div>
              </GlassCard>

              {/* Databases */}
              <GlassCard onClick={() => setDatabasesModalOpen(true)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="red-orange-gradient-text flex items-center gap-1">
                      Databases
                      <div className="relative">
                        <button
                          onMouseEnter={() => setActiveTooltip('Databases')}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={(e) => e.stopPropagation()}
                          className="info-btn group"
                          aria-label="Info"
                        >
                          <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                        </button>
                        <InfoTooltip
                          metricKey="Databases"
                          show={activeTooltip === 'Databases'}
                          onClose={() => setActiveTooltip(null)}
                        />
                      </div>
                    </div>
                    <div className="metric-value">{loading ? "..." : databaseDetails.length}</div>
                  </div>
                  <div className="icon-wrapper">
                    <Database size={20} className="text-cyan-300" />
                  </div>
                </div>
              </GlassCard>

              {/* Resources */}
              <GlassCard onClick={() => setResourcesModalOpen(true)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="red-orange-gradient-text flex items-center gap-1">
                      Resources
                      <div className="relative">
                        <button
                          onMouseEnter={() => setActiveTooltip('Resources')}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={(e) => e.stopPropagation()}
                          className="info-btn group"
                          aria-label="Info"
                        >
                          <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                        </button>
                        <InfoTooltip
                          metricKey="Resources"
                          show={activeTooltip === 'Resources'}
                          onClose={() => setActiveTooltip(null)}
                        />
                      </div>
                    </div>
                    <div className="metric-value">
                      {resourceCounts
                        ? resourceCounts.EC2 + resourceCounts.S3 + resourceCounts.RDS + resourceCounts.Lambda + resourceCounts.Others
                        : loading || resourcesLoading ? "..." : "0"}
                    </div>
                  </div>
                  <div className="icon-wrapper">
                    <Layers size={20} className="text-violet-300" />
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* === TOOLS OVERVIEW === */}
          <section className="mb-12">
            <SectionHeading>
              <span className="blue-cyan-gradient-text">TOOLS OVERVIEW</span>
            </SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Tools in Use */}
              <GlassCard onClick={() => setToolsModalOpen(true)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="red-orange-gradient-text flex items-center gap-1">
                    Tools in Use
                    <div className="relative">
                      <button
                        onMouseEnter={() => setActiveTooltip('Tools in Use')}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onClick={(e) => e.stopPropagation()}
                        className="info-btn group"
                        aria-label="Info"
                      >
                        <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                      </button>
                      <InfoTooltip
                        metricKey="Tools in Use"
                        show={activeTooltip === 'Tools in Use'}
                        onClose={() => setActiveTooltip(null)}
                      />
                    </div>
                  </div>
                  <div className="icon-wrapper">
                    <Layers size={20} className="text-violet-300" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 bg-white/10 rounded w-32 animate-pulse"></div>
                ) : (
                  <p className="text-4xl font-bold text-white">{deployedToolsCount}</p>
                )}
              </GlassCard>
            </div>
          </section>

          {/* === CONNECTION STATUS === */}
          <section className="mb-12">
            <SectionHeading>
              <span className="blue-cyan-gradient-text">CONNECTION STATUS</span>
            </SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* GitHub Status */}
              <GlassCard onClick={() => setGithubDetailsModalOpen(true)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="red-orange-gradient-text flex items-center gap-1">
                    GitHub Status
                    <div className="relative">
                      <button
                        onMouseEnter={() => setActiveTooltip('GitHub Status')}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onClick={(e) => e.stopPropagation()}
                        className="info-btn group"
                        aria-label="Info"
                      >
                        <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                      </button>
                      <InfoTooltip
                        metricKey="GitHub Status"
                        show={activeTooltip === 'GitHub Status'}
                        onClose={() => setActiveTooltip(null)}
                      />
                    </div>
                  </div>
                  <div className="icon-wrapper">
                    {githubConnected === true ? (
                      <Github size={20} className="text-green-400" />
                    ) : githubConnected === false ? (
                      <Github size={20} className="text-rose-400" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gray-500 animate-pulse"></div>
                    )}
                  </div>
                </div>
                {githubConnected === true ? (
                  <p className="text-lg font-semibold text-green-400 flex items-center gap-2">
                    <span>Connected</span>
                  </p>
                ) : githubConnected === false ? (
                  <p className="text-lg font-semibold text-rose-400 flex items-center gap-2">
                    <span>●</span> Not Connected
                  </p>
                ) : (
                  <div className="h-6 bg-white/10 rounded w-32 animate-pulse"></div>
                )}
              </GlassCard>

              {/* Connected Accounts */}
              <GlassCard onClick={() => setCloudServicesModalOpen(true)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="red-orange-gradient-text flex items-center gap-1">
                    Connected Accounts
                    <div className="relative">
                      <button
                        onMouseEnter={() => setActiveTooltip('Connected Accounts')}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onClick={(e) => e.stopPropagation()}
                        className="info-btn group"
                        aria-label="Info"
                      >
                        <Info size={16} className="text-gray-400 group-hover:text-cyan-400" />
                      </button>
                      <InfoTooltip
                        metricKey="Connected Accounts"
                        show={activeTooltip === 'Connected Accounts'}
                        onClose={() => setActiveTooltip(null)}
                      />
                    </div>
                  </div>
                  <div className="icon-wrapper">
                    <Link2 size={20} className="text-blue-300" />
                  </div>
                </div>
                <p className="metric-value">{loading ? "..." : awsAccounts.length}</p>
              </GlassCard>
            </div>
          </section>

          {/* === LIVE COST & RESOURCES === */}
          <section className="mb-12">
            <SectionHeading>
              <span className="blue-cyan-gradient-text">LIVE COST & RESOURCES</span>
            </SectionHeading>
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="red-orange-gradient-text flex items-center gap-2">
                  <DollarSign size={20} />
                  AWS Cost & Usage
                </h3>
                {costSummary && (
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                    {costSummary.month}
                  </span>
                )}
              </div>
              {awsAccounts.length === 0 ? (
                <p className="text-gray-400 italic">No AWS accounts connected.</p>
              ) : (
                <>
                  {/* Account Selector */}
                  <div className="mb-5">
                    <label className="block text-sm text-gray-400 mb-2">Select AWS Account</label>
                    <div className="relative">
                      <select
                        value={selectedAccountId || ""}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="" disabled>
                          Select an AWS account...
                        </option>
                        {awsAccounts.map((acc) => (
                          <option key={acc.accountId} value={acc.accountId}>
                            {acc.accountName} ({acc.accountId}, {acc.awsRegion})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedAccountId && (
                    <>
                      {costError && (
                        <div className="p-4 rounded-lg flex items-start gap-3 bg-yellow-900/30 border border-yellow-700/30">
                          <AlertTriangle className="mt-0.5 flex-shrink-0 text-yellow-400" size={18} />
                          <div>
                            <span className="font-medium text-yellow-300">
                              {costError.includes('🔒') ? 'Permission Required' : 'Data Unavailable'}
                            </span>
                            <p className="text-sm mt-1 text-yellow-200 opacity-90">
                              {costError.includes('AccessDenied') || costError.includes('🔒')
                                ? "You don’t have permission to view cost or resource data for this account."
                                : costError.includes('Insufficient historical data')
                                ? "Cost Explorer data is not yet available. Please wait 24–48 hours after enabling billing."
                                : costError.includes('not found')
                                ? "Account configuration incomplete. Please check Cloud Connector settings."
                                : "Data could not be retrieved at this time."}
                            </p>
                          </div>
                        </div>
                      )}

                      {hasCostPermission === true && !costError && (
                        <div className="space-y-6">
                          {/* Top Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-black/30 p-5 rounded-lg">
                              <h4 className="text-sm text-gray-400 mb-1">Current Spend</h4>
                              {costSummaryLoading ? (
                                <span className="h-8 w-24 bg-white/10 rounded animate-pulse inline-block"></span>
                              ) : costSummary ? (
                                <>
                                  <div className="text-3xl font-bold text-white">
                                    {costSummary?.currency === 'INR' ? '₹' : '$'}
                                    {costSummary?.total?.toLocaleString() || '0'}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {costSummary?.accountName || '—'}
                                  </p>
                                </>
                              ) : (
                                <p className="text-gray-500 text-sm italic">No spend data available</p>
                              )}
                            </div>
                            <div className="bg-black/30 p-5 rounded-lg">
                              <h4 className="text-sm text-gray-400 mb-1">Forecast</h4>
                              {forecastLoading ? (
                                <div className="h-8 w-20 bg-white/10 rounded animate-pulse"></div>
                              ) : forecast ? (
                                <>
                                  <div className="text-2xl font-bold text-cyan-300">
                                    {costSummary?.currency === 'INR' ? '₹' : '$'}
                                    {forecast.mean.toLocaleString()}
                                  </div>
                                  <p className="text-xs text-cyan-400 mt-1">
                                    ±{Math.round(((forecast.max - forecast.min) / (forecast.mean || 1)) * 100)}%
                                  </p>
                                </>
                              ) : (
                                <div className="text-gray-500 flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>No forecast data</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Middle Row */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-black/20 p-4 rounded-lg">
                              <h4 className="text-white font-medium mb-3 flex items-center gap-1">
                                <TrendingUp size={16} />
                                Daily Trend (Last 30 Days)
                              </h4>
                              <div className="h-32 flex items-center justify-center">
                                {costTrendLoading ? (
                                  <div className="text-gray-500 text-center">Loading trend...</div>
                                ) : (
                                  <SVGLineChart data={trendValues} width={300} height={80} color="#3b82f6" />
                                )}
                              </div>
                            </div>
                            <div className="bg-black/20 p-4 rounded-lg">
                              <h4 className="text-white font-medium mb-4 flex items-center gap-1">
                                <Layers size={16} />
                                Resource Count
                              </h4>
                              {resourcesLoading ? (
                                <div className="text-gray-500 text-center py-6 italic">Loading...</div>
                              ) : resourceCounts ? (
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-400">{resourceCounts.EC2}</div>
                                    <div className="text-xs text-gray-400">EC2</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-green-400">{resourceCounts.S3}</div>
                                    <div className="text-xs text-gray-400">S3</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-rose-400">{resourceCounts.RDS}</div>
                                    <div className="text-xs text-gray-400">RDS</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-400">{resourceCounts.Lambda}</div>
                                    <div className="text-xs text-gray-400">Lambda</div>
                                  </div>
                                  <div className="text-center col-span-2">
                                    <div className="text-2xl font-bold text-gray-400">{resourceCounts.Others}</div>
                                    <div className="text-xs text-gray-400">Others</div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm italic">No resource data — check permissions or tagging.</p>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-black/20 p-4 rounded-lg">
                              <h4 className="text-white font-medium mb-3 flex items-center gap-1">
                                <PieChartIcon size={16} />
                                Service Breakdown
                              </h4>
                              <div className="flex justify-center min-h-[200px] items-center">
                                {pieData.length > 0 ? (
                                  <SVGPieChart data={pieData} size={160} />
                                ) : costSummaryLoading ? (
                                  <div className="text-gray-500">Loading breakdown...</div>
                                ) : (
                                  <div className="text-gray-500 text-sm italic">No service cost breakdown available.</div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-white font-medium mb-3 flex items-center gap-1">
                                <DollarSign size={16} />
                                Budgets
                              </h4>
                              {budgetsLoading ? (
                                <div className="text-gray-500 text-sm italic">Loading budgets...</div>
                              ) : budgets.length === 0 ? (
                                <p className="text-gray-500 text-sm">No budgets configured for this account.</p>
                              ) : (
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                  {budgets.map((b, i) => (
                                    <div key={`${b.name}-${b.type}`} className="bg-gray-800/50 p-3 rounded-lg">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-300">{b.name}</span>
                                        <span className={`font-medium ${budgetStatusColor(b.status)}`}>
                                          {b.status}
                                        </span>
                                      </div>
                                      <div className="mt-1 text-xs text-gray-400">
                                        Spent: {b.currency === 'INR' ? '₹' : '$'}
                                        {b.actual.toLocaleString()} / {b.currency === 'INR' ? '₹' : '$'}
                                        {b.amount.toLocaleString()}
                                      </div>
                                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                        <div
                                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                                          style={{ width: `${Math.min(100, (b.actual / (b.amount || 1)) * 100)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </GlassCard>
          </section>

          {/* === LIVE METRICS === */}
          <section className="mb-12">
            <SectionHeading>
              <span className="blue-cyan-gradient-text">LIVE METRICS</span>
            </SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="red-orange-gradient-text">CPU Utilization</h3>
                  <div className="icon-wrapper">
                    <Zap size={20} className="text-yellow-300" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Avg: {loading ? "..." : Math.round(cpuUtilization.reduce((a, b) => a + b, 0) / cpuUtilization.length)}%
                    </p>
                    <SVGLineChart data={cpuUtilization} color="#f59e0b" width={200} height={50} />
                  </div>
                  <div className="text-sm text-green-400 font-medium flex items-center gap-1">
                    <span>↗</span> <span>+11%</span>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="red-orange-gradient-text">Network Traffic</h3>
                  <div className="icon-wrapper">
                    <TrendingUp size={20} className="text-green-300" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Throughput: {loading ? "..." : networkTraffic.toFixed(1)} Gbps
                    </p>
                    <SVGLineChart
                      data={cpuUtilization.map(v => v * 0.05)}
                      color="#10b981"
                      width={200}
                      height={50}
                    />
                  </div>
                  <div className={`text-sm font-medium flex items-center gap-1 ${networkChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>{networkChange >= 0 ? '↗' : '↘'}</span>
                    <span>{Math.abs(networkChange).toFixed(0)}%</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* === RECENT ACTIVITY === */}
          <section className="mb-12">
            <SectionHeading>
              <span className="blue-cyan-gradient-text">RECENT ACTIVITY</span>
            </SectionHeading>
            <GlassCard>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-xl animate-pulse bg-white/5"></div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={`${activity.action}-${activity.timestamp}-${index}`} // ✅ Safe composite key
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <span className="font-medium text-white">{activity.action}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-300">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            activity.status === "success"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-gray-400">No recent activity</p>
              )}
            </GlassCard>
          </section>
        </div>
      </div>

      {/* === MODALS === */}
      <Modal open={activeClustersModalOpen} onClose={() => setActiveClustersModalOpen(false)} title="Active Clusters">
        {clusters.length === 0 ? (
          <p className="text-gray-400 italic text-center py-6">No active clusters found.</p>
        ) : (
          <div className="space-y-5">
            {clusters.map((cluster) => {
              const status = (cluster.status || "unknown").toLowerCase();
              const name = cluster.name || cluster.clusterName || "Unnamed Cluster";
              const region = cluster.region || "N/A";
              const nodes = cluster.liveNodeCount ?? 0;
              const version = cluster.version || "N/A";
              const key = cluster._id || `${cluster.accountId}-${name}`;
              return (
                <div key={key} className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-white flex items-center gap-2">
                      <Server size={18} className="text-cyan-300" /> {name}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      status === "running" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : status === "stopped" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : status === "not-found" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-gray-500/20 text-gray-300"
                    }`}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Region:</span>
                      <span className="text-cyan-300 font-mono">{region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Nodes:</span>
                      <span className="text-white font-mono text-lg">{nodes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Version:</span>
                      <span className="text-cyan-300 font-mono">{version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Account:</span>
                      <span className="text-orange-300 font-mono">
                        {awsAccounts.find(acc => acc.accountId === cluster.accountId)?.accountName || cluster.accountId || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* ✅ FIXED: key={account.accountId} (not _id, not index) */}
      <Modal open={cloudServicesModalOpen} onClose={() => setCloudServicesModalOpen(false)} title="Connected Cloud Accounts">
        {awsAccounts.length === 0 ? (
          <p className="text-gray-400 italic text-center py-6">No cloud accounts connected.</p>
        ) : (
          <ul className="space-y-4">
            {awsAccounts.map((account) => (
              <li key={account.accountId} className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="font-bold text-orange-300 text-lg">{account.accountName}</div>
                <div className="text-sm text-gray-300 mt-2 space-y-1">
                  <div><span className="text-gray-400">Account ID:</span> <span className="font-mono text-cyan-200">{account.accountId}</span></div>
                  <div><span className="text-gray-400">Region:</span> <span className="font-mono text-cyan-200">{account.awsRegion}</span></div>
                  <div><span className="text-gray-400">IAM User:</span> <span className="font-mono text-cyan-200">{account.iamUserName}</span></div>
                  <div className="text-xs"><span className="text-gray-400">ARN:</span> <span className="font-mono break-all text-cyan-100/80">{account.arn}</span></div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={databasesModalOpen} onClose={() => setDatabasesModalOpen(false)} title="Databases">
        {databaseDetails.length === 0 ? (
          <p className="text-gray-400 italic text-center py-6">No databases found.</p>
        ) : (
          <div className="space-y-5">
            {databaseDetails.map((db, index) => (
              <div key={`${db.dbType}-${db.endpoint || 'db'}-${index}`} className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <Database size={18} className="text-teal-300" /> {db.dbType || 'Unknown'}
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Success
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Account:</span>
                    <span className="text-orange-300 font-mono">{db.awsAccountName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Region:</span>
                    <span className="text-teal-300 font-mono">{db.awsRegion || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Endpoint:</span>
                    <span className="text-white font-mono">{db.endpoint || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-cyan-300 font-mono">
                      {new Date(db.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={toolsModalOpen} onClose={() => setToolsModalOpen(false)} title="Deployed Tools">
        {deployedTools.length === 0 ? (
          <p className="text-gray-400 italic text-center py-6">No tools deployed yet.</p>
        ) : (
          <div className="space-y-5">
            {deployedTools.map((tool, index) => (
              <div key={`${tool.selectedTool}-${tool.selectedCluster}-${tool.createdAt}`} className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <Layers size={18} className="text-purple-300" /> {tool.selectedTool || 'Unknown Tool'}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`}>
                    Deployed
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Cluster:</span>
                    <span className="text-cyan-300 font-mono">{tool.selectedCluster || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-cyan-300 font-mono">
                      {new Date(tool.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={githubDetailsModalOpen} onClose={() => setGithubDetailsModalOpen(false)} title="GitHub Connection Details">
        {githubConnected === false ? (
          <div className="text-center py-6">
            <Github className="h-12 w-12 mx-auto text-rose-500 mb-3" />
            <p className="text-gray-400 mb-4">GitHub is not connected.</p>
            <button
              onClick={() => { window.location.href = "/sidebar/scm-connector"; }}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition shadow-md"
            >
              🔗 Connect GitHub
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <div className="h-6 bg-white/10 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <div className="inline-flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30 mb-5">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Connection Verified</span>
            </div>
            <p className="blue-cyan-gradient-text text-2xl font-bold tracking-tight">@{resolvedGithubUsername}</p>
            <p className="text-gray-400 mt-4 text-sm max-w-xs mx-auto">
              You can now manage repositories and organizations through the SCM Connector.
            </p>
          </div>
        )}
      </Modal>

      <Modal open={resourcesModalOpen} onClose={() => setResourcesModalOpen(false)} title="Resource Details">
        {resourceCounts ? (
          <div className="space-y-5">
            {resourceCounts.EC2 > 0 && (
              <div key="ec2" className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <Server size={18} className="text-cyan-300" /> EC2 Instances
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {resourceCounts.EC2} Total
                  </span>
                </div>
                <p className="text-sm text-gray-300">This section would list individual EC2 instances if detailed data were available.</p>
              </div>
            )}
            {resourceCounts.S3 > 0 && (
              <div key="s3" className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <Database size={18} className="text-teal-300" /> S3 Buckets
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {resourceCounts.S3} Total
                  </span>
                </div>
                <p className="text-sm text-gray-300">This section would list individual S3 buckets if detailed data were available.</p>
              </div>
            )}
            {resourceCounts.RDS > 0 && (
              <div key="rds" className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <Database size={18} className="text-purple-300" /> RDS Instances
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {resourceCounts.RDS} Total
                  </span>
                </div>
                <p className="text-sm text-gray-300">This section would list individual RDS instances if detailed data were available.</p>
              </div>
            )}
            {resourceCounts.Lambda > 0 && (
              <div key="lambda" className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <Zap size={18} className="text-yellow-300" /> Lambda Functions
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {resourceCounts.Lambda} Total
                  </span>
                </div>
                <p className="text-sm text-gray-300">This section would list individual Lambda functions if detailed data were available.</p>
              </div>
            )}
            {resourceCounts.Others > 0 && (
              <div key="others" className="bg-gradient-to-br from-green-900/20 to-teal-900/10 p-5 rounded-xl border border-teal-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-white flex items-center gap-2">
                    <Layers size={18} className="text-gray-300" /> Other Resources
                  </h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {resourceCounts.Others} Total
                  </span>
                </div>
                <p className="text-sm text-gray-300">This section would list other resource types (e.g., VPC, IAM, SQS) if detailed data were available.</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 italic text-center py-6">
            {loading || resourcesLoading ? 'Loading...' : 'No resource data available.'}
          </p>
        )}
      </Modal>

      <SupportTicketModal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        onSubmit={handleTicketSubmit}
      />
    </>
  );
};

export default DashBoard;

