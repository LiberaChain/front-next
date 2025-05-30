import { generateAsymmetricKeys } from './blockchainTransactions';
import { uploadProfileToIPFS } from './ipfsService';
import { ethers } from 'ethers';

// Store a user's profile in IPFS without blockchain registration
export const storeProfileOnlyInIPFS = async (profile) => {
  try {
    // Upload the profile to IPFS
    const cid = await uploadProfileToIPFS(profile);
    
    if (!cid) {
      throw new Error('Failed to upload profile to IPFS');
    }
    
    // Store the DID to CID mapping for retrieval
    const mockCidMap = JSON.parse(localStorage.getItem('liberaChainDidProfiles') || '{}');
    mockCidMap[profile.did] = cid;
    localStorage.setItem('liberaChainDidProfiles', JSON.stringify(mockCidMap));
    
    return {
      success: true,
      cid,
    };
  } catch (error) {
    console.error('Error storing user profile in IPFS:', error);
    return { 
      success: false,
      error: error.message 
    };
  }
};

// Create an IPFS-only account with browser wallet (no blockchain registration)
export const createIpfsOnlyAccount = async (did, displayName, walletAddress, walletData) => {
  try {
    // Generate messaging keys
    const keyPair = await generateAsymmetricKeys();

    // Create identity data
    const identityData = {
      did,
      displayName: displayName || `User-${walletAddress.substring(2, 8)}`,
      wallet: walletAddress,
      walletType: 'browser',
      createdAt: new Date().toISOString(),
      messagingKeyAddress: keyPair.address,
      blockchainVerified: false,
      ipfsOnly: true
    };

    // Store messaging keys locally
    const messagingKeys = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      address: keyPair.address,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('liberaChainMessagingKeys', JSON.stringify(messagingKeys));

    // Store profile in IPFS
    const result = await storeProfileOnlyInIPFS(identityData);
    
    if (!result.success) {
      throw new Error('Failed to store profile in IPFS: ' + (result.error || 'Unknown error'));
    }

    // Store auth data in localStorage
    const authData = {
      did,
      expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      wallet: walletAddress,
      walletType: 'browser',
      verified: true,
      ipfsOnly: true,
      cid: result.cid
    };
    
    localStorage.setItem('liberaChainAuth', JSON.stringify(authData));
    localStorage.setItem('liberaChainIdentity', JSON.stringify(identityData));

    return { 
      success: true,
      cid: result.cid,
      keyPair
    };
  } catch (error) {
    console.error('Error creating IPFS-only account:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
};

// Verify user with recovery phrase for IPFS-only account
export const verifyBrowserWalletWithRecoveryPhrase = async (recoveryPhrase) => {
  try {
    // Create a wallet from the recovery phrase
    const wallet = ethers.Wallet.fromMnemonic(recoveryPhrase);
    
    // Check if we have this wallet's address stored
    const authData = JSON.parse(localStorage.getItem('liberaChainAuth') || '{}');
    const identityData = JSON.parse(localStorage.getItem('liberaChainIdentity') || '{}');
    
    // Check if this is the right wallet (either by address or DID)
    const isCorrectWallet = identityData.wallet === wallet.address || 
                           identityData.did === `did:libera:${wallet.address}`;
    
    if (!isCorrectWallet) {
      // This is not the wallet that was registered
      return {
        success: false,
        error: 'Invalid recovery phrase. This wallet was not registered.'
      };
    }
    
    // Recovery successful, update auth status
    authData.expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem('liberaChainAuth', JSON.stringify(authData));
    
    return {
      success: true,
      wallet: {
        address: wallet.address,
        did: identityData.did
      }
    };
  } catch (error) {
    console.error('Error verifying browser wallet with recovery phrase:', error);
    return {
      success: false, 
      error: 'Invalid recovery phrase. Please check and try again.'
    };
  }
};

// Check IPFS for profile CID by DID
export const getProfileCidByDid = (did) => {
  try {
    const mockCidMap = JSON.parse(localStorage.getItem('liberaChainDidProfiles') || '{}');
    return mockCidMap[did] || null;
  } catch (error) {
    console.error('Error getting profile CID by DID:', error);
    return null;
  }
};