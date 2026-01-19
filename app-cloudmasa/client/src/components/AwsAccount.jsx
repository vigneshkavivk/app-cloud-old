// src/components/AWSAccountsList.jsx
import React, { useEffect, useState } from "react";
import api from "../interceptor/api.interceptor";
import { useAuth } from "../hooks/useAuth";
import { Lock } from "lucide-react";

const AWSAccountsList = () => {
  const { hasPermission } = useAuth();
  const canViewCredentials = hasPermission('Credentials', 'View');

  if (!canViewCredentials) {
    return (
      <div className="max-w-md mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-lg text-center">
        <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-400 mb-2">Access Denied</h3>
        <p className="text-gray-400">
          You need <span className="font-mono">Credentials.View</span> permission to view AWS accounts.
        </p>
      </div>
    );
  }

  const [awsAccounts, setAwsAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  useEffect(() => {
    const fetchAwsAccounts = async () => {
      setLoading(true);
      try {
        // ✅ Use the correct endpoint that exists in your backend
        const response = await api.get("/api/aws/get-aws-accounts");
        setAwsAccounts(response.data);
      } catch (err) {
        setError("Failed to fetch AWS accounts");
      } finally {
        setLoading(false);
      }
    };

    fetchAwsAccounts();
  }, []);

  const handleAccountClick = (account) => {
    setSelectedAccount(account);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-lg">
      {selectedAccount ? (
        <div>
          <h3 className="text-xl font-semibold mb-2">Selected AWS Account</h3>
          <p><strong>Account ID:</strong> {selectedAccount.awsAccountNumber}</p>
          <p><strong>Alias:</strong> {selectedAccount.alias || 'N/A'}</p>
          <button
            onClick={() => setSelectedAccount(null)}
            className="mt-4 text-blue-400 hover:underline"
          >
            ← Back to accounts
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-semibold text-center mb-4" style={{ color: "#0ff" }}>
            Connected AWS Accounts
          </h2>

          {loading && <p className="text-center text-gray-400">Loading...</p>}
          {error && <p className="text-red-500 text-center">{error}</p>}

          <ul className="divide-y divide-gray-700">
            {awsAccounts.length === 0 && !loading && (
              <li className="p-4 text-gray-500">No AWS accounts connected.</li>
            )}
            {awsAccounts.map((account) => (
              <li
                key={account._id || account.awsAccountNumber}
                onClick={() => handleAccountClick(account)}
                className="p-4 cursor-pointer transition hover:bg-gray-800 rounded-md"
              >
                <p className="text-lg font-medium">
                  {account.alias || `Account ${account.awsAccountNumber}`}
                </p>
                <p className="text-gray-400">ID: {account.awsAccountNumber}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default AWSAccountsList;