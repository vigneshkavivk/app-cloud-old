// client/src/main.jsx
import React, { useEffect } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import App from './App.jsx';

function useSSOTokenHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Step 1: Fetch user profile
      fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(async (data) => {
          if (data.user) {
            let fullUser = { ...data.user, token };

            // 👇 Step 2: Fetch permissions (just like manual login)
            if (data.user.role !== 'super-admin') {
              try {
                const permRes = await fetch(
                  `/api/policies/roles/permissions?role=${encodeURIComponent(data.user.role)}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (permRes.ok) {
                  const permData = await permRes.json();
                  fullUser = { ...fullUser, permissions: permData.permissions || {} };
                }
              } catch (err) {
                console.warn('Failed to fetch permissions for SSO user:', err);
              }
            } else {
              // 👇 Super admin gets full permissions
              fullUser.permissions = {
                Overall: { Read: true, Administer: true },
                Credentials: { Create: true, View: true, Delete: true },
                Job: { Create: true, Read: true, Delete: true },
                Agent: { Configure: true, Provision: true, Read: true, Delete: true }
              };
            }

            // 👇 Save FULL user (with permissions!)
            localStorage.setItem('user', JSON.stringify(fullUser));
            localStorage.setItem('token', token);

            window.history.replaceState({}, document.title, '/sidebar');
            navigate('/sidebar', { replace: true });
          }
        })
        .catch(err => {
          console.error('SSO failed:', err);
          window.history.replaceState({}, document.title, '/');
          navigate('/', { replace: true });
        });
    }
  }, [navigate]);
}

function AppWithAuth() {
  useSSOTokenHandler();
  return <App />;
}

const root = document.getElementById('root');
createRoot(root).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppWithAuth />
    </BrowserRouter>
  </StrictMode>
);
