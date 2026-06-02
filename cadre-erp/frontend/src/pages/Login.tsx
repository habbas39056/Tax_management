import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [isClientMode, setIsClientMode] = useState(false);
  
  // Staff State
  const [email, setEmail] = useState('admin@cadre.app');
  const [staffPassword, setStaffPassword] = useState('Password123!');
  
  // Client State
  const [username, setUsername] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { login, loginClient } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isClientMode) {
        await loginClient(username, clientPassword);
        navigate('/portal');
      } else {
        await login(email, staffPassword);
        navigate('/');
      }
    } catch (error) {
      // Error is handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center min-h-screen py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src="/logo.png" alt="Logo" className="mx-auto h-28 w-auto object-contain mb-6" />
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-8 bg-white shadow sm:rounded-lg sm:px-10">
          
          <div className="flex justify-center mb-6 border-b border-gray-200">
            <button
              onClick={() => setIsClientMode(false)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${!isClientMode ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Staff Login
            </button>
            <button
              onClick={() => setIsClientMode(true)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${isClientMode ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Client Login
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isClientMode ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email or Username</label>
                  <div className="mt-1">
                    <input required type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="mt-1">
                    <input required type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Portal Username</label>
                  <div className="mt-1">
                    <input required type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. johndoe1234" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Portal Password</label>
                  <div className="mt-1">
                    <input required type="password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm appearance-none focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
              </>
            )}

            <div>
              <button disabled={loading} type="submit" className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                {loading ? 'Authenticating...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
