// src/Tools/GrafanaDashboard.jsx
import React from 'react';

const GrafanaDashboard = () => {
  return (  
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-6">📊 Grafana Monitoring Dashboard</h1>
      <div className="bg-black border border-gray-700 rounded-lg h-[80vh]">
        <iframe
          src="http://localhost:3000" // ⚠️ REPLACE WITH YOUR GRAFANA URL
          width="100%"
          height="100%"
          frameBorder="0"
          title="Grafana Dashboard"
          className="rounded-lg"
        ></iframe>
      </div>
    </div>
  );
};

export default GrafanaDashboard;