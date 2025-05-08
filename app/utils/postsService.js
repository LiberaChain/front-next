// Posts Service for IPFS-based social media functionality using S3 storage
import {
  uploadFile, 
  getFile, 
  hasS3Credentials, 
  getS3Gateway
} from './ipfs-crud.js';
import {
  getBlockchainPost,
  getUserBlockchainPosts,
  getPublicBlockchainPosts,
  checkBalanceForPosting,
  getBlockchainPostFee
} from './blockchainPostsService';

// Check if IPFS credentials are available
const hasIpfsCredentials = () => {
  return hasS3Credentials();
};

/**
 * Upload a post to IPFS
 * @param {Object} postData - Post data to upload
 * @returns {Promise<string|null>} IPFS CID (Content ID) or null if upload failed
 */
export const uploadPostToIPFS = async (postData) => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  // Convert post data to string
  const postDataString = JSON.stringify(postData);
  
  // Generate a unique filename for this post
  const filename = `post-${Date.now()}.json`;
  
  // Use S3 uploadFile function from ipfs-crud.js
  const fileLocation = await uploadFile(filename, postDataString);
  
  if (!fileLocation) {
    throw new Error('Post upload failed');
  }

  return filename;
};

/**
 * Retrieve a post from IPFS
 * @param {string} cid - IPFS Content ID (CID) or filename
 * @returns {Promise<Object|null>} Post data or null if not found
 */
export const retrievePostFromIPFS = async (cid) => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  const fileContent = await getFile(cid);
  if (!fileContent) {
    throw new Error('Failed to fetch post from IPFS');
  }

  return JSON.parse(fileContent);
};

/**
 * Get all public posts from IPFS and blockchain
 * @returns {Promise<Array>} Array of public post objects
 */
export const getAllPublicPosts = async () => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  const gateway = getS3Gateway();
  let posts = [];

  try {
    const response = await fetch(gateway);
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.status}`);
    }

    const listData = await response.json();
    if (listData.success && listData.files) {
      const postFiles = listData.files.filter(file => file.match(/post-\d+\.json/));
      
      // Fetch and process each post in parallel
      const postPromises = postFiles.map(async (filename) => {
        const postContent = await getFile(filename);
        if (postContent) {
          const postData = JSON.parse(postContent);
          if (postData.visibility === 'public') {
            return {
              ...postData,
              cid: filename,
              source: 'ipfs'
            };
          }
        }
        return null;
      });

      const results = await Promise.all(postPromises);
      posts = results.filter(post => post !== null);
    }
  } catch (error) {
    console.error('Error fetching public posts:', error);
    throw error;
  }

  // Get blockchain posts as well
  try {
    const blockchainPosts = await getPublicBlockchainPosts();
    if (blockchainPosts && blockchainPosts.length > 0) {
      posts = [...posts, ...blockchainPosts];
    }
  } catch (error) {
    console.error('Error fetching blockchain posts:', error);
  }

  // Sort all posts by timestamp, newest first
  return posts.sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Get posts for a specific user
 * @param {string} did - User's DID
 * @returns {Promise<Array>} Array of post objects
 */
export const getUserPosts = async (did) => {
  if (!hasIpfsCredentials()) {
    throw new Error('IPFS credentials not configured');
  }

  const gateway = getS3Gateway();
  let userPosts = [];

  try {
    const response = await fetch(gateway);
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.status}`);
    }

    const listData = await response.json();
    if (listData.success && listData.files) {
      const postFiles = listData.files.filter(file => file.match(/post-\d+\.json/));
      
      const postPromises = postFiles.map(async (filename) => {
        const postContent = await getFile(filename);
        if (postContent) {
          const postData = JSON.parse(postContent);
          if (postData.authorDid === did) {
            return {
              ...postData,
              cid: filename,
              source: 'ipfs'
            };
          }
        }
        return null;
      });

      const results = await Promise.all(postPromises);
      userPosts = results.filter(post => post !== null);
    }
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }

  // Get user's blockchain posts as well
  try {
    const blockchainPosts = await getUserBlockchainPosts(did);
    if (blockchainPosts && blockchainPosts.length > 0) {
      userPosts = [...userPosts, ...blockchainPosts];
    }
  } catch (error) {
    console.error('Error fetching user blockchain posts:', error);
  }

  // Sort all posts by timestamp, newest first
  return userPosts.sort((a, b) => b.timestamp - a.timestamp);
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

/**
 * Extract basic metadata from external URLs (social media links)
 * @param {string} url - URL to extract metadata from
 * @returns {Promise<Object>} Object containing extracted metadata
 */
export const extractMetadataFromUrl = async (url) => {
  try {
    // Validate URL
    if (!url || !url.startsWith('http')) {
      throw new Error('Invalid URL format');
    }
    
    // Determine the source type
    let source = 'unknown';
    if (url.includes('facebook.com') || url.includes('fb.com')) {
      source = 'facebook';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      source = 'x';
    } else if (url.includes('reddit.com')) {
      source = 'reddit';
    } else if (url.includes('instagram.com')) {
      source = 'instagram';
    } else if (url.includes('linkedin.com')) {
      source = 'linkedin';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      source = 'youtube';
    }

    // In a production environment, we would:
    // 1. Use proper API calls to fetch metadata (requires API keys)
    // 2. Use Open Graph protocol to extract metadata
    // 3. Handle rate limiting and errors properly
    
    // For this prototype, we'll return basic metadata
    return {
      url,
      source,
      extracted: true,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error extracting metadata from URL:', error);
    return {
      url,
      source: 'unknown',
      extracted: false,
      error: error.message
    };
  }
};

/**
 * Create a post from an imported URL
 * @param {Object} data - Post data including URL and user's comment
 * @param {Object} authorInfo - Author information
 * @returns {Promise<Object>} Result containing CID and status
 */
export const createImportedPost = async (data, authorInfo) => {
  try {
    if (!data.url) throw new Error('URL is required');
    if (!authorInfo.did) throw new Error('Author information is required');
    
    // Extract metadata from the URL
    const metadata = await extractMetadataFromUrl(data.url);
    
    // Create post data structure
    const postData = {
      type: 'imported',
      title: data.title || `Imported from ${metadata.source}`,
      content: data.comment || '',
      url: data.url,
      source: metadata.source,
      authorDid: authorInfo.did,
      authorName: authorInfo.displayName || `User-${authorInfo.wallet?.substring(2, 8)}`,
      timestamp: Date.now(),
      metadata
    };
    
    // Upload to IPFS
    const cid = await uploadPostToIPFS(postData);
    
    if (!cid) throw new Error('Failed to upload imported post to IPFS');
    
    // Store post metadata
    const metadataResult = storePostMetadata(cid, {
      type: 'imported',
      authorDid: authorInfo.did,
      authorName: authorInfo.displayName || `User-${authorInfo.wallet?.substring(2, 8)}`,
      visibility: data.visibility || 'public',
      source: metadata.source,
      url: data.url,
      contentPreview: data.comment ? 
        data.comment.substring(0, 100) + (data.comment.length > 100 ? '...' : '') : 
        `Imported from ${metadata.source}`
    });
    
    if (!metadataResult) throw new Error('Failed to store imported post metadata');
    
    return {
      success: true,
      cid,
      source: metadata.source,
      postData
    };
  } catch (error) {
    console.error('Error creating imported post:', error);
    throw error;
  }
};

/**
 * Add a comment to a post
 * @param {string} postIdentifier - CID or postId of the post being commented on
 * @param {Object} commentData - Comment data including author info and content
 * @returns {Promise<Object>} Result object with success status and new comment info
 */
export const addCommentToPost = async (postIdentifier, commentData) => {
  try {
    if (!postIdentifier) throw new Error('Post identifier is required');
    if (!commentData.authorDid) throw new Error('Comment author DID is required');
    if (!commentData.content) throw new Error('Comment content is required');
    
    // Generate a unique ID for the comment
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Create the comment object
    const comment = {
      id: commentId,
      authorDid: commentData.authorDid,
      authorName: commentData.authorName,
      content: commentData.content,
      timestamp: Date.now(),
      parentCommentId: commentData.parentCommentId || null, // For threaded comments
      edited: false,
      postSource: commentData.postSource || 'ipfs' // Track if this is for a blockchain or IPFS post
    };
    
    // Get the existing comments for this post
    const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');
    
    // Initialize if this is the first comment for the post
    if (!postComments[postIdentifier]) {
      postComments[postIdentifier] = [];
    }
    
    // Add the new comment
    postComments[postIdentifier].push(comment);
    
    // Save back to storage
    localStorage.setItem('liberaChainPostComments', JSON.stringify(postComments));
    
    // In a production system, we would also update an on-chain record or IPFS
    // to ensure comments are decentralized as well
    
    return {
      success: true,
      comment,
      postIdentifier
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Get comments for a specific post
 * @param {string} postIdentifier - CID or postId of the post
 * @returns {Array} Array of comments for the post
 */
export const getPostComments = (postIdentifier) => {
  try {
    if (!postIdentifier) return [];
    
    // Get all comments from storage
    const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');
    
    // Get comments for this specific post
    const comments = postComments[postIdentifier] || [];
    
    // Sort by timestamp (oldest first, for chronological display)
    return comments.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Error getting post comments:', error);
    return [];
  }
};

/**
 * Check if a user is a friend of another user
 * @param {string} userDid - DID of the user to check
 * @param {string} targetDid - DID of the potential friend
 * @returns {boolean} Whether the users are friends
 */
export const checkFriendship = (userDid, targetDid) => {
  try {
    // If same user, return true (you can comment on your own posts)
    if (userDid === targetDid) return true;
    
    // For this implementation, we'll use a simple friendships map in localStorage
    // In a production app, this would be stored on-chain or through a verifiable credential system
    const friendships = JSON.parse(localStorage.getItem('liberaChainFriendships') || '{}');
    
    // Check if userDid has targetDid as a friend
    const userFriends = friendships[userDid] || [];
    return userFriends.includes(targetDid);
  } catch (error) {
    console.error('Error checking friendship:', error);
    return false;
  }
};

/**
 * Delete a comment from a post
 * @param {string} postIdentifier - CID or postId of the post
 * @param {string} commentId - ID of the comment to delete
 * @param {string} userDid - DID of the user attempting to delete the comment
 * @returns {Promise<Object>} Result object with success status
 */
export const deleteComment = async (postIdentifier, commentId, userDid) => {
  try {
    if (!postIdentifier) throw new Error('Post identifier is required');
    if (!commentId) throw new Error('Comment ID is required');
    if (!userDid) throw new Error('User DID is required');
    
    // Get the existing comments for this post
    const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');
    
    // Check if there are comments for this post
    if (!postComments[postIdentifier]) {
      throw new Error('No comments found for this post');
    }
    
    // Find the comment
    const commentIndex = postComments[postIdentifier].findIndex(comment => comment.id === commentId);
    
    if (commentIndex === -1) {
      throw new Error('Comment not found');
    }
    
    // Check if the user is the author of the comment
    if (postComments[postIdentifier][commentIndex].authorDid !== userDid) {
      throw new Error('You can only delete your own comments');
    }
    
    // Remove the comment
    postComments[postIdentifier].splice(commentIndex, 1);
    
    // Save back to storage
    localStorage.setItem('liberaChainPostComments', JSON.stringify(postComments));
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

/**
 * Check if user can post to blockchain (has enough balance)
 * @returns {Promise<Object>} Balance check result
 */
export const checkBlockchainPostingAbility = async () => {
  return checkBalanceForPosting();
};

/**
 * Get the current post fee for blockchain
 * @returns {Promise<Object>} Fee information
 */
export const getBlockchainPostingFee = async () => {
  return getBlockchainPostFee();
};