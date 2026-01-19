// src/components/MCPBot.jsx
import React from 'react';

// 🔴 Replace with your actual bot URL

const BOT_IFRAME_URL = 'http://adda45508893248ab8ae56d5b36637c8-789915023.us-east-1.elb.amazonaws.com/';

const MCPBot = () => {
  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 overflow-hidden">
      <iframe
        src={BOT_IFRAME_URL}
        title="MCP Bot Assistant"
        className="w-full h-full border-0"
        style={{ minHeight: '100%', minWidth: '100%' }}
      />
    </div>
  );
};

export default MCPBot;