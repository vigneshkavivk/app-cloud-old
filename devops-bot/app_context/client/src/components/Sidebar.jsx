// import React, { useState, useEffect } from "react";
// import {
//   FaSlidersH, FaCubes, FaPlayCircle, FaServer, FaClipboardList,
//   FaBars, FaCloud, FaWrench, FaDatabase
// } from "react-icons/fa";
// import { GiNetworkBars } from "react-icons/gi";
// import {
//   MdDashboard, MdBusiness, MdSettings, MdLogout, MdCloudCircle
// } from "react-icons/md";
// import { Link, Outlet, useLocation } from "react-router-dom";
// import CloudMasaLogo from '../assets/cloudmasa.png';



// const Sidebar = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [userName, setUserName] = useState('');

//   const toggleSidebar = () => setIsOpen(!isOpen);

//   const handleLogout = () => {
//     localStorage.removeItem('user');
//     window.location.href = '/login';
//   };

//   // Retrieve user name from localStorage on mount
//   useEffect(() => {
//     const storedUser = localStorage.getItem('user');
//     if (storedUser) {
//       try {
//         const user = JSON.parse(storedUser);
//         setUserName(user.name || '');
//       } catch (err) {
//         console.error("Error parsing user from localStorage", err);
//       }
//     }
//   }, []);

//   return (
//     <div className="flex h-screen font-roboto text-gray-800">
//       {/* Toggle button for small screens */}
//       <button
//         onClick={toggleSidebar}
//         className="lg:hidden absolute top-4 left-4 z-50 bg-white p-2 rounded-md shadow-md"
//       >
//         <FaBars />
//       </button>

//       {/* Sidebar */}
//       <div className={`${isOpen ? "block" : "hidden"} lg:block`}>
//         <div className="flex flex-col h-screen w-64 bg-gradient-to-br from-[#2e4367] via-[#0f172a] to-[#1c1f2a] text-white p-5 rounded-tr-3xl rounded-br-3xl shadow-lg overflow-y-auto">
          
//           {/* Logo */}
//           <div className="flex items-center mb-8">
//             <img 
//               src={CloudMasaLogo} 
//               alt="CloudMasa Logo"
//               className="w-10 h-10 rounded-full mr-3 shadow-md"
//             />
//             <h1 className="text-2xl font-bold">CloudMasa</h1>
//           </div>

//           {/* User Greeting */}
//           {userName && (
//             <div className="mb-6 text-white text-sm font-medium">
//               Welcome, <span className="font-semibold">{userName}</span>
//             </div>
//           )}

//           {/* Navigation */}
//           <nav className="flex flex-col gap-2 text-base font-medium flex-grow">
//             <SidebarItem title="Dashboard" icon={<MdDashboard />} to="/sidebar/dash-board" />
//             <SidebarItem title="Workspace" icon={<MdBusiness />} to="/sidebar/work-space" />
//             <SidebarItem title="Clusters" icon={<MdCloudCircle />} to="/sidebar/clusters" />
//             <SidebarItem title="Work Flow" icon={<FaDatabase />} to="/sidebar/work-flow" />
//             <SidebarItem title="Cloud Connector" icon={<FaCloud />} to="/sidebar/cloud-connector" />
//             <SidebarItem title="SCM Connector" icon={<GiNetworkBars />} to="/sidebar/scm-connector" />
//             <SidebarItem title="Tools" icon={<FaWrench />} to="/sidebar/toolsUI" />
//             <SidebarItem title="Database" icon={<FaDatabase />} to="/sidebar/database" />
//             <SidebarItem title="Control Center" icon={<FaSlidersH />} />
//             <SidebarItem title="Modules" icon={<FaCubes />} />
//             <SidebarItem title="Executer" icon={<FaPlayCircle />} />
//             <SidebarItem title="Resources" icon={<FaServer />} />
//             <SidebarItem title="Policies" icon={<FaClipboardList />} />
//             <SidebarItem title="Configuration" icon={<MdSettings />} />
//           </nav>

//           {/* Logout Button */}
//           <div className="mt-6">
//             <button
//               onClick={handleLogout}
//               className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-semibold py-2 px-4 rounded-xl shadow transition-all"
//             >
//               <MdLogout size={20} /> Logout
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Main content area */}
//       <div className="flex-1 h-screen overflow-y-auto bg-gradient-to-br from-[#f0f4ff] via-white to-[#e4ecff] p-4 sm:p-6">
//         <Outlet />
//       </div>
//     </div>
//   );
// };

// const SidebarItem = ({ title, icon, to }) => {
//   const location = useLocation();
//   const isActive = to && location.pathname === to;

//   const baseClasses = "flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200";
//   const activeClasses = isActive
//     ? "bg-blue-500 text-white font-semibold shadow"
//     : "text-gray-300";

//   return to ? (
//     <Link to={to} className={`${baseClasses} ${activeClasses}`}>
//       <span className="text-lg">{icon}</span>
//       <span className="truncate">{title}</span>
//     </Link>
//   ) : (
//     <div className={`${baseClasses} ${activeClasses}`}>
//       <span className="text-lg">{icon}</span>
//       <span className="truncate">{title}</span>
//     </div>
//   );
// };

// export default Sidebar;


import React, { useState, useEffect } from "react";
import {
  FaSlidersH, FaCubes, FaPlayCircle, FaServer, FaClipboardList,
  FaBars, FaCloud, FaWrench, FaDatabase
} from "react-icons/fa";
import { GiNetworkBars } from "react-icons/gi";
import {
  MdDashboard, MdBusiness, MdSettings, MdLogout, MdCloudCircle
} from "react-icons/md";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import CloudMasaLogo from '../assets/cloudmasa.png';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || '');
      } catch (err) {
        console.error("Error parsing user from localStorage", err);
      }
    }
  }, []);

  return (
    <div className="flex h-screen font-sans text-gray-800 dark:text-white">
      {/* Toggle button for small screens */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden absolute top-4 left-4 z-50 bg-cloudWhite dark:bg-slate-800 p-2 rounded-md shadow-md"
      >
        <FaBars />
      </button>

      {/* Sidebar */}
      <div className={`${isOpen ? "block" : "hidden"} lg:block`}>
        <div className="flex flex-col h-screen w-64 bg-cloudBlue dark:bg-slate-800 text-gray-900 dark:text-white p-5 rounded-tr-3xl rounded-br-3xl shadow-lg overflow-y-auto transition-all duration-300">

          {/* Logo */}
          <div className="flex items-center mb-8">
            <img 
              src={CloudMasaLogo} 
              alt="CloudMasa Logo"
              className="w-10 h-10 rounded-full mr-3 shadow-md"
            />
            <h1 className="text-2xl font-bold text-black dark:text-white">CloudMasa</h1>
          </div>

          {/* User Greeting */}
          {userName && (
            <div className="mb-6 text-sm font-medium">
              Welcome, <span className="font-semibold">{userName}</span>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex flex-col gap-2 text-base font-medium flex-grow">
            <SidebarItem title="Dashboard" icon={<MdDashboard />} to="/sidebar/dash-board" />
            <SidebarItem title="Workspace" icon={<MdBusiness />} to="/sidebar/work-space" />
            <SidebarItem title="Clusters" icon={<MdCloudCircle />} to="/sidebar/clusters" />
            <SidebarItem title="Work Flow" icon={<FaDatabase />} to="/sidebar/work-flow" />
            <SidebarItem title="Cloud Connector" icon={<FaCloud />} to="/sidebar/cloud-connector" />
            <SidebarItem title="SCM Connector" icon={<GiNetworkBars />} to="/sidebar/scm-connector" />
            <SidebarItem title="Tools" icon={<FaWrench />} to="/sidebar/toolsUI" />
            <SidebarItem title="Database" icon={<FaDatabase />} to="/sidebar/database" />
            <SidebarItem title="Control Center" icon={<FaSlidersH />} />
            <SidebarItem title="Modules" icon={<FaCubes />} />
            <SidebarItem title="Executer" icon={<FaPlayCircle />} />
            <SidebarItem title="Resources" icon={<FaServer />} />
            <SidebarItem title="Policies" icon={<FaClipboardList />} />
            <SidebarItem title="Configuration" icon={<MdSettings />} />
          </nav>

          {/* Theme Toggle Button */}
          <div className="mt-4 mb-2 flex justify-center">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-cloudHighlight dark:bg-sky-700 text-white rounded-lg transition"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className="text-sm">{theme === 'dark' ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>

          {/* Logout Button */}
          <div className="mt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-semibold py-2 px-4 rounded-xl shadow transition-all"
            >
              <MdLogout size={20} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 h-screen overflow-y-auto bg-cloudWhite dark:bg-gray-900 p-4 sm:p-6 transition-all duration-300">
        <Outlet />
      </div>
    </div>
  );
};

const SidebarItem = ({ title, icon, to }) => {
  const location = useLocation();
  const isActive = to && location.pathname === to;

  const baseClasses = "flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-200";
  const activeClasses = isActive
    ? "bg-cloudHighlight text-white font-semibold shadow"
    : "hover:bg-cloudGray dark:hover:bg-slate-700";

  return to ? (
    <Link to={to} className={`${baseClasses} ${activeClasses}`}>
      <span className="text-lg">{icon}</span>
      <span className="truncate">{title}</span>
    </Link>
  ) : (
    <div className={`${baseClasses} ${activeClasses}`}>
      <span className="text-lg">{icon}</span>
      <span className="truncate">{title}</span>
    </div>
  );
};

export default Sidebar;
