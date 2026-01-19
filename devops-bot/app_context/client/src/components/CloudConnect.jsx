// import React, { useState, useEffect } from 'react';
// import {
//   Cloud,
//   Lock,
//   KeyRound,
//   Globe,
//   Link,
//   Loader2,
//   XCircle,
//   ShieldCheck,
//   ShieldAlert,
//   Eye,
//   EyeOff
// } from 'lucide-react';
// import { __API_URL__ } from '../config/env.config';

// const CloudConnector = () => {
//   const [formData, setFormData] = useState({
//     cloudProvider: '',
//     secretKey: '',
//     accessKey: '',
//     region: '',
//   });

//   const [responseMessage, setResponseMessage] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [connectedAccounts, setConnectedAccounts] = useState([]);
//   const [selectedAccount, setSelectedAccount] = useState('');
//   const [showSecret, setShowSecret] = useState(false);
//   const [showAccess, setShowAccess] = useState(false);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const fetchConnectedAccounts = async () => {
//     try {
//       const response = await fetch(`${__API_URL__}/api/get-aws-accounts`);
//       // const response = await fetch(`http://localhost:3000/api/get-aws-accounts`);
//       const result = await response.json();

//       if (response.ok) {
//         const uniqueAccounts = result.filter(
//           (value, index, self) =>
//             index === self.findIndex((t) =>
//               t.accountId === value.accountId || t.arn === value.arn
//             )
//         );
//         setConnectedAccounts(uniqueAccounts);
//         if (uniqueAccounts.length > 0) {
//           setSelectedAccount(uniqueAccounts[0].accountId);
//         }
//       } else {
//         setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
//       }
//     } catch (error) {
//       console.error('Error fetching connected accounts:', error);
//       setResponseMessage('Failed to fetch connected accounts.');
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setResponseMessage('');

//     try {
//       const response = await fetch(`${__API_URL__}/connect-to-aws`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData),
//       });
//       // const response = await fetch('http://localhost:3000/connect-to-aws', {
//       //   method: 'POST',
//       //   headers: { 'Content-Type': 'application/json' },
//       //   body: JSON.stringify(formData),
//       // });

//       const result = await response.json();
//       if (response.ok) {
//         setResponseMessage(result.message);
//         fetchConnectedAccounts();
//       } else {
//         setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setResponseMessage('Failed to connect.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRemoveAccount = async (accountId) => {
//     console.log('Attempting to remove account with ID:', accountId);  // Log the accountId
  
//     if (!accountId) {
//       console.log('No account selected.');
//       return;
//     }
  
//     try {
//       const response = await fetch(`${__API_URL__}/api/remove-aws-account/${accountId}`, {
//         method: 'DELETE',
//       });
//       // const response = await fetch(`http://localhost:3000/api/remove-aws-account/${accountId}`, {
//       //   method: 'DELETE',
//       // });
  
//       const result = await response.json();
//       console.log('API Response:', result);  // Log the response from the backend
  
//       if (response.ok) {
//         setResponseMessage(result.message);
//         setConnectedAccounts((prev) => prev.filter((acc) => acc.accountId !== accountId));
//       } else {
//         setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
//       }
//     } catch (error) {
//       console.error('Error removing account:', error);
//       setResponseMessage('Failed to remove account.');
//     }
//   };
  

  

//   const regions = {
//     AWS: ['us-east-1', 'us-west-1', 'us-west-2'],
//     Azure: ['East US', 'West US', 'West Europe'],
//     GCP: ['us-central1', 'us-east1', 'us-west1'],
//   };

//   useEffect(() => {
//     fetchConnectedAccounts();
//   }, []);

//   const filteredAccounts = formData.cloudProvider
//     ? connectedAccounts.filter((acc) => acc.cloudProvider === formData.cloudProvider)
//     : connectedAccounts;

//   return (
//     <div className="min-h-screen bg-[#1E2633] p-10 flex justify-center items-start text-white">
//       <div className="bg-[#2A4C83] border border-[#3a5b9b] rounded-2xl shadow-lg w-full max-w-2xl p-8">
//         <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-white">
//           <Cloud className="text-[#F26A2E]" /> Connect Your Cloud Account
//         </h2>

//         <div className="mb-6">
//           <label htmlFor="cloudProvider" className="block text-sm font-medium text-gray-200 mb-2">
//             Choose Cloud Provider
//           </label>
//           <select
//             name="cloudProvider"
//             value={formData.cloudProvider}
//             onChange={handleChange}
//             className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
//           >
//             <option value="">-- Select Provider --</option>
//             <option value="AWS">Amazon Web Services (AWS)</option>
//             <option value="Azure">Microsoft Azure</option>
//             <option value="GCP">Google Cloud Platform (GCP)</option>
//           </select>
//         </div>

//         {formData.cloudProvider && (
//           <form onSubmit={handleSubmit} className="space-y-5">
//             <div className="relative">
//               <label className="block text-sm font-medium text-gray-200 mb-1">
//                 <Lock size={16} className="inline mr-1 text-orange-400" /> Secret Key
//               </label>
//               <input
//                 type={showSecret ? 'text' : 'password'}
//                 name="secretKey"
//                 value={formData.secretKey}
//                 onChange={handleChange}
//                 className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
//                 required
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowSecret((prev) => !prev)}
//                 className="absolute right-3 top-[38px] text-gray-400 hover:text-orange-400"
//               >
//                 {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
//               </button>
//             </div>

//             <div className="relative">
//               <label className="block text-sm font-medium text-gray-200 mb-1">
//                 <KeyRound size={16} className="inline mr-1 text-orange-400" /> Access Key
//               </label>
//               <input
//                 type={showAccess ? 'text' : 'password'}
//                 name="accessKey"
//                 value={formData.accessKey}
//                 onChange={handleChange}
//                 className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
//                 required
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowAccess((prev) => !prev)}
//                 className="absolute right-3 top-[38px] text-gray-400 hover:text-orange-400"
//               >
//                 {showAccess ? <EyeOff size={18} /> : <Eye size={18} />}
//               </button>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-200 mb-1">
//                 <Globe size={16} className="inline mr-1 text-orange-400" /> Region
//               </label>
//               <select
//                 name="region"
//                 value={formData.region}
//                 onChange={handleChange}
//                 className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
//                 required
//               >
//                 <option value="">-- Select Region --</option>
//                 {regions[formData.cloudProvider]?.map((region) => (
//                   <option key={region} value={region}>{region}</option>
//                 ))}
//               </select>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full flex items-center justify-center gap-2 bg-[#F26A2E] text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 shadow-md transition"
//             >
//               {loading ? <Loader2 className="animate-spin" size={18} /> : <Link size={18} />}
//               {loading ? 'Connecting...' : 'Connect Account'}
//             </button>
//           </form>
//         )}

//         {filteredAccounts.length > 0 && (
//           <div className="mt-10">
//             <label className="block text-sm font-semibold text-gray-200 mb-2">
//               <ShieldCheck className="inline-block mr-1 text-green-400" size={18} />
//               Connected Cloud Accounts
//             </label>
//             <div className="flex items-center gap-4">
//               <select
//                 className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
//                 value={selectedAccount}
//                 onChange={(e) => setSelectedAccount(e.target.value)}
//               >
//                 {filteredAccounts.map((account) => (
//                   <option key={account.accountId} value={account.accountId}>
//                     {account.accountId} - {account.arn}
//                   </option>
//                 ))}
//               </select>
//               <button
//                 onClick={() => handleRemoveAccount(selectedAccount)}
//                 className="text-red-400 hover:text-red-600"
//               >
//                 <XCircle size={20} />
//               </button>
//             </div>
//           </div>
//         )}

//         {responseMessage && (
//           <div className="mt-6 text-center text-sm text-gray-300 italic flex items-center justify-center gap-2">
//             <ShieldAlert size={16} className="text-yellow-400" /> {responseMessage}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CloudConnector;


import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Lock,
  KeyRound,
  Globe,
  Link,
  Loader2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import { __API_URL__ } from '../config/env.config';

const CloudConnector = () => {
  const [formData, setFormData] = useState({
    cloudProvider: '',
    secretKey: '',
    accessKey: '',
    region: '',
  });

  const [responseMessage, setResponseMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showAccess, setShowAccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch(`${__API_URL__}/api/get-aws-accounts`);
      const result = await response.json();

      if (response.ok) {
        const uniqueAccounts = result.filter(
          (value, index, self) =>
            index ===
            self.findIndex((t) => t.accountId === value.accountId && t.arn === value.arn)
        );
        setConnectedAccounts(uniqueAccounts);
        if (uniqueAccounts.length > 0) {
          setSelectedAccount(uniqueAccounts[0].accountId);
        }
      } else {
        setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
      setResponseMessage('Failed to fetch connected accounts.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponseMessage('');

    try {
      const response = await fetch(`${__API_URL__}/api/connect-to-aws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        setResponseMessage(result.message);
        await fetchConnectedAccounts();
      } else {
        setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setResponseMessage('Failed to connect.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId) => {
    if (!accountId) return;

    try {
      const response = await fetch(`${__API_URL__}/api/remove-aws-account/${accountId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setResponseMessage(result.message);
        const updated = connectedAccounts.filter((acc) => acc.accountId !== accountId);
        setConnectedAccounts(updated);
        if (updated.length > 0) {
          setSelectedAccount(updated[0].accountId);
        } else {
          setSelectedAccount('');
        }
      } else {
        setResponseMessage(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing account:', error);
      setResponseMessage('Failed to remove account.');
    }
  };

  const regions = {
    AWS: ['us-east-1', 'us-west-1', 'us-west-2'],
    Azure: ['East US', 'West US', 'West Europe'],
    GCP: ['us-central1', 'us-east1', 'us-west1'],
  };

  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  const filteredAccounts = formData.cloudProvider
    ? connectedAccounts.filter((acc) => acc.cloudProvider === formData.cloudProvider)
    : connectedAccounts;

  return (
    <div className="min-h-screen bg-[#1E2633] p-10 flex justify-center items-start text-white">
      <div className="bg-[#2A4C83] border border-[#3a5b9b] rounded-2xl shadow-lg w-full max-w-2xl p-8">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3 text-white">
          <Cloud className="text-[#F26A2E]" /> Connect Your Cloud Account
        </h2>

        <div className="mb-6">
          <label htmlFor="cloudProvider" className="block text-sm font-medium text-gray-200 mb-2">
            Choose Cloud Provider
          </label>
          <select
            name="cloudProvider"
            value={formData.cloudProvider}
            onChange={handleChange}
            className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
          >
            <option value="">-- Select Provider --</option>
            <option value="AWS">Amazon Web Services (AWS)</option>
            <option value="Azure">Microsoft Azure</option>
            <option value="GCP">Google Cloud Platform (GCP)</option>
          </select>
        </div>

        {formData.cloudProvider && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-200 mb-1">
                <Lock size={16} className="inline mr-1 text-orange-400" /> Secret Key
              </label>
              <input
                type={showSecret ? 'text' : 'password'}
                name="secretKey"
                value={formData.secretKey}
                onChange={handleChange}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-orange-400"
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-200 mb-1">
                <KeyRound size={16} className="inline mr-1 text-orange-400" /> Access Key
              </label>
              <input
                type={showAccess ? 'text' : 'password'}
                name="accessKey"
                value={formData.accessKey}
                onChange={handleChange}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowAccess((prev) => !prev)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-orange-400"
              >
                {showAccess ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                <Globe size={16} className="inline mr-1 text-orange-400" /> Region
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">-- Select Region --</option>
                {regions[formData.cloudProvider]?.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#F26A2E] text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 shadow-md transition"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Link size={18} />}
              {loading ? 'Connecting...' : 'Connect Account'}
            </button>
          </form>
        )}

        {filteredAccounts.length > 0 && (
          <div className="mt-10">
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              <ShieldCheck className="inline-block mr-1 text-green-400" size={18} />
              Connected Cloud Accounts
            </label>
            <div className="flex items-center gap-4">
              <select
                className="w-full bg-[#1E2633] border border-[#3a5b9b] text-white rounded-md p-2 focus:ring-2 focus:ring-orange-500"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                {filteredAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.accountId} - {account.arn}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleRemoveAccount(selectedAccount)}
                className="text-red-400 hover:text-red-600"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>
        )}

        {responseMessage && (
          <div className="mt-6 text-center text-sm text-gray-300 italic flex items-center justify-center gap-2">
            <ShieldAlert size={16} className="text-yellow-400" /> {responseMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudConnector;