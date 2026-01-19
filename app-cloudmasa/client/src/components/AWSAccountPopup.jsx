// src/components/AWSAccountPopup.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import api from '../interceptor/api.interceptor';
import { useAuth } from '../hooks/useAuth';

const AWSAccountPopup = ({ handleClose, onAccountSelect }) => {
  const { hasPermission } = useAuth();
  const canViewCredentials = hasPermission('Credentials', 'View');

  if (!canViewCredentials) {
    return (
      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
        maxWidth: '500px',
        margin: '40px auto',
        color: '#333',
        textAlign: 'center'
      }}>
        <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-500 mb-2">Access Denied</h3>
        <p className="text-gray-600">
          You need <span className="font-mono">Credentials.View</span> permission to view AWS accounts.
        </p>
        <button
          onClick={handleClose}
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    );
  }

  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSavedAccounts = async () => {
      try {
        // ✅ Use the correct backend endpoint
        const { data } = await api.get('/api/aws/get-aws-accounts');
        setSavedAccounts(data);
        if (data.length === 1) {
          setSelectedAccount(data[0]);
        }
      } catch (err) {
        console.error('Failed to fetch saved AWS accounts:', err);
        setError('Failed to load AWS accounts.');
      }
    };

    fetchSavedAccounts();
  }, []);

  const handleAccountSelect = () => {
    if (selectedAccount && onAccountSelect) {
      onAccountSelect(selectedAccount);
    }
  };

  const styles = {
    popup: {
      background: '#fff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      maxWidth: '700px',
      margin: '40px auto',
      color: '#333',
    },
    popupHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    popupTitle: {
      fontSize: '22px',
      margin: 0,
    },
    closeButton: {
      fontSize: '24px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
    },
    accountBox: {
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s',
    },
    accountBoxSelected: {
      border: '2px solid #4f46e5',
      backgroundColor: '#eef2ff',
    },
  };

  return (
    <div style={styles.popup}>
      <div style={styles.popupHeader}>
        <h2 style={styles.popupTitle}>Connected AWS Accounts</h2>
        <button onClick={handleClose} style={styles.closeButton}>&times;</button>
      </div>
      {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
      {savedAccounts.length === 0 ? (
        <p style={{ color: '#666' }}>No AWS accounts connected yet.</p>
      ) : (
        <div>
          {savedAccounts.map((account) => {
            const isSelected = selectedAccount?.accountId === account.accountId;
            return (
              <div
                key={account.accountId}
                style={{
                  ...styles.accountBox,
                  ...(isSelected ? styles.accountBoxSelected : {}),
                }}
                onClick={() => setSelectedAccount(account)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{account.accountId}</strong>
                    <p style={{ fontSize: '14px', margin: '5px 0' }}>Region: {account.awsRegion}</p>
                    <p style={{ fontSize: '12px', color: '#555' }}>User: {account.userId}</p>
                  </div>
                  {isSelected && <CheckCircle2 color="#22c55e" />}
                </div>
              </div>
            );
          })}
          <button
            onClick={handleAccountSelect}
            disabled={!selectedAccount}
            style={{
              marginTop: '15px',
              width: '100%',
              padding: '10px',
              backgroundColor: selectedAccount ? '#4f46e5' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: selectedAccount ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            Select Account
          </button>
        </div>
      )}
    </div>
  );
};

export default AWSAccountPopup;