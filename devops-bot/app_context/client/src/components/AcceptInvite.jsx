import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AcceptInvite = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email');
  const role = params.get('role');

  useEffect(() => {
    if (email && role) {
      localStorage.setItem('cloudmasa_user_email', email);
      localStorage.setItem('cloudmasa_user_role', role);
      navigate('/dashboard');
    }
  }, [email, role]);

  return <p>Processing your invitation...</p>;
};

export default AcceptInvite;
