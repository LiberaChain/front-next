// Blockchain Posts Service for direct on-chain storage
import { ethers } from 'ethers';
import { BlockchainService } from './BlockchainService';
import { blockchainPostsABI } from './abi';

export class BlockchainPosts {

    /**
     * Get BlockchainPosts contract instance
     * @param {boolean} withSigner - Whether to use a signer for transactions
     * @returns {Promise<ethers.Contract>} BlockchainPosts contract instance
     */
    static async getBlockchainPostsContract(withSigner = true) {
        return await BlockchainService.getInstance().getContract('BlockchainPosts', withSigner, blockchainPostsABI);
    };

    /**
     * Get the current fee for posting to blockchain
     * @returns {Promise<{success: boolean, fee: string, error: string|null}>} Fee in ETH
     */
    static async getBlockchainPostFee() {
        try {
            const contract = await BlockchainPosts.getBlockchainPostsContract(false);
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
    static async createBlockchainPost(postData, options = {}) {
        try {
            const contract = await BlockchainPosts.getBlockchainPostsContract(true);

            // Get the fee
            const feeResult = await BlockchainPosts.getBlockchainPostFee();
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
                metadata = '{}'
            } = postData;

            // Get donation amount if provided
            const donationAmount = options.donationAmount || '0';

            // Calculate total transaction value (fee + donation)
            const feeWei = ethers.getBigInt(feeResult.feeWei);
            const donationWei = ethers.parseEther(donationAmount);
            const totalValue = feeWei + donationWei;

            // Get provider to estimate gas and gas price
            const { provider } = await BlockchainService.getInstance().getProviderAndSigner();

            // Get current gas price and increase it slightly to avoid replacement
            const currentGasPrice = (await provider.getFeeData()).gasPrice || ethers.parseUnits('20', 'gwei');

            // For large donations, we need to ensure our gas settings are adequate
            // Increase gas price by 20% to ensure transaction goes through
            const gasPrice = ethers.getBigInt(currentGasPrice) * 120n / 100n;

            // Create transaction options with gas settings
            const txOptions = {
                value: totalValue,
                gasLimit: 600000, // Set a reasonable gas limit
                gasPrice: gasPrice
            };

            // If using EIP-1559 compatible network, use maxFeePerGas instead
            const network = await provider.getNetwork();
            if (network.chainId !== 31337) { // Not Hardhat local
                // Use EIP-1559 gas settings
                const feeData = await provider.getFeeData();
                if (feeData.maxFeePerGas) {
                    // EIP-1559 is supported
                    delete txOptions.gasPrice;
                    txOptions.maxFeePerGas = feeData.maxFeePerGas * 120n / 100n; // Increase by 20%
                    txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 120n / 100n; // Increase by 20%
                }
            }

            console.log('Sending transaction with options:', {
                value: ethers.formatEther(totalValue),
                ...txOptions,
                gasPrice: txOptions.gasPrice ? ethers.formatUnits(txOptions.gasPrice, 'gwei') + ' gwei' : undefined,
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
                txOptions
            );

            console.log('Blockchain post transaction sent:', tx.hash);

            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('Transaction confirmed in block:', receipt.blockNumber);

            // Try to extract postId from the transaction logs/events
            let postId = null;
            let donationValue = null;
            for (const log of receipt.logs) {
                try {
                    const parsedLog = contract.interface.parseLog(log);
                    if (parsedLog.name === 'PostCreated') {
                        postId = parsedLog.args.postId;
                        donationValue = parsedLog.args.donation;
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
                postIdHex: postId ? ethers.toBeHex(postId) : null,
                donation: donationValue ? ethers.formatEther(donationValue) : donationAmount
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
    static async getBlockchainPost(postId) {
        try {
            const contract = await BlockchainPosts.getBlockchainPostsContract(false);

            const [
                content,
                title,
                authorDid,
                authorName,
                contentType,
                timestamp,
                visibility,
                ipfsCid,
                metadata,
                donation
            ] = await contract.getPost(postId);

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
    static async getUserBlockchainPosts(did) {
        try {
            const contract = await BlockchainPosts.getBlockchainPostsContract(false);

            // Get post IDs for this user
            const postIds = await contract.getUserPostIds(did);

            // Fetch each post
            const posts = await Promise.all(
                postIds.map(async (postId) => {
                    try {
                        const result = await BlockchainPosts.getBlockchainPost(postId);
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
    static async getPublicBlockchainPosts(offset = 0, limit = 20) {
        try {
            const contract = await BlockchainPosts.getBlockchainPostsContract(false);

            // Get paginated post IDs
            const postIds = await contract.getPaginatedPostIds(offset, limit);

            // Fetch each post
            const posts = await Promise.all(
                postIds.map(async (postId) => {
                    try {
                        const result = await BlockchainPosts.getBlockchainPost(postId);
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
    static async checkBalanceForPosting() {
        try {
            const { provider } = await BlockchainService.getInstance().getProviderAndSigner();
            const userAddress = await BlockchainService.getInstance().getCurrentUserAddress();

            console.debug('Checking user balance for posting:', {
                userAddress,
                provider: provider
            });

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
            const { success, feeWei } = await BlockchainPosts.getBlockchainPostFee();
            const requiredFee = ethers.getBigInt(feeWei || '1000000000000000'); // Fallback to 0.001 ETH

            // Check if user has enough balance (fee + some gas)
            const gasBuffer = ethers.parseEther('0.002'); // Estimated gas + buffer
            const requiredTotal = requiredFee + gasBuffer;

            const hasBalance = balance >= requiredTotal;

            console.debug('User balance check:', {
                userAddress,
                balance: ethers.formatEther(balance),
                requiredTotal: ethers.formatEther(requiredTotal),
                hasBalance,
                fee: ethers.formatEther(requiredFee)
            });

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
    static async getContractCreator() {
        try {
            const contract = await BlockchainPosts.getBlockchainPostsContract(false);
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
}