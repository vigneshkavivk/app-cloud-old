import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaGitlab, FaBitbucket } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import cloudmasaLogo from '../assets/cloudmasa.png';
import axios from 'axios';
import api from '../interceptor/api.interceptor';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOAuthLogin = (provider) => {
    // Consider adding state parameter for CSRF protection
    window.location.href = `https://api.cloudmasa.com/auth/${provider}?redirect_uri=${window.location.origin}/oauth/callback`;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const { email, password } = formData;

  // Step 2: Debug login payload
  console.log('Sending login:', { email, password });

  // Basic validation
  if (!email || !password) {
    toast.error('Email and password are required!');
    return;
  }

  // Email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast.error('Please enter a valid email address');
    return;
  }

  setLoading(true);
  setError('');

  try {
    const response = await api.post('http://localhost:3000/api/auth/login', {
      email,
      password
    });

    toast.success('Login successful! Redirecting...');
    
    // Store user data in localStorage  
    localStorage.setItem('user', JSON.stringify({
      name: response.data.user.name,
      email: response.data.user.email,
      token: response.data.token // JWT token
    }));
    
    // Redirect to dashboard or home page
    setTimeout(() => navigate('/sidebar'), 1500);
    
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error.response?.data?.message || 'An error occurred during login';
    setError(errorMessage);
    toast.error(errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen flex-col justify-center items-center bg-[#1E2633] px-6 py-12">
      <div className="absolute top-4 left-4 flex items-center">
        <img src={cloudmasaLogo} alt="CloudMaSa Logo" className="h-8 mr-2" />
        <span className="text-2xl font-bold text-white">CloudMaSa</span>
      </div>

      <div className="sm:w-full sm:max-w-sm bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-center text-2xl font-bold text-[#1E2633]">Sign in to your account</h2>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => handleOAuthLogin('google')}
            className="flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm border border-gray-300 hover:bg-gray-100"
            disabled={loading}
          >
            <FcGoogle className="mr-2 text-lg" /> Google
          </button>
          <button
            onClick={() => handleOAuthLogin('github')}
            className="flex items-center justify-center rounded-md bg-[#1E2633] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A4C83]"
            disabled={loading}
          >
            <FaGithub className="mr-2 text-lg" /> GitHub
          </button>
          <button
            onClick={() => handleOAuthLogin('gitlab')}
            className="flex items-center justify-center rounded-md bg-[#F26A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d15b22]"
            disabled={loading}
          >
            <FaGitlab className="mr-2 text-lg" /> GitLab
          </button>
          <button
            onClick={() => handleOAuthLogin('bitbucket')}
            className="flex items-center justify-center rounded-md bg-[#2A4C83] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3a6d]"
            disabled={loading}
          >
            <FaBitbucket className="mr-2 text-lg" /> Bitbucket
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1E2633]">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full border border-gray-300 py-2 px-4 rounded-md text-[#1E2633] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A4C83]"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1E2633]">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full border border-gray-300 py-2 px-4 rounded-md text-[#1E2633] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2A4C83]"
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-[#2A4C83] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E2633] transition flex justify-center items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-gray-600">
          <Link 
            to="/register" 
            className="font-semibold text-[#2A4C83] hover:text-[#1E2633]"
            onClick={(e) => loading && e.preventDefault()}
          >
            Need An Account? <span className="underline">Sign up</span>
          </Link>
        </div>
        <div className="text-sm mt-2 text-center">
          <Link 
            to="/forgot-password" 
            className="font-semibold text-[#2A4C83] hover:text-[#1E2633]"
            onClick={(e) => loading && e.preventDefault()}
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <ToastContainer 
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default Login;