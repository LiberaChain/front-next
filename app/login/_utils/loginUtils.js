import { ethers } from 'ethers';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { providerConfig, verifyUserOnBlockchain } from '../../utils/blockchainTransactions';

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

// Check user blockchain registration
export const checkUserRegistration = async (did) => {
  try {
    const verificationResult = await verifyUserOnBlockchain(did);
    
    if (verificationResult.success && verificationResult.verified) {
      console.log('User verified on blockchain. Registration time:', verificationResult.registrationTime);
      return {
        verified: true,
        checking: false,
        registrationTime: verificationResult.registrationTime,
        publicKey: verificationResult.publicKey
      };
    } else {
      console.log('User not verified on blockchain:', verificationResult.error);
      return { verified: false, checking: false };
    }
  } catch (err) {
    console.error("Error checking user registration:", err);
    return { verified: false, checking: false };
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
  
  if (address) {
    const did = `did:ethr:${address}`;
    console.log('Wallet connected. DID:', did);
    return { did, address };
  }
  
  throw new Error('Failed to get wallet address');
};

// Sign challenge with wallet
export const signChallenge = async (challenge) => {
  if (!window.ethereum) {
    throw new Error("Wallet not connected");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return await signer.signMessage(challenge);
};

// Verify signature
export const verifySignature = async (message, signature, address) => {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (err) {
    console.error("Error verifying signature:", err);
    return false;
  }
};

// Generate a unique challenge for DID verification
export const generateChallenge = () => {
  return `Authenticate with LiberaChain at ${new Date().toISOString()} with nonce ${Math.random().toString(36).substring(2, 15)}`;
};

// Store auth in local storage
export const storeAuthInLocalStorage = (did, walletAddress, blockchainVerification) => {
  const authData = {
    did,
    expiry: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    wallet: walletAddress,
    verified: blockchainVerification.verified,
    registrationTime: blockchainVerification.registrationTime
  };
  localStorage.setItem('liberaChainAuth', JSON.stringify(authData));
};