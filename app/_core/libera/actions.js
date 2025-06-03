/**
 * @file libera.actions.js
 * @dev High-level, context-aware functions for Next.js components to interact with LiberaChain.
 * These actions use the LiberaChainService for blockchain interactions and FilebaseIPFSService
 * for content storage.
 */

import { ethers } from "ethers";
import { FilebaseIPFSProvider } from '../storage/ipfs/FilebaseIPFSService';

// ===================================================================================
// USER ONBOARDING & PROFILE ACTIONS
// ===================================================================================

/**
 * Checks if the current user is registered on LiberaChain and, if not,
 * initiates the registration process.
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @returns {Promise<{isNewUser: boolean, tx: ethers.TransactionResponse | null}>}
 */
export async function checkAndRegisterUser(liberaService) {
    try {
        const userAddress = await liberaService.signer.getAddress();
        const profile = await liberaService.getUserProfile(userAddress);

        if (profile.isRegistered) {
            console.log("User is already registered.");
            return { isNewUser: false, tx: null };
        }

        console.log("New user detected. Initiating registration...");
        const tx = await liberaService.registerDid();
        console.log("Registration transaction sent:", tx.hash);
        return { isNewUser: true, tx };
    } catch (error) {
        console.error("Error during user registration check:", error);
        throw error;
    }
}

/**
 * Creates or updates a user's public profile.
 * This involves uploading profile data to IPFS via Filebase and then setting the CID on-chain.
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @param {{name: string, bio: string, avatarCid?: string}} profileData - The user's profile information.
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function updateUserProfile(liberaService, profileData) {
    try {
        console.log("Updating user profile...", profileData);
        const filebaseService = FilebaseIPFSProvider.getInstance();
        
        // Convert profile data to a Blob for upload
        const profileJsonBlob = new Blob([JSON.stringify(profileData)], { 
            type: 'application/json' 
        });
        
        // Upload to IPFS via Filebase
        const { cid } = await filebaseService.uploadToIpfs(profileJsonBlob);
        
        console.log(`Profile data uploaded to IPFS with CID: ${cid}. Now updating on-chain...`);
        const tx = await liberaService.setProfileCID(cid);
        
        console.log("Profile update transaction sent:", tx.hash);
        return tx;
    } catch (error) {
        console.error("Failed to update user profile:", error);
        throw error;
    }
}

/**
 * Fetches and resolves a full user profile.
 * It gets the profile CID from the blockchain and then fetches the corresponding data from IPFS.
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @param {string} userAddress - The address of the user to fetch.
 * @returns {Promise<object | null>} The resolved profile object or null if not found.
 */
export async function getFullUserProfile(liberaService, userAddress) {
    try {
        const onChainProfile = await liberaService.getUserProfile(userAddress);
        if (!onChainProfile || !onChainProfile.isRegistered) {
            return null;
        }

        const offChainProfile = await fetchFromIpfs(onChainProfile.profileDataCID);
        
        return {
            address: userAddress,
            ...onChainProfile,
            ...offChainProfile
        };
    } catch (error) {
        console.error(`Failed to get full profile for ${userAddress}:`, error);
        throw error;
    }
}

// ===================================================================================
// CONTENT AND POSTING ACTIONS
// ===================================================================================

/**
 * Creates a new user post, storing content on IPFS via Filebase and anchoring it on-chain.
 * Corresponds to the content persistence mechanism in report section 5.2.1.
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @param {{text: string, imageCid?: string, tags?: string[]}} postData - The content of the post.
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function createPost(liberaService, postData) {
    try {
        console.log("Creating new post...", postData);
        const filebaseService = FilebaseIPFSProvider.getInstance();

        // Prepare the post metadata
        const postJson = {
            version: "1.0",
            createdAt: new Date().toISOString(),
            content: postData.text,
            image: postData.imageCid || null,
            tags: postData.tags || [],
        };

        // If there's an image, ensure it's already on IPFS
        if (postData.image instanceof File || postData.image instanceof Blob) {
            const { cid: imageCid } = await filebaseService.uploadToIpfs(postData.image);
            postJson.image = imageCid;
        }

        // Upload the post content to IPFS
        const postJsonBlob = new Blob([JSON.stringify(postJson)], { 
            type: 'application/json' 
        });
        const { cid } = await filebaseService.uploadToIpfs(postJsonBlob);

        console.log(`Post uploaded to IPFS with CID: ${cid}. Anchoring on-chain...`);
        const tx = await liberaService.postIPFSAnchor(cid);

        console.log("Post anchor transaction sent:", tx.hash);
        return tx;
    } catch (error) {
        console.error("Failed to create post:", error);
        throw error;
    }
}

/**
 * Fetches a list of the latest post CIDs by querying contract events.
 * This is an efficient way to build a feed without iterating through all possible post IDs.
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @param {number} [limit=20] - The number of recent posts to fetch.
 * @returns {Promise<Array<{postId: number, author: string, cid: string}>>}
 */
export async function getPostFeedCIDs(liberaService, limit = 20) {
    try {
        const contract = liberaService.contracts.contentManagement;
        const filter = contract.filters.NewIPFSAnchor();
        const events = await contract.queryFilter(filter, -5000); // Check last 5000 blocks

        const sortedEvents = events.sort((a, b) => b.blockNumber - a.blockNumber);
        
        return sortedEvents.slice(0, limit).map(event => ({
            postId: event.args.postId.toNumber(),
            author: event.args.author,
            cid: event.args.cid,
        }));
    } catch (error) {
        console.error("Failed to fetch post feed:", error);
        throw error;
    }
}


// ===================================================================================
// "OBJECT" ACTIONS
// ===================================================================================

/**
 * Creates a new verifiable "Object" on LiberaChain with metadata stored on IPFS.
 * Implements the flow from report section 5.3.
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @param {object} objectMetadata - A JS object describing the Object (e.g., { name, description, location }).
 * @param {string} feeInEther - The fee to pay for creating the object.
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function createVerifiableObject(liberaService, objectMetadata, feeInEther) {
    try {
        console.log("Creating new verifiable Object...", objectMetadata);
        const filebaseService = FilebaseIPFSProvider.getInstance();

        // Generate cryptographic identity for the object
        const objectIdentity = ethers.Wallet.createRandom();
        const objectPublicKey = objectIdentity.publicKey; // Uncompressed public key

        // Upload object metadata to IPFS
        const metadataBlob = new Blob([JSON.stringify({
            ...objectMetadata,
            createdAt: new Date().toISOString(),
            publicKey: objectPublicKey
        })], { type: 'application/json' });
        
        const { cid: metadataCID } = await filebaseService.uploadToIpfs(metadataBlob);
        
        console.log(`Object metadata uploaded. CID: ${metadataCID}. Creating on-chain...`);
        const tx = await liberaService.createObject(metadataCID, objectPublicKey, feeInEther);

        console.log("Object creation transaction sent:", tx.hash);
        
        // Store private key securely - in a real app, this would be encrypted
        const objectInfo = {
            privateKey: objectIdentity.privateKey,
            publicKey: objectPublicKey,
            metadataCID,
            txHash: tx.hash
        };
        
        return { tx, objectInfo };
    } catch (error) {
        console.error("Failed to create verifiable object:", error);
        throw error;
    }
}

/**
 * Updates the metadata for an existing object.
 * Only the object owner can perform this action.
 */
export async function updateObjectMetadata(liberaService, objectId, newMetadata) {
    try {
        const filebaseService = FilebaseIPFSProvider.getInstance();
        
        // First verify ownership
        const object = await liberaService.getObject(objectId);
        const currentOwner = await liberaService.signer.getAddress();
        
        if (object.owner.toLowerCase() !== currentOwner.toLowerCase()) {
            throw new Error("Only the object owner can update its metadata");
        }

        // Upload new metadata to IPFS
        const metadataBlob = new Blob([JSON.stringify({
            ...newMetadata,
            updatedAt: new Date().toISOString(),
            previousCID: object.metadataCID // Keep history
        })], { type: 'application/json' });
        
        const { cid: newMetadataCID } = await filebaseService.uploadToIpfs(metadataBlob);
        
        // Update the CID on-chain (assuming such a method exists in the contract)
        const tx = await liberaService.contracts.objectLifecycle.updateObjectMetadata(
            objectId, 
            newMetadataCID
        );

        return { tx, newMetadataCID };
    } catch (error) {
        console.error("Failed to update object metadata:", error);
        throw error;
    }
}

/**
 * Records a verifiable interaction with an object.
 * The interaction data is stored on IPFS and referenced on-chain.
 */
export async function recordObjectInteraction(liberaService, objectId, interactionData) {
    try {
        const filebaseService = FilebaseIPFSProvider.getInstance();
        
        // Prepare interaction metadata
        const interaction = {
            ...interactionData,
            timestamp: new Date().toISOString(),
            objectId: objectId
        };

        // Upload interaction data to IPFS
        const interactionBlob = new Blob([JSON.stringify(interaction)], { 
            type: 'application/json' 
        });
        const { cid: interactionCID } = await filebaseService.uploadToIpfs(interactionBlob);

        // Record the interaction on-chain with the IPFS CID
        const tx = await liberaService.recordInteraction(objectId, {
            ...interaction,
            cid: interactionCID
        });

        return { tx, interactionCID };
    } catch (error) {
        console.error("Failed to record object interaction:", error);
        throw error;
    }
}