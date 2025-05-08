// IPNS Service for creating and managing mutable pointers to IPFS content
import {
  uploadToIpfs,
  getFromIpfs,
  publishToIpns as publishToNode,
  createIpnsKey,
  resolveIpnsName
} from './ipfs-http';

// Store mapping of DIDs to their IPNS keys
const IPNS_KEY_REGISTRY = 'liberaChainIpnsKeyRegistry';

/**
 * Get the IPNS key registry
 * @returns {Object} Registry mapping DIDs to IPNS keys
 */
const getKeyRegistry = () => {
  try {
    return JSON.parse(localStorage.getItem(IPNS_KEY_REGISTRY) || '{}');
  } catch (error) {
    console.error('Error reading IPNS key registry:', error);
    return {};
  }
};

/**
 * Save the IPNS key registry
 * @param {Object} registry - Registry to save
 */
const saveKeyRegistry = (registry) => {
  try {
    localStorage.setItem(IPNS_KEY_REGISTRY, JSON.stringify(registry));
  } catch (error) {
    console.error('Error saving IPNS key registry:', error);
  }
};

/**
 * Get or create IPNS key for a DID and type
 * @param {string} did - The DID to get/create key for
 * @param {string} type - Content type (e.g., 'profile', 'posts')
 * @returns {Promise<string>} IPNS key name
 */
const getOrCreateKey = async (did, type) => {
  const registry = getKeyRegistry();
  const keyId = `${did}-${type}`;

  if (!registry[keyId]) {
    // Create new IPNS key
    const keyName = `key-${keyId}`;
    const keyInfo = await createIpnsKey(keyName);
    registry[keyId] = keyInfo.name;
    saveKeyRegistry(registry);
  }

  return registry[keyId];
};

/**
 * Publish content to IPNS
 * @param {string} did - The DID associated with this content
 * @param {string} cid - The IPFS CID to point to
 * @param {string} type - The type of content
 * @returns {Promise<string>} The IPNS name
 */
export const publishToIpns = async (did, cid, type) => {
  try {
    const keyName = await getOrCreateKey(did, type);
    const ipnsName = await publishToNode(cid, keyName);
    return ipnsName;
  } catch (error) {
    console.error('Error publishing to IPNS:', error);
    throw error;
  }
};

/**
 * Resolve an IPNS name to its latest IPFS CID
 * @param {string} ipnsName - The IPNS name to resolve
 * @returns {Promise<string|null>} The latest IPFS CID or null if not found
 */
export const resolveIpns = async (ipnsName) => {
  try {
    return await resolveIpnsName(ipnsName);
  } catch (error) {
    console.error('Error resolving IPNS:', error);
    return null;
  }
};

/**
 * Get the latest content for a DID and type using IPNS
 * @param {string} did - The DID to get content for
 * @param {string} type - The type of content to get
 * @returns {Promise<Object|null>} The content or null if not found
 */
export const getLatestContent = async (did, type) => {
  try {
    const keyName = await getOrCreateKey(did, type);
    const cid = await resolveIpnsName(keyName);
    
    if (!cid) {
      return null;
    }
    
    const content = await getFromIpfs(cid);
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error('Error getting latest content:', error);
    return null;
  }
};

/**
 * Update content and publish new version to IPNS
 * @param {string} did - The DID associated with this content
 * @param {Object} content - The content to update
 * @param {string} type - The type of content being updated
 * @returns {Promise<{ipnsName: string, cid: string}>} The IPNS name and new CID
 */
export const updateContent = async (did, content, type) => {
  try {
    // Upload new content version to IPFS
    const contentStr = JSON.stringify(content);
    const cid = await uploadToIpfs(contentStr);
    
    // Publish to IPNS
    const ipnsName = await publishToIpns(did, cid, type);
    
    return { ipnsName, cid };
  } catch (error) {
    console.error('Error updating content:', error);
    throw error;
  }
};