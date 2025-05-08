import { ethers } from 'ethers';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { 
  providerConfig, 
  generateAsymmetricKeys, 
  registerPublicKeyOnChain,
  verifyUserOnBlockchain,
  storeMessagingKeys,
  storeUserProfileInIPFS
} from '../../utils/blockchainTransactions';

// Initialize DID resolver and ethers provider
export const initializeProviders = async () => {
  try {
    const resolver = new Resolver(getEthrResolver(providerConfig));
    const provider = new ethers.providers.JsonRpcProvider(providerConfig.networks[0].rpcUrl);
    return { resolver, provider };
  } catch (err) {
    console.error('Error initializing blockchain connections:', err);
    return { resolver: null, provider: null };
  }
};

// Connect to Ethereum wallet
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask or another Ethereum wallet');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  
  if (!address) {
    throw new Error('Failed to get wallet address');
  }

  const did = `did:ethr:${address}`;
  return { did, address };
};

// Verify user registration and generate keys if needed
export const verifyAndGenerateKeys = async (did) => {
  const verificationResult = await verifyUserOnBlockchain(did);
  
  if (verificationResult.success && verificationResult.verified) {
    return {
      verified: true,
      checking: false,
      registrationTime: verificationResult.registrationTime,
      publicKey: verificationResult.publicKey,
      keyPair: null
    };
  }

  // Generate new asymmetric keys for secure messaging
  const keys = await generateAsymmetricKeys();
  return {
    verified: false,
    checking: false,
    keyPair: keys
  };
};

// Register user on blockchain
export const registerOnBlockchain = async (keyPair, did) => {
  if (!window.ethereum) {
    throw new Error('Wallet not connected');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  
  const result = await registerPublicKeyOnChain(signer, keyPair.publicKey, did);
  if (!result.success) {
    throw new Error(`Blockchain registration failed: ${result.error || 'Unknown error'}`);
  }
  
  return result;
};

// Store user identity and auth data
export const storeIdentityAndAuth = async (did, displayName, walletAddress, keyPair) => {
  const identityData = {
    did,
    displayName: displayName || `User-${walletAddress.substring(2, 8)}`,
    wallet: walletAddress,
    createdAt: new Date().toISOString()
  };

  // If we have generated keys, store them
  if (keyPair) {
    storeMessagingKeys(keyPair.privateKey, keyPair.publicKey, keyPair.address);
    identityData.messagingKeyAddress = keyPair.address;
  }

  // Store profile in IPFS
  const result = await storeUserProfileInIPFS(identityData);
  if (!result.success) {
    throw new Error('Failed to store profile in IPFS');
  }

  // Store auth data in localStorage
  const authData = {
    did,
    expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    wallet: walletAddress,
    verified: true
  };
  localStorage.setItem('liberaChainAuth', JSON.stringify(authData));
  localStorage.setItem('liberaChainIdentity', JSON.stringify(identityData));

  return { success: true };
};