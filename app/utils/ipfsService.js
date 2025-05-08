// IPFS Service for user profile storage using IPFS HTTP gateway
import {
  uploadToIpfs,
  getFromIpfs,
  publishToIpns as publishToNode,
  createIpnsKey,
  resolveIpnsName
} from './ipfs-http';
import {
  publishToIpns,
  resolveIpns,
  getLatestContent,
  updateContent
} from './ipns-service';
import {
  pinContent,
  unpinContent
} from './ipfs-pin-service';

/**
 * Check if IPFS is available
 * @returns {boolean} Whether IPFS is available
 */
export const hasIpfsCredentials = () => {
  try {
    return process.env.NEXT_PUBLIC_IPFS_HOST && 
           process.env.NEXT_PUBLIC_IPFS_API_PORT && 
           process.env.NEXT_PUBLIC_IPFS_GATEWAY_PORT;
  } catch (error) {
    return false;
  }
};

/**
 * Get IPFS status information including gateway and mode
 * @returns {Object} IPFS status information
 */
export const getIpfsStatus = () => {
  const isConnected = hasIpfsCredentials();
  const host = process.env.NEXT_PUBLIC_IPFS_HOST || 'localhost';
  const apiPort = process.env.NEXT_PUBLIC_IPFS_API_PORT || '5001';
  const gatewayPort = process.env.NEXT_PUBLIC_IPFS_GATEWAY_PORT || '8080';
  
  return {
    connected: isConnected,
    mode: isConnected ? 'distributed' : 'local_storage',
    gateway: isConnected ? `http://${host}:${gatewayPort}` : 'mock (localStorage)',
    apiEndpoint: isConnected ? `http://${host}:${apiPort}` : 'none',
    nodeType: isConnected ? 'IPFS Node' : 'Local Mock',
    health: isConnected ? 'healthy' : 'simulated',
    storageCount: isConnected ? null : getLocalStorageItemCount(),
    state: isConnected ? 'IPNS Enabled' : 'Local Only'
  };
};

/**
 * Get the count of items in mock IPFS localStorage
 * @returns {number} Count of items
 */
const getLocalStorageItemCount = () => {
  try {
    const profiles = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
    return Object.keys(profiles).length;
  } catch (e) {
    return 0;
  }
};

/**
 * Upload user profile data to IPFS
 * @param {Object} profileData - User profile data to upload
 * @returns {Promise<string|null>} IPFS CID or null if upload failed
 */
export const uploadProfileToIPFS = async (profileData) => {
  try {
    // If IPFS is not available, use fallback
    if (!hasIpfsCredentials()) {
      console.warn('IPFS not available. Using fallback storage.');
      const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
      const mockCid = 'mock-cid-' + Date.now();
      profilesMap[mockCid] = profileData;
      localStorage.setItem('liberaChainIpfsProfiles', JSON.stringify(profilesMap));
      return mockCid;
    }

    // Use updateContent which handles both IPFS upload and IPNS publishing
    const { cid, ipnsName } = await updateContent(profileData.did, profileData, 'profile');
    console.log('Profile uploaded and published:', { cid, ipnsName });
    
    // Try to pin the profile content
    await pinContent(cid, {
      type: 'profile',
      did: profileData.did,
      timestamp: Date.now()
    });

    return cid;
  } catch (error) {
    console.error('Error uploading profile to IPFS:', error);
    return null;
  }
};

/**
 * Retrieve user profile data from IPFS
 * @param {string} did - The DID to get the profile for
 * @returns {Promise<Object|null>} User profile data or null if not found
 */
export const retrieveProfileFromIPFS = async (did) => {
  try {
    // Try to get the latest profile using IPNS first
    const profile = await getLatestContent(did, 'profile');
    if (profile) {
      return profile;
    }

    // If no IPNS record exists, check localStorage fallback
    const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
    
    // Look for any profile with matching DID in localStorage
    for (const [cid, data] of Object.entries(profilesMap)) {
      if (data.did === did) {
        return data;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving profile from IPFS:', error);
    return null;
  }
};

/**
 * Update user profile in IPFS
 * @param {string} did - The DID of the profile to update
 * @param {Object} profileData - Updated user profile data
 * @returns {Promise<string|null>} New IPFS CID
 */
export const updateProfileInIPFS = async (did, profileData) => {
  try {
    // If IPFS is not available, use fallback
    if (!hasIpfsCredentials()) {
      console.warn('IPFS not available. Using fallback storage.');
      const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
      const mockCid = 'mock-cid-' + Date.now();
      profilesMap[mockCid] = profileData;
      localStorage.setItem('liberaChainIpfsProfiles', JSON.stringify(profilesMap));
      return mockCid;
    }

    // Use updateContent to handle both IPFS upload and IPNS update
    const { cid } = await updateContent(did, profileData, 'profile');
    console.log('Profile updated with new CID:', cid);
    return cid;

  } catch (error) {
    console.error('Error updating profile in IPFS:', error);
    return null;
  }
};

/**
 * Upload data to IPFS
 * @param {Object} data - Data to upload
 * @returns {Promise<string|null>} IPFS CID (Content ID) or null if upload failed
 */
export const uploadToIPFS = async (data) => {
  try {
    // If IPFS credentials are not available, use fallback
    if (!hasIpfsCredentials()) {
      console.warn('IPFS credentials not found. Using fallback storage.');
      // For development, we'll store in localStorage as fallback
      const dataMap = JSON.parse(localStorage.getItem('liberaChainIpfsData') || '{}');
      const mockCid = 'mock-cid-' + Date.now();
      dataMap[mockCid] = data;
      localStorage.setItem('liberaChainIpfsData', JSON.stringify(dataMap));
      return mockCid;
    }
    
    // Convert data to string
    const dataString = JSON.stringify(data);
    
    // Generate a unique filename for this data
    const filename = `data-${Date.now()}.json`;
    
    // Use S3 uploadFile function from ipfs-crud.js
    const fileLocation = await uploadFile(filename, dataString);
    
    if (!fileLocation) {
      throw new Error('Upload failed');
    }
    
    // Extract CID or filename from the location URL to use as identifier
    const cid = filename; // Using filename as the CID identifier
    console.log('Data uploaded to IPFS with ID:', cid);
    return cid;
    
  } catch (error) {
    console.error('Error uploading data to IPFS:', error);
    
    // Fallback to localStorage if the upload fails
    const dataMap = JSON.parse(localStorage.getItem('liberaChainIpfsData') || '{}');
    const mockCid = 'mock-cid-' + Date.now();
    dataMap[mockCid] = data;
    localStorage.setItem('liberaChainIpfsData', JSON.stringify(dataMap));
    
    return mockCid;
  }
};

/**
 * Retrieve data from IPFS
 * @param {string} cid - IPFS Content ID (CID) or filename
 * @returns {Promise<Object|null>} Data or null if not found
 */
export const retrieveFromIPFS = async (cid) => {
  try {
    // Check if this is a mock CID for localStorage storage
    if (cid.startsWith('mock-cid-')) {
      console.warn('Using fallback storage for retrieval.');
      const dataMap = JSON.parse(localStorage.getItem('liberaChainIpfsData') || '{}');
      return dataMap[cid] || null;
    }
    
    // Use the getFile function from ipfs-crud.js
    const fileContent = await getFile(cid);
    
    if (!fileContent) {
      throw new Error(`Failed to fetch IPFS content`);
    }
    
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error retrieving data from IPFS:', error);
    
    // Check if we have this CID in localStorage as fallback
    try {
      const dataMap = JSON.parse(localStorage.getItem('liberaChainIpfsData') || '{}');
      return dataMap[cid] || null;
    } catch (e) {
      return null;
    }
  }
};

/**
 * Check if a file exists in IPFS/S3
 * @param {string} filename - Filename to check
 * @returns {Promise<boolean>} Whether the file exists
 */
const checkFileExists = async (filename) => {
  try {
    const fileContent = await getFile(filename);
    return !!fileContent;
  } catch (error) {
    console.error('Error checking if file exists:', error);
    return false;
  }
};