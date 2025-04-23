// IPFS Service for user profile storage using web-compatible APIs
import axios from 'axios'; // We'll use axios instead of ipfs-http-client

// Configure IPFS client
// We're using Infura's IPFS HTTP API, but you can use any IPFS provider or run your own node
const projectId = process.env.NEXT_PUBLIC_IPFS_PROJECT_ID;
const projectSecret = process.env.NEXT_PUBLIC_IPFS_API_SECRET;

// Create authorization header
const auth = projectId && projectSecret 
  ? 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64')
  : '';

// IPFS API endpoint
const ipfsApiEndpoint = 'https://ipfs.infura.io:5001/api/v0';

/**
 * Check if IPFS credentials are available
 * @returns {boolean} Whether credentials are available
 */
const hasIpfsCredentials = () => {
  return !!(projectId && projectSecret);
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
    
    // Create form data with the file contents
    const formData = new FormData();
    const blob = new Blob([profileDataString], { type: 'application/json' });
    formData.append('file', blob);
    
    // Upload to IPFS via Infura API
    const response = await axios.post(`${ipfsApiEndpoint}/add`, formData, {
      headers: {
        'Authorization': auth,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const cid = response.data.Hash;
    console.log('Profile uploaded to IPFS with CID:', cid);
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
 * @param {string} cid - IPFS Content ID (CID)
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
    
    // Use public IPFS gateway to fetch the content
    const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;
    const response = await axios.get(gatewayUrl);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch IPFS content: ${response.statusText}`);
    }
    
    return response.data;
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
 * Update a user profile in IPFS (creates a new CID)
 * @param {Object} profileData - Updated user profile data
 * @returns {Promise<string|null>} New IPFS CID
 */
export const updateProfileInIPFS = async (profileData) => {
  // IPFS is immutable, so updating is actually creating a new entry
  return await uploadProfileToIPFS(profileData);
};