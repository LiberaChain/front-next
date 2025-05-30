'use client';

import { useState, useEffect } from 'react';
import { 
  setUserPublicKey, 
  getUserPublicKey, 
  checkUserPublicKeyExists,
  getCurrentUserAddress,
  checkWalletNetwork
} from '../../_core/blockchain/blockchainTransactions';

export default function PublicKeyManager({ userId }) {
  const [publicKey, setPublicKey] = useState('');
  const [newPublicKey, setNewPublicKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [attemptedLoad, setAttemptedLoad] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [networkError, setNetworkError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // New state for collapse functionality

  // Check wallet network on component mount
  useEffect(() => {
    const checkNetwork = async () => {
      const networkStatus = await checkWalletNetwork();
      console.log('[DEBUG] Network status check:', networkStatus);
      setNetworkInfo(networkStatus);
      
      if (!networkStatus.success || !networkStatus.rightNetwork) {
        setNetworkError('Your wallet is not connected to the correct network. Please connect to Hardhat Local (Chain ID: 31337).');
      } else {
        setNetworkError(null);
      }
    };
    
    checkNetwork();
  }, []);

  // Check if wallet is connected on component mount and when window.ethereum changes
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        // Check if wallet is connected
        const address = await getCurrentUserAddress();
        const connected = !!address;
        
        console.log('[DEBUG] Wallet connection status:', connected, address);
        setWalletAddress(address);
        setIsConnected(connected);
        
        return connected;
      } catch (err) {
        console.error('[DEBUG] Error checking wallet connection:', err);
        setWalletAddress(null);
        setIsConnected(false);
        return false;
      }
    };

    // Listen for account changes in MetaMask
    const handleAccountsChanged = (accounts) => {
      console.log('[DEBUG] Accounts changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected wallet
        setWalletAddress(null);
        setIsConnected(false);
      } else {
        // User switched accounts
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        // Refetch public key when account changes
        fetchPublicKey();
      }
    };

    // Check wallet connection on mount
    checkWalletConnection().then(connected => {
      // If wallet is already connected, fetch public key
      if (connected && userId) {
        fetchPublicKey();
      } else {
        setLoading(false);
      }
    });

    // Add event listeners for MetaMask
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => {
        // Handle chain change
        console.log('[DEBUG] Chain changed, reloading...');
        window.location.reload();
      });
    }

    // Cleanup event listeners
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, [userId]); // Re-run when userId changes

  // Fetch public key from blockchain
  const fetchPublicKey = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      setAttemptedLoad(true);
      
      console.log('[DEBUG] Fetching public key for userId:', userId);
      
      // Always use sanitized ID for consistency with blockchain storage
      const sanitizedId = userId.replace(/[^\w\s]/gi, '_');
      console.log('[DEBUG] Using sanitized userId for retrieval:', sanitizedId);
      
      // First check if the key exists with the sanitized ID
      const existsCheck = await checkUserPublicKeyExists(sanitizedId);
      console.log('[DEBUG] Key exists check result for sanitized ID:', existsCheck);
      
      if (existsCheck.success && existsCheck.exists) {
        const response = await getUserPublicKey(sanitizedId);
        console.log('[DEBUG] Public key response with sanitized ID:', response);
        
        if (response.success && response.publicKey) {
          console.log('[DEBUG] Setting public key:', response.publicKey.substring(0, 20) + '...');
          setPublicKey(response.publicKey);
        } else if (response.error) {
          console.warn('[DEBUG] Warning fetching public key:', response.error);
          setError(`Error retrieving your key: ${response.error}`);
        }
      } else {
        // If key doesn't exist with sanitized ID, try with original ID as fallback
        console.log('[DEBUG] Key not found with sanitized ID, trying original ID');
        const originalCheck = await checkUserPublicKeyExists(userId);
        console.log('[DEBUG] Key exists check result for original ID:', originalCheck);
        
        if (originalCheck.success && originalCheck.exists) {
          const response = await getUserPublicKey(userId);
          console.log('[DEBUG] Public key response with original ID:', response);
          
          if (response.success && response.publicKey) {
            console.log('[DEBUG] Setting public key:', response.publicKey.substring(0, 20) + '...');
            setPublicKey(response.publicKey);
          }
        } else {
          console.log('[DEBUG] No key found for either sanitized or original ID');
        }
      }
    } catch (err) {
      console.error('[DEBUG] Failed to fetch public key:', err);
      setError('Failed to fetch your public key. Please make sure your wallet is connected.');
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet and then fetch public key
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // MetaMask will open requesting connection
      const address = await getCurrentUserAddress();
      
      if (address) {
        setWalletAddress(address);
        setIsConnected(true);
        
        // Check network status
        const networkStatus = await checkWalletNetwork();
        setNetworkInfo(networkStatus);
        
        if (!networkStatus.success || !networkStatus.rightNetwork) {
          setNetworkError('Your wallet is not connected to the correct network. Please connect to Hardhat Local (Chain ID: 31337).');
        } else {
          setNetworkError(null);
          
          // Only fetch public key if we have a userId and we're on the right network
          if (userId) {
            await fetchPublicKey();
          }
        }
      } else {
        throw new Error('No wallet address returned');
      }
    } catch (err) {
      console.error('[DEBUG] Error connecting wallet:', err);
      setError('Failed to connect wallet. Do you have MetaMask installed?');
      setLoading(false);
    }
  };

  const handlePublishPublicKey = async (e) => {
    e.preventDefault();
    
    if (!newPublicKey.trim()) {
      setError('Public key cannot be empty');
      return;
    }

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (networkError) {
      setError('Please connect to the correct network before publishing your key');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('[DEBUG] Publishing public key for userId:', userId);
      console.log('[DEBUG] Public key (first 20 chars):', newPublicKey.substring(0, 20));
      
      // Always use sanitized ID for storing to ensure consistency
      const sanitizedId = userId.replace(/[^\w\s]/gi, '_');
      console.log('[DEBUG] Using sanitized userId for storage:', sanitizedId);
      
      // Store with sanitized ID
      const result = await setUserPublicKey(sanitizedId, newPublicKey);
      
      if (result.success) {
        setPublicKey(newPublicKey);
        setNewPublicKey('');
        setSuccess(`Public key successfully published on blockchain! Transaction hash: ${result.transactionHash}`);
        
        console.log('[DEBUG] Public key successfully stored with sanitized ID');
      } else {
        setError(result.error || 'Failed to publish public key');
      }
    } catch (err) {
      console.error('[DEBUG] Error publishing public key:', err);
      setError('Failed to publish your public key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct test function for debugging
  const testDirectKeyStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const testKey = "TEST_KEY_" + Date.now(); // Create a unique test key
      console.log('[DEBUG] Running direct key storage test');
      console.log('[DEBUG] User ID:', userId);
      console.log('[DEBUG] Test key:', testKey);
      
      // First, try with sanitized ID
      const sanitizedId = userId.replace(/[^\w\s]/gi, '_');
      console.log('[DEBUG] Sanitized ID:', sanitizedId);
      
      // Store key with sanitized ID
      const storeResult = await setUserPublicKey(sanitizedId, testKey);
      console.log('[DEBUG] Store result:', storeResult);
      
      if (storeResult.success) {
        // Now try to retrieve it
        const checkResult = await checkUserPublicKeyExists(sanitizedId);
        console.log('[DEBUG] Check exists result:', checkResult);
        
        const retrieveResult = await getUserPublicKey(sanitizedId);
        console.log('[DEBUG] Retrieve result:', retrieveResult);
        
        if (retrieveResult.success && retrieveResult.publicKey === testKey) {
          setSuccess(`Test successful! Key was stored and retrieved with sanitized ID.
            Original ID: ${userId}
            Sanitized ID: ${sanitizedId}
            Key: ${testKey}`);
          
          // Update the displayed public key
          setPublicKey(testKey);
        } else {
          setError('Test failed: Key was stored but could not be retrieved correctly.');
        }
      } else {
        setError(`Test failed at storage step: ${storeResult.error}`);
      }
    } catch (err) {
      console.error('[DEBUG] Test error:', err);
      setError('Test failed with error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // If user manually refreshes page, check if we need to reload
  useEffect(() => {
    // If wallet is connected but we never attempted to load the data
    if (isConnected && userId && !attemptedLoad && !networkError) {
      fetchPublicKey();
    }
  }, [isConnected, userId, attemptedLoad, networkError]);

  // Toggle collapse functionality
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="my-6 p-4 border rounded-md bg-white dark:bg-gray-800">
      {/* Collapsible header */}
      <button 
        onClick={toggleCollapse}
        className="w-full flex justify-between items-center text-lg font-semibold mb-1"
      >
        <h3>Blockchain Public Key Manager</h3>
        <span className="text-gray-500">
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      </button>
      
      {/* Content - Only shown when not collapsed */}
      {!isCollapsed && (
        <div className="mt-3">
          {networkInfo && networkInfo.success && (
            <div className="mb-4 text-sm">
              <div className="flex items-center">
                <span className="mr-2 font-medium">Network:</span> 
                <span className={networkInfo.rightNetwork ? "text-green-500" : "text-yellow-500"}>
                  {networkInfo.networkName || 'Unknown'} (Chain ID: {networkInfo.chainId})
                </span>
              </div>
            </div>
          )}
          
          {networkError && (
            <div className="mb-4 p-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
              <p>{networkError}</p>
              <p className="text-sm mt-1">To use the local Hardhat network in MetaMask:</p>
              <ol className="text-sm list-decimal pl-5 mt-1">
                <li>Open MetaMask</li>
                <li>Click on the network dropdown at the top</li>
                <li>Select "Add Network"</li>
                <li>Add network manually with: Name: "Hardhat Local", RPC URL: "http://127.0.0.1:8545", Chain ID: "31337"</li>
              </ol>
            </div>
          )}
          
          {!isConnected ? (
            <div className="mb-4">
              <button 
                onClick={connectWallet}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
              <p className="mt-2 text-sm text-gray-500">Connect your Ethereum wallet to publish your public key</p>
            </div>
          ) : (
            <div className="mb-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">Connected Wallet: </span>
              <code className="text-xs break-all bg-gray-100 dark:bg-gray-700 p-1 rounded">
                {walletAddress}
              </code>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}
          
          {loading && !error ? (
            <div className="mb-4">Loading public key data...</div>
          ) : publicKey ? (
            <div className="mb-4">
              <h4 className="font-medium">Your Current Public Key:</h4>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto max-w-full">
                {publicKey}
              </pre>
              <p className="mt-1 text-sm text-gray-500">{`Stored with ID: ${userId}`}</p>
            </div>
          ) : (
            <div className="mb-4 text-yellow-600">
              {isConnected ? 
                `No public key found for your profile (${userId.substring(0, 10)}...) on the blockchain` : 
                'Connect your wallet to view your public key'
              }
            </div>
          )}
          
          <form onSubmit={handlePublishPublicKey}>
            <div className="mb-4">
              <label htmlFor="publicKey" className="block mb-1 font-medium">
                New Public Key
              </label>
              <textarea
                id="publicKey"
                value={newPublicKey}
                onChange={(e) => setNewPublicKey(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                rows={4}
                placeholder="Paste your public key here"
              />
              <div className="mt-1 text-xs text-gray-500 flex justify-between">
                <span>This key will be stored on-chain with ID: {userId && userId.substring(0, 10)}...</span>
                <span>{newPublicKey.length} characters</span>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !isConnected || !!networkError}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:bg-gray-400"
            >
              {loading ? 'Publishing...' : 'Publish Public Key to Blockchain'}
            </button>
          </form>
          
          {isConnected && (
            <div className="mt-4">
              <button
                onClick={testDirectKeyStorage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded mr-2"
                disabled={loading || !isConnected || !!networkError}
              >
                Run Storage Test
              </button>
              <span className="text-xs text-gray-500">
                This will test direct key storage and retrieval using your DID
              </span>
            </div>
          )}
          
          {/* Debug section - remove in production */}
          <div className="mt-8 border-t border-gray-300 pt-4 text-xs text-gray-500">
            <details>
              <summary className="cursor-pointer">Debug Information</summary>
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                <p>User ID: {userId || 'Not set'}</p>
                <p>Wallet Connected: {isConnected ? 'Yes' : 'No'}</p>
                <p>Address: {walletAddress || 'Not connected'}</p>
                <p>Attempted Load: {attemptedLoad ? 'Yes' : 'No'}</p>
                <p>Network: {networkInfo ? JSON.stringify(networkInfo) : 'Unknown'}</p>
                <p>Public Key Status: {publicKey ? `Found (${publicKey.length} chars)` : 'Not found'}</p>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}