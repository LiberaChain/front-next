// Blockchain transaction handling with IPFS integration
import { ethers } from "ethers";
import { uploadFile, getFile } from "@core/storage/ipfs/ipfs-crud";
import { hasIpfsCredentials } from "@core/storage/ipfs/ipfsService";

// Define ABIs directly to avoid build issues
const userPublicKeysABI = [
  // Public key management functions
  "function setPublicKey(string memory userId, string memory publicKey) public",
  "function getPublicKey(string memory userId) public view returns (string memory)",
  "function publicKeyExists(string memory userId) public view returns (bool)",
  // Events
  "event PublicKeySet(string indexed userId, string publicKey)",
];

// ABI for the new UserRegistry contract
const userRegistryABI = [
  // User registration functions
  "function registerUser(string memory did, string memory publicKey) public",
  "function userExists(string memory did) public view returns (bool)",
  "function getUser(string memory did) public view returns (bool exists, string memory publicKey, uint256 registrationTime)",
  "function updatePublicKey(string memory did, string memory newPublicKey) public",
  // Events
  "event UserRegistered(string indexed did, string publicKey)",
];

// Provider configuration for DID resolver
export const providerConfig = {
  networks: [
    {
      name: "sepolia",
      registry: "0xdca7ef03e98e0dc2b855be647c39abe984fcf21b",
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545",
    },
  ],
};

// Try to get contract addresses, with fallbacks
let contractAddresses = {};
try {
  // First try to load from artifact file
  if (typeof window !== "undefined") {
    try {
      // Try dynamic import during runtime
      const addresses = require("../../blockchain/artifacts/contracts/contract-address.json");
      contractAddresses = addresses;
      console.log(
        "[DEBUG] Loaded contract addresses from artifacts:",
        contractAddresses
      );
    } catch (error) {
      console.warn(
        "[DEBUG] Contract address file not found, using fallback addresses"
      );
      // Fallback to hardcoded addresses for local Hardhat network
      contractAddresses = {
        UserPublicKeys: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        UserRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      };
    }
  } else {
    // Server-side, use env variables or fallbacks
    contractAddresses = {
      UserPublicKeys:
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
        "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      UserRegistry:
        process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ||
        "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    };
  }
} catch (error) {
  console.error("[DEBUG] Error loading contract addresses:", error);
  // Fallback to hardcoded addresses for local Hardhat network
  contractAddresses = {
    UserPublicKeys: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    UserRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  };
}

console.log("[DEBUG] Using contract addresses:", contractAddresses);

// Initialize provider and signer
export const getProviderAndSigner = async () => {
  if (typeof window === "undefined") {
    // Server-side rendering - use a provider for the testnet
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545"
    );
    return { provider, signer: null, account: null };
  }

  // Client-side - check if MetaMask is installed
  if (!window.ethereum) {
    console.warn(
      "MetaMask is not installed. Some functionality may be limited."
    );
    // Fallback to a read-only provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545"
    );
    return { provider, signer: null, account: null };
  }

  try {
    // Request account access if needed
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Initialize provider with MetaMask
    const provider = new ethers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const account = await signer.getAddress();

    return { provider, signer, account };
  } catch (error) {
    console.error("Error connecting to MetaMask:", error);
    // Fallback to a read-only provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545"
    );
    return { provider, signer: null, account: null };
  }
};

// Get contract instance with specified ABI
export const getContract = async (
  contractName,
  withSigner = true,
  customABI = null
) => {
  if (!contractAddresses[contractName]) {
    console.error(`[DEBUG] Contract address for ${contractName} is not set`);
    throw new Error(
      `Contract address not found for ${contractName}. Please make sure the contract is deployed and the address is set.`
    );
  }

  console.log(
    `[DEBUG] Getting ${contractName} contract at address:`,
    contractAddresses[contractName]
  );

  const { provider, signer, account } = await getProviderAndSigner();
  console.log("[DEBUG] Provider/signer initialized, account:", account);

  if (withSigner && !signer) {
    console.error("[DEBUG] Signer not available but was requested");
    throw new Error("Signer not available. Are you connected to MetaMask?");
  }

  // Use custom ABI if provided, otherwise use default ABIs
  let abi;
  if (customABI) {
    abi = customABI;
  } else {
    // Select ABI based on contract name
    if (contractName === "UserRegistry") {
      abi = userRegistryABI;
    } else if (contractName === "BlockchainPosts") {
      // Default empty ABI - actual one should be passed via customABI
      abi = [];
    } else {
      abi = userPublicKeysABI;
    }
  }

  return new ethers.Contract(
    contractAddresses[contractName],
    abi,
    withSigner && signer ? signer : provider
  );
};

// Legacy support for old code
const getPublicKeysContract = async (withSigner = true) => {
  return getContract("UserPublicKeys", withSigner);
};

// Set a user's public key
export const setUserPublicKey = async (userId, publicKey) => {
  try {
    console.log("[DEBUG] Setting public key for userId:", userId);
    console.log("[DEBUG] Public key length:", publicKey.length);

    // Ensure we have valid inputs
    if (!userId || typeof userId !== "string") {
      return {
        success: false,
        error: "Invalid user ID",
      };
    }

    if (!publicKey || typeof publicKey !== "string") {
      return {
        success: false,
        error: "Invalid public key",
      };
    }

    let idToUse = userId;

    // If userId contains special characters that might cause issues, sanitize it
    if (/[^\w\s]/gi.test(userId)) {
      console.log("[DEBUG] Using sanitized userId for consistency");
      idToUse = userId.replace(/[^\w\s]/gi, "_");
    }

    console.log("[DEBUG] ID being used for transaction:", idToUse);

    const contract = await getPublicKeysContract();
    const tx = await contract.setPublicKey(idToUse, publicKey);
    console.log("[DEBUG] Transaction sent:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("[DEBUG] Transaction confirmed in block:", receipt.blockNumber);

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      sanitizedId: idToUse !== userId ? idToUse : null,
    };
  } catch (error) {
    console.error("[DEBUG] Error setting user public key:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
};

// Get a user's public key
export const getUserPublicKey = async (userId) => {
  try {
    console.log("[DEBUG] Getting public key for userId:", userId);

    // Ensure userId is a valid string
    if (!userId || typeof userId !== "string") {
      console.error("[DEBUG] Invalid userId:", userId);
      return {
        success: false,
        error: "Invalid user ID",
      };
    }

    // Use provider to read data, no need for signer
    const contract = await getPublicKeysContract(false);

    // Try to get the key with proper error handling
    try {
      // Check if the key exists first to avoid unnecessary errors
      let exists = false;
      try {
        exists = await contract.publicKeyExists(userId);
      } catch (checkError) {
        // If we get an error checking existence, try with a sanitized ID
        if (checkError.code === "CALL_EXCEPTION") {
          const sanitizedId = userId.replace(/[^\w\s]/gi, "_");
          try {
            exists = await contract.publicKeyExists(sanitizedId);
            if (exists) {
              // If the sanitized ID works, use it to get the public key
              const publicKey = await contract.getPublicKey(sanitizedId);
              console.log(
                "[DEBUG] Retrieved public key with sanitized ID, length:",
                publicKey.length
              );

              return {
                success: true,
                publicKey,
                sanitized: true,
              };
            }
          } catch (sanitizedError) {
            console.log(
              "[DEBUG] Sanitized ID also failed:",
              sanitizedError.message
            );
          }
        }
        console.warn(
          "[DEBUG] Error checking if key exists:",
          checkError.message
        );
      }

      console.log("[DEBUG] Public key exists check:", exists);

      if (!exists) {
        console.log("[DEBUG] Key does not exist for userId:", userId);
        return {
          success: false,
          error: "Public key not found",
        };
      }

      const publicKey = await contract.getPublicKey(userId);
      console.log("[DEBUG] Retrieved public key length:", publicKey.length);
      console.log(
        "[DEBUG] Public key excerpt:",
        publicKey.substring(0, 20) + "..."
      );

      return {
        success: true,
        publicKey,
      };
    } catch (callError) {
      console.error("[DEBUG] Contract call error:", callError);
      throw callError;
    }
  } catch (error) {
    console.error("[DEBUG] Error getting user public key:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
};

// Check if a user's public key exists
export const checkUserPublicKeyExists = async (userId) => {
  try {
    console.log("[DEBUG] Checking if public key exists for userId:", userId);

    // Ensure userId is a valid string
    if (!userId || typeof userId !== "string") {
      console.error("[DEBUG] Invalid userId:", userId);
      return {
        success: false,
        error: "Invalid user ID",
      };
    }

    const contract = await getPublicKeysContract(false);

    // Make the call with proper error handling
    try {
      const exists = await contract.publicKeyExists(userId);
      console.log("[DEBUG] Public key exists result:", exists);

      return {
        success: true,
        exists,
      };
    } catch (callError) {
      console.error("[DEBUG] Contract call error:", callError);

      // If we get a specific error related to encoding, try again with a sanitized ID
      if (callError.code === "CALL_EXCEPTION") {
        console.log("[DEBUG] Trying with sanitized userId");
        const sanitizedId = userId.replace(/[^\w\s]/gi, "_");
        console.log(
          "[DEBUG] Original ID vs Sanitized ID:",
          userId,
          sanitizedId
        );

        try {
          const exists = await contract.publicKeyExists(sanitizedId);
          console.log("[DEBUG] Sanitized public key exists result:", exists);

          return {
            success: true,
            exists,
            sanitized: true,
          };
        } catch (retryError) {
          throw new Error(`Failed with sanitized ID: ${retryError.message}`);
        }
      }

      throw callError;
    }
  } catch (error) {
    console.error("[DEBUG] Error checking if user public key exists:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
};

// Get current user's Ethereum address
export const getCurrentUserAddress = async () => {
  try {
    const { account } = await getProviderAndSigner();
    return account;
  } catch (error) {
    console.error("Error getting current user address:", error);
    return null;
  }
};

// Register public key on blockchain - updated to use both contracts
export const registerPublicKeyOnChain = async (signer, publicKey, userId) => {
  try {
    // Use the provided userId (DID) or generate a random one as fallback
    const finalUserId = userId || `user_${Math.floor(Math.random() * 1000000)}`;

    // Get contract instances
    if (!contractAddresses.UserPublicKeys || !contractAddresses.UserRegistry) {
      throw new Error(
        "Contract addresses not found. Please deploy the contracts first."
      );
    }

    // Register with the old public keys contract for backward compatibility
    const publicKeysContract = new ethers.Contract(
      contractAddresses.UserPublicKeys,
      userPublicKeysABI,
      signer
    );

    // Register with the new user registry contract
    const userRegistryContract = new ethers.Contract(
      contractAddresses.UserRegistry,
      userRegistryABI,
      signer
    );

    console.log(`Registering user ${finalUserId} with public key`);

    // First check if the user already exists in the registry
    const userExists = await userRegistryContract.userExists(finalUserId);

    let registryTx;
    if (userExists) {
      console.log("User already exists, updating public key");
      registryTx = await userRegistryContract.updatePublicKey(
        finalUserId,
        publicKey
      );
    } else {
      console.log("Registering new user");
      registryTx = await userRegistryContract.registerUser(
        finalUserId,
        publicKey
      );
    }

    console.log("User registry transaction sent:", registryTx.hash);
    await registryTx.wait();

    // For backward compatibility also register in the public keys contract
    const pkTx = await publicKeysContract.setPublicKey(finalUserId, publicKey);
    console.log("Public keys transaction sent:", pkTx.hash);

    // Wait for transaction to be mined
    const receipt = await pkTx.wait();
    console.log("Transactions confirmed");

    return {
      success: true,
      userId: finalUserId,
      transactionHash: pkTx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("Error registering user on chain:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
};

// For compatibility with other code that expects these functions
export const searchUserByDid = async (did) => {
  console.log("searchUserByDid called with:", did);
  return { found: true, did, displayName: "User" };
};

// Generate a unique identifier for a friend request between two users
const generateFriendRequestId = (senderDid, receiverDid) => {
  // Sort DIDs to ensure consistent IDs regardless of who initiates
  const sortedDids = [senderDid, receiverDid].sort();
  return `fr_${sortedDids[0]}_${sortedDids[1]}_${Date.now()}`;
};

// Create a friend request and store it in IPFS
export const createFriendRequest = async (receiverDid, receiverPublicKey) => {
  try {
    if (!hasIpfsCredentials()) {
      throw new Error("IPFS credentials required for friend requests");
    }

    // Get sender info from auth state
    const profileData = JSON.parse(localStorage.getItem("liberaChainIdentity"));
    if (!profileData?.did) {
      throw new Error("User not authenticated");
    }

    // Create friend request object
    const friendRequest = {
      id: `fr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: profileData.did,
      fromName: profileData.displayName || profileData.did,
      to: receiverDid,
      message: `Friend request from ${profileData.displayName || "Anonymous"}`,
      timestamp: Date.now(),
      status: "pending",
    };

    // Generate unique filename for IPFS
    const requestFileName = `friend-request_${friendRequest.id}.json`;

    // Upload to IPFS
    const requestCid = await uploadFile(
      requestFileName,
      JSON.stringify(friendRequest)
    );
    if (!requestCid) {
      throw new Error("Failed to upload friend request to IPFS");
    }

    return {
      ...friendRequest,
      success: true,
      cid: requestCid,
    };
  } catch (error) {
    console.error("Error creating friend request:", error);
    return {
      success: false,
      error: error.message || "Unknown error creating friend request",
    };
  }
};

// Check for pending friend requests for the current user
export const checkPendingFriendRequests = async () => {
  try {
    // Get current user's DID
    const profileData = JSON.parse(
      localStorage.getItem("liberaChainIdentity") || "{}"
    );

    if (!profileData?.did) {
      throw new Error("User profile not found");
    }

    // Check if we're using local storage mode for IPFS
    const { hasIpfsCredentials } = await import("./ipfsService.js");
    const useIpfs = hasIpfsCredentials();

    let pendingRequests = [];

    if (useIpfs) {
      // In a real app, you would query IPFS for requests where the 'to' field matches the user's DID
      // For example, by using an IPFS indexer or a database that tracks friend request CIDs

      // Since we're simulating this functionality, we'll check in localStorage
      console.log("Checking IPFS for pending friend requests (simulated)");
    } else {
      // Check in localStorage (fallback/mock mode)
      const allRequests = JSON.parse(
        localStorage.getItem("liberaChainFriendRequests") || "{}"
      );

      // Filter for requests addressed to the current user that are still pending
      Object.values(allRequests).forEach((request) => {
        if (request.to === profileData.did && request.status === "pending") {
          pendingRequests.push(request);
        }
      });
    }

    return {
      success: true,
      requests: pendingRequests,
    };
  } catch (error) {
    console.error("Error checking pending friend requests:", error);
    return {
      success: false,
      error: error.message,
      requests: [],
    };
  }
};

// Accept a friend request
export const acceptFriendRequest = async (requestId) => {
  try {
    if (!hasIpfsCredentials()) {
      throw new Error("IPFS credentials required to accept friend request");
    }

    // Find the request file in IPFS
    const response = await fetch("/api/storage");
    if (!response.ok) {
      throw new Error("Failed to list IPFS files");
    }

    const listData = await response.json();
    const requestFiles = listData.files.filter((file) =>
      file.includes(requestId)
    );

    if (requestFiles.length === 0) {
      throw new Error("Friend request not found");
    }

    // Get the request data
    const content = await getFile(requestFiles[0]);
    if (!content) {
      throw new Error("Failed to read friend request");
    }

    const requestData = JSON.parse(content);
    requestData.status = "accepted";

    // Update the request in IPFS
    await uploadFile(requestFiles[0], JSON.stringify(requestData));

    // Update friendships in localStorage temporarily
    // In a real implementation, this would be stored on-chain
    const friendships = JSON.parse(
      localStorage.getItem("liberaChainFriendships") || "{}"
    );
    if (!friendships[requestData.to]) {
      friendships[requestData.to] = [];
    }
    if (!friendships[requestData.from]) {
      friendships[requestData.from] = [];
    }

    if (!friendships[requestData.to].includes(requestData.from)) {
      friendships[requestData.to].push(requestData.from);
    }
    if (!friendships[requestData.from].includes(requestData.to)) {
      friendships[requestData.from].push(requestData.to);
    }

    localStorage.setItem("liberaChainFriendships", JSON.stringify(friendships));

    return {
      success: true,
      request: requestData,
    };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Reject a friend request
export const rejectFriendRequest = async (requestId) => {
  try {
    if (!hasIpfsCredentials()) {
      throw new Error("IPFS credentials required to reject friend request");
    }

    // Find the request file in IPFS
    const response = await fetch("/api/storage");
    if (!response.ok) {
      throw new Error("Failed to list IPFS files");
    }

    const listData = await response.json();
    const requestFiles = listData.files.filter((file) =>
      file.includes(requestId)
    );

    if (requestFiles.length === 0) {
      throw new Error("Friend request not found");
    }

    // Get the request data
    const content = await getFile(requestFiles[0]);
    if (!content) {
      throw new Error("Failed to read friend request");
    }

    const requestData = JSON.parse(content);
    requestData.status = "rejected";

    // Update the request in IPFS
    await uploadFile(requestFiles[0], JSON.stringify(requestData));

    return {
      success: true,
      request: requestData,
    };
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get blockchain status
export const getBlockchainStatus = async () => {
  try {
    const { provider } = await getProviderAndSigner();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    return {
      connected: true,
      name:
        network.name === "unknown"
          ? network.chainId === 17000
            ? "Holesky"
            : network.name
          : network.name,
      chainId: network.chainId,
      latestBlock: blockNumber,
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545",
      networkName:
        network.name === "unknown"
          ? network.chainId === 17000
            ? "Holesky"
            : "Local Hardhat"
          : network.name,
      status: "Connected",
      isMock: false,
    };
  } catch (error) {
    console.error("Error getting blockchain status:", error);
    return {
      connected: false,
      name: "unknown",
      chainId: 0,
      latestBlock: 0,
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545",
      networkName: "Unknown",
      status: "Disconnected",
      isMock: true,
    };
  }
};

// Check if wallet is on the right network
export const checkWalletNetwork = async () => {
  try {
    // Skip if not in browser or no ethereum object
    if (typeof window === "undefined" || !window.ethereum) {
      return {
        success: false,
        rightNetwork: false,
        error: "No wallet detected",
      };
    }

    const provider = new ethers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    console.log("[DEBUG] Wallet connected to network:", network);

    // Hardhat's chainId is 31337
    const isHardhat = network.chainId === 31337;
    const isSepolia = network.chainId === 11155111; // Ethereum Sepolia testnet

    // Get contract artifact address (for hardhat) or env var (for live networks)
    let correctAddress;

    // For Hardhat, use the artifact
    if (isHardhat) {
      try {
        const addresses = require("../../blockchain/artifacts/contracts/contract-address.json");
        correctAddress = addresses.UserPublicKeys;
        console.log("[DEBUG] Using Hardhat contract address:", correctAddress);
      } catch (error) {
        console.error("[DEBUG] Failed to load Hardhat contract address");
      }
    }
    // For Sepolia, use env var
    else if (isSepolia) {
      correctAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      console.log("[DEBUG] Using Sepolia contract address:", correctAddress);
    }

    // Check if contract address matches network
    const rightNetwork = isHardhat || isSepolia;
    const validAddress = !!correctAddress;

    return {
      success: true,
      rightNetwork,
      networkName: network.name,
      chainId: network.chainId,
      validAddress,
    };
  } catch (error) {
    console.error("[DEBUG] Error checking wallet network:", error);
    return {
      success: false,
      rightNetwork: false,
      error: error.message,
    };
  }
};

// Verify a user exists on the blockchain
export const verifyUserOnBlockchain = async (did) => {
  try {
    console.log("[DEBUG] Verifying user exists on blockchain:", did);

    // Ensure did is a valid string
    if (!did || typeof did !== "string") {
      console.error("[DEBUG] Invalid did:", did);
      return {
        success: false,
        error: "Invalid DID",
      };
    }

    // Use provider to read data, no need for signer
    const contract = await getContract("UserRegistry", false);

    // Check if the user exists
    const exists = await contract.userExists(did);
    console.log("[DEBUG] User exists check:", exists);

    if (!exists) {
      return {
        success: false,
        verified: false,
        error: "User not found on blockchain",
      };
    }

    // Get user registration data
    const userData = await contract.getUser(did);

    return {
      success: true,
      verified: true,
      publicKey: userData[1],
      registrationTime: new Date(userData[2].toNumber() * 1000).toISOString(),
    };
  } catch (error) {
    console.error("[DEBUG] Error verifying user on blockchain:", error);
    return {
      success: false,
      verified: false,
      error: error.message || "Unknown error",
    };
  }
};

// Generate asymmetric keys for secure messaging
export const generateAsymmetricKeys = async () => {
  try {
    // Create a random wallet
    const wallet = ethers.Wallet.createRandom();

    // Get the wallet's address, privateKey, and publicKey
    const address = wallet.address;
    const privateKey = wallet.privateKey;
    const publicKey = wallet.publicKey;

    console.log("Generated new key pair");

    return {
      address,
      privateKey,
      publicKey,
    };
  } catch (error) {
    console.error("Error generating asymmetric keys:", error);
    throw error;
  }
};

// Store messaging keys in local storage
export const storeMessagingKeys = (privateKey, publicKey, address) => {
  try {
    const messagingKeys = {
      privateKey,
      publicKey,
      address,
      createdAt: new Date().toISOString(),
    };

    // Encrypt private key with a derived key or password in a real app
    localStorage.setItem(
      "liberaChainMessagingKeys",
      JSON.stringify(messagingKeys)
    );
    return true;
  } catch (error) {
    console.error("Error storing messaging keys:", error);
    return false;
  }
};

// Retrieve messaging keys from local storage
export const retrieveMessagingKeys = () => {
  try {
    const keysStr = localStorage.getItem("liberaChainMessagingKeys");
    if (!keysStr) return null;

    return JSON.parse(keysStr);
  } catch (error) {
    console.error("Error retrieving messaging keys:", error);
    return null;
  }
};

// Store user profile in IPFS
export const storeUserProfileInIPFS = async (profile) => {
  try {
    // Import the uploadProfileToIPFS function from ipfsService
    const { uploadProfileToIPFS } = await import("./ipfsService.js");

    // Upload the profile to IPFS
    const cid = await uploadProfileToIPFS(profile);

    if (!cid) {
      throw new Error("Failed to upload profile to IPFS");
    }

    return {
      success: true,
      cid,
    };
  } catch (error) {
    console.error("Error storing user profile in IPFS:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get user profile from IPFS
export const getUserProfileFromIPFS = async (did) => {
  try {
    // Import the retrieveProfileFromIPFS function from ipfsService
    const { retrieveProfileFromIPFS } = await import("./ipfsService.js");

    // Try to get all profiles associated with this DID
    // In a real implementation, you would have a registry of DIDs to profile CIDs
    // For this demo, we'll use a mock approach
    const mockCidMap = JSON.parse(
      localStorage.getItem("liberaChainDidProfiles") || "{}"
    );
    const cid = mockCidMap[did];

    if (!cid) {
      console.log(`No profile CID found for DID: ${did}`);
      return null;
    }

    // Retrieve the profile from IPFS
    const profile = await retrieveProfileFromIPFS(cid);
    return profile;
  } catch (error) {
    console.error("Error getting user profile from IPFS:", error);
    return null;
  }
};

// Set username for DID
export const setUserNameForDID = async (did, username) => {
  try {
    if (!did || !username) {
      throw new Error("DID and username are required");
    }

    // Get existing profile or create new one
    const existingProfile = await getUserProfileFromIPFS(did);
    const profile = existingProfile || { did };

    // Update the profile
    profile.username = username;
    profile.updatedAt = new Date().toISOString();

    // Store updated profile in IPFS
    const result = await storeUserProfileInIPFS(profile);

    if (!result.success) {
      throw new Error(result.error || "Failed to store profile");
    }

    // Update the DID to CID mapping
    const mockCidMap = JSON.parse(
      localStorage.getItem("liberaChainDidProfiles") || "{}"
    );
    mockCidMap[did] = result.cid;
    localStorage.setItem("liberaChainDidProfiles", JSON.stringify(mockCidMap));

    return {
      success: true,
      cid: result.cid,
    };
  } catch (error) {
    console.error("Error setting username for DID:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get all friend requests for the current user (both sent and received)
export const getAllFriendRequests = async () => {
  try {
    // Get current user's DID
    const profileData = JSON.parse(
      localStorage.getItem("liberaChainIdentity") || "{}"
    );

    if (!profileData?.did) {
      throw new Error("User profile not found");
    }

    if (!hasIpfsCredentials()) {
      throw new Error("IPFS credentials required to check friend requests");
    }

    // List all files in IPFS storage
    const response = await fetch("/api/storage");
    if (!response.ok) {
      throw new Error("Failed to list IPFS files");
    }

    const listData = await response.json();
    if (!listData.success || !listData.files) {
      throw new Error("Invalid response from IPFS storage");
    }

    // Find all friend request files
    const requestFiles = listData.files.filter((file) =>
      file.match(/friend-request.*\.json/)
    );
    console.log(`Found ${requestFiles.length} potential friend request files`);

    const received = [];
    const sent = [];

    // Process each request file
    for (const filename of requestFiles) {
      try {
        const content = await getFile(filename);
        if (!content) continue;

        const requestData = JSON.parse(content);

        // Sort into received and sent requests
        if (requestData.to === profileData.did) {
          received.push(requestData);
        } else if (requestData.from === profileData.did) {
          sent.push(requestData);
        }
      } catch (err) {
        console.error("Error processing friend request file:", filename, err);
      }
    }

    // Sort requests by timestamp, newest first
    received.sort((a, b) => b.timestamp - a.timestamp);
    sent.sort((a, b) => b.timestamp - a.timestamp);

    return {
      success: true,
      received,
      sent,
    };
  } catch (error) {
    console.error("Error getting friend requests:", error);
    return {
      success: false,
      error: error.message,
      received: [],
      sent: [],
    };
  }
};
