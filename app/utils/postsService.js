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
 * Initialize demo mock posts if none exist
 * This is called when the app loads to ensure there's content to display
 */
export const initializeMockPosts = () => {
  try {
    // Check if we already have posts
    const postRegistry = JSON.parse(localStorage.getItem('liberaChainPostRegistry') || '{}');
    const postsMap = JSON.parse(localStorage.getItem('liberaChainIpfsPosts') || '{}');
    const userPosts = JSON.parse(localStorage.getItem('liberaChainUserPosts') || '{}');
    
    // If we already have posts, don't add mock data
    if (Object.keys(postRegistry).length > 0) {
      return;
    }
    
    console.log('Initializing mock posts for demo purposes');
    
    // Create demo DIDs for mock users
    const mockUsers = [
      {
        did: 'did:ethr:0x1234MockUser1',
        displayName: 'Alex Chen',
        wallet: '0x1234MockWallet1'
      },
      {
        did: 'did:ethr:0x5678MockUser2',
        displayName: 'Maria Santos',
        wallet: '0x5678MockWallet2'
      },
      {
        did: 'did:ethr:0x9012MockUser3',
        displayName: 'Jamal Washington',
        wallet: '0x9012MockWallet3'
      }
    ];
    
    // Create mock posts
    const mockPosts = [
      {
        title: 'Welcome to LiberaChain',
        content: 'This is the first post on LiberaChain, a decentralized social platform built with privacy in mind. All content is stored on IPFS, giving you true ownership of your data.\n\nFeel free to explore and create your own posts!',
        authorDid: mockUsers[0].did,
        authorName: mockUsers[0].displayName,
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
        visibility: 'public'
      },
      {
        title: 'Web3 Identity and Data Sovereignty',
        content: 'The future of digital identity is decentralized. With DIDs (Decentralized Identifiers), users can control their own identity without relying on centralized providers.\n\nWhat are your thoughts on data sovereignty and Web3 identity solutions?',
        authorDid: mockUsers[1].did,
        authorName: mockUsers[1].displayName,
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        visibility: 'public'
      },
      {
        title: 'IPFS: The Backbone of Web3 Storage',
        content: 'IPFS (InterPlanetary File System) is revolutionizing how we think about storing and sharing data online. Instead of location-based addressing, IPFS uses content-based addressing.\n\nEvery file gets a unique hash (CID) based on its content, making it resistant to censorship and permanent.',
        authorDid: mockUsers[2].did,
        authorName: mockUsers[2].displayName,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
        visibility: 'public'
      },
      {
        type: 'imported',
        title: 'Check out this article on Web3 privacy',
        content: 'This is a great overview of current privacy challenges in Web3 and how zero-knowledge proofs might help solve them.',
        url: 'https://ethereum.org/en/zero-knowledge-proofs/',
        source: 'ethereum',
        authorDid: mockUsers[1].did,
        authorName: mockUsers[1].displayName,
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        visibility: 'public',
        metadata: {
          url: 'https://ethereum.org/en/zero-knowledge-proofs/',
          source: 'ethereum',
          extracted: true,
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000
        }
      },
      {
        title: 'Friends-only content sharing',
        content: 'This is a private post that should only be visible to my friends. LiberaChain makes it easy to control who sees your content.\n\nWith the friend-only option, you can share thoughts privately with your connections while keeping the benefits of decentralized storage.',
        authorDid: mockUsers[0].did,
        authorName: mockUsers[0].displayName,
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
        visibility: 'friends-only'
      }
    ];
    
    // Store mock posts in localStorage
    mockPosts.forEach((post, index) => {
      const mockCid = `mock-demo-post-cid-${index}`;
      
      // Add to posts map
      postsMap[mockCid] = post;
      
      // Add to post registry
      postRegistry[mockCid] = {
        authorDid: post.authorDid,
        authorName: post.authorName,
        visibility: post.visibility,
        type: post.type || 'regular',
        url: post.url,
        source: post.source,
        timestamp: post.timestamp,
        contentPreview: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '')
      };
      
      // Add to user posts list
      if (!userPosts[post.authorDid]) {
        userPosts[post.authorDid] = [];
      }
      userPosts[post.authorDid].push(mockCid);
    });
    
    // Save everything to localStorage
    localStorage.setItem('liberaChainIpfsPosts', JSON.stringify(postsMap));
    localStorage.setItem('liberaChainPostRegistry', JSON.stringify(postRegistry));
    localStorage.setItem('liberaChainUserPosts', JSON.stringify(userPosts));
    
    // Setup some mock friendships so we can demo the comments
    const friendships = JSON.parse(localStorage.getItem('liberaChainFriendships') || '{}');
    
    // Make all demo users friends with each other
    mockUsers.forEach(user => {
      if (!friendships[user.did]) {
        friendships[user.did] = [];
      }
      mockUsers.forEach(friend => {
        if (user.did !== friend.did && !friendships[user.did].includes(friend.did)) {
          friendships[user.did].push(friend.did);
        }
      });
    });
    
    localStorage.setItem('liberaChainFriendships', JSON.stringify(friendships));
    
    // Add mock comments to a couple posts
    const postComments = {};
    
    // Comments for first post
    postComments['mock-demo-post-cid-0'] = [
      {
        id: 'comment-mock-1',
        authorDid: mockUsers[1].did,
        authorName: mockUsers[1].displayName,
        content: 'This is exactly what we need - decentralized social media where users control their data!',
        timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
        edited: false
      },
      {
        id: 'comment-mock-2',
        authorDid: mockUsers[2].did,
        authorName: mockUsers[2].displayName,
        content: 'Looking forward to seeing this platform grow. Web3 social media is the future.',
        timestamp: Date.now() - 5.5 * 24 * 60 * 60 * 1000,
        edited: false
      }
    ];
    
    // Comments for second post
    postComments['mock-demo-post-cid-1'] = [
      {
        id: 'comment-mock-3',
        authorDid: mockUsers[0].did,
        authorName: mockUsers[0].displayName,
        content: 'I think DIDs are going to be essential for future online interactions. They solve so many identity problems!',
        timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
        edited: false
      },
      {
        id: 'comment-mock-4',
        authorDid: mockUsers[2].did,
        authorName: mockUsers[2].displayName,
        content: 'Data sovereignty is the most important aspect of Web3. Users should own their data, not corporations.',
        timestamp: Date.now() - 3.5 * 24 * 60 * 60 * 1000,
        edited: false
      }
    ];
    
    localStorage.setItem('liberaChainPostComments', JSON.stringify(postComments));
    
    console.log('Mock posts initialized successfully');
  } catch (error) {
    console.error('Error initializing mock posts:', error);
  }
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
 * @param {string} postCid - CID of the post being commented on
 * @param {Object} commentData - Comment data including author info and content
 * @returns {Promise<Object>} Result object with success status and new comment info
 */
export const addCommentToPost = async (postCid, commentData) => {
  try {
    if (!postCid) throw new Error('Post CID is required');
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
      edited: false
    };
    
    // Get the existing comments for this post
    const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');
    
    // Initialize if this is the first comment for the post
    if (!postComments[postCid]) {
      postComments[postCid] = [];
    }
    
    // Add the new comment
    postComments[postCid].push(comment);
    
    // Save back to storage
    localStorage.setItem('liberaChainPostComments', JSON.stringify(postComments));
    
    // In a production system, we would also update an on-chain record or IPFS
    // to ensure comments are decentralized as well
    
    return {
      success: true,
      comment,
      postCid
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Get comments for a specific post
 * @param {string} postCid - CID of the post
 * @returns {Array} Array of comments for the post
 */
export const getPostComments = (postCid) => {
  try {
    if (!postCid) return [];
    
    // Get all comments from storage
    const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');
    
    // Get comments for this specific post
    const comments = postComments[postCid] || [];
    
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
 * @param {string} postCid - CID of the post
 * @param {string} commentId - ID of the comment to delete
 * @param {string} userDid - DID of the user attempting to delete the comment
 * @returns {Promise<Object>} Result object with success status
 */
export const deleteComment = async (postCid, commentId, userDid) => {
  try {
    if (!postCid) throw new Error('Post CID is required');
    if (!commentId) throw new Error('Comment ID is required');
    if (!userDid) throw new Error('User DID is required');
    
    // Get the existing comments for this post
    const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');
    
    // Check if there are comments for this post
    if (!postComments[postCid]) {
      throw new Error('No comments found for this post');
    }
    
    // Find the comment
    const commentIndex = postComments[postCid].findIndex(comment => comment.id === commentId);
    
    if (commentIndex === -1) {
      throw new Error('Comment not found');
    }
    
    // Check if the user is the author of the comment
    if (postComments[postCid][commentIndex].authorDid !== userDid) {
      throw new Error('You can only delete your own comments');
    }
    
    // Remove the comment
    postComments[postCid].splice(commentIndex, 1);
    
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