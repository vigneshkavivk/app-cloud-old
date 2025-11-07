// src/App.jsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth & Main Pages
import Login from "./components/Login";
import Register from "./components/Regsiteration";

// Cluster Page
import ClusterPage from "./components/ClustersPage";

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
import Workflow from "./components/WorkFlow";
import Policies from './components/Policies'; 
// Standalone Dashboards
import GrafanaDashboard from "./Tools/GrafanaDashboard";
import PrometheusDashboard from "./Tools/PrometheusDashboard";

// Floating Help Robot
import HelpdeskRobot from "./components/HelpdeskRobot";

function App() {
  return (
    <>
      {/* Floating Helpdesk Robot (always visible) */}
      <HelpdeskRobot />

      {/* Main Routes */}
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Sidebar Nested Routes */}
        <Route path="/sidebar/*" element={<Sidebar />}>
          {/* ✅ DEFAULT ROUTE — renders on /sidebar */}
          <Route index element={<Dashboard />} />

          {/* Other nested routes */}
          <Route path="executer" element={<Executer />} />
          <Route path="work-space" element={<Workspace />} />
          <Route path="cloud-connector" element={<CloudConnector />} />
          <Route path="control-center" element={<ControlCenter />} />
          <Route path="scm-connector" element={<SCMConnector />} />
          <Route path="toolsUI" element={<ToolsUI />} />
          <Route path="toolsUI/gitlab" element={<GitLabInfo />} />
          <Route path="dash-board" element={<Dashboard />} /> {/* kept for backward compatibility */}
          <Route path="database" element={<DatabaseCards />} />
          <Route path="work-flow" element={<Workflow />} />
          <Route path="mcp-bot" element={<MCPBot />} />
          <Route path="clusters" element={<ClusterPage />} />
        </Route>
          <Route path="/sidebar/*"element={<ProtectedRoute><Sidebar /></ProtectedRoute>}/>
          <Route path="/sidebar/policies" element={<Policies />} />

        {/* Standalone Dashboard Routes */}
        <Route path="/dashboard/grafana" element={<GrafanaDashboard />} />
        <Route path="/dashboard/prometheus" element={<PrometheusDashboard />} />
        
        {/* Catch-all 404 Route */}
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
  );
}

export default App;
