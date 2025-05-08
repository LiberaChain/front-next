// IPFS Service for user profile storage using S3-compatible implementation from Filebase
import {
  uploadFile,
  getFile,
  updateFile,
  hasS3Credentials,
  getS3Gateway
} from './ipfs-crud.js';

/**
 * Check if IPFS credentials are available
 * @returns {boolean} Whether credentials are available
 */
export const hasIpfsCredentials = () => {
  return hasS3Credentials();
};

/**
 * Get IPFS status information including gateway and mode
 * @returns {Object} IPFS status information
 */
export const getIpfsStatus = () => {
  const isConnected = hasIpfsCredentials();
  if (!isConnected) {
    throw new Error('IPFS credentials not configured. Please set up your IPFS environment variables.');
  }
  return {
    connected: true,
    mode: 'distributed',
    gateway: getS3Gateway(),
    apiEndpoint: 'S3-compatible API',
    nodeType: 'Filebase S3',
    health: 'healthy'
  };
};

/**
 * Upload user profile data to IPFS
 * @param {Object} profileData - User profile data to upload
 * @returns {Promise<string|null>} IPFS CID (Content ID) or null if upload failed
 */
export const uploadProfileToIPFS = async (profileData) => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  const profileDataString = JSON.stringify(profileData);
  const filename = `profile-${Date.now()}.json`;
  const fileLocation = await uploadFile(filename, profileDataString);
  
  if (!fileLocation) {
    throw new Error('Failed to upload profile to IPFS');
  }

  return filename;
};

/**
 * Retrieve user profile data from IPFS
 * @param {string} cid - IPFS Content ID (CID) or filename
 * @returns {Promise<Object|null>} User profile data or null if not found
 */
export const retrieveProfileFromIPFS = async (cid) => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  const fileContent = await getFile(cid);
  if (!fileContent) {
    throw new Error('Failed to fetch IPFS content');
  }

  return JSON.parse(fileContent);
};

/**
 * Update a user profile in IPFS
 * @param {string} cid - Original IPFS Content ID (CID) or filename
 * @param {Object} profileData - Updated user profile data
 * @returns {Promise<string|null>} New IPFS CID
 */
export const updateProfileInIPFS = async (cid, profileData) => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  const profileDataString = JSON.stringify(profileData);
  const fileExists = await checkFileExists(cid);

  if (!fileExists) {
    const newFilename = `profile-${Date.now()}.json`;
    const fileLocation = await uploadFile(newFilename, profileDataString);
    if (!fileLocation) {
      throw new Error('Failed to create new profile in IPFS');
    }
    return newFilename;
  }

  const updatedLocation = await updateFile(cid, profileDataString);
  if (!updatedLocation) {
    throw new Error('Failed to update profile in IPFS');
  }

  return cid;
};