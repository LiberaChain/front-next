import { ethers } from 'ethers';
import { uploadFile, getFile } from './ipfs-crud';
import { retrieveMessagingKeys, getUserPublicKey } from './blockchainTransactions';

// Encrypt a message using the recipient's public key
const encryptMessage = async (message, recipientPublicKey) => {
  try {
    // Create ephemeral wallet for encrypting this message
    const ephemeralWallet = ethers.Wallet.createRandom();
    
    // Create a shared secret using ECDH
    const publicKeyBytes = ethers.utils.arrayify(recipientPublicKey);
    const sharedSecret = ethers.utils.keccak256(
      ethers.utils.arrayify(
        await ephemeralWallet.signMessage(publicKeyBytes)
      )
    );

    // Use the shared secret to encrypt the message
    const messageBytes = ethers.utils.toUtf8Bytes(message);
    const encryptedData = ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.concat([
          ethers.utils.arrayify(sharedSecret),
          messageBytes
        ])
      )
    );

    return {
      encrypted: ethers.utils.hexlify(encryptedData),
      ephemeralPubKey: ephemeralWallet.publicKey
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw error;
  }
};

// Decrypt a message using the recipient's private key
const decryptMessage = async (encryptedMessage, ephemeralPubKey) => {
  try {
    const keys = retrieveMessagingKeys();
    if (!keys || !keys.privateKey) {
      throw new Error('No messaging keys found');
    }

    // Recreate the shared secret using our private key and the ephemeral public key
    const wallet = new ethers.Wallet(keys.privateKey);
    const publicKeyBytes = ethers.utils.arrayify(ephemeralPubKey);
    const sharedSecret = ethers.utils.keccak256(
      ethers.utils.arrayify(
        await wallet.signMessage(publicKeyBytes)
      )
    );

    // Decrypt the message
    const decryptedBytes = ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.concat([
          ethers.utils.arrayify(sharedSecret),
          ethers.utils.arrayify(encryptedMessage)
        ])
      )
    );

    return ethers.utils.toUtf8String(decryptedBytes);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw error;
  }
};

// Store a message on IPFS
export const storeMessage = async (recipientDid, message) => {
  try {
    // Get recipient's public key from blockchain
    const keyResult = await getUserPublicKey(recipientDid);
    if (!keyResult.success || !keyResult.publicKey) {
      throw new Error('Failed to get recipient public key');
    }

    // Encrypt the message
    const { encrypted, ephemeralPubKey } = await encryptMessage(message, keyResult.publicKey);

    // Create message object
    const messageData = {
      to: recipientDid,
      encryptedContent: encrypted,
      ephemeralPubKey,
      timestamp: Date.now(),
    };

    // Upload to IPFS
    const fileName = `message-${Date.now()}.json`;
    const cid = await uploadFile(fileName, JSON.stringify(messageData));

    if (!cid) {
      throw new Error('Failed to upload message to IPFS');
    }

    // Store message reference
    const messageRefs = JSON.parse(localStorage.getItem('liberaChainIPFSMessages') || '{}');
    if (!messageRefs[recipientDid]) {
      messageRefs[recipientDid] = [];
    }
    messageRefs[recipientDid].push(cid);
    localStorage.setItem('liberaChainIPFSMessages', JSON.stringify(messageRefs));

    return { success: true, cid };
  } catch (error) {
    console.error('Error storing message:', error);
    return { success: false, error: error.message };
  }
};

// Retrieve messages from IPFS
export const retrieveMessages = async (conversationDid) => {
  try {
    const messageRefs = JSON.parse(localStorage.getItem('liberaChainIPFSMessages') || '{}');
    const messageCids = messageRefs[conversationDid] || [];

    const messages = await Promise.all(
      messageCids.map(async (cid) => {
        try {
          const messageContent = await getFile(cid);
          if (!messageContent) {
            return null;
          }

          const messageData = JSON.parse(messageContent);
          
          // Decrypt the message
          const decryptedText = await decryptMessage(
            messageData.encryptedContent,
            messageData.ephemeralPubKey
          );

          return {
            id: cid,
            text: decryptedText,
            timestamp: new Date(messageData.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            sender: messageData.to === conversationDid ? 'You' : conversationDid
          };
        } catch (err) {
          console.error(`Error retrieving message ${cid}:`, err);
          return null;
        }
      })
    );

    // Filter out any failed retrievals
    return messages.filter(msg => msg !== null);
  } catch (error) {
    console.error('Error retrieving messages:', error);
    throw error;
  }
};