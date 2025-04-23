// Posts Service for IPFS-based social media functionality
import axios from 'axios';

// Reuse the IPFS configuration from ipfsService.js
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
 * Upload a post to IPFS
 * @param {Object} postData - Post data to upload
 * @returns {Promise<string|null>} IPFS CID (Content ID) or null if upload failed
 */
export const uploadPostToIPFS = async (postData) => {
  try {
    // If IPFS credentials are not available, use fallback
    if (!hasIpfsCredentials()) {
      console.warn('IPFS credentials not found. Using fallback storage for post.');
      // For development, we'll store in localStorage as fallback
      const postsMap = JSON.parse(localStorage.getItem('liberaChainIpfsPosts') || '{}');
      const mockCid = 'mock-post-cid-' + Date.now();
      postsMap[mockCid] = postData;
      localStorage.setItem('liberaChainIpfsPosts', JSON.stringify(postsMap));
      return mockCid;
    }
    
    // Convert post data to string
    const postDataString = JSON.stringify(postData);
    
    // Create form data with the file contents
    const formData = new FormData();
    const blob = new Blob([postDataString], { type: 'application/json' });
    formData.append('file', blob);
    
    // Upload to IPFS via Infura API
    const response = await axios.post(`${ipfsApiEndpoint}/add`, formData, {
      headers: {
        'Authorization': auth,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const cid = response.data.Hash;
    console.log('Post uploaded to IPFS with CID:', cid);
    return cid;
    
  } catch (error) {
    console.error('Error uploading post to IPFS:', error);
    
    // Fallback to localStorage if the upload fails
    const postsMap = JSON.parse(localStorage.getItem('liberaChainIpfsPosts') || '{}');
    const mockCid = 'mock-post-cid-' + Date.now();
    postsMap[mockCid] = postData;
    localStorage.setItem('liberaChainIpfsPosts', JSON.stringify(postsMap));
    
    return mockCid;
  }
};

/**
 * Retrieve a post from IPFS
 * @param {string} cid - IPFS Content ID (CID)
 * @returns {Promise<Object|null>} Post data or null if not found
 */
export const retrievePostFromIPFS = async (cid) => {
  try {
    // Check if this is a mock CID for localStorage storage
    if (cid.startsWith('mock-post-cid-')) {
      console.warn('Using fallback storage for post retrieval.');
      const postsMap = JSON.parse(localStorage.getItem('liberaChainIpfsPosts') || '{}');
      return postsMap[cid] || null;
    }
    
    // Use public IPFS gateway to fetch the content
    const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;
    const response = await axios.get(gatewayUrl);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch IPFS post content: ${response.statusText}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error retrieving post from IPFS:', error);
    
    // Check if we have this CID in localStorage as fallback
    try {
      const postsMap = JSON.parse(localStorage.getItem('liberaChainIpfsPosts') || '{}');
      return postsMap[cid] || null;
    } catch (e) {
      return null;
    }
  }
};

/**
 * Store post metadata in local registry
 * @param {string} cid - IPFS Content ID of the post
 * @param {Object} metadata - Post metadata including author, visibility, etc.
 */
export const storePostMetadata = (cid, metadata) => {
  try {
    // Get existing post registry
    const postRegistry = JSON.parse(localStorage.getItem('liberaChainPostRegistry') || '{}');
    
    // Add new post metadata
    postRegistry[cid] = {
      ...metadata,
      timestamp: Date.now()
    };
    
    // Save updated registry
    localStorage.setItem('liberaChainPostRegistry', JSON.stringify(postRegistry));
    
    // Also update user's posts list
    if (metadata.authorDid) {
      const userPosts = JSON.parse(localStorage.getItem('liberaChainUserPosts') || '{}');
      if (!userPosts[metadata.authorDid]) {
        userPosts[metadata.authorDid] = [];
      }
      userPosts[metadata.authorDid].push(cid);
      localStorage.setItem('liberaChainUserPosts', JSON.stringify(userPosts));
    }
    
    return true;
  } catch (error) {
    console.error('Error storing post metadata:', error);
    return false;
  }
};

/**
 * Get posts for a specific user
 * @param {string} did - User's DID
 * @returns {Promise<Array>} Array of post objects
 */
export const getUserPosts = async (did) => {
  try {
    // Get list of post CIDs for this user
    const userPosts = JSON.parse(localStorage.getItem('liberaChainUserPosts') || '{}');
    const postCids = userPosts[did] || [];
    
    // Fetch each post content
    const posts = await Promise.all(
      postCids.map(async (cid) => {
        const postData = await retrievePostFromIPFS(cid);
        if (postData) {
          return {
            ...postData,
            cid
          };
        }
        return null;
      })
    );
    
    // Filter out any nulls and sort by timestamp (newest first)
    return posts
      .filter(post => post !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
    
  } catch (error) {
    console.error('Error getting user posts:', error);
    return [];
  }
};

/**
 * Get public posts from all users
 * @param {number} limit - Maximum number of posts to return
 * @returns {Promise<Array>} Array of post objects
 */
export const getPublicPosts = async (limit = 50) => {
  try {
    // Get post registry
    const postRegistry = JSON.parse(localStorage.getItem('liberaChainPostRegistry') || '{}');
    
    // Get all public post CIDs
    const publicPostCids = Object.entries(postRegistry)
      .filter(([_, metadata]) => metadata.visibility === 'public')
      .map(([cid, _]) => cid);
    
    // Fetch content for each public post
    const posts = await Promise.all(
      publicPostCids.map(async (cid) => {
        const postData = await retrievePostFromIPFS(cid);
        const metadata = postRegistry[cid];
        if (postData && metadata) {
          return {
            ...postData,
            ...metadata,
            cid
          };
        }
        return null;
      })
    );
    
    // Filter out nulls, sort by timestamp (newest first), and limit results
    return posts
      .filter(post => post !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
  } catch (error) {
    console.error('Error getting public posts:', error);
    return [];
  }
};

/**
 * Check if a user is authorized to view a post
 * @param {string} viewerDid - DID of the user trying to view the post
 * @param {Object} postMetadata - Post metadata
 * @returns {boolean} Whether the user is authorized
 */
export const canViewPost = (viewerDid, postMetadata) => {
  // Public posts can be viewed by anyone
  if (postMetadata.visibility === 'public') {
    return true;
  }
  
  // Author can always view their own posts
  if (viewerDid === postMetadata.authorDid) {
    return true;
  }
  
  // For friends-only posts, check if viewer is a friend
  if (postMetadata.visibility === 'friends-only') {
    // In a real app, this would check the blockchain or a more sophisticated friendship system
    // For now, we'll use a simple friends list in localStorage
    const friendships = JSON.parse(localStorage.getItem('liberaChainFriendships') || '{}');
    const authorFriends = friendships[postMetadata.authorDid] || [];
    return authorFriends.includes(viewerDid);
  }
  
  return false;
};