"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '', // Can be email or username
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [didVerification, setDidVerification] = useState(false);
  const [didVerificationComplete, setDidVerificationComplete] = useState(false);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.identifier || !formData.password) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // In a production app, you would:
      // 1. Send the credentials to your authentication service
      // 2. Verify the DID if necessary
      // 3. Return a session token or JWT
      
      // Mock authentication - simulate API request delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, let's say any login works
      console.log('User authenticated successfully');
      
      // Redirect to dashboard (or home for now)
      router.push('/');
      
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle DID verification
  const handleDidVerify = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Simulate DID verification process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDidVerificationComplete(true);
      
      // Simulate navigation after successful verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to dashboard
      router.push('/');
      
    } catch (err) {
      setError('DID verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="LiberaChain Logo" width={80} height={80} className="mx-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Access your decentralized identity on LiberaChain
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
          {didVerification ? (
            // DID Verification Interface
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-center text-white">DID Authentication</h3>
              
              {!didVerificationComplete ? (
                <>
                  <div className="bg-gray-700 p-5 rounded-lg text-center">
                    <div className="flex justify-center mb-4">
                      <Image 
                        src="/qr.png" 
                        alt="QR Code" 
                        width={180} 
                        height={180} 
                        className="mx-auto border-4 border-white p-1 rounded-md"
                      />
                    </div>
                    <p className="text-sm text-gray-300 mb-4">
                      Scan this QR code with your DID wallet app to authenticate
                    </p>
                    
                    <div className="text-xs text-gray-400 p-2 bg-gray-800 rounded mb-2 overflow-x-auto">
                      <code>did:ethr:0x7F39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0</code>
                    </div>
                    
                    <button
                      onClick={handleDidVerify}
                      disabled={loading}
                      className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </>
                      ) : "Mock Verification (Demo)"}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      className="text-sm text-emerald-500 hover:text-emerald-400"
                      onClick={() => setDidVerification(false)}
                    >
                      Back to login
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-5">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-600 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white">Verification Successful!</h3>
                  <p className="mt-2 text-sm text-gray-400">Redirecting to dashboard...</p>
                </div>
              )}
              
              {error && (
                <div className="rounded-md bg-red-900/40 p-4">
                  <div className="flex">
                    <div className="text-sm text-red-400">{error}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Regular Login Form
            <>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-300">
                    Email or Username
                  </label>
                  <div className="mt-1">
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      required
                      value={formData.identifier}
                      onChange={handleChange}
                      className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-gray-700"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-emerald-500 hover:text-emerald-400">
                      Forgot your password?
                    </a>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-900/40 p-4">
                    <div className="flex">
                      <div className="text-sm text-red-400">{error}</div>
                    </div>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </>
                    ) : "Sign in"}
                  </button>
                </div>
              </form>

              {/* Alternate login methods */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700 py-2 px-4 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none"
                    onClick={() => setDidVerification(true)}
                  >
                    <span>DID Connect</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700 py-2 px-4 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none"
                  >
                    <span>QR Code</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Footer info */}
          <div className="mt-6">
            <p className="text-center text-xs text-gray-500">
              Don't have an account?{' '}
              <Link href="/registration" className="text-emerald-500 hover:text-emerald-400">
                Register now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}