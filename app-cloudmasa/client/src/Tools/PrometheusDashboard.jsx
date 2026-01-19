// src/Tools/PrometheusDashboard.jsx
import React from 'react';

const PrometheusDashboard = () => {
  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-white">📈 Prometheus Metrics Dashboard</h1>
      <div className="bg-black border border-gray-700 rounded-lg h-[80vh]">
        <iframe
          src="http://localhost:9090"
          width="100%"
          height="100%"
          frameBorder="0"
          title="Prometheus Dashboard"
          className="rounded-lg"
        ></iframe>
      </div>
    </div>
  );
};

export default PrometheusDashboard; // ✅ Now it matches! 