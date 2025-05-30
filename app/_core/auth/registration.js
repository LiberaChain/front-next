// import { ethers } from "ethers";
// import { Resolver } from "did-resolver";
// import { getResolver as getEthrResolver } from "ethr-did-resolver";
// import { WALLET_TYPE_BROWSER, WALLET_TYPE_ETHEREUM } from "../constants";
// // import {
// //   providerConfig,
//   // generateAsymmetricKeys,
// //   registerPublicKeyOnChain,
// //   verifyUserOnBlockchain,
// //   storeMessagingKeys,
// //   storeUserProfileInIPFS,
// // } from "@/app/_core/blockchain/blockchainTransactions";
// // import {
// //   createBrowserWallet,
// //   storeBrowserWallet,
// //   generateLiberaDid,
// // } from "@core/utils/browserWalletUtils";
// // import { createIpfsOnlyAccount } from "@core/utils/ipfsOnlyUtils";

// // Connect to Ethereum wallet
// export const connectWallet = async () => {
//   if (!window.ethereum) {
//     throw new Error("Please install MetaMask or another Ethereum wallet");
//   }

//   const provider = new ethers.BrowserProvider(window.ethereum);
//   await window.ethereum.request({ method: "eth_requestAccounts" });
//   const signer = await provider.getSigner();
//   const address = await signer.getAddress();

//   if (!address) {
//     throw new Error("Failed to get wallet address");
//   }

//   const did = `did:ethr:${address}`;
//   return { did, address };
// };

// // Create a new browser wallet
// export const createNewBrowserWallet = async () => {
//   const wallet = createBrowserWallet();
//   const did = generateLiberaDid(wallet.address);
//   return { did, address: wallet.address, wallet };
// };

// // Store browser wallet
// export const finalizeBrowserWallet = (wallet) => {
//   storeBrowserWallet(wallet);
//   return true;
// };

// // Verify user registration and generate keys if needed
// export const verifyAndGenerateKeys = async (
//   did,
//   walletType = WALLET_TYPE_ETHEREUM
// ) => {
//   // Skip blockchain verification for browser wallet
//   if (walletType === WALLET_TYPE_BROWSER) {
//     // Generate new asymmetric keys for secure messaging instead of verifying on blockchain
//     const keys = await generateAsymmetricKeys();
//     return {
//       verified: false,
//       checking: false,
//       ipfsOnly: true,
//       keyPair: keys,
//     };
//   }

//   // For MetaMask users, perform blockchain verification
//   const verificationResult = await verifyUserOnBlockchain(did);

//   if (verificationResult.success && verificationResult.verified) {
//     return {
//       verified: true,
//       checking: false,
//       registrationTime: verificationResult.registrationTime,
//       publicKey: verificationResult.publicKey,
//       keyPair: null,
//     };
//   }

//   // Generate new asymmetric keys for secure messaging
//   const keys = await generateAsymmetricKeys();
//   return {
//     verified: false,
//     checking: false,
//     keyPair: keys,
//   };
// };

// // Register user on blockchain
// export const registerOnBlockchain = async (keyPair, did, isEthrDid = true) => {
//   if (isEthrDid && !window.ethereum) {
//     throw new Error("Wallet not connected");
//   }

//   let signer;

//   if (isEthrDid) {
//     const provider = new ethers.providers.Web3Provider(window.ethereum);
//     signer = provider.getSigner();
//   } else {
//     // For browser wallet, create a new ethers.Wallet instance
//     const wallet = new ethers.Wallet(keyPair.privateKey);
//     const provider = new ethers.providers.JsonRpcProvider(
//       providerConfig.networks[0].rpcUrl
//     );
//     signer = wallet.connect(provider);
//   }

//   const result = await registerPublicKeyOnChain(signer, keyPair.publicKey, did);
//   if (!result.success) {
//     throw new Error(
//       `Blockchain registration failed: ${result.error || "Unknown error"}`
//     );
//   }

//   return result;
// };

// // Store user identity and auth data
// export const storeIdentityAndAuth = async (
//   did,
//   displayName,
//   walletAddress,
//   keyPair,
//   walletType = "ethereum"
// ) => {
//   // If using browser wallet, use IPFS-only method
//   if (walletType === "browser") {
//     const result = await createIpfsOnlyAccount(
//       did,
//       displayName,
//       walletAddress,
//       null
//     );
//     return result;
//   }

//   // For MetaMask wallet, use traditional approach with blockchain
//   const identityData = {
//     did,
//     displayName: displayName || `User-${walletAddress.substring(2, 8)}`,
//     wallet: walletAddress,
//     walletType,
//     createdAt: new Date().toISOString(),
//   };

//   // If we have generated keys, store them
//   if (keyPair) {
//     storeMessagingKeys(keyPair.privateKey, keyPair.publicKey, keyPair.address);
//     identityData.messagingKeyAddress = keyPair.address;
//   }

//   // Store profile in IPFS
//   const result = await storeUserProfileInIPFS(identityData);
//   if (!result.success) {
//     throw new Error("Failed to store profile in IPFS");
//   }

//   // Store auth data in localStorage
//   const authData = {
//     did,
//     expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
//     wallet: walletAddress,
//     walletType,
//     verified: true,
//   };
//   localStorage.setItem("liberaChainAuth", JSON.stringify(authData));
//   localStorage.setItem("liberaChainIdentity", JSON.stringify(identityData));

//   return { success: true };
// };
