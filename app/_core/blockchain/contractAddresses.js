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
export let contractAddresses = {};
try {
    // First try to load from artifact file
    if (typeof window !== "undefined") {
        try {
            // Try dynamic import during runtime
            const addresses = require("../../../blockchain/artifacts/contracts/contract-address.json");
            contractAddresses = addresses;
            console.debug(
                "Loaded contract addresses from artifacts:",
                contractAddresses
            );
        } catch (error) {
            console.warn(
                "Contract address file not found, using fallback addresses"
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
    console.error("Error loading contract addresses:", error);
    // Fallback to hardcoded addresses for local Hardhat network
    contractAddresses = {
        UserPublicKeys: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        UserRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    };
}

console.debug("Using contract addresses:", contractAddresses);
