/**
 * @file libera.retrieval.js
 * @dev Provides high-level functions for discovering and retrieving data from IPFS,
 * using the blockchain as a verifiable index, as described in the LiberaChain report.
 */
import { FilebaseIPFSProvider } from '../storage/ipfs/FilebaseIPFSService';

/**
 * A utility function to fetch JSON data from IPFS via Filebase.
 * @param {string} cid The IPFS Content Identifier.
 * @returns {Promise<object|null>} The parsed JSON data from IPFS, or null on error.
 */
async function fetchFromIpfs(cid) {
    if (!cid) {
        console.warn("fetchFromIpfs was called with a null or empty CID.");
        return null;
    }
    try {
        const filebaseService = FilebaseIPFSProvider.getInstance();
        const { gateway } = await filebaseService.getStatus();
        
        const response = await fetch(`${gateway}/ipfs/${cid}`);
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Failed to fetch content for CID ${cid}:`, error);
        return null;
    }
}

/**
 * A utility function to resolve an IPNS name via Filebase.
 * @param {string} ipnsName The IPNS name to resolve (e.g., a k51q... string).
 * @returns {Promise<object|null>} The parsed JSON data from the latest resolved content.
 */
async function resolveIpnsName(ipnsName) {
    if (!ipnsName) {
        console.warn("resolveIpnsName was called with a null or empty name.");
        return null;
    }
    try {
        const filebaseService = FilebaseIPFSProvider.getInstance();
        const { gateway } = await filebaseService.getStatus();
        
        const response = await fetch(`${gateway}/ipns/${ipnsName}`);
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Failed to resolve IPNS name ${ipnsName}:`, error);
        return null;
    }
}

// ===================================================================================
// IMPLEMENTATION OF DISCOVERY MECHANISMS
// ===================================================================================

/**
 * fetches a specific post by its on-chain ID.
 * This function demonstrates the "Direct Lookup via On-Chain Anchors" mechanism. [cite: 91, 176]
 * It reads the CID from the smart contract and then fetches the content from IPFS.
 *
 * @param {import('./LiberaChainService.js').default} liberaService An instance of the LiberaChainService.
 * @param {number} postId The unique on-chain ID of the post.
 * @returns {Promise<object|null>} A fully resolved post object, or null if not found.
 */
export async function fetchPostById(liberaService, postId) {
    try {
        console.log(`Fetching post with ID: ${postId}...`);
        // 1. Query the smart contract for the on-chain anchor data. [cite: 176]
        const anchor = await liberaService.contracts.contentManagement.ipfsAnchors(postId);

        if (!anchor || anchor.author === '0x0000000000000000000000000000000000000000') {
            console.warn(`Post with ID ${postId} not found on-chain.`);
            return null;
        }

        // 2. Use the retrieved CID to fetch the actual post content from IPFS. [cite: 176]
        const postContent = await fetchFromIpfs(anchor.cid);

        if (!postContent) {
            return {
                id: postId,
                author: anchor.author,
                timestamp: new Date(anchor.timestamp.toNumber() * 1000).toISOString(),
                content: { error: "Failed to fetch content from IPFS." },
                cid: anchor.cid
            };
        }
        
        // 3. Combine on-chain and off-chain data into a single, rich object.
        return {
            id: postId,
            author: anchor.author,
            timestamp: new Date(anchor.timestamp.toNumber() * 1000).toISOString(),
            content: postContent,
            cid: anchor.cid,
        };
    } catch (error) {
        console.error(`Error fetching post ${postId}:`, error);
        return null;
    }
}


/**
 * Fetches a feed of recent posts by querying smart contract events.
 * This demonstrates the "Querying Contract Events for Feeds" mechanism, which builds upon the
 * concept of the blockchain as a "transparent, chronologically ordered, and immutable audit trail." [cite: 250]
 *
 * @param {import('./LiberaChainService.js').default} liberaService An instance of the LiberaChainService.
 * @param {number} [limit=20] The maximum number of posts to return.
 * @returns {Promise<Array<object>>} An array of fully resolved post objects.
 */
export async function fetchPostFeed(liberaService, limit = 20) {
    try {
        console.log("Fetching recent post feed...");
        const contract = liberaService.contracts.contentManagement;
        
        // 1. Create a filter to find all `NewIPFSAnchor` events.
        const filter = contract.filters.NewIPFSAnchor();

        // 2. Query the blockchain for all matching events in a recent block range.
        const events = await contract.queryFilter(filter, -5000); // Check last 5000 blocks for performance

        // 3. Sort events to get the most recent first and apply the limit.
        const recentEvents = events
            .sort((a, b) => b.blockNumber - a.blockNumber)
            .slice(0, limit);

        // 4. For each event, fetch the corresponding content from IPFS.
        const feedPosts = await Promise.all(
            recentEvents.map(event =>
                fetchPostById(liberaService, event.args.postId.toNumber())
            )
        );

        // Filter out any posts that failed to resolve.
        return feedPosts.filter(post => post !== null);
    } catch (error) {
        console.error("Failed to fetch post feed:", error);
        return [];
    }
}

/**
 * Fetches the latest version of a user's profile using their IPNS name.
 * This demonstrates the "Discovery via Mutable Pointers (IPNS)" mechanism researched by the project. [cite: 177, 191]
 * It assumes an IPNS name is stored on-chain, as conceptualized in the report. [cite: 122, 220]
 *
 * @param {import('./LiberaChainService.js').default} liberaService An instance of the LiberaChainService.
 * @param {string} userAddress The user's Ethereum address.
 * @returns {Promise<object|null>} The user's latest profile data, or null if not found.
 */
export async function fetchLatestUserProfileViaIPNS(liberaService, userAddress) {
    try {
        console.log(`Fetching latest profile via IPNS for ${userAddress}...`);
        
        // This is a conceptual implementation based on the report.
        // It assumes the user's IPNS name is stored in a contract field, e.g., 'ipnsName'.
        // Let's assume for this example it is stored in the DIDRegistry contract.
        // const { ipnsName } = await liberaService.contracts.didRegistry.users(userAddress);
        const ipnsName = "k51qzi5uqu5dlvj2b4p4x1ryb140n855a882swc5ye5z00nvk7v3h3g9q9o8b4"; // Mock IPNS name for demonstration
        
        if (!ipnsName) {
            console.warn(`No IPNS name found for user ${userAddress}.`);
            return null;
        }

        // 2. Resolve the IPNS name using a public gateway to get the latest content. [cite: 191]
        const profileContent = await resolveIpnsName(ipnsName);

        if (!profileContent) {
            return { error: "Failed to resolve user profile from IPNS." };
        }
        
        return {
            address: userAddress,
            ...profileContent
        };
        
    } catch (error) {
        console.error(`Error fetching profile via IPNS for ${userAddress}:`, error);
        return null;
    }
}