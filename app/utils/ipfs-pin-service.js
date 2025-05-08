// IPFS Pinning Service
import axios from 'axios';

const IPFS_API_PORT = process.env.NEXT_PUBLIC_IPFS_API_PORT || '5001';
const IPFS_HOST = process.env.NEXT_PUBLIC_IPFS_HOST || 'localhost';
const IPFS_API_URL = `http://${IPFS_HOST}:${IPFS_API_PORT}/api/v0`;

/**
 * Check if pinning is available on the current IPFS node
 * @returns {Promise<boolean>} Whether pinning is available
 */
export const isPinningAvailable = async () => {
  try {
    // Try to list pins to check if pinning is available
    const response = await axios.post(`${IPFS_API_URL}/pin/ls`);
    return response.status === 200;
  } catch (error) {
    console.warn('IPFS pinning not available:', error.message);
    return false;
  }
};

/**
 * Pin content to IPFS node
 * @param {string} cid - Content ID to pin
 * @param {Object} metadata - Optional metadata about the content
 * @returns {Promise<boolean>} Whether pinning was successful
 */
export const pinContent = async (cid, metadata = {}) => {
  try {
    if (!await isPinningAvailable()) {
      console.warn('Pinning not available, content will rely on gateway caching');
      return false;
    }

    const response = await axios.post(`${IPFS_API_URL}/pin/add`, null, {
      params: {
        arg: cid,
        recursive: true,
      },
    });

    if (response.status === 200) {
      // Store pin metadata locally
      const pinRegistry = JSON.parse(localStorage.getItem('liberaChainPinRegistry') || '{}');
      pinRegistry[cid] = {
        timestamp: Date.now(),
        ...metadata
      };
      localStorage.setItem('liberaChainPinRegistry', JSON.stringify(pinRegistry));
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error pinning content:', error);
    return false;
  }
};

/**
 * Unpin content from IPFS node
 * @param {string} cid - Content ID to unpin
 * @returns {Promise<boolean>} Whether unpinning was successful
 */
export const unpinContent = async (cid) => {
  try {
    if (!await isPinningAvailable()) {
      return false;
    }

    const response = await axios.post(`${IPFS_API_URL}/pin/rm`, null, {
      params: {
        arg: cid,
        recursive: true,
      },
    });

    if (response.status === 200) {
      // Remove from local registry
      const pinRegistry = JSON.parse(localStorage.getItem('liberaChainPinRegistry') || '{}');
      delete pinRegistry[cid];
      localStorage.setItem('liberaChainPinRegistry', JSON.stringify(pinRegistry));
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unpinning content:', error);
    return false;
  }
};

/**
 * Get all pinned content with metadata
 * @returns {Promise<Object>} Map of CIDs to their metadata
 */
export const getPinnedContent = async () => {
  try {
    if (!await isPinningAvailable()) {
      // Return local registry only
      return JSON.parse(localStorage.getItem('liberaChainPinRegistry') || '{}');
    }

    const response = await axios.post(`${IPFS_API_URL}/pin/ls`);
    const pinRegistry = JSON.parse(localStorage.getItem('liberaChainPinRegistry') || '{}');

    // Merge IPFS pins with local metadata
    const allPins = {};
    for (const [cid, info] of Object.entries(response.data.Keys || {})) {
      allPins[cid] = {
        ...info,
        ...(pinRegistry[cid] || {})
      };
    }

    return allPins;
  } catch (error) {
    console.error('Error getting pinned content:', error);
    // Fallback to local registry
    return JSON.parse(localStorage.getItem('liberaChainPinRegistry') || '{}');
  }
};