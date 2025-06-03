import { ethers } from "ethers";
import BlockchainService from "./blockchain/BlockchainService";
import { FilebaseIPFSProvider } from "./storage/ipfs/FilebaseIPFSService";

export class ObjectsService {
  constructor() {
    this.ipfsProvider = FilebaseIPFSProvider.getInstance();
  }

  /**
   * Creates a new verifiable object on LiberaChain
   * @param {Object} objectData - Object metadata (name, description, etc)
   * @param {File|Blob} [mediaFile] - Optional media file associated with the object
   * @returns {Promise<{objectId: number, tx: ethers.ContractTransaction}>}
   */
  async createObject(objectData, mediaFile = null) {
    try {
      // 1. Upload media to IPFS if provided
      let ipfsCID = null;
      if (mediaFile) {
        const result = await this.ipfsProvider.uploadToIpfs(mediaFile);
        ipfsCID = result.cid;
      }

      // Prepare object data
      const metadata = {
        ...objectData,
        mediaCID: ipfsCID,
        timestamp: new Date().toISOString()
      };

      // Upload metadata to IPFS
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const { cid: metadataCID } = await this.ipfsProvider.uploadToIpfs(metadataBlob);

      // Create object on chain
      const liberaService = await BlockchainService.libera();
      const tx = await liberaService.contracts.objectLifecycle.createObject(
        metadata.name || "Untitled Object",
        metadata.description || "",
        metadataCID,
        { value: ethers.parseEther("0.01") } // Standard fee
      );

      // Wait for transaction and get object ID from event
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === 'ObjectCreated');
      const objectId = event?.args?.tokenId;

      return { objectId, tx };
    } catch (error) {
      console.error("Failed to create object:", error);
      throw error;
    }
  }

  /**
   * Gets all objects owned by a user.
   * @param {string} userAddress - The Ethereum address of the user
   * @returns {Promise<Array<Object>>} Array of objects with their metadata
   */
  async getUserObjects(userAddress) {
    try {
      const liberaService = await BlockchainService.libera();
      let objCount;
      try {
        objCount = await liberaService.contracts.objectLifecycle.getObjectCount();
        objCount = objCount ? Number(objCount) : 0;
      } catch (err) {
        console.warn("Failed to get object count, defaulting to 0:", err);
        objCount = 0;
      }
      
      const objects = [];
      // Since we don't have enumeration, we need to scan all objects
      for (let i = 1; i <= objCount; i++) {
        try {
          const owner = await liberaService.contracts.objectLifecycle.ownerOf(i);
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const objectData = await liberaService.contracts.objectLifecycle.objects(i);
            
            // Get metadata from IPFS
            let metadata = {};
            if (objectData.ipfsCID) {
              try {
                metadata = await this.ipfsProvider.getFromIpfs(objectData.ipfsCID);
              } catch (err) {
                console.warn(`Failed to load metadata for object ${i}:`, err);
              }
            }

            objects.push({
              id: i.toString(),
              name: objectData.name || `Object #${i}`,
              description: objectData.description || '',
              ipfsCID: objectData.ipfsCID,
              creator: objectData.creator,
              owner: objectData.owner,
              createdAt: new Date(Number(objectData.createdAt) * 1000),
              status: objectData.status,
              metadata
            });
          }
        } catch (error) {
          // Skip if token doesn't exist or other error
          continue;
        }
      }

      return objects;
    } catch (error) {
      console.error("Failed to get user objects:", error);
      return [];
    }
  }

  /**
   * Generates a QR code payload for object interaction
   * @param {number} objectId - The ID of the object
   * @returns {Promise<{payload: string, signature: string}>}
   */
  async generateInteractionPayload(objectId) {
    const liberaService = await BlockchainService.libera();
    const object = await liberaService.contracts.objectLifecycle.objects(objectId);
    if (!object || object.owner === ethers.ZeroAddress) throw new Error("Object not found");

    const payload = {
      objectId: objectId.toString(),
      timestamp: Date.now(),
      nonce: ethers.hexlify(ethers.randomBytes(16))
    };

    const payloadString = JSON.stringify(payload);
    const signature = await liberaService.signer.signMessage(payloadString);

    return {
      payload: payloadString,
      signature
    };
  }

  /**
   * Verifies and records an interaction with an object
   * @param {number} objectId - The ID of the object being interacted with
   * @param {{payload: string, signature: string}} signedPayload - The payload and signature from QR code
   * @returns {Promise<ethers.ContractTransaction>}
   */
  async verifyAndRecordInteraction(objectId, signedPayload) {
    const liberaService = await BlockchainService.libera();
    
    // Get object data and verify it exists
    const object = await liberaService.contracts.objectLifecycle.objects(objectId);
    if (!object || object.owner === ethers.ZeroAddress) throw new Error("Object not found");

    // Parse and validate payload
    const payload = JSON.parse(signedPayload.payload);
    if (payload.objectId !== objectId.toString()) {
      throw new Error("Payload objectId mismatch");
    }

    // Verify the signature matches the object's owner
    const signerAddress = ethers.verifyMessage(signedPayload.payload, signedPayload.signature);
    if (signerAddress !== object.owner) {
      throw new Error("Invalid signature! QR code is not from the object owner");
    }

    // Create interaction claim
    const claimHash = ethers.keccak256(ethers.toUtf8Bytes(signedPayload.payload));
    const userSignature = await liberaService.signer.signMessage(ethers.getBytes(claimHash));

    // Record the interaction on chain
    return liberaService.contracts.objectLifecycle.recordInteraction(
      objectId,
      claimHash,
      userSignature
    );
  }
}