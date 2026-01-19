// src/components/workflow/ProviderSelector.jsx
import React from 'react';
import { Cloud } from 'lucide-react';
import { providers } from './constants'; // ✅ import from constants

const ProviderSelector = ({ onSelectProvider }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
      {providers.map((provider) => (
        <div
          key={provider.id}
          onClick={() => onSelectProvider(provider.id)}
          className={`cursor-pointer p-6 bg-[#2A4C83] border-2 ${provider.color} rounded-xl shadow transition duration-200 text-center hover:shadow-lg hover:scale-105`}
        >
          <img
            src={provider.icon}
            alt={provider.name}
            className={`mx-auto mb-3 object-contain ${provider.size || 'w-14 h-14'}`}
          />
          <h2 className="text-xl font-semibold text-white">{provider.name}</h2>
          <p className="text-sm text-gray-300 mt-2">{provider.description}</p>
        </div>
      ))}
    </div>
  );
};

export default ProviderSelector;
