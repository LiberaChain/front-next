// groupsService.js
import { ethers } from 'ethers';
import { getContract, getProviderAndSigner, getCurrentUserAddress } from './blockchainTransactions';
import { uploadToIPFS, retrieveFromIPFS } from './ipfsService';

// Define the GroupRegistry contract ABI
const groupRegistryABI = [
  // Group management functions
  "function createGroup(string memory _did, string memory _name, string memory _description, string memory _adminDid, bool _isPublic, string memory _ipfsCid) public returns (bool)",
  "function addMember(string memory _groupDid, string memory _memberDid) public returns (bool)",
  "function removeMember(string memory _groupDid, string memory _memberDid) public returns (bool)",
  "function addGroupPost(string memory _groupDid, bytes32 _postId) public returns (bool)",
  "function isMember(string memory _groupDid, string memory _memberDid) public view returns (bool)",
  "function getGroup(string memory _groupDid) public view returns (string memory did, string memory name, string memory description, string memory adminDid, uint256 memberCount, uint256 postCount, uint256 creationTime, string memory ipfsCid, bool isPublic)",
  "function getGroupMembers(string memory _groupDid) public view returns (string[] memory)",
  "function getGroupPosts(string memory _groupDid) public view returns (bytes32[] memory)",
  "function getUserGroups(string memory _userDid) public view returns (string[] memory)"
];

/**
 * Get GroupRegistry contract instance
 * @param {boolean} withSigner - Whether to use a signer for transactions
 * @returns {Promise<ethers.Contract>} GroupRegistry contract instance
 */
export const getGroupRegistryContract = async (withSigner = true) => {
  return getContract('GroupRegistry', withSigner, groupRegistryABI);
};

/**
 * Create a new group
 * @param {Object} groupData - Group data object
 * @param {string} groupData.name - Group name
 * @param {string} groupData.description - Group description
 * @param {string} groupData.adminDid - DID of group admin
 * @param {boolean} groupData.isPublic - Whether the group is public or private
 * @param {Object} groupData.metadata - Additional metadata to store in IPFS
 * @returns {Promise<{success: boolean, did: string, error: string|null}>} Result
 */
export const createGroup = async (groupData) => {
  try {
    const { name, description, adminDid, isPublic, metadata } = groupData;

    if (!adminDid || !name) {
      throw new Error('Group name and admin DID are required');
    }

    // Create a DID for the group by generating a random Ethereum address
    const groupWallet = ethers.Wallet.createRandom();
    const groupDid = `did:ethr:${groupWallet.address}`;

    // Store additional metadata in IPFS if provided
    let ipfsCid = '';
    if (metadata) {
      const metadataWithTimestamp = {
        ...metadata,
        createdAt: Date.now(),
        name,
        description,
        adminDid
      };
      
      ipfsCid = await uploadToIPFS(metadataWithTimestamp, `group-metadata-${groupDid}`);
    }

    // Create the group on the blockchain
    const contract = await getGroupRegistryContract(true);
    const tx = await contract.createGroup(
      groupDid,
      name,
      description,
      adminDid,
      isPublic,
      ipfsCid
    );

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('Group created on blockchain, transaction confirmed in block:', receipt.blockNumber);

    // Store group in local storage for offline access
    storeGroupLocally(groupDid, {
      did: groupDid,
      name,
      description,
      adminDid,
      members: [adminDid],
      posts: [],
      creationTime: Date.now(),
      ipfsCid,
      isPublic
    });

    return {
      success: true,
      did: groupDid,
      transactionHash: tx.hash
    };
  } catch (error) {
    console.error('Error creating group:', error);
    return {
      success: false,
      error: error.message || 'Failed to create group'
    };
  }
};

/**
 * Join a group
 * @param {string} groupDid - Group DID
 * @param {string} memberDid - DID of the member joining
 * @returns {Promise<{success: boolean, error: string|null}>} Result
 */
export const joinGroup = async (groupDid, memberDid) => {
  try {
    const contract = await getGroupRegistryContract(true);
    
    // First check if user is already a member
    const isMember = await contract.isMember(groupDid, memberDid);
    if (isMember) {
      return {
        success: true,
        alreadyMember: true
      };
    }
    
    // Add member to the group
    const tx = await contract.addMember(groupDid, memberDid);
    await tx.wait();
    
    // Update local storage
    const localGroups = JSON.parse(localStorage.getItem('liberaChainGroups') || '{}');
    if (localGroups[groupDid] && !localGroups[groupDid].members.includes(memberDid)) {
      localGroups[groupDid].members.push(memberDid);
      localStorage.setItem('liberaChainGroups', JSON.stringify(localGroups));
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error joining group:', error);
    return {
      success: false,
      error: error.message || 'Failed to join group'
    };
  }
};

/**
 * Leave a group
 * @param {string} groupDid - Group DID
 * @param {string} memberDid - DID of the member leaving
 * @returns {Promise<{success: boolean, error: string|null}>} Result
 */
export const leaveGroup = async (groupDid, memberDid) => {
  try {
    const contract = await getGroupRegistryContract(true);
    
    // Remove member from the group
    const tx = await contract.removeMember(groupDid, memberDid);
    await tx.wait();
    
    // Update local storage
    const localGroups = JSON.parse(localStorage.getItem('liberaChainGroups') || '{}');
    if (localGroups[groupDid]) {
      localGroups[groupDid].members = localGroups[groupDid].members.filter(did => did !== memberDid);
      localStorage.setItem('liberaChainGroups', JSON.stringify(localGroups));
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error leaving group:', error);
    return {
      success: false,
      error: error.message || 'Failed to leave group'
    };
  }
};

/**
 * Post to a group
 * @param {Object} postData - Post data
 * @param {string} groupDid - The DID of the group to post to
 * @returns {Promise<{success: boolean, postId: string, error: string|null}>} Result
 */
export const createGroupPost = async (postData, groupDid) => {
  try {
    // First create the post using the existing post service
    // but add a group field to indicate this is a group post
    const postWithGroup = {
      ...postData,
      group: groupDid,
      visibility: 'group' // Special visibility for group posts
    };
    
    // Use your existing createBlockchainPost or uploadPostToIPFS function
    const postResult = await createBlockchainPost(postWithGroup);
    
    if (!postResult.success) {
      throw new Error('Failed to create post: ' + (postResult.error || 'Unknown error'));
    }
    
    // Now add this post to the group
    const contract = await getGroupRegistryContract(true);
    const tx = await contract.addGroupPost(groupDid, postResult.postId);
    await tx.wait();
    
    // Update local storage
    const localGroups = JSON.parse(localStorage.getItem('liberaChainGroups') || '{}');
    if (localGroups[groupDid] && !localGroups[groupDid].posts.includes(postResult.postId)) {
      localGroups[groupDid].posts.push(postResult.postId);
      localStorage.setItem('liberaChainGroups', JSON.stringify(localGroups));
    }
    
    return {
      success: true,
      postId: postResult.postId,
      transactionHash: postResult.transactionHash
    };
  } catch (error) {
    console.error('Error creating group post:', error);
    return {
      success: false,
      error: error.message || 'Failed to create group post'
    };
  }
};

/**
 * Get all groups a user is a member of
 * @param {string} userDid - User's DID
 * @returns {Promise<Array>} Array of group objects
 */
export const getUserGroups = async (userDid) => {
  try {
    const contract = await getGroupRegistryContract(false);
    
    // Get group DIDs this user is a member of
    const groupDids = await contract.getUserGroups(userDid);
    
    // Get details for each group
    const groups = await Promise.all(
      groupDids.map(async (groupDid) => {
        try {
          const groupData = await contract.getGroup(groupDid);
          
          // Get additional metadata from IPFS if available
          let metadataFromIpfs = null;
          if (groupData.ipfsCid) {
            metadataFromIpfs = await retrieveFromIPFS(groupData.ipfsCid);
          }
          
          return {
            did: groupData.did,
            name: groupData.name,
            description: groupData.description,
            adminDid: groupData.adminDid,
            memberCount: groupData.memberCount.toNumber(),
            postCount: groupData.postCount.toNumber(),
            creationTime: new Date(groupData.creationTime.toNumber() * 1000),
            ipfsCid: groupData.ipfsCid,
            isPublic: groupData.isPublic,
            metadata: metadataFromIpfs
          };
        } catch (err) {
          console.error(`Error getting details for group ${groupDid}:`, err);
          return null;
        }
      })
    );
    
    // Filter out any nulls from errors
    return groups.filter(group => group !== null);
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
};

/**
 * Get all posts for a group
 * @param {string} groupDid - Group's DID
 * @param {string} userDid - User's DID (to verify membership)
 * @returns {Promise<Array>} Array of post objects
 */
export const getGroupPosts = async (groupDid, userDid) => {
  try {
    const contract = await getGroupRegistryContract(false);
    
    // First verify the user is a member of this group or it's a public group
    const groupData = await contract.getGroup(groupDid);
    const isPublic = groupData.isPublic;
    
    if (!isPublic) {
      const isMember = await contract.isMember(groupDid, userDid);
      if (!isMember) {
        throw new Error('You are not a member of this group');
      }
    }
    
    // Get posts IDs for this group
    const postIds = await contract.getGroupPosts(groupDid);
    
    // Get details for each post using existing getBlockchainPost function
    const posts = await Promise.all(
      postIds.map(async (postId) => {
        try {
          const postResult = await getBlockchainPost(postId);
          return postResult.success ? postResult.post : null;
        } catch (error) {
          console.error(`Error fetching post ${postId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any nulls from errors and sort by timestamp (newest first)
    return posts
      .filter(post => post !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error getting group posts:', error);
    return [];
  }
};

/**
 * Store group information in local storage for offline access
 * @param {string} groupDid - Group DID
 * @param {Object} groupData - Group data
 */
const storeGroupLocally = (groupDid, groupData) => {
  try {
    const groups = JSON.parse(localStorage.getItem('liberaChainGroups') || '{}');
    groups[groupDid] = groupData;
    localStorage.setItem('liberaChainGroups', JSON.stringify(groups));
  } catch (error) {
    console.error('Error storing group locally:', error);
  }
};

/**
 * Get all public groups
 * @returns {Promise<Array>} Array of public group objects
 */
export const getPublicGroups = async () => {
  // For a full implementation, you would need to add a function to the contract
  // to list public groups. For now, we'll use a simplified approach:
  try {
    // Since we don't have a direct way to get all public groups from the contract,
    // we can use a workaround by checking local storage first
    const localGroups = JSON.parse(localStorage.getItem('liberaChainGroups') || '{}');
    const publicGroups = Object.values(localGroups).filter(group => group.isPublic);
    
    // In a real implementation, you would want to fetch this from the blockchain
    // by adding a getPublicGroups method to your contract
    
    return publicGroups;
  } catch (error) {
    console.error('Error getting public groups:', error);
    return [];
  }
};