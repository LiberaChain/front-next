"use client";

import { useState, useEffect } from 'react';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { verifyJWT } from '@decentralized-identity/did-auth-jose';
import { ethers } from 'ethers';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  providerConfig, 
  generateAsymmetricKeys, 
  registerPublicKeyOnChain,
  verifyUserOnBlockchain,
  storeMessagingKeys 
} from '../utils/blockchainTransactions';

// Main Registration component
export default function Registration() {
  const router = useRouter(); // Add router for navigation
  const [displayName, setDisplayName] = useState('');
  const [didIdentifier, setDidIdentifier] = useState('');
  const [step, setStep] = useState(1); // Multi-step registration
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [didCreated, setDidCreated] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [ethersProvider, setEthersProvider] = useState(null);
  const [didResolver, setDidResolver] = useState(null);
  const [keyPair, setKeyPair] = useState(null);
  const [blockchainVerification, setBlockchainVerification] = useState({ verified: false, checking: false });
  
  // Initialize DID resolver and ethers provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        // Create resolver instance with Ethereum DID resolver (public blockchain, no centralization)
        const resolver = new Resolver(getEthrResolver(providerConfig));
        setDidResolver(resolver);
        console.log('DID resolver initialized successfully');
        
        // Initialize ethers provider - connecting directly to public node
        // Using ethers v5 syntax
        const provider = new ethers.providers.JsonRpcProvider(providerConfig.networks[0].rpcUrl);
        setEthersProvider(provider);
        console.log('Ethers provider initialized successfully');
      } catch (err) {
        console.error('Error initializing blockchain connections:', err);
      }
    };
    
    initProvider();
  }, []);

  // Connect to Ethereum wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if MetaMask or other wallet is installed
      if (!window.ethereum) {
        setError('Please install MetaMask or another Ethereum wallet');
        setLoading(false);
        return;
      }

      // Connect directly to the user's wallet - no intermediary server
      // Using ethers v5 syntax
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Request account access from user's wallet
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      if (address) {
        // Create a DID from the Ethereum address - fully decentralized identity
        const did = `did:ethr:${address}`;
        setDidIdentifier(did);
        setWalletAddress(address);
        setIsWalletConnected(true);
        
        console.log('Wallet connected. DID:', did);
        
        // Check if user already exists on blockchain
        setBlockchainVerification({ verified: false, checking: true });
        const verificationResult = await verifyUserOnBlockchain(did);
        
        if (verificationResult.success && verificationResult.verified) {
          console.log('User already exists on blockchain. Registration time:', verificationResult.registrationTime);
          setBlockchainVerification({
            verified: true,
            checking: false,
            registrationTime: verificationResult.registrationTime,
            publicKey: verificationResult.publicKey
          });
          
          // User exists, but we'll still allow registration to continue
          // Just show them they're already registered
          setDidCreated(true);
        } else {
          console.log('User does not exist on blockchain yet. Will be registered.');
          setBlockchainVerification({ verified: false, checking: false });
          
          // Generate new asymmetric keys for secure messaging
          const keys = await generateAsymmetricKeys();
          setKeyPair(keys);
          console.log('New messaging key pair generated:', keys.address);
          setDidCreated(true);
        }
      }
    } catch (err) {
      setError(`Failed to connect wallet: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle display name change
  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
  };

  // Store identity data in browser's local storage
  const storeIdentityInLocalStorage = () => {
    const identityData = {
      did: didIdentifier,
      displayName: displayName || `User-${walletAddress.substring(2, 8)}`, // Default name if none provided
      wallet: walletAddress,
      createdAt: new Date().toISOString()
    };
    
    // If we have generated keys, store them using our utility function
    if (keyPair) {
      // Store the messaging keys
      storeMessagingKeys(keyPair.privateKey, keyPair.publicKey, keyPair.address);
      
      // Add the messaging key address to the identity data
      identityData.messagingKeyAddress = keyPair.address;
    }
    
    localStorage.setItem('liberaChainIdentity', JSON.stringify(identityData));
  };
  
  // Store authentication state in browser's local storage
  const storeAuthInLocalStorage = (did, expiryTime) => {
    const authData = {
      did,
      expiry: expiryTime,
      wallet: walletAddress,
      verified: true, // Now this is a blockchain-verified account
    };
    localStorage.setItem('liberaChainAuth', JSON.stringify(authData));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      // Move directly to DID creation
      setError('');
      setStep(2);
      return;
    }
    
    if (step === 2) {
      if (!didCreated) {
        setError('Please connect your wallet to create your decentralized identity');
        return;
      }
      
      try {
        setLoading(true);
        
        // If blockchain verification shows the user is already registered
        if (blockchainVerification.verified) {
          console.log('User already registered on blockchain, skipping registration');
          // Still store identity data locally
          storeIdentityInLocalStorage();
          
          // Also store auth information with 24-hour expiry
          const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
          storeAuthInLocalStorage(didIdentifier, expiryTime);
          
          // Move to success step
          await new Promise(resolve => setTimeout(resolve, 500));
          setLoading(false);
          setStep(3);
          return;
        }
        
        // If we have a key pair, register the public key on the blockchain
        if (keyPair) {
          // Get signer for blockchain transaction - using ethers v5 syntax
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          
          // Register the public key on the blockchain using our utility function
          // Pass the DID as the userId to ensure we can retrieve it later
          const registrationResult = await registerPublicKeyOnChain(signer, keyPair.publicKey, didIdentifier);
          
          if (!registrationResult.success) {
            throw new Error(`Blockchain registration failed: ${registrationResult.error || 'Unknown error'}`);
          }
          
          console.log('Registration successful on blockchain:', registrationResult);
          
        } else {
          throw new Error('Communication keys were not generated properly');
        }
        
        // Store the DID and display name locally
        storeIdentityInLocalStorage();
        
        // Also store auth information with 24-hour expiry
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
        storeAuthInLocalStorage(didIdentifier, expiryTime);
        
        // Move to success step
        await new Promise(resolve => setTimeout(resolve, 500));
        setLoading(false);
        setStep(3);
      } catch (err) {
        setError(`Registration failed: ${err.message || 'Please try again.'}`);
        setLoading(false);
      }
    }
  };

  // Navigate to dashboard after short delay
  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="LiberaChain Logo" width={80} height={80} className="mx-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Create your decentralized identity
        </h2>
        <p className="mt-2 text-center text-sm text-gray-100">
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

          {/* Step 1: Introduction */}
          {step === 1 && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <h3 className="text-lg font-medium text-white">Welcome to LiberaChain</h3>
                <p className="mt-2 text-sm text-gray-400">
                  LiberaChain uses decentralized identity (DID) technology to give you complete control over your digital identity. 
                  No email, no password, no central authority.
                </p>
              </div>

              <div className="rounded-md bg-gray-700 p-4">
                <h4 className="text-sm font-medium text-white mb-2">How this works:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-300">
                  <li>Connect your Ethereum wallet (like MetaMask)</li>
                  <li>Your wallet address generates your unique DID</li>
                  <li>Secure messaging keys are created for encrypted communication</li>
                  <li>Your public key is stored on-chain and private key in your wallet</li>
                  <li>Your account is only valid if registered on the blockchain</li>
                  <li>No central database storing your personal data</li>
                </ul>
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
                  Get Started
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
                    onClick={connectWallet}
                    disabled={loading}
                    className="flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        Connect Wallet
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md bg-gray-700 p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-300">Your DID:</span>
                      <code className="mt-1 text-xs text-emerald-400 break-all">{didIdentifier}</code>
                      <p className="mt-2 text-xs text-gray-400">
                        This is your unique decentralized identifier derived from your wallet address. Keep it safe!
                      </p>
                    </div>
                  </div>
                  
                  {/* Show blockchain verification status */}
                  {blockchainVerification.checking && (
                    <div className="rounded-md bg-gray-700 p-4">
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-gray-300">Checking blockchain registration...</span>
                      </div>
                    </div>
                  )}
                  
                  {blockchainVerification.verified && !blockchainVerification.checking && (
                    <div className="rounded-md bg-green-900/30 p-4">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <span className="text-sm font-medium text-green-400">Already registered on blockchain</span>
                          <p className="text-xs text-gray-300 mt-1">
                            Your identity was registered on {new Date(blockchainVerification.registrationTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!blockchainVerification.verified && !blockchainVerification.checking && keyPair && (
                    <div className="rounded-md bg-gray-700 p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-300">Messaging Key Generated:</span>
                        <code className="mt-1 text-xs text-emerald-400 break-all">{keyPair.address}</code>
                        <p className="mt-2 text-xs text-gray-400">
                          A secure messaging key pair has been generated. Your public key will be stored on-chain, 
                          and your private key will be securely stored in your local wallet.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-300">
                      Display Name (optional)
                    </label>
                    <div className="mt-1">
                      <input
                        id="displayName"
                        name="displayName"
                        type="text"
                        value={displayName}
                        onChange={handleDisplayNameChange}
                        placeholder={`User-${walletAddress ? walletAddress.substring(2, 8) : 'XXX'}`}
                        className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        A human-readable name for your DID. This is stored locally and not on a central server.
                      </p>
                    </div>
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
                        {blockchainVerification.verified ? 'Completing...' : 'Registering on Blockchain...'}
                      </>
                    ) : (blockchainVerification.verified ? "Complete Registration" : "Register on Blockchain")}
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
                  Your decentralized identity has been {blockchainVerification.verified ? 'verified' : 'created'} successfully.
                </p>
              </div>

              <div className="rounded-md bg-gray-700 p-4">
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium text-gray-300">Display Name:</span>
                  <span className="text-sm text-emerald-400">{displayName || `User-${walletAddress.substring(2, 8)}`}</span>
                  
                  <span className="mt-2 text-sm font-medium text-gray-300">DID:</span>
                  <code className="text-xs text-emerald-400 break-all">{didIdentifier}</code>
                  
                  {keyPair && (
                    <>
                      <span className="mt-2 text-sm font-medium text-gray-300">Messaging Address:</span>
                      <code className="text-xs text-emerald-400 break-all">{keyPair.address}</code>
                    </>
                  )}
                  
                  <div className="mt-4 rounded-md bg-blue-900/30 p-2">
                    <p className="text-xs text-blue-300">
                      <strong>Important:</strong> Your identity is now securely registered on the blockchain. 
                      Make sure you have backed up your wallet recovery phrase securely!
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={navigateToDashboard}
                  className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-8">
            <p className="text-center text-xs text-gray-500">
              By creating a DID, you retain full control of your identity through decentralized blockchain technology.
            </p>
            {step < 3 && (
              <p className="text-center text-xs text-gray-500 mt-2">
                Already have a DID? <Link href="/login" className="text-emerald-500 hover:text-emerald-400">Sign in with your DID</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}