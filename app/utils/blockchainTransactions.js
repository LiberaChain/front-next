import { ethers } from 'ethers';

// Define ABI directly to avoid build issues
const userPublicKeysABI = [
  // Public key management functions
  "function setPublicKey(string memory userId, string memory publicKey) public",
  "function getPublicKey(string memory userId) public view returns (string memory)",
  "function publicKeyExists(string memory userId) public view returns (bool)",
  // Events
  "event PublicKeySet(string indexed userId, string publicKey)"
];

// Provider configuration for DID resolver
export const providerConfig = {
  networks: [
    {
      name: 'sepolia',
      registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545'
    }
  ]
};

// Try to get contract address, with fallbacks
let contractAddress;
try {
  // First try to load from artifact file
  if (typeof window !== 'undefined') {
    try {
      // Try dynamic import during runtime
      const addresses = require('../../blockchain/artifacts/contracts/contract-address.json');
      contractAddress = addresses.UserPublicKeys;
      console.log('[DEBUG] Loaded contract address from artifacts:', contractAddress);
    } catch (error) {
      console.warn('[DEBUG] Contract address file not found, using fallback address');
      // Fallback to hardcoded address for local Hardhat network
      contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    }
  } else {
    // Server-side, use env variable or fallback
    contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  }
} catch (error) {
  console.error('[DEBUG] Error loading contract address:', error);
  // Fallback to hardcoded address for local Hardhat network
  contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
}

console.log('[DEBUG] Using contract address:', contractAddress);

// Initialize provider and signer
const getProviderAndSigner = async () => {
  if (typeof window === 'undefined') {
    // Server-side rendering - use a provider for the testnet
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545");
    return { provider, signer: null, account: null };
  }

  // Client-side - check if MetaMask is installed
  if (!window.ethereum) {
    console.warn('MetaMask is not installed. Some functionality may be limited.');
    // Fallback to a read-only provider
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545");
    return { provider, signer: null, account: null };
  }

  try {
    // Request account access if needed
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Initialize provider with MetaMask
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const account = await signer.getAddress();
    
    return { provider, signer, account };
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    // Fallback to a read-only provider
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545");
    return { provider, signer: null, account: null };
  }
};

// Get contract instance
const getContract = async (withSigner = true) => {
  if (!contractAddress) {
    console.error('[DEBUG] Contract address is not set');
    throw new Error('Contract address not found. Please make sure the contract is deployed and the address is set.');
  }

  console.log('[DEBUG] Getting contract at address:', contractAddress);
  
  const { provider, signer, account } = await getProviderAndSigner();
  console.log('[DEBUG] Provider/signer initialized, account:', account);
  
  if (withSigner && !signer) {
    console.error('[DEBUG] Signer not available but was requested');
    throw new Error('Signer not available. Are you connected to MetaMask?');
  }

  return new ethers.Contract(
    contractAddress,
    userPublicKeysABI,
    withSigner && signer ? signer : provider
  );
};

// Set a user's public key
export const setUserPublicKey = async (userId, publicKey) => {
  try {
    console.log('[DEBUG] Setting public key for userId:', userId);
    console.log('[DEBUG] Public key length:', publicKey.length);
    
    // Ensure we have valid inputs
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        error: 'Invalid user ID'
      };
    }
    
    if (!publicKey || typeof publicKey !== 'string') {
      return {
        success: false,
        error: 'Invalid public key'
      };
    }
    
    let idToUse = userId;
    
    // If userId contains special characters that might cause issues, sanitize it
    if (/[^\w\s]/gi.test(userId)) {
      console.log('[DEBUG] Using sanitized userId for consistency');
      idToUse = userId.replace(/[^\w\s]/gi, '_');
    }
    
    console.log('[DEBUG] ID being used for transaction:', idToUse);
    
    const contract = await getContract();
    const tx = await contract.setPublicKey(idToUse, publicKey);
    console.log('[DEBUG] Transaction sent:', tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('[DEBUG] Transaction confirmed in block:', receipt.blockNumber);
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      sanitizedId: idToUse !== userId ? idToUse : null
    };
  } catch (error) {
    console.error('[DEBUG] Error setting user public key:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

// Get a user's public key
export const getUserPublicKey = async (userId) => {
  try {
    console.log('[DEBUG] Getting public key for userId:', userId);
    
    // Ensure userId is a valid string
    if (!userId || typeof userId !== 'string') {
      console.error('[DEBUG] Invalid userId:', userId);
      return {
        success: false,
        error: 'Invalid user ID'
      };
    }
    
    // Use provider to read data, no need for signer
    const contract = await getContract(false);
    
    // Try to get the key with proper error handling
    try {
      // Check if the key exists first to avoid unnecessary errors
      let exists = false;
      try {
        exists = await contract.publicKeyExists(userId);
      } catch (checkError) {
        // If we get an error checking existence, try with a sanitized ID
        if (checkError.code === 'CALL_EXCEPTION') {
          const sanitizedId = userId.replace(/[^\w\s]/gi, '_');
          try {
            exists = await contract.publicKeyExists(sanitizedId);
            if (exists) {
              // If the sanitized ID works, use it to get the public key
              const publicKey = await contract.getPublicKey(sanitizedId);
              console.log('[DEBUG] Retrieved public key with sanitized ID, length:', publicKey.length);
              
              return {
                success: true,
                publicKey,
                sanitized: true
              };
            }
          } catch (sanitizedError) {
            console.log('[DEBUG] Sanitized ID also failed:', sanitizedError.message);
          }
        }
        console.warn('[DEBUG] Error checking if key exists:', checkError.message);
      }
      
      console.log('[DEBUG] Public key exists check:', exists);
      
      if (!exists) {
        console.log('[DEBUG] Key does not exist for userId:', userId);
        return {
          success: false,
          error: 'Public key not found'
        };
      }
      
      const publicKey = await contract.getPublicKey(userId);
      console.log('[DEBUG] Retrieved public key length:', publicKey.length);
      console.log('[DEBUG] Public key excerpt:', publicKey.substring(0, 20) + '...');
      
      return {
        success: true,
        publicKey
      };
    } catch (callError) {
      console.error('[DEBUG] Contract call error:', callError);
      throw callError;
    }
  } catch (error) {
    console.error('[DEBUG] Error getting user public key:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

// Check if a user's public key exists
export const checkUserPublicKeyExists = async (userId) => {
  try {
    console.log('[DEBUG] Checking if public key exists for userId:', userId);
    
    // Ensure userId is a valid string
    if (!userId || typeof userId !== 'string') {
      console.error('[DEBUG] Invalid userId:', userId);
      return {
        success: false,
        error: 'Invalid user ID'
      };
    }
    
    const contract = await getContract(false);
    
    // Make the call with proper error handling
    try {
      const exists = await contract.publicKeyExists(userId);
      console.log('[DEBUG] Public key exists result:', exists);
      
      return {
        success: true,
        exists
      };
    } catch (callError) {
      console.error('[DEBUG] Contract call error:', callError);
      
      // If we get a specific error related to encoding, try again with a sanitized ID
      if (callError.code === 'CALL_EXCEPTION') {
        console.log('[DEBUG] Trying with sanitized userId');
        const sanitizedId = userId.replace(/[^\w\s]/gi, '_');
        console.log('[DEBUG] Original ID vs Sanitized ID:', userId, sanitizedId);
        
        try {
          const exists = await contract.publicKeyExists(sanitizedId);
          console.log('[DEBUG] Sanitized public key exists result:', exists);
          
          return {
            success: true,
            exists,
            sanitized: true
          };
        } catch (retryError) {
          throw new Error(`Failed with sanitized ID: ${retryError.message}`);
        }
      }
      
      throw callError;
    }
  } catch (error) {
    console.error('[DEBUG] Error checking if user public key exists:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

// Get current user's Ethereum address
export const getCurrentUserAddress = async () => {
  try {
    const { account } = await getProviderAndSigner();
    return account;
  } catch (error) {
    console.error('Error getting current user address:', error);
    return null;
  }
};

// Register public key on blockchain
export const registerPublicKeyOnChain = async (signer, publicKey, userId) => {
  try {
    // Use the provided userId (DID) or generate a random one as fallback
    const finalUserId = userId || `user_${Math.floor(Math.random() * 1000000)}`;
    
    // Get contract instance
    if (!contractAddress) {
      throw new Error('Contract address not found. Please deploy the contract first.');
    }
    
    const contract = new ethers.Contract(
      contractAddress,
      userPublicKeysABI,
      signer
    );
    
    console.log(`Registering public key for user ${finalUserId}`);
    
    // Call the contract method to set the public key
    const tx = await contract.setPublicKey(finalUserId, publicKey);
    console.log('Transaction sent:', tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    
    return {
      success: true,
      userId: finalUserId,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Error registering public key on chain:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

// For compatibility with other code that expects these functions
export const searchUserByDid = async (did) => {
  console.log('searchUserByDid called with:', did);
  return { found: true, did, displayName: 'User' }; 
};

export const createFriendRequest = async (did, publicKey) => {
  console.log('createFriendRequest called with:', did, publicKey);
  return { success: true, from: 'current-user', to: did };
};

export const generateAsymmetricKeys = async () => {
  return { publicKey: 'demo-public-key', privateKey: 'demo-private-key', address: '0xdemo' };
};

export const storeMessagingKeys = (privateKey, publicKey, address) => {
  console.log('Storing messaging keys:', { privateKey, publicKey, address });
};

export const retrieveMessagingKeys = () => {
  return { publicKey: 'demo-public-key', privateKey: 'demo-private-key', address: '0xdemo' };
};

export const storeUserProfileInIPFS = async (profile) => {
  console.log('Storing user profile in IPFS:', profile);
  return { success: true };
};

export const getUserProfileFromIPFS = async (did) => {
  console.log('Getting user profile from IPFS for DID:', did);
  return null;
};

export const setUserNameForDID = async (did, username) => {
  console.log('Setting username for DID:', did, username);
  return { success: true };
};

export const getBlockchainStatus = async () => {
  try {
    const { provider } = await getProviderAndSigner();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    return {
      connected: true,
      name: network.name,
      chainId: network.chainId,
      latestBlock: blockNumber,
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545',
      networkName: network.name === 'unknown' ? 'Local Hardhat' : network.name,
      status: 'Connected',
      isMock: false
    };
  } catch (error) {
    console.error('Error getting blockchain status:', error);
    return {
      connected: false,
      name: 'unknown',
      chainId: 0,
      latestBlock: 0,
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545',
      networkName: 'Unknown',
      status: 'Disconnected',
      isMock: true
    };
  }
};

// Check if wallet is on the right network
export const checkWalletNetwork = async () => {
  try {
    // Skip if not in browser or no ethereum object
    if (typeof window === 'undefined' || !window.ethereum) {
      return { 
        success: false, 
        rightNetwork: false,
        error: 'No wallet detected' 
      };
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    console.log('[DEBUG] Wallet connected to network:', network);
    
    // Hardhat's chainId is 31337
    const isHardhat = network.chainId === 31337;
    const isSepolia = network.chainId === 11155111; // Ethereum Sepolia testnet
    
    // Get contract artifact address (for hardhat) or env var (for live networks)
    let correctAddress;
    
    // For Hardhat, use the artifact
    if (isHardhat) {
      try {
        const addresses = require('../../blockchain/artifacts/contracts/contract-address.json');
        correctAddress = addresses.UserPublicKeys;
        console.log('[DEBUG] Using Hardhat contract address:', correctAddress);
      } catch (error) {
        console.error('[DEBUG] Failed to load Hardhat contract address');
      }
    } 
    // For Sepolia, use env var
    else if (isSepolia) {
      correctAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      console.log('[DEBUG] Using Sepolia contract address:', correctAddress);
    }
    
    // Check if contract address matches network
    const rightNetwork = isHardhat || isSepolia;
    const validAddress = !!correctAddress;
    
    return { 
      success: true, 
      rightNetwork, 
      networkName: network.name, 
      chainId: network.chainId,
      validAddress
    };
  } catch (error) {
    console.error('[DEBUG] Error checking wallet network:', error);
    return { 
      success: false, 
      rightNetwork: false, 
      error: error.message 
    };
  }
};
