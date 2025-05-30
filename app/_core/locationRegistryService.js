import { uploadToIPFS, retrieveFromIPFS } from './ipfsService';

// Store location data with IPFS CIDs locally
const storeLocationRegistry = () => {
  try {
    localStorage.setItem('liberaChainLocationRegistry', JSON.stringify(locationRegistry));
  } catch (error) {
    console.error('Error storing location registry:', error);
  }
};

// Load location registry from local storage
const loadLocationRegistry = () => {
  try {
    const registry = localStorage.getItem('liberaChainLocationRegistry');
    return registry ? JSON.parse(registry) : {};
  } catch (error) {
    console.error('Error loading location registry:', error);
    return {};
  }
};

// Initialize the registry
let locationRegistry = loadLocationRegistry();

/**
 * Store a location DID to IPFS CID mapping
 * @param {string} locationDid - The location DID
 * @param {string} ipfsCid - The IPFS CID of the public key data
 * @returns {boolean} Success status
 */
export const storeLocationMapping = (locationDid, ipfsCid) => {
  try {
    locationRegistry[locationDid] = ipfsCid;
    storeLocationRegistry();
    return true;
  } catch (error) {
    console.error('Error storing location mapping:', error);
    return false;
  }
};

/**
 * Get the IPFS CID for a location DID
 * @param {string} locationDid - The location DID
 * @returns {string|null} The IPFS CID or null if not found
 */
export const getLocationCid = (locationDid) => {
  return locationRegistry[locationDid] || null;
};

/**
 * Store location metadata on IPFS and save the mapping
 * @param {Object} locationData - Location data including public key
 * @returns {Promise<string>} The IPFS CID
 */
export const storeLocationData = async (locationData) => {
  try {
    const ipfsCid = await uploadToIPFS(locationData);
    
    if (!ipfsCid) {
      throw new Error('Failed to upload location data to IPFS');
    }
    
    // Store the mapping
    storeLocationMapping(locationData.locationDid, ipfsCid);
    
    return ipfsCid;
  } catch (error) {
    console.error('Error storing location data:', error);
    throw error;
  }
};

/**
 * Retrieve location data from IPFS using the location DID
 * @param {string} locationDid - The location DID
 * @returns {Promise<Object|null>} Location data or null if not found
 */
export const retrieveLocationDataFromIPFS = async (locationDid) => {
  try {
    const ipfsCid = getLocationCid(locationDid);
    
    if (!ipfsCid) {
      console.warn(`No IPFS CID found for location DID: ${locationDid}`);
      return null;
    }
    
    const locationData = await retrieveFromIPFS(ipfsCid);
    return locationData;
  } catch (error) {
    console.error('Error retrieving location data:', error);
    return null;
  }
};

/**
 * Get all stored locations
 * @returns {Array} Array of location DIDs and their metadata
 */
export const getAllLocations = async () => {
  try {
    const locations = [];
    
    for (const [locationDid, ipfsCid] of Object.entries(locationRegistry)) {
      try {
        const locationData = await retrieveFromIPFS(ipfsCid);
        if (locationData) {
          locations.push({
            ...locationData,
            ipfsCid
          });
        }
      } catch (err) {
        console.error(`Error fetching location data for ${locationDid}:`, err);
      }
    }
    
    return locations;
  } catch (error) {
    console.error('Error getting all locations:', error);
    return [];
  }
};