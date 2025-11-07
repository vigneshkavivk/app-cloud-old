import { useState } from "react";
import "./HelpdeskRobot.css";

export default function HelpdeskRobot() {
  const [open, setOpen] = useState(false);

  const FunnyRobotIcon = ({ size = 28 }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
    >
      <rect x="14" y="20" width="36" height="28" rx="6" ry="6" fill="#4f46e5" />
      <circle cx="24" cy="34" r="5" fill="white" />
      <circle cx="40" cy="34" r="5" fill="white" />
      <circle cx="24" cy="34" r="2" fill="#4f46e5" />
      <circle cx="40" cy="34" r="2" fill="#4f46e5" />
      <rect x="22" y="44" width="20" height="4" rx="2" ry="2" fill="#fff" />
      <line x1="32" y1="14" x2="32" y2="20" stroke="#4f46e5" strokeWidth="3" />
      <circle cx="32" cy="12" r="3" fill="#ef4444" />
    </svg>
  );

  return (
    <>
      {/* Floating Robot Button */}
      <div className="robot-btn-wrapper" onClick={() => setOpen(!open)}>
        <div className={`robot-btn ${open ? "active" : ""}`}>
          <FunnyRobotIcon size={60} />
          {!open && <div className="thinking-dot"></div>}
        </div>
      </div>

      {/* Popup Chat Window */}
      {open && (
        <div className="chat-popup">
          <div className="chat-header">
            <span className="chat-title">
              <FunnyRobotIcon size={22} /> CloudMasa Assistant
            </span>
            <button className="close-btn" onClick={() => setOpen(false)}>
              ✖
            </button>
          </div>

          <iframe
            src="http://localhost:8501"
            title="Helpdesk Assistant"
            className="chat-iframe"
          />
        </div>
      )}
    </>
  );
}
