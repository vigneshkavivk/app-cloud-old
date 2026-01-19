// import React, { useState } from 'react';
// import axios from 'axios';
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import 'tailwindcss/tailwind.css';
// import Login from './Login';
// import api from '../interceptor/api.interceptor';

// const RegisterForm = () => {
//   const [form, setForm] = useState({
//     name: '',
//     email: '',
//     password: '',
//   });

//   const [isLoading, setIsLoading] = useState(false);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

// // In your RegisterForm component, update the axios post URL:
// const handleRegister = async (e) => {
//   e.preventDefault();
//   setIsLoading(true);

//   try {
//     const res = await api.post('/api/auth/register', form);
//     // const res = await axios.post('http://localhost:3000/api/auth/register', form);
//     toast.success(res.data.message || 'Registered successfully!');
//     setForm({ name: '', email: '', password: '' });
//   } catch (err) {
//     console.error(err);
//     const errorMessage = err.response?.data?.message || 'Failed to register user.';
//     toast.error(errorMessage);
//   } finally {
//     setIsLoading(false);
//   }
// };

//   return (
//     <div className="min-h-screen px-6 py-10 bg-[#1E2633] flex items-center justify-center">
//       <div className="bg-[#2A4C83] p-8 rounded-xl shadow-lg border border-[#F26A2E] max-w-md w-full">
//         <h2 className="text-3xl font-bold text-center text-white mb-6"> Register</h2>
//         <form onSubmit={handleRegister} className="space-y-5">
//           <div>
//             <label className="block text-white font-medium mb-1">Name</label>
//             <input
//               type="text"
//               name="name"
//               value={form.name}
//               onChange={handleChange}
//                  autoComplete="name"
//               required
//               className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
//             />
//           </div>

//           <div>
//             <label className="block text-white font-medium mb-1">Email</label>
//             <input
//               type="email"
//               name="email"
//               value={form.email}
//                autoComplete="username"
//               onChange={handleChange}
//               required
//               className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
//             />
//           </div>

//           <div>
//             <label className="block text-white font-medium mb-1">Password</label>
//     <input
//   type="password"
//   name="password"
//    autoComplete="new-password"
//   onChange={handleChange}
//   required
//   class="w-full p-2 border border-gray-300 rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
// />

//           </div>

//           <button
//             type="submit"
//             className={`w-full bg-[#F26A2E] text-white font-semibold py-2 rounded-md hover:bg-[#D75A2C] transition ${isLoading && 'opacity-50 cursor-not-allowed'}`}
//             disabled={isLoading}
//           >
//             {isLoading ? 'Registering...' : 'Register'}
//           </button>

//           {/* 🔒 Login Link */}
//           <div className="text-center mt-4">
//             <p className="text-white">
//               Already have an account?{' '}
//               <button
//                 type="button"
//                 onClick={() => window.location.href = '/'} // Replace with navigate() if using react-router
//                 className="text-[#F26A2E] hover:underline font-semibold"
//               >
//                 Login
//               </button>
//             </p>
//           </div>
//         </form>
//       </div>
//       <ToastContainer position="top-right" autoClose={3000} />
//     </div>
//   );
// };

// export default RegisterForm;


import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'tailwindcss/tailwind.css';
import api from '../interceptor/api.interceptor';

const RegisterForm = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isValidCompanyEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && !['gmail.com', 'yahoo.com'].includes(domain);
  };

  const isStrongPassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!isValidCompanyEmail(form.email)) {
      toast.error('Only company email addresses are allowed (no Gmail/Yahoo).');
      setIsLoading(false);
      return;
    }

    if (!isStrongPassword(form.password)) {
      toast.error(
        'Password must be at least 8 characters long, with uppercase, lowercase, number, and special character.'
      );
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.post('/api/auth/register', form);
      toast.success(res.data.message || 'Registered successfully!');
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Failed to register user.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 bg-[#1E2633] flex items-center justify-center">
      <div className="bg-[#2A4C83] p-8 rounded-xl shadow-lg border border-[#F26A2E] max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Register</h2>
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-white font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              autoComplete="username"
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#F26A2E] focus:border-[#F26A2E]"
            />
          </div>

          <button
            type="submit"
            className={`w-full bg-[#F26A2E] text-white font-semibold py-2 rounded-md hover:bg-[#D75A2C] transition ${
              isLoading && 'opacity-50 cursor-not-allowed'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>

          <div className="text-center mt-4">
            <p className="text-white">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                className="text-[#F26A2E] hover:underline font-semibold"
              >
                Login
              </button>
            </p>
          </div>
        </form>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default RegisterForm;
