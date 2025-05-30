// IPFS HTTP Gateway Service
import axios from 'axios';

// IPFS node configuration
const IPFS_API_PORT = process.env.NEXT_PUBLIC_IPFS_API_PORT || '5001';
const IPFS_GATEWAY_PORT = process.env.NEXT_PUBLIC_IPFS_GATEWAY_PORT || '8080';
const IPFS_HOST = process.env.NEXT_PUBLIC_IPFS_HOST || 'localhost';

// IPFS HTTP client configuration
const IPFS_API_URL = `http://${IPFS_HOST}:${IPFS_API_PORT}/api/v0`;
const IPFS_GATEWAY_URL = `http://${IPFS_HOST}:${IPFS_GATEWAY_PORT}/ipfs`;

/**
 * Upload content to IPFS
 * @param {string} content - Content to upload
 * @returns {Promise<string>} IPFS CID
 */
export const uploadToIpfs = async (content) => {
  try {
    const formData = new FormData();
    const blob = new Blob([content], { type: 'application/json' });
    formData.append('file', blob);

    const response = await axios.post(`${IPFS_API_URL}/add`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.Hash;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    throw error;
  }
};

/**
 * Get content from IPFS
 * @param {string} cid - IPFS CID
 * @returns {Promise<string>} Content from IPFS
 */
export const getFromIpfs = async (cid) => {
  try {
    const response = await axios.get(`${IPFS_GATEWAY_URL}/${cid}`);
    return response.data;
  } catch (error) {
    console.error('Error getting content from IPFS:', error);
    throw error;
  }
};

/**
 * Publish content to IPNS
 * @param {string} cid - IPFS CID to publish
 * @param {string} key - IPNS key name
 * @returns {Promise<string>} IPNS name
 */
export const publishToIpns = async (cid, key) => {
  try {
    const response = await axios.post(`${IPFS_API_URL}/name/publish`, null, {
      params: {
        arg: `/ipfs/${cid}`,
        key: key,
        'allow-offline': true,
      },
    });

    return response.data.Name;
  } catch (error) {
    console.error('Error publishing to IPNS:', error);
    throw error;
  }
};

/**
 * Create a new IPNS key
 * @param {string} name - Key name
 * @returns {Promise<{name: string, id: string}>} Key info
 */
export const createIpnsKey = async (name) => {
  try {
    const response = await axios.post(`${IPFS_API_URL}/key/gen`, null, {
      params: {
        arg: name,
        type: 'rsa',
        size: 2048,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error creating IPNS key:', error);
    throw error;
  }
};

/**
 * Resolve IPNS name to latest IPFS CID
 * @param {string} name - IPNS name
 * @returns {Promise<string>} IPFS CID
 */
export const resolveIpnsName = async (name) => {
  try {
    const response = await axios.post(`${IPFS_API_URL}/name/resolve`, null, {
      params: {
        arg: name,
      },
    });

    // Extract CID from path
    const path = response.data.Path;
    return path.split('/ipfs/')[1];
  } catch (error) {
    console.error('Error resolving IPNS name:', error);
    throw error;
  }
};