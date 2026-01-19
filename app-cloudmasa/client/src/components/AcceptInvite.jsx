// src/components/AcceptInvite.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AcceptInvite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const email = params.get('email');
  const role = params.get('role');

  useEffect(() => {
    // ✅ Store invite context ONLY (no auth here)
    if (email) {
      localStorage.setItem('invite_email', email);
    }
    if (role) {
      localStorage.setItem('invite_role', role);
    }

    // ❗ ALWAYS go to login (Google / password decides auth)
    navigate('/login', { replace: true });
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');

    axios.post('/api/invite/accept?token=' + token)
      .then(() => navigate('/login'))
      .catch(() => alert('Invite invalid'));
  }, []);


  return <p>Redirecting to login...</p>;
};

export default AcceptInvite;
