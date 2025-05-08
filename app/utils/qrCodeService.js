import QRCode from 'qrcode';
import { createHash } from 'crypto';
import eccrypto from 'eccrypto';
import { uploadToIPFS } from './ipfsService';
import { storeLocationData, retrieveLocationDataFromIPFS } from './locationRegistryService';

/**
 * Generate a cryptographic keypair for location verification
 * @returns {Promise<{privateKey: Buffer, publicKey: Buffer}>} The generated keypair
 */
export const generateLocationKeyPair = async () => {
  // Generate a random private key
  const privateKey = eccrypto.generatePrivate();
  // Derive the public key from the private key
  const publicKey = eccrypto.getPublic(privateKey);
  
  return {
    privateKey,
    publicKey
  };
};

/**
 * Create a QR code for a location with cryptographic verification
 * @param {Object} locationData - Location data to encode in the QR code
 * @param {string} locationData.name - Name of the location
 * @param {string} locationData.coordinates - Coordinates of the location
 * @param {string} locationData.orgDid - DID of the organization that owns the location
 * @param {string} locationData.reward - Reward for checking in at the location
 * @returns {Promise<{qrCodeDataUrl: string, privateKey: string, publicKey: string, locationDid: string}>} The QR code and associated data
 */
export const createLocationQRCode = async (locationData) => {
  try {
    // Generate a keypair for this location
    const { privateKey, publicKey } = await generateLocationKeyPair();
    
    // Convert the keys to hex strings for storage
    const privateKeyHex = privateKey.toString('hex');
    const publicKeyHex = publicKey.toString('hex');
    
    // Generate a unique identifier for the location
    const locationId = createHash('sha256')
      .update(locationData.name + locationData.coordinates + Date.now())
      .digest('hex')
      .substring(0, 10);
    
    // Format the location name for use in the DID
    const formattedLocationName = locationData.name.replace(/\s+/g, '-').toLowerCase();
    
    // Create the DID for the location
    const locationDid = `did:ethr:${locationData.type || 'location'}:${formattedLocationName}:${locationData.coordinates || 'unknown'}:${locationData.orgDid || ''}:${locationData.reward || ''}:${locationId}`;
    
    // Create the data to be encoded in the QR code
    // This includes the location DID and the private key for verification
    const qrCodeData = JSON.stringify({
      locationDid,
      privateKey: privateKeyHex,
      timestamp: Date.now()
    });
    
    // Store the public key and location metadata on IPFS
    const publicKeyData = {
      publicKey: publicKeyHex,
      locationDid,
      locationName: locationData.name,
      coordinates: locationData.coordinates,
      orgDid: locationData.orgDid,
      reward: locationData.reward,
      type: locationData.type || 'location',
      createdAt: Date.now(),
      createdBy: locationData.createdBy || 'unknown'
    };
    
    // Store location data on IPFS and in the registry
    const ipfsCid = await storeLocationData(publicKeyData);
    
    // Create the QR code as a data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });
    
    return {
      qrCodeDataUrl,
      privateKeyHex,
      publicKeyHex,
      locationDid,
      ipfsCid
    };
  } catch (error) {
    console.error('Error creating location QR code:', error);
    throw error;
  }
};

/**
 * Verify a location QR code using cryptographic signatures
 * @param {Object} qrData - Data extracted from the QR code
 * @param {string} qrData.locationDid - DID of the location
 * @param {string} qrData.privateKey - Private key for verification
 * @returns {Promise<{isValid: boolean, locationData: Object|null}>} Verification result and location data
 */
export const verifyLocationQRCode = async (qrData) => {
  try {
    // Retrieve location data from IPFS using the DID
    const locationData = await retrieveLocationDataFromIPFS(qrData.locationDid);
    
    if (!locationData || !locationData.publicKey) {
      console.error('Location data not found or missing public key');
      return { isValid: false, locationData: null };
    }
    
    // Convert keys from hex strings to Buffers
    const privateKey = Buffer.from(qrData.privateKey, 'hex');
    const publicKey = Buffer.from(locationData.publicKey, 'hex');
    
    // Create a message to sign
    const message = Buffer.from(qrData.locationDid);
    
    // Sign the message with the private key
    const signature = await eccrypto.sign(privateKey, message);
    
    // Verify the signature with the public key
    await eccrypto.verify(publicKey, message, signature);
    
    return { 
      isValid: true, 
      locationData 
    };
  } catch (error) {
    console.error('Error verifying location QR code:', error);
    return { 
      isValid: false, 
      locationData: null,
      error: error.message
    };
  }
};