// src/app/pages/NotificationsPage.jsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Bell, AlertTriangle, CheckCircle, Clock, DollarSign, Server, Database, Github } from "lucide-react";
import api from "../interceptor/api.interceptor";

// Reuse your existing GlassCard style
const GlassCard = ({ children, className = "" }) => (
  <div
    className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg ${className}`}
  >
    {children}
  </div>
);

// Get icon by type — extensible
const getIconByType = (type) => {
  switch (type) {
    case 'warning': return <AlertTriangle className="text-yellow-400" size={20} />;
    case 'error': return <AlertTriangle className="text-red-400" size={20} />;
    case 'success': return <CheckCircle className="text-green-400" size={20} />;
    case 'info':
    default: return <Bell className="text-blue-400" size={20} />;
  }
};

// Format time (reuse your formatTimeAgo logic)
const formatTimeAgo = (isoString) => {
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

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/notifications");
      const data = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial + auto-refresh every 60s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Optional: Mark as read (you can add PATCH later)
  const handleMarkAsRead = async (id) => {
    try {
      // Future: await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.warn("Mark as read failed:", err);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 bg-[#0b1421]">
      {/* Reuse your animated background */}
      <div className="dashboard-bg fixed top-0 left-0 w-full h-full z-[-2] bg-[url('image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2730%27%20height%3D%2730%27%20fill%3D%27none%27%20stroke%3D%27rgba%28255%2C255%2C255%2C0.02%29%27%20viewBox%3D%270%200%2030%2030%27%3E%3Cpath%20d%3D%27M0%2015h30M15%200v30%27%20fill%3D%27none%27%2F%3E%3C%2Fsvg%3E')] bg-[length:30px_30px]" />
      <div className="animated-gradient-bg fixed top-0 left-0 w-full h-full z-[-1] opacity-15 bg-gradient-conic from-red-500 via-yellow-500 to-cyan-500 blur-[80px] animate-gradient-shift" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Notifications
            </span>
          </h1>
          <p className="text-gray-400 mt-2">
            Recent alerts, updates, and activity from your workspace.
          </p>
        </header>

        {/* Main Content */}
        <div className="space-y-4">
          {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <GlassCard key={i} className="h-24 animate-pulse bg-white/5">
                <div className="h-full w-full rounded bg-white/5" />
              </GlassCard>
            ))}
          </div>
          ) : error ? (
            <GlassCard className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-3" />
              <p className="text-yellow-300">{error}</p>
            </GlassCard>
          ) : notifications.length === 0 ? (
            <GlassCard className="text-center py-12">
              <Bell className="mx-auto h-16 w-16 text-gray-500/50 mb-4" />
              <p className="text-gray-400 text-lg">No notifications yet.</p>
              <p className="text-gray-500 mt-2 text-sm">
                You’ll see cost alerts, workspace joins, tool updates, and more here.
              </p>
            </GlassCard>
          ) : (
            notifications.map((notif) => (
              <GlassCard
                key={notif.id}
                className={`transition-all duration-200 ${
                  !notif.read ? 'ring-1 ring-blue-500/30 bg-blue-500/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex-shrink-0">
                    {getIconByType(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className={`font-semibold ${notif.read ? 'text-gray-300' : 'text-white'}`}>
                        {notif.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        notif.type === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                        notif.type === 'error' ? 'bg-red-500/20 text-red-300' :
                        notif.type === 'success' ? 'bg-green-500/20 text-green-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm ${notif.read ? 'text-gray-400' : 'text-gray-200'}`}>
                      {notif.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{formatTimeAgo(notif.timestamp)}</span>
                      {!notif.read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
