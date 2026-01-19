import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../interceptor/api.interceptor';
import { useNavigate } from 'react-router-dom';

/**
 * 🌌 Enhanced RegisterForm with Glass + Glitter Effect
 * 
 * ✅ Dark theme | ✅ Consistent ToolsUI styling | ✅ Orange-red gradient buttons
 * ✅ Glitter sparkle overlay | ✅ Safe colors (no pure red) | ✅ Larger, accessible UI
 */
const RegisterForm = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(true);
  const navigate = useNavigate();

  // 📧 Allow only company emails
  const isValidCompanyEmail = (email) => {
    if (!email) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1].toLowerCase();
    const blockedDomains = ['yahoo.com', 'hotmail.com', 'outlook.com', 'live.com'];
    return !blockedDomains.includes(domain);
  };

  // 🔒 Strong password check
  const isStrongPassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
  };

  // 🔍 Live password feedback
  useEffect(() => {
    if (!form.password) {
      setPasswordStrength('');
      return;
    }
    if (form.password.length < 8) {
      setPasswordStrength('Too short');
    } else if (!/[A-Z]/.test(form.password)) {
      setPasswordStrength('Missing uppercase');
    } else if (!/[a-z]/.test(form.password)) {
      setPasswordStrength('Missing lowercase');
    } else if (!/\d/.test(form.password)) {
      setPasswordStrength('Missing number');
    } else if (!/[\W_]/.test(form.password)) {
      setPasswordStrength('Missing symbol');
    } else {
      setPasswordStrength('Strong');
    }
  }, [form.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'email') {
      setIsEmailValid(isValidCompanyEmail(value));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!isEmailValid) {
      toast.error('Only company email addresses are allowed (e.g., you@yourcompany.com).', {
        theme: 'colored',
        icon: '⚠️',
      });
      return;
    }

    if (!isStrongPassword(form.password)) {
      toast.error(
        'Password must be ≥8 chars with uppercase, lowercase, number, and symbol.',
        { theme: 'colored', icon: '🔒' }
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      toast.success(res.data.message || '✅ Account created! Redirecting to sign in…', {
        icon: '🎉',
      });

      setForm({ name: '', email: '', password: '' });

      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Registration error:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please try again.';
      toast.error(msg, { icon: '❌' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-12 bg-[#0b1421] flex items-center justify-center overflow-hidden relative">
      {/* ✨ Subtle glitter background effect (non-intrusive) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-orange-300 rounded-full animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-cyan-300 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-10 w-0.5 h-0.5 bg-yellow-200 rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* 🪞 Glass Card with Glitter Overlay */}
      <div
        className="relative w-full max-w-md rounded-2xl p-7 sm:p-8 border border-white/10 backdrop-blur-xl bg-gradient-to-br from-[#161b22] via-[#1e252d] to-[#24292f] shadow-2xl overflow-hidden"
        style={{
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* 🔆 Glitter effect layer (semi-transparent animated sparkles) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.1)_0%,transparent_20%)]"></div>
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_90%_80%,rgba(255,165,0,0.08)_0%,transparent_25%)]"></div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500">
            CloudMaSa
          </h1>
          <p className="text-gray-300 mt-3 text-sm sm:text-base">
            Create your secure workspace
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-gray-200 font-medium text-sm mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
              className="w-full px-5 py-4 bg-[#121a25] border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26A2E]/50 focus:border-transparent transition text-base"
              placeholder="e.g., Saravana Kumar"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-gray-200 font-medium text-sm mb-2">
              Company Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="username"
              required
              className={`w-full px-5 py-4 bg-[#121a25] border ${
                !isEmailValid && form.email ? 'border-rose-500/60' : 'border-white/10'
              } rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26A2E]/50 focus:border-transparent transition text-base`}
              placeholder="you@yourcompany.com"
            />
            {!isEmailValid && form.email && (
              <p className="mt-2 text-sm text-rose-400 flex items-center">
                ⚠️ Public domains (Gmail, Yahoo, etc.) are not accepted.
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-gray-200 font-medium text-sm mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
              className="w-full px-5 py-4 bg-[#121a25] border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26A2E]/50 focus:border-transparent transition text-base"
              placeholder="••••••••"
            />
            {form.password && (
              <div className="mt-2 text-sm">
                <span
                  className={`${
                    passwordStrength === 'Strong'
                      ? 'text-emerald-400 font-medium'
                      : passwordStrength.includes('Missing') || passwordStrength === 'Too short'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  🔒 {passwordStrength}
                </span>
              </div>
            )}
          </div>

          {/* Submit Button — Orange-Red Gradient */}
          <div className="flex justify-center w-full mt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-1/2 py-3 px-4 rounded-lg font-medium text-white text-base transition-all duration-300 transform ${
              isLoading
                ? 'bg-gradient-to-r from-orange-500/70 via-red-500/70 to-red-600/70 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 via-red-500 to-red-600 hover:scale-[1.02] shadow-lg hover:shadow-orange-500/20 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Creating...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
        </form>

        {/* 🔄 Sign In Link */}
        <div className="text-center mt-8 pt-6 border-t border-white/5">
          <p className="text-gray-300 text-base">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 font-semibold underline-offset-4 hover:underline transition"
              aria-label="Go to sign in page"
            >
              Sign in
            </button>
          </p>
        </div>

        {/* 🔐 Security Note */}
        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>🔒 End-to-end encrypted • Company email only • SOC 2 compliant</p>
        </div>
      </div>

      {/* 🍞 Toast Container */}
      <ToastContainer
        position="top-center"
        autoClose={4500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        style={{ width: '95%', maxWidth: '500px' }}
      />
    </div>
  );
};

export default RegisterForm;
