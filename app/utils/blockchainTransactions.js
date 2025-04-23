// Blockchain Transactions Utility
import { ethers } from 'ethers';
import { uploadProfileToIPFS, retrieveProfileFromIPFS, updateProfileInIPFS } from './ipfsService';

// Configuration for Ethereum networks
export const providerConfig = {
  // Public RPC endpoint - no central authority
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com', // Sepolia testnet for development
  name: 'sepolia',
  chainId: '0x5',
  registry: '0xdca7ef03e98e0dc2b855be647c39abe984fcf21b' // Registry address for sepolia
};

/**
 * Get blockchain network status information
 * @returns {Object} Blockchain status information
 */
export const getBlockchainStatus = async () => {
  try {
    // Try to create a provider to check connection
    const provider = new ethers.JsonRpcProvider(providerConfig.rpcUrl);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const isConnected = !!network;

    return {
      connected: isConnected,
      name: providerConfig.name,
      chainId: network ? network.chainId.toString() : providerConfig.chainId,
      networkName: network ? network.name : 'Unknown',
      rpcUrl: providerConfig.rpcUrl,
      blockNumber: blockNumber,
      registry: providerConfig.registry,
      latestBlock: blockNumber ? blockNumber : 'Unknown',
      status: isConnected ? 'connected' : 'disconnected',
      isMock: false
    };
  } catch (error) {
    console.error('Error getting blockchain status:', error);
    // Return a mock status when connection fails
    return {
      connected: false,
      name: providerConfig.name,
      chainId: providerConfig.chainId,
      networkName: 'Unknown',
      rpcUrl: providerConfig.rpcUrl,
      blockNumber: 'Unknown',
      registry: providerConfig.registry,
      latestBlock: 'Unknown',
      status: 'disconnected',
      isMock: true,
      error: error.message
    };
  }
};

/**
 * Generate asymmetric key pair for secure messaging
 * @returns {Promise<Object>} Object containing publicKey, privateKey and address
 */
export const generateAsymmetricKeys = async () => {
  try {
    // Create a new random wallet which contains a key pair
    const messageWallet = ethers.Wallet.createRandom();
    
    // Get the public key from the wallet
    const publicKey = messageWallet.publicKey;
    
    // Get the private key from the wallet
    const privateKey = messageWallet.privateKey;
    
    console.log('Generated messaging key pair successfully');
    
    return {
      publicKey,
      privateKey,
      address: messageWallet.address
    };
  } catch (error) {
    console.error('Error generating asymmetric keys:', error);
    throw error;
  }
};

/**
 * Register a user's public key on the blockchain
 * @param {ethers.Signer} signer - Ethereum signer object
 * @param {string} publicKey - Public key to register
 * @param {Object} options - Additional options for the transaction
 * @returns {Promise<boolean>} Success status
 */
export const registerPublicKeyOnChain = async (signer, publicKey, options = {}) => {
  try {
    // In a production app, this would invoke a smart contract function
    // Example contract ABI and address would be needed
    console.log('Registering public key on chain:', publicKey);
    
    // This is a placeholder for the actual contract interaction
    // In a real implementation, it would look something like this:
    /*
    const contractABI = [...]; // Contract ABI
    const contractAddress = '0x...'; // Contract address
    
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    const transaction = await contract.registerPublicKey(publicKey, options);
    await transaction.wait(); // Wait for transaction to be confirmed
    */
    
    // Return true to simulate successful registration
    return true;
  } catch (error) {
    console.error('Error registering public key on chain:', error);
    throw error;
  }
};

/**
 * Lookup a user's public key from the blockchain by their DID
 * @param {string} did - Decentralized identifier
 * @param {ethers.Provider} provider - Provider for blockchain interactions
 * @returns {Promise<string|null>} Public key or null if not found
 */
export const lookupPublicKeyByDid = async (did, provider) => {
  try {
    // Extract address from DID
    const address = did.replace('did:ethr:', '');
    
    // In a production app, this would query a smart contract
    console.log('Looking up public key for:', address);
    
    // Placeholder for actual contract call
    /*
    const contractABI = [...]; // Contract ABI
    const contractAddress = '0x...'; // Contract address
    
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    const publicKey = await contract.getPublicKey(address);
    return publicKey;
    */
    
    // Return null for now to indicate not implemented
    return null;
  } catch (error) {
    console.error('Error looking up public key:', error);
    return null;
  }
};

/**
 * Create and encrypt a symmetric key for secure messaging between two parties
 * @param {string} senderPrivateKey - Sender's private key
 * @param {string} recipientPublicKey - Recipient's public key
 * @returns {Object} Object containing encrypted key and related data
 */
export const createEncryptedSymmetricKey = async (senderPrivateKey, recipientPublicKey) => {
  try {
    // Convert keys to wallet instances for cryptographic operations
    const senderWallet = new ethers.Wallet(senderPrivateKey);
    
    // Generate a random symmetric key (e.g., AES-256)
    const symmetricKey = ethers.utils.randomBytes(32); // 256 bits
    
    // In a real implementation, we would encrypt this key with the recipient's public key
    // For now, return a placeholder
    return {
      encryptedKey: "placeholder-for-encrypted-key",
      algorithm: "AES-256",
      created: Date.now()
    };
  } catch (error) {
    console.error('Error creating encrypted symmetric key:', error);
    throw error;
  }
};

/**
 * Store messaging keys in browser's local storage
 * @param {string} privateKey - Private key to store
 * @param {string} publicKey - Public key to store 
 * @param {string} address - Address derived from the key pair
 */
export const storeMessagingKeys = (privateKey, publicKey, address) => {
  try {
    // Store the private key securely 
    // In a production app, consider using more secure storage methods
    localStorage.setItem('liberaChainMessagingPrivateKey', privateKey);
    localStorage.setItem('liberaChainMessagingPublicKey', publicKey);
    localStorage.setItem('liberaChainMessagingKeyAddress', address);
    
    // Also add the messaging key address to the identity data
    const identityData = JSON.parse(localStorage.getItem('liberaChainIdentity') || '{}');
    identityData.messagingKeyAddress = address;
    localStorage.setItem('liberaChainIdentity', JSON.stringify(identityData));
    
    console.log('Messaging keys stored successfully');
    return true;
  } catch (error) {
    console.error('Error storing messaging keys:', error);
    return false;
  }
};

/**
 * Retrieve messaging keys from browser's local storage
 * @returns {Object|null} Object containing privateKey, publicKey, and address or null if not found
 */
export const retrieveMessagingKeys = () => {
  try {
    const privateKey = localStorage.getItem('liberaChainMessagingPrivateKey');
    const publicKey = localStorage.getItem('liberaChainMessagingPublicKey');
    const address = localStorage.getItem('liberaChainMessagingKeyAddress');
    
    if (privateKey && address) {
      return { privateKey, publicKey, address };
    }
    return null;
  } catch (error) {
    console.error('Error retrieving messaging keys:', error);
    return null;
  }
};

/**
 * Deploy a new key registry contract (admin function)
 * @param {ethers.Signer} signer - Ethereum signer object
 * @returns {Promise<string>} Address of the deployed contract
 */
export const deployKeyRegistryContract = async (signer) => {
  try {
    // This would deploy a new key registry contract
    // For now, return a placeholder address
    return "0x0000000000000000000000000000000000000000";
  } catch (error) {
    console.error('Error deploying key registry contract:', error);
    throw error;
  }
};

/**
 * Create friend request with encrypted symmetric key
 * @param {string} recipientDid - Recipient's DID
 * @param {string} recipientPublicKey - Recipient's public key
 * @returns {Promise<Object>} Object containing the encrypted key, signature, and other metadata
 */
export const createFriendRequest = async (recipientDid, recipientPublicKey) => {
  try {
    // Retrieve user's messaging keys
    const senderKeys = retrieveMessagingKeys();
    if (!senderKeys) {
      throw new Error('Messaging keys not found. Please generate keys first.');
    }
    
    // Create a new symmetric key for secure messaging between the two parties
    const symmetricKey = ethers.utils.randomBytes(32); // 256 bits AES key
    const symmetricKeyHex = ethers.utils.hexlify(symmetricKey);
    
    // Convert keys for cryptographic operations
    const senderWallet = new ethers.Wallet(senderKeys.privateKey);
    
    // Encrypt the symmetric key with recipient's public key
    // In ethers v5, we would use encryption functions
    // This is a simplified encryption simulation
    const encryptedData = {
      symmetricKey: symmetricKeyHex,
      recipientDid: recipientDid,
      timestamp: Date.now(),
    };
    
    // Serialize the data to encrypt
    const dataToEncrypt = JSON.stringify(encryptedData);
    
    // Sign the data with sender's private key
    const signature = await senderWallet.signMessage(dataToEncrypt);
    
    // Create the friend request object
    const friendRequest = {
      from: senderKeys.address,
      to: recipientDid,
      encryptedSymmetricKey: symmetricKeyHex, // In a real app, this would be actually encrypted
      signature: signature,
      timestamp: Date.now(),
      algorithm: "AES-256",
    };
    
    console.log('Friend request created successfully');
    return friendRequest;
  } catch (error) {
    console.error('Error creating friend request:', error);
    throw error;
  }
};

/**
 * Search for a user by DID on the blockchain or network
 * @param {string} did - Decentralized identifier to search for
 * @returns {Promise<Object|null>} User data if found, null otherwise
 */
export const searchUserByDid = async (did) => {
  try {
    // In a production app, this would query a registry contract or API
    console.log('Searching for user with DID:', did);
    
    // For demo purposes, simulate finding a user with a delay
    // In a real implementation, this would check against a smart contract or API
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock response for testing
        if (did && did.startsWith('did:ethr:')) {
          const address = did.replace('did:ethr:', '');
          
          // Generate a deterministic "public key" based on the address
          // In a real app, this would come from the registry
          const mockPublicKey = `0x04${address.substring(2)}00`.padEnd(132, '0');
          
          resolve({
            did: did,
            publicKey: mockPublicKey,
            found: true,
            displayName: `User ${address.substring(2, 6)}`
          });
        } else {
          resolve(null);
        }
      }, 1000);
    });
  } catch (error) {
    console.error('Error searching for user:', error);
    return null;
  }
};

/**
 * Store user profile information in IPFS and link it to DID
 * @param {string} did - User's decentralized identifier
 * @param {Object} profileData - User profile data (username, bio, etc)
 * @returns {Promise<Object>} Result object with IPFS CID and status
 */
export const storeUserProfileInIPFS = async (did, profileData) => {
  try {
    if (!did) throw new Error('DID is required');
    if (!profileData) throw new Error('Profile data is required');
    
    // Ensure profile data has the DID
    profileData.did = did;
    profileData.updatedAt = Date.now();
    
    // Upload to IPFS
    const cid = await uploadProfileToIPFS(profileData);
    
    if (!cid) throw new Error('Failed to upload profile to IPFS');
    
    // Store CID reference locally for this user's DID
    const didToCidMap = JSON.parse(localStorage.getItem('liberaChainDidToCidMap') || '{}');
    didToCidMap[did] = cid;
    localStorage.setItem('liberaChainDidToCidMap', JSON.stringify(didToCidMap));
    
    // In a production app, we would also store this mapping on-chain
    // For example, calling a smart contract to register the CID for this DID
    
    console.log(`Profile for ${did} stored in IPFS with CID: ${cid}`);
    
    return {
      success: true,
      did,
      cid,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error storing user profile in IPFS:', error);
    throw error;
  }
};

/**
 * Get a user's profile from IPFS using their DID
 * @param {string} did - User's decentralized identifier
 * @returns {Promise<Object|null>} User profile data or null if not found
 */
export const getUserProfileFromIPFS = async (did) => {
  try {
    if (!did) throw new Error('DID is required');
    
    // Get CID reference for this DID
    const didToCidMap = JSON.parse(localStorage.getItem('liberaChainDidToCidMap') || '{}');
    const cid = didToCidMap[did];
    
    if (!cid) {
      console.warn(`No profile found for DID: ${did}`);
      return null;
    }
    
    // Retrieve profile from IPFS
    const profileData = await retrieveProfileFromIPFS(cid);
    
    return profileData;
  } catch (error) {
    console.error('Error getting user profile from IPFS:', error);
    return null;
  }
};

/**
 * Update a user's profile information in IPFS
 * @param {string} did - User's decentralized identifier
 * @param {Object} updatedProfileData - Updated profile data
 * @returns {Promise<Object>} Result object with new CID and status
 */
export const updateUserProfileInIPFS = async (did, updatedProfileData) => {
  try {
    if (!did) throw new Error('DID is required');
    if (!updatedProfileData) throw new Error('Updated profile data is required');
    
    // Get existing profile data
    const existingProfile = await getUserProfileFromIPFS(did);
    
    // Merge existing data with updates
    const mergedProfile = {
      ...existingProfile,
      ...updatedProfileData,
      did,
      updatedAt: Date.now()
    };
    
    // Upload updated profile to IPFS (creates new CID)
    const newCid = await updateProfileInIPFS(mergedProfile);
    
    if (!newCid) throw new Error('Failed to update profile in IPFS');
    
    // Update CID reference for this DID
    const didToCidMap = JSON.parse(localStorage.getItem('liberaChainDidToCidMap') || '{}');
    didToCidMap[did] = newCid;
    localStorage.setItem('liberaChainDidToCidMap', JSON.stringify(didToCidMap));
    
    // In a production app, we would also update this mapping on-chain
    
    console.log(`Profile for ${did} updated in IPFS with new CID: ${newCid}`);
    
    return {
      success: true,
      did,
      cid: newCid,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error updating user profile in IPFS:', error);
    throw error;
  }
};

/**
 * Set a username for a DID in the IPFS profile
 * @param {string} did - User's decentralized identifier
 * @param {string} username - Username to set
 * @returns {Promise<Object>} Result object with new CID and status
 */
export const setUserNameForDID = async (did, username) => {
  try {
    if (!did) throw new Error('DID is required');
    if (!username) throw new Error('Username is required');
    
    // Update profile with username
    return await updateUserProfileInIPFS(did, { username });
  } catch (error) {
    console.error('Error setting username for DID:', error);
    throw error;
  }
};