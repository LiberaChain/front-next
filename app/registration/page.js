"use client";

import { useState, useEffect } from 'react';
import { Resolver } from 'did-resolver';
import { getResolver } from 'ethr-did-resolver';
import { createJWT, verifyJWT } from '@decentralized-identity/did-auth-jose';
import Link from 'next/link';
import Image from 'next/image';

// Main Registration component
export default function Registration() {
  // Form state management
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [didIdentifier, setDidIdentifier] = useState('');
  const [step, setStep] = useState(1); // Multi-step registration
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [didCreated, setDidCreated] = useState(false);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Generate a new DID
  const generateDid = async () => {
    try {
      setLoading(true);
      setError('');
      
      // In a production environment, this would connect to a DID provider or blockchain
      // For demo purposes, we're simulating the DID creation process
      const mockDid = `did:ethr:${Math.random().toString(36).substring(2, 15)}`;
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDidIdentifier(mockDid);
      setDidCreated(true);
      setLoading(false);
    } catch (err) {
      setError('Failed to generate DID. Please try again.');
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validate first step
      if (!formData.username || !formData.email) {
        setError('Please fill all required fields');
        return;
      }
      
      // Move to DID creation step
      setError('');
      setStep(2);
      return;
    }
    
    if (step === 2) {
      if (!didCreated) {
        setError('Please create your decentralized identity first');
        return;
      }
      
      try {
        setLoading(true);
        
        // In a production app, you would:
        // 1. Create a challenge for the user to sign with their DID
        // 2. Verify the signature
        // 3. Register the user in your system
        
        // Simulate API request
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Move to success step
        setLoading(false);
        setStep(3);
      } catch (err) {
        setError('Registration failed. Please try again.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="LiberaChain Logo" width={80} height={80} className="mx-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Create your decentralized identity
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Join the decentralized web with your own sovereign identity
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
          {/* Step indicators */}
          <div className="flex items-center justify-center mb-8">
            <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
            <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
            <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
            <div className={`h-0.5 w-12 ${step >= 3 ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
            <div className={`h-2 w-2 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                  Username (@ handle)
                </label>
                <div className="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                  />
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
                  className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* Step 2: DID Creation */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white">Create your DID</h3>
                <p className="mt-1 text-sm text-gray-400">
                  A decentralized identifier (DID) is a unique identity that you control, not any central authority.
                </p>
              </div>

              {!didCreated ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <button
                    onClick={generateDid}
                    disabled={loading}
                    className="flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : "Generate DID"}
                  </button>
                </div>
              ) : (
                <div className="rounded-md bg-gray-700 p-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-300">Your DID:</span>
                    <code className="mt-1 text-xs text-emerald-400 break-all">{didIdentifier}</code>
                    <p className="mt-2 text-xs text-gray-400">
                      This is your unique decentralized identifier. Keep it safe!
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-900/40 p-4">
                  <div className="flex">
                    <div className="text-sm text-red-400">{error}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex justify-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none"
                  >
                    Back
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!didCreated || loading}
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registering...
                      </>
                    ) : "Complete Registration"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-white">Registration successful!</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Your decentralized identity has been created and registered.
                </p>
              </div>

              <div className="rounded-md bg-gray-700 p-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-300">Username:</span>
                  <span className="text-sm text-emerald-400">{formData.username}</span>
                  
                  <span className="mt-2 text-sm font-medium text-gray-300">DID:</span>
                  <code className="text-xs text-emerald-400 break-all">{didIdentifier}</code>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/" 
                  className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-8">
            <p className="text-center text-xs text-gray-500">
              By registering, you retain full control of your identity through decentralized technology.
            </p>
            {step < 3 && (
              <p className="text-center text-xs text-gray-500 mt-2">
                Already have an account? <Link href="/login" className="text-emerald-500 hover:text-emerald-400">Sign in</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}