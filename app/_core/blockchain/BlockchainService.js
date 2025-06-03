import { ethers } from "ethers";

import { contractAddresses } from './contractAddresses';
import { userRegistryABI, userPublicKeysABI, blockchainPostsABI } from './abi';

export class BlockchainService {
    constructor() {
        if (BlockchainService.instance) {
            return BlockchainService.instance;
        }

        this.initialized = false;
        BlockchainService.instance = this;
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
    }

    //   async libera() {
    //     if (!this._liberaService) {
    //       const { provider, signer } = await this.getProviderAndSigner();

    //       // Get contract addresses from environment or artifacts
    //       let contractAddresses;
    //       if (typeof window !== 'undefined') {
    //         try {
    //           const addresses = await import('../../../blockchain/scripts/contract-addresses.json');
    //           contractAddresses = {
    //             feeAndTreasury: addresses.FeeAndTreasury,
    //             didRegistry: addresses.DIDRegistry,
    //             contentManagement: addresses.ContentManagement,
    //             objectLifecycle: addresses.ObjectLifeCycle
    //           };
    //         } catch (error) {
    //           console.warn('Failed to load contract addresses from artifacts, using env vars');
    //         }
    //       }

    //       // Fallback to environment variables if needed
    //       if (!contractAddresses) {
    //         contractAddresses = {
    //           feeAndTreasury: process.env.NEXT_PUBLIC_FEE_TREASURY_ADDRESS,
    //           didRegistry: process.env.NEXT_PUBLIC_DID_REGISTRY_ADDRESS,
    //           contentManagement: process.env.NEXT_PUBLIC_CONTENT_MGMT_ADDRESS,
    //           objectLifecycle: process.env.NEXT_PUBLIC_OBJECT_LIFECYCLE_ADDRESS
    //         };
    //       }

    //       // Initialize LiberaBlockchainService
    //       const config = {
    //         rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://ethereum-holesky-rpc.publicnode.com',
    //         signer: signer,
    //         contractAddresses
    //       };

    //       this._liberaService = new LiberaBlockChainService(config);
    //     }

    //     return this._liberaService;
    //   }

    async getStatus() {
        try {
            const provider = await this.getProvider();
            const network = await provider.getNetwork();
            const blockNumber = await provider.getBlockNumber();
            const feeData = await provider.getFeeData();

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
                rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-holesky-rpc.publicnode.com",
                gasPrice: feeData.gasPrice?.toString(),
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
                rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-holesky-rpc.publicnode.com",
                networkName: "Unknown",
                status: "Disconnected",
                isMock: true,
            };
        }
    }

    async getProvider() {
        const { provider } = await this.getProviderAndSigner();
        return provider;
    }

    // Initialize provider and signer
    async getProviderAndSigner() {
        if (typeof window === "undefined") {
            // Server-side rendering - use a provider for the testnet
            const provider = new ethers.JsonRpcProvider(
                process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-holesky-rpc.publicnode.com"
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
                process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-holesky-rpc.publicnode.com"
            );
            return { provider, signer: null, account: null };
        }

        try {
            // Request account access if needed
            await window.ethereum.request({ method: "eth_requestAccounts" });

            // Initialize provider with MetaMask
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const account = await signer.getAddress();

            return { provider, signer, account };
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
            // Fallback to a read-only provider
            const provider = new ethers.JsonRpcProvider(
                process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-holesky-rpc.publicnode.com"
            );
            return { provider, signer: null, account: null };
        }
    }

    async getContract(contractName, withSigner = true, customABI = null) {
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

        const { provider, signer, account } = await this.getProviderAndSigner();
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
    }

    async getCurrentUserAddress() {
        try {
            const { account } = await this.getProviderAndSigner();
            if (!account) {
                console.warn("No account found. User may not be connected to MetaMask.");
                return null;
            }
            return account;
        } catch (error) {
            console.error("Error getting current user address:", error);
            return null;
        }
    }

    /**
     * @type {BlockchainService}
     */
    static instance;

    static getInstance() {
        if (!BlockchainService.instance) {
            BlockchainService.instance = new BlockchainService();
        }
        return BlockchainService.instance;
    }
}

// Export singleton instance
export default BlockchainService.getInstance();
