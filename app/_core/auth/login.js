import { ethers } from "ethers";

// Check user blockchain registration
export const checkUserRegistration = async (did) => {
    try {
        const verificationResult = await verifyUserOnBlockchain(did);

        if (verificationResult.success && verificationResult.verified) {
            console.log(
                "User verified on blockchain. Registration time:",
                verificationResult.registrationTime
            );
            return {
                verified: true,
                checking: false,
                registrationTime: verificationResult.registrationTime,
                publicKey: verificationResult.publicKey,
            };
        } else {
            console.log("User not verified on blockchain:", verificationResult.error);
            return { verified: false, checking: false };
        }
    } catch (err) {
        console.error("Error checking user registration:", err);
        return { verified: false, checking: false };
    }
};

// Connect to Ethereum wallet
export const connectWallet = async () => {
    if (!window.ethereum) {
        throw new Error("Please install MetaMask or another Ethereum wallet");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    if (address) {
        const did = `did:ethr:${address}`;
        console.log("Wallet connected. DID:", did);
        return { did, address };
    }

    throw new Error("Failed to get wallet address");
};

// Connect to browser-based wallet
export const connectBrowserWallet = () => {
    const wallet = retrieveBrowserWallet();
    if (!wallet) {
        throw new Error(
            "No browser wallet found. Please recover or create a new one."
        );
    }

    const did = generateLiberaDid(wallet.address);
    console.log("Browser wallet connected. DID:", did);
    return { did, address: wallet.address };
};

// Recover browser wallet from mnemonic
export const recoverBrowserWalletWithPhrase = async (recoveryPhrase) => {
    try {
        const wallet = recoverBrowserWallet(recoveryPhrase);
        console.log("Browser wallet recovered. DID:", wallet.did);
        return {
            did: wallet.did,
            address: wallet.address,
        };
    } catch (error) {
        console.error("Error recovering browser wallet:", error);
        throw new Error(
            "Failed to recover wallet. Please check your recovery phrase."
        );
    }
};

// Sign challenge with wallet
export const signChallenge = async (challenge) => {
    if (!window.ethereum) {
        // Try browser wallet
        const walletData = retrieveBrowserWallet();
        if (walletData) {
            return await signWithBrowserWallet(challenge);
        }
        throw new Error("No wallet available");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = provider.getSigner();
    return await signer.signMessage(challenge);
};

// Verify signature
export const verifySignature = async (message, signature, address) => {
    try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (err) {
        console.error("Error verifying signature:", err);
        return false;
    }
};

// Generate a unique challenge for DID verification
export const generateChallenge = () => {
    return `Authenticate with LiberaChain at ${new Date().toISOString()} with nonce ${Math.random()
        .toString(36)
        .substring(2, 15)}`;
};

// Store auth in local storage
export const storeAuthInLocalStorage = (
    did,
    walletAddress,
    blockchainVerification
) => {
    const authData = {
        did,
        expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        wallet: walletAddress,
        verified: blockchainVerification.verified,
        registrationTime: blockchainVerification.registrationTime,
    };
    localStorage.setItem("liberaChainAuth", JSON.stringify(authData));
};

// Verify a DID signature
export const verifyDidSignature = async (
    didIdentifier,
    challenge,
    signature
) => {
    try {
        // Extract the address from the DID identifier
        // Assume DID format is did:ethr:0xaddress or did:libera:0xaddress
        const addressMatch = didIdentifier.match(/did:(ethr|libera):(.+)/);
        if (!addressMatch || !addressMatch[2]) {
            throw new Error("Invalid DID format");
        }

        const address = addressMatch[2];

        // Verify the signature using ethers.js
        const messageHash = ethers.hashMessage(challenge);
        const recoveredAddress = ethers.recoverAddress(
            messageHash,
            signature
        );

        // Check if the recovered address matches the DID address
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            throw new Error("Invalid signature");
        }

        // If we reach here, the signature is valid
        return {
            success: true,
            verified: true,
        };
    } catch (error) {
        console.error("Error verifying DID signature:", error);
        return {
            success: false,
            verified: false,
            error: error.message,
        };
    }
};

// // Verify browser wallet using recovery phrase
// export const verifyBrowserWallet = async (recoveryPhrase) => {
//   try {
//     // Verify browser wallet with recovery phrase
//     const result = await verifyBrowserWalletWithRecoveryPhrase(recoveryPhrase);

//     if (!result.success) {
//       throw new Error(result.error || "Invalid recovery phrase");
//     }

//     return {
//       success: true,
//       did: result.wallet.did,
//       address: result.wallet.address,
//     };
//   } catch (error) {
//     console.error("Error verifying browser wallet:", error);
//     return {
//       success: false,
//       error: error.message || "Failed to verify browser wallet",
//     };
//   }
// };

// // Verify if a DID is registered on the blockchain
// export const verifyDidOnBlockchain = async (didIdentifier) => {
//   try {
//     // Check if the DID is registered on the blockchain
//     const result = await verifyUserOnBlockchain(didIdentifier);

//     return {
//       success: true,
//       verified: result.verified,
//       registrationTime: result.registrationTime || null,
//       publicKey: result.publicKey || null,
//       error: result.error || null,
//     };
//   } catch (error) {
//     console.error("Error verifying DID on blockchain:", error);
//     return {
//       success: false,
//       verified: false,
//       error: error.message || "Failed to verify DID on blockchain",
//     };
//   }
// };

// Get authentication challenge
export const getAuthChallenge = (didIdentifier) => {
    const timestamp = Date.now();
    return `Authenticate ${didIdentifier} at ${timestamp}`;
};
