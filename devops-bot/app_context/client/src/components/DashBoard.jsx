import React, { useState, useEffect } from 'react';
import {
  Layers,
  DollarSign,
  Activity,
  Link2,
  Cloud,
  Github,
} from 'lucide-react';
import api from '../interceptor/api.interceptor';
import { io } from 'socket.io-client'; // ✅ NEW: Import Socket.IO Client

// ⏱️ Helper: Convert timestamp to "2 mins ago"
const getTimeAgo = (timestamp) => {
  const diff = Date.now() - new Date(timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  return `${hours} hours ago`;
};

const Dashboard = () => {
  const [clusters, setClusters] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]); // ✅ Recent Activity State
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true); // ✅ Loading for activity

  // 🌐 Fetch clusters
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const response = await api.get('/api/get-clusters');
        setClusters(response.data || []);
      } catch (error) {
        console.error('Error fetching clusters:', error);
        setClusters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClusters();
  }, []);

  // ☁️ Fetch connected cloud accounts
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      try {
        const response = await api.get('/api/get-aws-accounts');
        const accounts = response.data || [];

        const cloudProviders = new Set();
        accounts.forEach(account => {
          if (account.cloudProvider) {
            cloudProviders.add(account.cloudProvider.toUpperCase());
          } else {
            cloudProviders.add('AWS'); // default fallback
          }
        });

        setConnectedAccounts(Array.from(cloudProviders));
      } catch (error) {
        console.error('Error fetching connected accounts:', error);
        setConnectedAccounts([]);
      }
    };

    fetchConnectedAccounts();
  }, []);

  // 🔄 Fetch Recent Activities + REAL-TIME via WebSocket
  useEffect(() => {
    // 🔹 STEP 1: Initial Load
    const fetchInitialActivities = async () => {
      setActivityLoading(true);
      try {
        const response = await api.get('/api/get-recent-activity');
        setRecentActivities(response.data || []);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        setRecentActivities([]);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchInitialActivities();

    // 🔹 STEP 2: Connect to WebSocket
    const socket = io('http://localhost:3000', {
      transports: ['websocket'], // Force WebSocket (optional)
    });

    // 🔹 STEP 3: Listen for real-time events
    const handleNewActivity = (newActivity) => {
      setRecentActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep latest 10
    };

    socket.on('recent-activity', handleNewActivity);

    // 🔹 STEP 4: Cleanup on unmount
    return () => {
      socket.off('recent-activity', handleNewActivity);
      socket.disconnect();
    };
  }, []); // Empty dependency → run once on mount

  return (
    <div className="min-h-screen p-10 bg-[#1E2633] text-[#FFFFFF]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-14">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-[#FFFFFF]">
            Welcome back..
          </h1>
          <p className="text-[#F26A2E] text-lg">
            Here's a quick glance at your cloud and tool usage.
          </p>
        </header>

        {/* Metrics Overview */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-[#F26A2E]">
            Metrics Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Clusters"
              value={loading ? "..." : clusters.length.toString()}
              change="+8%"
              icon={<Cloud className="text-white" size={20} />}
              gradient="from-[#2A4C83] via-[#1E2633] to-[#2A4C83]"
            />
            <MetricCard
              title="Active Branches"
              value="24"
              change="+12%"
              icon={<Link2 className="text-white" size={20} />}
              gradient="from-[#F26A2E] via-[#2A4C83] to-[#F26A2E]"
            />
            <MetricCard
              title="Open PRs"
              value="7"
              change="+3%"
              icon={<Github className="text-white" size={20} />}
              gradient="from-[#F26A2E] via-[#F26A2E] to-[#2A4C83]"
            />
            <MetricCard
              title="Server Nodes"
              value="32"
              change="+5%"
              icon={<Layers className="text-white" size={20} />}
              gradient="from-[#2A4C83] via-[#F26A2E] to-[#2A4C83]"
            />
          </div>
        </section>

        {/* Tool & Cost Overview */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-[#F26A2E]">
            Tool & Cost Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              icon={<Layers className="text-white" size={20} />}
              title="Tools in Use"
              value="Jenkins, Kubernetes"
              gradient="from-[#2A4C83] via-[#1E2633] to-[#2A4C83]"
            />
            <Card
              icon={<DollarSign className="text-white" size={20} />}
              title="Monthly Cost"
              value="₹23,000"
              gradient="from-[#F26A2E] via-[#F26A2E] to-[#2A4C83]"
            />
            <Card
              icon={<Activity className="text-white" size={20} />}
              title="Active Tool"
              value="SonarQube"
              gradient="from-[#2A4C83] via-[#F26A2E] to-[#2A4C83]"
            />
            <Card
              icon={<Link2 className="text-white" size={20} />}
              title="Connected Accounts"
              value={connectedAccounts.length ? connectedAccounts.join(', ') : 'None'}
              gradient="from-[#F26A2E] via-[#2A4C83] to-[#F26A2E]"
            />
          </div>
        </section>

        {/* Connection Status */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 text-[#F26A2E]">
            Connection Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {connectedAccounts.length > 0 ? (
              connectedAccounts.map((account, idx) => (
                <Card
                  key={idx}
                  icon={<Cloud className="text-white" size={20} />}
                  title={`${account} Cloud Provider`}
                  value={`${account} Connected`}
                  gradient="from-[#2A4C83] via-[#F26A2E] to-[#2A4C83]"
                />
              ))
            ) : (
              <Card
                icon={<Cloud className="text-white" size={20} />}
                title="No Cloud Providers Connected"
                value="None"
                gradient="from-[#1E2633] via-[#F26A2E] to-[#2A4C83]"
              />
            )}

            <Card
              icon={<Github className="text-white" size={20} />}
              title="GitHub Status"
              value="Connected"
              gradient="from-[#2A4C83] via-[#1E2633] to-[#2A4C83]"
            />
          </div>
        </section>

        {/* ✅ REAL-TIME: Recent Activity Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-[#F26A2E]">
            Recent Activity
          </h2>
          {activityLoading ? (
            <p className="text-gray-400">Loading recent activity...</p>
          ) : recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, idx) => (
                <div
                  key={idx}
                  className="bg-[#2A4C83] p-4 rounded-lg flex justify-between items-center hover:bg-opacity-90 transition-all duration-200 group"
                >
                  <div>
                    <p className="font-medium text-white group-hover:text-[#F26A2E] transition-colors">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-300">
                      {getTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      activity.status === 'success'
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-red-500 text-white shadow-lg'
                    }`}
                  >
                    {activity.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No recent activity found.</p>
          )}
        </section>
      </div>
    </div>
  );
};

// Reusable Components (unchanged)
const MetricCard = ({ title, value, change, icon, gradient }) => (
  <div
    className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg overflow-hidden group transition-transform hover:scale-[1.02] duration-200`}
  >
    <div className="text-sm font-medium mb-2">{title}</div>
    <div className="text-3xl font-bold mb-1">{value}</div>
    <div className="flex items-center text-sm space-x-1">
      <span>↗</span>
      <span className="font-semibold">{change}</span>
    </div>
    <div className="absolute top-4 right-4 bg-white bg-opacity-20 rounded-full p-2 z-10">
      {icon}
    </div>
    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
  </div>
);

const Card = ({ icon, title, value, gradient }) => (
  <div
    className={`relative bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-md hover:shadow-lg transition-transform hover:scale-[1.02] group overflow-hidden`}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-medium text-[#FFFFFF]">{title}</h3>
      <div className="bg-white bg-opacity-20 p-2 rounded-full z-10">{icon}</div>
    </div>
    <p className="text-xl font-semibold">{value}</p>
    <div className="absolute inset-0 bg-white opacity-10 transform rotate-45 scale-x-[2] scale-y-[1.5] translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700 pointer-events-none" />
  </div>
);

export default Dashboard;