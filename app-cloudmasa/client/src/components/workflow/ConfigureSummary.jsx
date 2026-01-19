// src/components/workflow/ConfigureSummary.jsx
import React from 'react';
import { Settings, DollarSign, Code } from 'lucide-react';
import { providers, modules } from './constants';

const ConfigureSummary = ({
  selectedProvider,
  formData,
  selectedAccount,
  selectedModules,
  modules,
  estimatedCost,
  showIacPreview,
  setShowIacPreview,
  iacCode,
}) => {
  const selectedModuleObjects = selectedModules.map(id =>
    modules[selectedProvider]?.find(m => m.id === id)
  ).filter(Boolean);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Settings className="mr-2 text-orange-400" /> Configuration Summary
      </h2>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
        <h3 className="font-medium mb-2">Provider Details</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-400">Provider:</div>
          <div>{selectedProvider.toUpperCase()}</div>
          <div className="text-gray-400">Region:</div>
          <div>{formData.region}</div>
          {selectedAccount && (
            <>
              <div className="text-gray-400">Account ID:</div>
              <div>{selectedAccount.accountId}</div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Selected Modules</h3>
          <span className="text-xs text-gray-400">{selectedModules.length} selected</span>
        </div>
        {selectedModules.length > 0 ? (
          <div className="space-y-3">
            {selectedModuleObjects.map((module) => (
              <div key={module.id} className="p-2 bg-[#2A4C83] rounded-lg">
                <div className="flex items-center">
                  <div className="mr-2">{module.icon}</div>
                  <div>
                    <h4 className="text-sm font-medium">{module.name}</h4>
                    <p className="text-xs text-gray-400">{module.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-300">No modules selected</p>
        )}
      </div>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b] mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium flex items-center">
            <DollarSign className="mr-1 text-green-400" size={18} /> Estimated Cost
          </h3>
        </div>
        <p className="text-xl font-bold text-green-400">
          ${estimatedCost.toFixed(2)}<span className="text-sm font-normal text-gray-300">/month</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Estimated based on standard pricing. Actual costs may vary.
        </p>
      </div>

      <div className="bg-[#1E2633] p-4 rounded-lg border border-[#3a5b9b]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium flex items-center">
            <Code className="mr-1 text-orange-400" size={18} /> Infrastructure as Code
          </h3>
          <button
            className="text-xs bg-[#2A4C83] hover:bg-[#3a5b9b] py-1 px-2 rounded"
            onClick={() => setShowIacPreview(!showIacPreview)}
          >
            {showIacPreview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>
        {showIacPreview && (
          <div className="bg-[#1E2633] p-3 rounded border border-[#3a5b9b] mt-2 max-h-60 overflow-y-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{iacCode}</pre>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Preview the Terraform code that will be used to provision your resources.
        </p>
      </div>
    </div>
  );
};

export default ConfigureSummary;