"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { verifyJWT, decodeJWT } from '@decentralized-identity/did-auth-jose';
import { ethers } from 'ethers';
import { 
  providerConfig, 
  verifyUserOnBlockchain
} from '../utils/blockchainTransactions';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [didVerification, setDidVerification] = useState(false);
  const [didVerificationComplete, setDidVerificationComplete] = useState(false);
  const [didChallenge, setDidChallenge] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userDid, setUserDid] = useState('');
  const [ethersProvider, setEthersProvider] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [signedMessage, setSignedMessage] = useState('');
  const [didResolver, setDidResolver] = useState(null);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
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
        const provider = new ethers.providers.JsonRpcProvider(providerConfig.networks[0].rpcUrl);
        setEthersProvider(provider);
        console.log('Ethers provider initialized successfully');
      } catch (err) {
        console.error('Error initializing blockchain connections:', err);
      }
    };
    
    initProvider();
  }, []);

  // Generate a challenge for DID verification
  useEffect(() => {
    if (didVerification && !didChallenge) {
      // Create a unique challenge that includes a timestamp to prevent replay attacks
      const challenge = `Authenticate with LiberaChain at ${new Date().toISOString()} with nonce ${Math.random().toString(36).substring(2, 15)}`;
      setDidChallenge(challenge);
    }
  }, [didVerification, didChallenge]);

  // Check if user is registered on the blockchain
  const checkUserRegistration = async (did) => {
    try {
      setBlockchainVerification({ verified: false, checking: true });
      
      // Check blockchain registration
      const verificationResult = await verifyUserOnBlockchain(did);
      
      if (verificationResult.success && verificationResult.verified) {
        console.log('User verified on blockchain. Registration time:', verificationResult.registrationTime);
        setBlockchainVerification({
          verified: true,
          checking: false,
          registrationTime: verificationResult.registrationTime,
          publicKey: verificationResult.publicKey
        });
        return true;
      } else {
        console.log('User not verified on blockchain:', verificationResult.error);
        setBlockchainVerification({ verified: false, checking: false });
        return false;
      }
    } catch (err) {
      console.error("Error checking user registration:", err);
      setBlockchainVerification({ verified: false, checking: false });
      return false;
    }
  };

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
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Request account access from user's wallet
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      if (address) {
        // Create a DID from the Ethereum address - fully decentralized identity
        const did = `did:ethr:${address}`;
        setUserDid(did);
        setWalletAddress(address);
        setIsWalletConnected(true);
        console.log('Wallet connected. DID:', did);
        
        // Check if user is registered on the blockchain
        const isRegistered = await checkUserRegistration(did);
        setIsUserRegistered(isRegistered);
        
        // If not registered, redirect to registration page
        if (!isRegistered) {
          console.log('User not registered on blockchain. Redirecting to registration...');
          setError('Your account is not registered on the blockchain. Redirecting to registration...');
          // Wait a moment to show the error message before redirecting
          setTimeout(() => {
            router.push('/registration');
          }, 2000);
          return;
        }
      }
    } catch (err) {
      setError(`Failed to connect wallet: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to directly sign a challenge with the user's wallet
  const signChallenge = async () => {
    try {
      if (!window.ethereum || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // User signs the challenge directly with their private key
      // No server involved - this is pure client-side cryptography
      const signature = await signer.signMessage(didChallenge);
      setSignedMessage(signature);
      
      return signature;
    } catch (err) {
      console.error("Error signing challenge:", err);
      throw err;
    }
  };

  // Verify the signature on the client side using blockchain
  const verifySignature = async (message, signature, address) => {
    try {
      // Recover the address from the signature using pure cryptography
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      // Check if recovered address matches the connected wallet
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (err) {
      console.error("Error verifying signature:", err);
      return false;
    }
  };

  // Store authentication state in browser's local storage
  // In a production app, this should use more secure storage with encryption
  const storeAuthInLocalStorage = (did, expiryTime) => {
    const authData = {
      did,
      expiry: expiryTime,
      wallet: walletAddress,
      verified: blockchainVerification.verified, // Add blockchain verification status
      registrationTime: blockchainVerification.registrationTime
    };
    localStorage.setItem('liberaChainAuth', JSON.stringify(authData));
  };

  // Handle DID verification completely on the client side
  const handleDidVerify = async () => {
    if (!isWalletConnected || !userDid) {
      await connectWallet();
      // Don't proceed if the user is not registered
      if (!isUserRegistered) {
        return;
      }
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Verify the user is registered on the blockchain again to make sure
      if (!blockchainVerification.verified) {
        const isRegistered = await checkUserRegistration(userDid);
        if (!isRegistered) {
          throw new Error("Account not found on blockchain. Please register first.");
        }
      }
      
      // 1. Let the user sign the challenge with their wallet
      console.log(`Challenge for signing: ${didChallenge}`);
      const signature = await signChallenge();
      
      // 2. Verify the signature directly in the browser
      const isValid = await verifySignature(didChallenge, signature, walletAddress);
      
      if (!isValid) {
        throw new Error("Signature verification failed");
      }
      
      console.log(`DID ${userDid} successfully verified with blockchain cryptography`);
      
      // 3. Store authentication locally (24 hour expiry)
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      storeAuthInLocalStorage(userDid, expiryTime);
      
      setDidVerificationComplete(true);
      
      // Navigate after successful verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      router.push('/dashboard');
      
    } catch (err) {
      setError(`DID verification failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle QR code authentication for mobile wallets
  const handleQrCodeAuth = () => {
    // Generate QR code that contains an authentication request
    // This would include the challenge and app details
    // Mobile wallet scans this and returns a signed response
    setDidVerification(true);
  };

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="LiberaChain Logo" width={80} height={80} className="mx-auto" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Sign in with your DID
        </h2>
        <p className="mt-2 text-center text-sm text-gray-100">
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
                  <div className="bg-gray-700 p-5 rounded-lg">
                    {!isWalletConnected ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-300 mb-4">
                          Connect your Ethereum wallet to authenticate with your decentralized identity
                        </p>
                        <button
                          onClick={connectWallet}
                          disabled={loading}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Connecting...
                            </>
                          ) : "Connect Wallet"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-center mb-4">
                          <Image 
                            src="/qr.png" 
                            alt="QR Code" 
                            width={180} 
                            height={180} 
                            className="mx-auto border-4 border-white p-1 rounded-md"
                          />
                        </div>
                        
                        {/* Show blockchain verification status */}
                        {blockchainVerification.checking && (
                          <div className="rounded-md bg-gray-800 p-3 mb-4">
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-sm text-gray-300">Verifying blockchain registration...</span>
                            </div>
                          </div>
                        )}
                        
                        {blockchainVerification.verified && !blockchainVerification.checking && (
                          <div className="rounded-md bg-green-900/30 p-3 mb-4">
                            <div className="flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <span className="text-sm font-medium text-green-400">Verified on blockchain</span>
                                <p className="text-xs text-gray-300">
                                  Registered on {new Date(blockchainVerification.registrationTime).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-300 mb-4 text-center">
                          Scan this QR code with your DID wallet app to authenticate
                        </p>
                        
                        <div className="text-xs text-gray-400 p-2 bg-gray-800 rounded mb-2 overflow-x-auto text-center">
                          <code>{userDid}</code>
                        </div>
                        
                        <div className="text-xs text-gray-300 p-2 rounded mb-4">
                          <p className="text-center font-medium mb-2">Challenge to sign:</p>
                          <div className="bg-gray-800 p-2 rounded">
                            <code>{didChallenge}</code>
                          </div>
                        </div>
                        
                        <button
                          onClick={handleDidVerify}
                          disabled={loading || !blockchainVerification.verified}
                          className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Verifying signature...
                            </>
                          ) : (
                            <>
                              {!blockchainVerification.verified ? "Account Not Verified" : "Sign & Verify"}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      className="text-sm text-emerald-500 hover:text-emerald-400"
                      onClick={() => setDidVerification(false)}
                    >
                      Back to login options
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
                  <p className="mt-2 text-sm text-gray-400">DID verified with blockchain cryptography. Redirecting to dashboard...</p>
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
            // Login Options - Only decentralized methods
            <>
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">Decentralized Authentication</h3>
                  <p className="text-sm text-gray-400">
                    Connect your crypto wallet or DID-enabled mobile app to authenticate
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none"
                    onClick={() => setDidVerification(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span>Connect Wallet</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700 py-3 px-4 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none"
                    onClick={handleQrCodeAuth}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1zM13 12a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 00-1-1h-3zm1 2v1h1v-1h-1z" clipRule="evenodd" />
                    </svg>
                    <span>Scan QR with Mobile Wallet</span>
                  </button>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-xs text-gray-400">
                    By signing in with your decentralized identity, you retain full control of your data.
                    <br />No passwords or centralized storage required.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Footer info */}
          <div className="mt-6">
            <p className="text-center text-xs text-gray-500">
              Don't have a DID yet?{' '}
              <Link href="/registration" className="text-emerald-500 hover:text-emerald-400">
                Create your decentralized identity
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}