import { ethers } from "ethers";
import { FilebaseIPFSProvider } from "@core/storage/ipfs/FilebaseIPFSService";

/**
 * Creates a new verifiable "Object" on LiberaChain.
 * This function handles metadata upload to IPFS, cryptographic key generation for the Object,
 * and the on-chain creation transaction.
 *
 * @param {object} objectData - A JS object with the Object's metadata (e.g., { name, description, type }).
 * @param {string} feeInEther - The fee (in Ether) required to create the object, sent as a string.
 * @returns {Promise<{tx: ethers.TransactionResponse, objectIdentity: {address: string, privateKey: string, publicKey: string}}>} An object containing the transaction response and the newly generated identity for the Object.
 */
export async function createObject(liberaService, objectData, feeInEther) {
    try {
        console.log("1. Preparing to create a new Object...");

        // Per section 5.3.2, each Object has its own cryptographic identity.
        // We generate a new random wallet for this purpose.
        const objectWallet = ethers.Wallet.createRandom();
        console.log(`2. Generated new cryptographic identity for the Object: ${objectWallet.address}`);

        // Get the uncompressed public key using the new ethers v6 syntax
        const signingKey = objectWallet.signingKey;
        const publicKeyPoints = signingKey.compressedPublicKey;
        
        // Convert to uncompressed format by getting the full public key
        const uncompressedPublicKey = signingKey.publicKey;
            
        console.log('3a. Public key length:', uncompressedPublicKey.length);
        console.log('3b. Public key:', uncompressedPublicKey);
        
        if (uncompressedPublicKey.length !== 132) {
            console.error(`Invalid public key length: ${uncompressedPublicKey.length}`);
            throw new Error('Generated public key is not the correct length');
        }

        // Upload the descriptive metadata to IPFS
        const metadataBlob = new Blob([JSON.stringify(objectData)], { type: 'application/json' });
        const { cid: metadataCID } = await FilebaseIPFSProvider.getInstance().uploadToIpfs(metadataBlob);
        console.log(`4. Metadata uploaded to IPFS. CID: ${metadataCID}`);

        // Call the service to execute the on-chain transaction
        console.log('5. About to call createObject with:');
        console.log('   metadataCID:', metadataCID);
        console.log('   uncompressed public key:', uncompressedPublicKey);
        const tx = await liberaService.createObject(metadataCID, uncompressedPublicKey, feeInEther);
        console.log(`6. On-chain creation transaction sent: ${tx.hash}`);

        return {
            tx,
            objectIdentity: {
                address: objectWallet.address,
                privateKey: objectWallet.privateKey,
                publicKey: uncompressedPublicKey
            }
        };
    } catch (error) {
        console.error("Failed to create Object. Error details:", error);
        console.error("Error stack trace:", error.stack);
        throw error;
    }
}

/**
 * Fetches the complete details for a specific Object.
 * This function queries the smart contract for on-chain data and resolves the
 * metadata from IPFS.
 *
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @param {number} objectId - The ID of the Object to query.
 * @returns {Promise<object|null>} A comprehensive object with both on-chain and off-chain data, or null if not found.
 */
export async function fetchObjectDetails(liberaService, objectId) {
    try {
        // 1. Get on-chain data from the contract.
        const onChainData = await liberaService.getObject(objectId);
        if (onChainData.creator === ethers.ZeroAddress) {
            return null; // Object does not exist.
        }

        // 2. Resolve metadata from IPFS.
        const metadata = await fetchFromIpfs(onChainData.metadataCID);

        // 3. Reconstruct the full public key from its components using ethers v6 syntax
        const publicKey = ethers.concat(['0x04', onChainData.pubKeyX, onChainData.pubKeyY]);

        return {
            id: objectId,
            creator: onChainData.creator,
            owner: onChainData.owner,
            publicKey: publicKey,
            metadata: metadata,
        };
    } catch (error) {
        console.error(`Failed to fetch details for Object ${objectId}:`, error);
        throw error;
    }
}


/**
 * Simulates an Object's system generating a signed payload for a QR code.
 * This is part of the Type I Interaction Protocol (Proof of Presence).
 * In a real application, this would run on a trusted device owned by the Object's creator.
 *
 * @param {string} objectPrivateKey - The private key of the LiberaChain Object.
 * @param {object} payload - The data to be signed (e.g., { objectId, timestamp, nonce }).
 * @returns {Promise<{payload: string, signature: string}>} The stringified payload and its signature.
 */
export async function generateObjectSignedPayload(objectPrivateKey, payload) {
    const objectWallet = new ethers.Wallet(objectPrivateKey);
    const payloadString = JSON.stringify(payload);
    const signature = await objectWallet.signMessage(payloadString);
    return {
        payload: payloadString,
        signature: signature
    };
}

/**
 * Implements the user's side of the Type I Interaction Protocol (User Scans Object).
 * The function first verifies the signature from the Object and then, if valid,
 * creates and submits a user-signed interaction claim to the blockchain.
 *
 * @param {import('./LiberaChainService.js').default} liberaService - An instance of the LiberaChainService.
 * @param {number} objectId - The ID of the object being interacted with.
 * @param {{payload: string, signature: string}} signedObjectPayload - The payload and signature scanned from the Object's QR code.
 * @returns {Promise<ethers.TransactionResponse>} The transaction response from submitting the interaction claim.
 */
export async function verifyAndClaimObjectInteraction(liberaService, objectId, signedObjectPayload) {
    try {
        // --- Step 1: Verify the Object's Signature (Client-Side Verification) ---
        console.log("1. Verifying signature from the Object...");

        // Fetches the object's public key from the smart contract[cite: 67].
        const objectDetails = await fetchObjectDetails(liberaService, objectId);
        if (!objectDetails) {
            throw new Error(`Object with ID ${objectId} not found.`);
        }

        // Verifies the signature using ethers v6 syntax
        const signerAddress = ethers.verifyMessage(signedObjectPayload.payload, signedObjectPayload.signature);
        const objectAddress = ethers.computeAddress(objectDetails.publicKey);

        if (signerAddress !== objectAddress) {
            throw new Error("Signature verification failed! The QR code is not authentic.");
        }
        console.log("2. Object's signature is authentic.");

        // --- Step 2: Create and Submit the User's Interaction Claim ---
        console.log("3. Creating and signing the user's interaction claim...");

        // The user signs a claim to prove they performed the interaction[cite: 69].
        const userAddress = await liberaService.signer.getAddress();
        const claimPayload = {
            user: userAddress,
            objectId: objectId,
            verifiedPayloadHash: ethers.keccak256(ethers.toUtf8Bytes(signedObjectPayload.payload)),
            timestamp: new Date().toISOString()
        };

        const claimHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(claimPayload)));
        const userSignature = await liberaService.signer.signMessage(ethers.getBytes(claimHash));

        console.log("4. Submitting interaction claim to the blockchain...");
        const tx = await liberaService.recordInteraction(objectId, claimHash, userSignature);
        console.log(`5. Interaction claim transaction sent: ${tx.hash}`);

        return tx;

    } catch (error) {
        console.error(`Failed to complete interaction with Object ${objectId}:`, error);
        throw error;
    }
}