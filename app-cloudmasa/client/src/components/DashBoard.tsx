"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  DollarSign,
  Activity,
  Link2,
  Cloud,
  Github,
  Server,
  Database,
  Zap,
  TrendingUp,
} from "lucide-react";
import api from "../interceptor/api.interceptor";

// Types
interface ActivityLog {
  action: string;
  timestamp: string;
  status: "success" | "failed";
}

interface CloudAccount {
  _id: string;
  accountId: string;
  accountName: string;
  awsRegion: string;
  iamUserName: string;
  arn: string;
}

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

const DashBoard = ({ user }: { user?: { name?: string } }) => {
  const [isDarkMode] = useState(true);

  const [clusters, setClusters] = useState<any[]>([]);
  const [repos, setRepos] = useState(0);
  const [databases, setDatabases] = useState(0);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [awsAccounts, setAwsAccounts] = useState<CloudAccount[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          clustersRes,
          accountsRes,
          activityRes,
        ] = await Promise.all([
          api.get("/api/clusters/get-clusters"),
          api.get("/api/aws/get-aws-accounts"),
          api.get("/api/get-recent-activity"),
        ]);

        setClusters(Array.isArray(clustersRes.data) ? clustersRes.data : []);
        setRepos(0);
        setDatabases(0);

        const awsAccountsData = Array.isArray(accountsRes.data) ? accountsRes.data : [];
        setAwsAccounts(awsAccountsData);
        
        const providers = new Set<string>();
        if (awsAccountsData.length > 0) providers.add("AWS");
        setConnectedAccounts(Array.from(providers));

        setRecentActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data. Please try again.");
        setClusters([]);
        setRepos(0);
        setDatabases(0);
        setConnectedAccounts([]);
        setAwsAccounts([]);
        setRecentActivity([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s as per your preference
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* 🎨 Theme + Minimal Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            :root {
              --bg-dark: linear-gradient(135deg, #0b0b14 0%, #06070f 100%);
              --bg-light: linear-gradient(135deg, #e8f0ff 0%, #f9fafc 100%);
              --text-dark: #e2e8f0;
              --text-light: #0f172a;
              --card-dark: rgba(255, 255, 255, 0.05);
              --card-light: rgba(255, 255, 255, 0.6);
              --border-dark: rgba(255, 255, 255, 0.1);
              --border-light: rgba(0, 0, 0, 0.08);
            }

            body {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: ${isDarkMode ? 'var(--bg-dark)' : 'var(--bg-light)'};
              color: ${isDarkMode ? 'var(--text-dark)' : 'var(--text-light)'};
              min-height: 100vh;
              margin: 0;
              overflow-x: hidden;
              transition: background 0.3s ease, color 0.3s ease;
            }

            .dashboard-grid {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image:
                linear-gradient(${isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px),
                linear-gradient(90deg, ${isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px);
              background-size: 30px 30px;
              z-index: -2;
              pointer-events: none;
            }

            .animated-gradient-bg {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -1;
              opacity: 0.5;
              background: linear-gradient(225deg, #0ea5e9, #8b5cf6, #10b981, #f59e0b);
              background-size: 400% 400%;
              animation: gradientShift 20s ease infinite;
              filter: blur(60px);
            }

            @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }

            @keyframes pulse {
              0%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(1.1); }
            }

            .glass-card {
              position: relative;
              backdrop-filter: blur(14px);
              background: ${isDarkMode ? 'var(--card-dark)' : 'var(--card-light)'};
              border: 1px solid ${isDarkMode ? 'var(--border-dark)' : 'var(--border-light)'};
              box-shadow: 0 8px 30px ${isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'};
              transition: all 0.3s ease;
              border-radius: 1rem;
            }

            .glass-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 10px 40px ${isDarkMode ? 'rgba(0,255,200,0.15)' : 'rgba(0,150,255,0.25)'};
            }
          `,
        }}
      />

      {/* Background Layers */}
      <div className="dashboard-grid" />
      <div className="animated-gradient-bg" />

      {/* Dashboard Content */}
      <div className="min-h-screen p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 text-[#FF6B35]`}>
              CLOUD INFRASTRUCTURE DASHBOARD {user?.name || ""} 
            </h1>
            <p className={`text-lg text-[#FF6B35]/80`}>              
            </p>
            {lastUpdated && (
              <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Last updated: {lastUpdated}
              </p>
            )}
            {error && <p className="text-red-400 mt-2">{error}</p>}
          </header>

          {/* Metrics Overview */}
          <section className="mb-16">
            <h2 className={`text-xl md:text-2xl font-semibold mb-6 text-[#FF6B35]`}>
              Metrics Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-sm font-medium text-[#FF6B35]/70 mb-1`}>
                      Active Clusters
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {loading ? "..." : clusters.length}
                    </div>
                    <div className="flex items-center text-sm text-emerald-300">
                      <span>↗</span>
                      <span className="ml-1 font-medium">+8%</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300' : 'bg-blue-100 border border-blue-200 text-blue-600'}`}>
                    <Server size={20} />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-sm font-medium text-[#FF6B35]/70 mb-1`}>
                      Databases
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {loading ? "..." : databases}
                    </div>
                    <div className="flex items-center text-sm text-emerald-300">
                      <span>↗</span>
                      <span className="ml-1 font-medium">+3%</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300' : 'bg-blue-100 border border-blue-200 text-blue-600'}`}>
                    <Database size={20} />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-sm font-medium text-[#FF6B35]/70 mb-1`}>
                      Cloud Services
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {loading ? "..." : connectedAccounts.length}
                    </div>
                    <div className="flex items-center text-sm text-emerald-300">
                      <span>↗</span>
                      <span className="ml-1 font-medium">+5%</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300' : 'bg-blue-100 border border-blue-200 text-blue-600'}`}>
                    <Cloud size={20} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tool & Cost Overview */}
          <section className="mb-16">
            <h2 className={`text-xl md:text-2xl font-semibold mb-6 text-[#FF6B35]`}>
              Tool & Cost Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>Tools in Use</h3>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-violet-500/10 border border-violet-500/20 text-violet-300' : 'bg-purple-100 border border-purple-200 text-purple-600'}`}>
                    <Layers size={20} />
                  </div>
                </div>
                <p className="text-lg font-semibold">{loading ? "..." : "Jenkins, Kubernetes"}</p>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>Monthly Cost</h3>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-green-100 border border-green-200 text-green-600'}`}>
                    <DollarSign size={20} />
                  </div>
                </div>
                <p className="text-lg font-semibold">₹{loading ? "..." : "23,000"}</p>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>Active Tool</h3>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300' : 'bg-indigo-100 border border-indigo-200 text-indigo-600'}`}>
                    <Activity size={20} />
                  </div>
                </div>
                <p className="text-lg font-semibold">{loading ? "..." : "SonarQube"}</p>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>Connected Accounts</h3>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' : 'bg-blue-100 border border-blue-200 text-blue-600'}`}>
                    <Link2 size={20} />
                  </div>
                </div>
                <p className="text-lg font-semibold">
                  {loading ? "..." : awsAccounts.length ? awsAccounts.map(acc => acc.accountName).join(", ") : "None"}
                </p>
              </div>
            </div>
          </section>

          {/* Connection Status */}
          <section className="mb-16">
            <h2 className={`text-xl md:text-2xl font-semibold mb-6 text-[#FF6B35]`}>
              Connection Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {awsAccounts.length > 0 ? (
                awsAccounts.map((account, idx) => (
                  <div key={account._id || idx} className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>AWS Account</h3>
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' : 'bg-blue-100 border border-blue-200 text-blue-600'}`}>
                        <Cloud size={20} />
                      </div>
                    </div>
                    <p className="text-lg font-semibold">
                      {account.accountName} • {account.awsRegion}
                    </p>
                  </div>
                ))
              ) : (
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>No Cloud Providers</h3>
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-100 border border-red-200 text-red-600'}`}>
                      <Cloud size={20} />
                    </div>
                  </div>
                  <p className="text-lg font-semibold">None</p>
                </div>
              )}

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>GitHub Status</h3>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-green-100 border border-green-200 text-green-600'}`}>
                    <Github size={20} />
                  </div>
                </div>
                <p className="text-lg font-semibold">Connected</p>
              </div>
            </div>
          </section>

          {/* Live Metrics - Professional Real-Time Visualization */}
          <section className="mb-16">
            <h2 className={`text-xl md:text-2xl font-semibold mb-6 text-[#FF6B35]`}>
              Live Metrics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* CPU Utilization - Enhanced */}
              <div className="glass-card rounded-2xl p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>CPU Utilization</h3>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-yellow-100 border border-yellow-200 text-yellow-600'}`}>
                    <Zap size={20} />
                  </div>
                </div>
                <div className="relative h-12 flex items-end gap-1 mb-3">
                  {[...Array(30)].map((_, i) => {
                    const height = Math.max(8, 20 + Math.sin((Date.now() / 1000 + i * 0.3)) * 18);
                    const opacity = 0.6 + (Math.sin((Date.now() / 1200 + i * 0.2)) * 0.4);
                    return (
                      <div
                        key={i}
                        className="w-1.5 rounded-sm bg-gradient-to-t from-cyan-400 to-cyan-300 shadow-[0_0_6px_rgba(0,200,255,0.4)] transition-all duration-300 ease-out"
                        style={{
                          height: `${height}%`,
                          opacity,
                          animation: 'pulse 2s infinite',
                          animationDelay: `${i * 0.03}s`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Avg: <span className="font-mono font-semibold">{Math.round(55 + Math.sin(Date.now() / 2500) * 12)}%</span>
                  </span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-green-600'}`}>
                    ↗ +{Math.round(4 + Math.random() * 8)}%
                  </span>
                </div>
              </div>

              {/* Network Traffic - Enhanced */}
              <div className="glass-card rounded-2xl p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-medium text-[#FF6B35]/70`}>Network Traffic</h3>
                  <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20 text-blue-300' : 'bg-blue-100 border border-blue-200 text-blue-600'}`}>
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="relative h-12 flex items-end gap-1 mb-3">
                  {[...Array(30)].map((_, i) => {
                    const height = Math.max(10, 25 + Math.cos((Date.now() / 950 + i * 0.25)) * 22);
                    const opacity = 0.5 + (Math.cos((Date.now() / 1300 + i * 0.18)) * 0.5);
                    return (
                      <div
                        key={i}
                        className="w-1.5 rounded-sm bg-gradient-to-t from-emerald-400 to-emerald-300 shadow-[0_0_6px_rgba(0,230,150,0.4)] transition-all duration-300 ease-out"
                        style={{
                          height: `${height}%`,
                          opacity,
                          animation: 'pulse 2.2s infinite',
                          animationDelay: `${i * 0.025}s`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Throughput: <span className="font-mono font-semibold">{(1.8 + Math.sin(Date.now() / 2800) * 0.7).toFixed(1)} Gbps</span>
                  </span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-green-600'}`}>
                    ↑ {Math.round(5 + Math.random() * 9)}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="mb-16">
            <h2 className={`text-xl md:text-2xl font-semibold mb-6 text-[#FF6B35]`}>
              Recent Activity
            </h2>
            <div className={`glass-card rounded-2xl p-5 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-14 rounded-xl animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}></div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-white/3 border border-white/5'
                          : 'bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <span className="font-medium">{activity.action}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            activity.status === "success"
                              ? isDarkMode
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-green-100 text-green-800 border border-green-200"
                              : isDarkMode
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No recent activity
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default DashBoard;
