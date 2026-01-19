import React from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Regsiteration";
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
import FetchDetails from "./components/FetchData";
import MyClusters from "./components/Cluster"
import Workflow from "./components/WorkFlow";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/sidebar" element={<Sidebar />}>
        <Route path="executer" element={<Executer />} />
        {/* <Route path="fetch-data" element={<FetchDetails/>} /> */}
        <Route path="work-space" element={<Workspace/>} />
        <Route path="cloud-connector" element={<CloudConnector />} />
        <Route path="control-center" element={<ControlCenter/>} />
        <Route path="scm-connector" element={<SCMConnector/>} />
        <Route path="toolsUI" element={<ToolsUI/>} />
        <Route path="toolsUI/gitlab" element={<GitLabInfo/>} />
        <Route path="dash-board" element={<Dashboard/>} />
        <Route path="database" element={<DatabaseCards/>} />
        <Route path="work-flow" element={<Workflow/>} />
        <Route path="clusters" element={<MyClusters/>} />
      </Route>
    </Routes>
  );
}

export default App;
