// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
// Icons
import {
  FaBars,
  FaServer
} from "react-icons/fa";
import { GiNetworkBars } from "react-icons/gi";
import {
  MdDashboard,
  MdBusiness,
  MdLogout,
  MdPolicy,
  MdAutoGraph,
  MdSecurity  // 👈 ADDED
} from "react-icons/md";
import {
  TbRobot,
  TbCloud,
  TbTool,
  TbDatabase
} from "react-icons/tb";

// Other imports
import { Link, Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import CloudMasaLogo from '../assets/cloudmasa.png';

const navItems = [
  { title: "Dashboard", icon: <MdDashboard className="text-sm" />, to: "/sidebar" },
  { title: "Workspace", icon: <MdBusiness className="text-sm" />, to: "/sidebar/work-space" },
  { title: "Cloud Connector", icon: <TbCloud className="text-sm" />, to: "/sidebar/cloud-connector" },
  { title: "Clusters", icon: <FaServer className="text-base" />, to: "/sidebar/clusters" },
  { title: "Work Flow", icon: <MdAutoGraph className="text-base" />, to: "/sidebar/work-flow" },
  { title: "SCM Connector", icon: <GiNetworkBars className="text-base" />, to: "/sidebar/scm-connector" },
  { title: "Tools", icon: <TbTool className="text-base" />, to: "/sidebar/toolsUI" },
  { title: "Database", icon: <TbDatabase className="text-base" />, to: "/sidebar/database" },
  { title: "Policies", icon: <MdPolicy className="text-base" />, to: "/sidebar/policies" },
  { title: "MaSa Bot", icon: <TbRobot className="text-base" />, to: "/sidebar/MaSa-bot" },
  { title: "Security Management", icon: <MdSecurity className="text-base" />, to: "/sidebar/security-management" },
];

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState(''); // 👈 Added for role
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };



  useEffect(() => {
  // 🔑 Check URL for token (OAuth redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');

  if (tokenFromUrl) {
    // Save token
    localStorage.setItem('token', tokenFromUrl);

    // Decode JWT to get user (payload is 2nd part)
    try {
      const payload = JSON.parse(atob(tokenFromUrl.split('.')[1]));
      const userFromToken = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        token: tokenFromUrl
      };
      localStorage.setItem('user', JSON.stringify(userFromToken));
      
      // Clean URL (remove ?token=...)
      window.history.replaceState({}, document.title, '/sidebar');
    } catch (e) {
      console.error('Failed to parse JWT token');
    }
  }

  // Load user from localStorage (for regular login)
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      setUserName(user.name || '');
      setUserRole(user.role || 'User');
    } catch (err) {
      console.error("Error parsing user from localStorage", err);
    }
  }
}, []);

  return (
    <div className="flex h-screen font-sans text-gray-800 dark:text-white relative">
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden absolute top-4 left-4 z-50 bg-white dark:bg-slate-800 p-2 rounded-md shadow-md"
      >
        <FaBars className="text-black dark:text-white" />
      </button>

      {/* Sidebar — Always dark */}
      <div className={`${isOpen ? "block" : "hidden"} lg:block`}>
      <div className="flex flex-col h-screen w-64 bg-[#0f172a] text-white p-5 shadow-lg overflow-y-auto transition-all duration-300">

          {/* Logo + Title */}
          <div className="flex items-center mb-8">
            <img
              src={CloudMasaLogo}
              alt="CloudMaSa Logo"
              className="w-10 h-10 rounded-full mr-3 shadow-md"
            />
            <h1 className="text-3xl font-bold gradient-logo-title">CloudMaSa</h1>
          </div>

          {/* Welcome + Name + Role — Updated */}
          {userName && (
            <div className="mb-6 text-center">
              {/* Welcome line */}
              <div className="text-lg font-medium">
                <span className="blue-gradient-text font-semibold">Welcome</span>,{' '}
                <span className="red-orange-gradient-text">{userName}</span>
              </div>

              {/* Role — Green to Blue Gradient, no "Role:" prefix, clean & centered */}
              {userRole && (
              <div className="mt-2  ">
                <span className="role-neutral-gradient-text">
                  [{userRole}]
                </span>
              </div>
            )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex flex-col gap-3 flex-grow">
            {navItems.map((item) => (
              <GradientButtonLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                title={item.title}
                isActive={location.pathname === item.to}
              />
            ))}
          </nav>

          {/* Theme Toggle */}


          {/* Logout */}
          <div>
            <button
              onClick={handleLogout}
              className="gradient-logout-button w-full py-3 text-sm font-bold"
            >
              <span className="flex items-center justify-center gap-2">
                <MdLogout size={18} />
                <span className="gradient-text">Logout</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 h-screen overflow-y-auto p-4 sm:p-6 bg-gray-900">
        <Outlet context={{ username: userName }} />
      </div>

      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* --- NAV BUTTONS (Blue → Cyan → Blue) --- */
        .gradient-button {
          position: relative;
          padding: 12px 16px;
          font-size: 15px;
          font-weight: 600;
          color: white;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 50px;
          overflow: hidden;
          transition: transform 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 100%;
          text-decoration: none;
          box-sizing: border-box;
          text-align: left;
          gap: 12px;
        }

        .gradient-button:hover {
          transform: scale(1.02);
        }

        .gradient-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, #60a5fa, #2dd4bf, #3b82f6);
          z-index: -2;
          filter: blur(8px);
          transition: transform 1.5s ease-in-out;
        }

        .gradient-button:hover::before {
          transform: scale(1.05);
        }

        .gradient-button::after {
          content: "";
          position: absolute;
          inset: 2px;
          background: #0f172a;
          border-radius: 48px;
          z-index: -1;
        }

        .gradient-button .gradient-text {
          color: transparent;
          background: linear-gradient(to right, #60a5fa, #2dd4bf, #3b82f6);
          background-clip: text;
          -webkit-background-clip: text;
        }

        .gradient-button:hover .gradient-text {
          animation: hue-rotating 2s linear infinite;
        }

        .gradient-button:active {
          transform: scale(0.99);
        }

        .gradient-button.active {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
          transform: scale(1.03);
          border: 2px solid rgba(59, 130, 246, 0.4);
        }

        /* --- LOGOUT BUTTON (Red → Orange) --- */
        .gradient-logout-button {
          position: relative;
          padding: 14px 20px;
          font-size: 17px;
          font-weight: 600;
          color: white;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 50px;
          overflow: hidden;
          transition: transform 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          text-decoration: none;
          box-sizing: border-box;
        }

        .gradient-logout-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to right, #ef4444, #f59e0b);
          z-index: -2;
          filter: blur(8px);
        }

        .gradient-logout-button .gradient-text {
          color: transparent;
          background: linear-gradient(to right, #ef4444, #f59e0b);
          background-clip: text;
          -webkit-background-clip: text;
        }

        /* --- LOGO & TITLE (Red → Orange) --- */
        .gradient-logo-title {
          color: transparent;
          background: linear-gradient(to right, #ef4444, #f59e0b);
          background-clip: text;
          -webkit-background-clip: text;
          font-weight: bold;
          font-size: 1.875rem;
        }

        /* 🔵 BLUE GRADIENT FOR 'Welcome' */
        .blue-gradient-text {
          background: linear-gradient(to right, #60a5fa, #2dd4bf, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: bold;
          font-size: 1.125rem;
        }

        /* 🟠 RED–ORANGE GRADIENT FOR USERNAME */
        .red-orange-gradient-text {
          background: linear-gradient(to right, #ef4444, #f59e0b);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: bold;
          font-size: 1.125rem;
        }

        .yellow-gradient-text {
          background: linear-gradient(to right, #f59e0b, #fbbf24); /* Amber to Yellow */
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: bold;
          font-size: 1rem; /* 👈 Larger than before */
          text-align: center; /* 👈 Ensure center alignment */
        }

        /* ⚪⚪⚪ Grey → White Neutral Gradient for Role — Refined & Subtle */
      .role-neutral-gradient-text {
        background: linear-gradient(
          to right,
          #94a3b8,        /* slate-400 — soft readable grey */
          #cbd5e1,        /* slate-300 — lighter mid-tone */
          #ffffff         /* pure white — clean finish */
        );
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: 600;   /* semibold — keeps clarity without bold heaviness */
        font-size: 0.875rem; /* text-sm = 14px (as you requested smaller size) */
      }

        @keyframes hue-rotating {
          to {
            filter: hue-rotate(360deg);
          }
        }
      `}} />
    </div>
  );
};

const GradientButtonLink = ({ to, icon, title, isActive }) => {
  return (
    <Link to={to} className={`gradient-button ${isActive ? 'active' : ''}`}>
      {React.cloneElement(icon, { size: 20, className: "text-white" })}
      <span className="gradient-text">{title}</span>
    </Link>
  );
};

export default Sidebar;
