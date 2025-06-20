// Blockchain Posts Service for direct on-chain storage
import { ethers } from 'ethers';
import { getContract, getProviderAndSigner, getCurrentUserAddress } from './blockchainTransactions';

// Define the BlockchainPosts contract ABI
const blockchainPostsABI = [
  // Post creation and retrieval with signatures
  "function createPost(string memory _content, string memory _title, string memory _authorDid, string memory _authorName, string memory _contentType, string memory _visibility, string memory _ipfsCid, string memory _metadata, bytes memory _signature) public payable returns (bytes32)",
  "function getPost(bytes32 _postId) public view returns (string memory content, string memory title, string memory authorDid, string memory authorName, string memory contentType, uint256 timestamp, string memory visibility, string memory ipfsCid, string memory metadata, uint256 donation, bytes memory signature, bool verified)",
  "function getUserPostIds(string memory _authorDid) public view returns (bytes32[] memory)",
  "function getTotalPostsCount() public view returns (uint256)",
  "function getPaginatedPostIds(uint256 _offset, uint256 _limit) public view returns (bytes32[] memory)",
  // Fee related functions
  "function getPostFee() public view returns (uint256)",
  "function setPostFee(uint256 _newFee) public",
  "function setFeeCollector(address _newCollector) public",
  "function getContractCreator() public view returns (address)",
  // Signature verification functions
  "function recoverSigner(bytes32 messageHash, bytes memory signature) public pure returns (address)",
  "function createMessageHash(string memory _content, string memory _title, string memory _authorDid, uint256 _timestamp) public pure returns (bytes32)",
  // Events
  "event PostCreated(bytes32 indexed postId, string authorDid, uint256 timestamp, string visibility, uint256 donation, bool verified)",
  "event PostVerified(bytes32 indexed postId, address verifier)",
  "event PostFeeChanged(uint256 newFee)",
  "event FeeCollectorChanged(address newCollector)",
  "event DonationReceived(bytes32 indexed postId, uint256 donationAmount)"
];

/**
 * Get BlockchainPosts contract instance
 * @param {boolean} withSigner - Whether to use a signer for transactions
 * @returns {Promise<ethers.Contract>} BlockchainPosts contract instance
 */
export const getBlockchainPostsContract = async (withSigner = true) => {
  return getContract('BlockchainPosts', withSigner, blockchainPostsABI);
};

/**
 * Get the current fee for posting to blockchain
 * @returns {Promise<{success: boolean, fee: string, error: string|null}>} Fee in ETH
 */
export const getBlockchainPostFee = async () => {
  try {
    const contract = await getBlockchainPostsContract(false);
    const feeWei = await contract.getPostFee();
    const feeEth = ethers.formatEther(feeWei);
    
    return {
      success: true,
      fee: feeEth,
      feeWei: feeWei.toString()
    };
  } catch (error) {
    console.error('Error getting blockchain post fee:', error);
    return {
      success: false,
      fee: '0.001', // Default fallback
      feeWei: '1000000000000000', // 0.001 ETH in wei
      error: error.message || 'Failed to get fee'
    };
  }
};

/**
 * Create a post on the blockchain with optional donation
 * @param {Object} postData - The post data
 * @param {Object} options - Additional options including donation amount
 * @returns {Promise<{success: boolean, postId: string, error: string|null}>} Result
 */
export const createBlockchainPost = async (postData, options = {}) => {
  try {
    const contract = await getBlockchainPostsContract(true);
    
    // Get the fee
    const feeResult = await getBlockchainPostFee();
    if (!feeResult.success) {
      throw new Error(`Failed to get post fee: ${feeResult.error}`);
    }
    
    // Prepare post data
    const {
      content,
      title = '',
      authorDid,
      authorName,
      contentType = 'text',
      visibility = 'public',
      ipfsCid = '',
      metadata = '{}',
      signature = ''
    } = postData;
    
    // Get donation amount if provided
    const donationAmount = options.donationAmount || '0';
    
    // Calculate total transaction value (fee + donation)
    const totalValue = ethers.parseEther(feeResult.fee).add(
      ethers.parseEther(donationAmount)
    );
    
    // Prepare transaction options
    const txOptions = {
      value: totalValue,
      ...options,
      gasLimit: options.gasLimit || 500000,
      maxFeePerGas: options.maxFeePerGas || ethers.parseUnits('20', 'gwei'),
      maxPriorityFeePerGas: options.maxPriorityFeePerGas || ethers.parseUnits('1.5', 'gwei')
    };
    
    console.log('Creating blockchain post with options:', {
      value: ethers.formatEther(totalValue),
      ...txOptions,
      maxFeePerGas: txOptions.maxFeePerGas ? ethers.formatUnits(txOptions.maxFeePerGas, 'gwei') + ' gwei' : undefined,
      maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas ? ethers.formatUnits(txOptions.maxPriorityFeePerGas, 'gwei') + ' gwei' : undefined
    });
    
    // Create transaction with fee + donation and gas settings
    const tx = await contract.createPost(
      content,
      title,
      authorDid, 
      authorName,
      contentType,
      visibility,
      ipfsCid,
      metadata,
      signature,
      txOptions
    );
    
    console.log('Blockchain post transaction sent:', tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    
    // Try to extract postId from the transaction logs/events
    let postId = null;
    let donationValue = null;
    let isVerified = false;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog.name === 'PostCreated') {
          postId = parsedLog.args.postId;
          donationValue = parsedLog.args.donation;
          isVerified = parsedLog.args.verified;
          break;
        }
      } catch (e) {
        // Not a relevant log, continue
      }
    }
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      postId: postId || `unknown-${Date.now()}`,
      postIdHex: postId ? ethers.hexlify(postId) : null,
      donation: donationValue ? ethers.formatEther(donationValue) : donationAmount,
      verified: isVerified
    };
  } catch (error) {
    console.error('Error creating blockchain post:', error);
    return {
      success: false,
      error: error.message || 'Failed to create post on blockchain'
    };
  }
};

/**
 * Get a post from the blockchain by its ID
 * @param {string} postId - The post ID
 * @returns {Promise<{success: boolean, post: Object|null, error: string|null}>} Result
 */
export const getBlockchainPost = async (postId) => {
  try {
    const contract = await getBlockchainPostsContract(false);
    const [content, title, authorDid, authorName, contentType, timestamp, visibility, ipfsCid, metadata, donation, signature, verified] = await contract.getPost(postId);

    // Convert timestamp from blockchain (seconds) to JS timestamp (milliseconds)
    const jsTimestamp = Number(timestamp) * 1000;

    // Convert donation from wei to ETH
    const donationEth = ethers.formatEther(donation);

    return {
      success: true,
      post: {
        content,
        title,
        authorDid,
        authorName,
        contentType,
        timestamp: jsTimestamp,
        visibility,
        ipfsCid,
        metadata,
        postId,
        donation: donationEth,
        signature,
        verified,
        isBlockchainPost: true
      }
    };
  } catch (error) {
    console.error(`Error getting blockchain post ${postId}:`, error);
    return {
      success: false,
      post: null,
      error: error.message || 'Failed to get post from blockchain'
    };
  }
};

/**
 * Get all posts for a user from the blockchain
 * @param {string} did - User's DID
 * @returns {Promise<{success: boolean, posts: Array|null, error: string|null}>} Result
 */
export const getUserBlockchainPosts = async (did) => {
  try {
    const contract = await getBlockchainPostsContract(false);
    
    // Get post IDs for this user
    const postIds = await contract.getUserPostIds(did);
    
    // Fetch each post
    const posts = await Promise.all(
      postIds.map(async (postId) => {
        try {
          const result = await getBlockchainPost(postId);
          return result.success ? result.post : null;
        } catch (error) {
          console.error(`Error fetching post ${postId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any nulls from errors
    const validPosts = posts.filter(post => post !== null);
    
    return {
      success: true,
      posts: validPosts
    };
  } catch (error) {
    console.error(`Error getting blockchain posts for user ${did}:`, error);
    return {
      success: false,
      posts: [],
      error: error.message || 'Failed to get user posts from blockchain'
    };
  }
};

/**
 * Get public posts from the blockchain with pagination
 * @param {number} offset - Pagination offset
 * @param {number} limit - Maximum posts to retrieve
 * @returns {Promise<{success: boolean, posts: Array|null, error: string|null}>} Result
 */
export const getPublicBlockchainPosts = async (offset = 0, limit = 10) => {
  try {
    const contract = await getBlockchainPostsContract(false);
    
    // Get paginated post IDs
    const postIds = await contract.getPaginatedPostIds(offset, limit);
    
    // Fetch each post
    const posts = await Promise.all(
      postIds.map(async (postId) => {
        try {
          const result = await getBlockchainPost(postId);
          if (result.success && result.post.visibility === 'public') {
            return result.post;
          }
          return null;
        } catch (error) {
          console.error(`Error fetching post ${postId}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any nulls from errors or non-public posts
    const validPosts = posts.filter(post => post !== null);
    
    return {
      success: true,
      posts: validPosts
    };
  } catch (error) {
    console.error('Error getting public blockchain posts:', error);
    return {
      success: false,
      posts: [],
      error: error.message || 'Failed to get public posts from blockchain'
    };
  }
};

/**
 * Check if user has enough balance to post on blockchain
 * @returns {Promise<{success: boolean, hasBalance: boolean, error: string|null}>} Result
 */
export const checkBalanceForPosting = async () => {
  try {
    const { provider } = await getProviderAndSigner();
    const userAddress = await getCurrentUserAddress();
    
    if (!userAddress) {
      return {
        success: false,
        hasBalance: false,
        error: 'No wallet connected'
      };
    }
    
    // Get user's balance
    const balance = await provider.getBalance(userAddress);
    
    // Get required fee
    const feeResult = await getBlockchainPostFee();
    if (!feeResult.success) {
      throw new Error('Failed to get required fee');
    }
    
    const requiredFee = ethers.parseEther(feeResult.fee);
    const requiredTotal = requiredFee.add(ethers.parseEther('0.001')); // Add some for gas
    
    const hasBalance = balance.gte(requiredTotal);
    
    return {
      success: true,
      hasBalance,
      balance: ethers.formatEther(balance),
      required: ethers.formatEther(requiredTotal),
      fee: ethers.formatEther(requiredFee)
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    return {
      success: false,
      hasBalance: false,
      error: error.message || 'Failed to check balance'
    };
  }
};

/**
 * Get the contract creator address
 * @returns {Promise<{success: boolean, address: string|null, error: string|null}>} Result
 */
export const getContractCreator = async () => {
  try {
    const contract = await getBlockchainPostsContract(false);
    const creatorAddress = await contract.getContractCreator();
    
    return {
      success: true,
      address: creatorAddress
    };
  } catch (error) {
    console.error('Error getting contract creator address:', error);
    return {
      success: false,
      address: null,
      error: error.message || 'Failed to get contract creator address'
    };
  }
};