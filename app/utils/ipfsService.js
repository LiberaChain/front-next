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
  return {
    connected: isConnected,
    mode: isConnected ? 'distributed' : 'local_storage',
    gateway: isConnected ? getS3Gateway() : 'mock (localStorage)',
    apiEndpoint: isConnected ? 'S3-compatible API' : 'none',
    nodeType: isConnected ? 'Filebase S3' : 'Local Mock',
    health: isConnected ? 'healthy' : 'simulated',
    storageCount: isConnected ? null : getLocalStorageItemCount()
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
 * @returns {Promise<string|null>} IPFS CID (Content ID) or null if upload failed
 */
export const uploadProfileToIPFS = async (profileData) => {
  try {
    // If IPFS credentials are not available, use fallback
    if (!hasIpfsCredentials()) {
      console.warn('IPFS credentials not found. Using fallback storage.');
      // For development, we'll store in localStorage as fallback
      const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
      const mockCid = 'mock-cid-' + Date.now();
      profilesMap[mockCid] = profileData;
      localStorage.setItem('liberaChainIpfsProfiles', JSON.stringify(profilesMap));
      return mockCid;
    }
    
    // Convert profile data to string
    const profileDataString = JSON.stringify(profileData);
    
    // Generate a unique filename for this profile
    const filename = `profile-${Date.now()}.json`;
    
    // Use S3 uploadFile function from ipfs-crud.js
    const fileLocation = await uploadFile(filename, profileDataString);
    
    if (!fileLocation) {
      throw new Error('Upload failed');
    }
    
    // Extract CID or filename from the location URL to use as identifier
    const cid = filename; // Using filename as the CID identifier
    console.log('Profile uploaded to IPFS with ID:', cid);
    return cid;
    
  } catch (error) {
    console.error('Error uploading profile to IPFS:', error);
    
    // Fallback to localStorage if the upload fails
    const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
    const mockCid = 'mock-cid-' + Date.now();
    profilesMap[mockCid] = profileData;
    localStorage.setItem('liberaChainIpfsProfiles', JSON.stringify(profilesMap));
    
    return mockCid;
  }
};

/**
 * Retrieve user profile data from IPFS
 * @param {string} cid - IPFS Content ID (CID) or filename
 * @returns {Promise<Object|null>} User profile data or null if not found
 */
export const retrieveProfileFromIPFS = async (cid) => {
  try {
    // Check if this is a mock CID for localStorage storage
    if (cid.startsWith('mock-cid-')) {
      console.warn('Using fallback storage for retrieval.');
      const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
      return profilesMap[cid] || null;
    }
    
    // Use the getFile function from ipfs-crud.js
    const fileContent = await getFile(cid);
    
    if (!fileContent) {
      throw new Error(`Failed to fetch IPFS content`);
    }
    
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error retrieving profile from IPFS:', error);
    
    // Check if we have this CID in localStorage as fallback
    try {
      const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
      return profilesMap[cid] || null;
    } catch (e) {
      return null;
    }
  }
};

/**
 * Update a user profile in IPFS
 * @param {string} cid - Original IPFS Content ID (CID) or filename
 * @param {Object} profileData - Updated user profile data
 * @returns {Promise<string|null>} New IPFS CID
 */
export const updateProfileInIPFS = async (cid, profileData) => {
  try {
    console.log('Attempting to update profile in IPFS with CID/filename:', cid);
    
    // Check if this is a mock CID for localStorage storage
    if (cid.startsWith('mock-cid-')) {
      console.log('Using localStorage fallback for update');
      // Use fallback storage for update
      const profilesMap = JSON.parse(localStorage.getItem('liberaChainIpfsProfiles') || '{}');
      profilesMap[cid] = profileData;
      localStorage.setItem('liberaChainIpfsProfiles', JSON.stringify(profilesMap));
      return cid; // Return the same mock CID
    }
    
    // Convert profile data to string
    const profileDataString = JSON.stringify(profileData);
    console.log('Profile data prepared for update:', { 
      did: profileData.did,
      username: profileData.username,
      bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME
    });
    
    // First check if the file exists before updating
    const fileExists = await checkFileExists(cid);
    
    // If file doesn't exist, create a new one instead
    if (!fileExists) {
      console.warn('File not found in S3 with key:', cid);
      console.log('Creating new file instead of updating...');
      // Generate a new unique filename
      const newFilename = `profile-${Date.now()}.json`;
      const fileLocation = await uploadFile(newFilename, profileDataString);
      
      if (!fileLocation) {
        throw new Error('Upload failed');
      }
      
      console.log('Created new profile instead of update. New location:', fileLocation);
      return newFilename; // Return the new filename/key
    }
    
    // Update the file with new content
    console.log('Updating existing file in S3:', cid);
    const updatedLocation = await updateFile(cid, profileDataString);
    
    if (!updatedLocation) {
      throw new Error('Update failed');
    }
    
    console.log('Profile updated successfully in S3:', updatedLocation);
    return cid; // Return the same filename/key
  } catch (error) {
    console.error('Error updating profile in IPFS:', error);
    // Create a new file if update fails for any reason
    try {
      console.log('Attempting to create a new file after update failure');
      const newFilename = `profile-${Date.now()}.json`;
      const profileDataString = JSON.stringify(profileData);
      const fileLocation = await uploadFile(newFilename, profileDataString);
      
      if (fileLocation) {
        console.log('Successfully created new profile after update failure:', fileLocation);
        return newFilename;
      }
    } catch (secondError) {
      console.error('Failed to create new file after update failure:', secondError);
    }
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