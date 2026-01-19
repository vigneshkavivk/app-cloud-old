// src/App.jsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import Register from "./components/Regsiteration";
import ClusterPage from "./components/ClustersPage";
import NotificationsPage from "./components/NotificationsPage";
import ClusterConfigPage from "./components/ClusterConfigPage";
import AuthCallback from "./components/AuthCallback";

// Sidebar Layout Pages
import Sidebar from "./components/Sidebar";
import Executer from "./components/Executer";
import CloudConnector from "./components/CloudConnect";
import SCMConnector from "./components/SCMConnet";
import ControlCenter from "./components/ControlCenter";
import Dashboard from "./components/DashBoard";
import Workspace from "./components/WorkSpace";
import ToolsUI from "./components/ToolsUI";
import GitLabInfo from "./components/GittLAbInfo";
import DatabaseCards from "./components/Database";
import MCPBot from './components/MCPBot';
import Workflow from "./components/workflow/CloudWorkflow";
import Policies from './components/Policies';
import SecurityManagement from "./components/SecurityManagement";  // 👈 THIS LINE

// Standalone Dashboards
import GrafanaDashboard from "./Tools/GrafanaDashboard";
import PrometheusDashboard from "./Tools/PrometheusDashboard";

// Floating Help Robot
import HelpdeskRobot from "./components/HelpdeskRobot";

function App() {
  return (
    <>
      <HelpdeskRobot />
      <Routes>
        {/* 🔓 Public Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/register" element={<Register />} />

        {/* 🔒 Protected: Standalone Create Cluster (NO SIDEBAR) */}
        <Route
          path="/clusters/create"
          element={
            <ProtectedRoute>
              <ClusterPage />
            </ProtectedRoute>
          }
        />

        {/* 🔒 Protected: Sidebar Layout */}
        <Route
          path="/sidebar/*"
          element={
            <ProtectedRoute>
              <Sidebar />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="executer" element={<Executer />} />
          <Route path="work-space" element={<Workspace />} />
          <Route path="cloud-connector" element={<CloudConnector />} />
          <Route path="control-center" element={<ControlCenter />} />
          <Route path="scm-connector" element={<SCMConnector />} />
          <Route path="toolsUI" element={<ToolsUI />} />
          <Route path="toolsUI/gitlab" element={<GitLabInfo />} />
          <Route path="dash-board" element={<Dashboard />} />
          <Route path="database" element={<DatabaseCards />} />
          <Route path="work-flow/*" element={<Workflow />} />
          <Route path="mcp-bot" element={<MCPBot />} />
          <Route path="clusters" element={<ClusterPage />} />
          <Route path="clusters/:id/config" element={<ClusterConfigPage />} />
          <Route path="policies" element={<Policies />} />
          <Route path="security-management" element={<SecurityManagement />} />
        </Route>

        {/* Standalone Dashboard Routes */}
        <Route path="/dashboard/grafana" element={<GrafanaDashboard />} />
        <Route path="/dashboard" element={<Navigate to="/sidebar" replace />} />
        <Route path="/dashboard/prometheus" element={<PrometheusDashboard />} />

         {/* ✅ ADD THIS NEW ROUTE HERE */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* ❌ 404 Catch-all */}
        <Route
          path="*"
          element={
            <div className="p-8 text-center text-white bg-red-900">
              <h1>404 - Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
            </div>
          }
        />
      </Routes>
    </>
  )
}

export default App;
