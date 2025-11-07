// src/components/MCPBot.jsx
import React from 'react';

const MCPBot = () => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="text-center p-8 rounded-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 max-w-md mx-4">
        <h1 className="text-3xl font-bold text-orange-500 mb-4">🚧 Coming Soon</h1>
        <p className="text-gray-300 text-lg">
          The MaSa Bot Assistant is under development.
        </p>
        <p className="text-gray-400 mt-2 text-sm">
          Stay tuned for an intelligent Kubernetes & cloud assistant!
        </p>
      </div>
    </div>
  );
};

export default MCPBot;
