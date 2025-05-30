import { ethers } from "ethers";

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
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545",
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
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545",
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
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
  }

  static getInstance() {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }
}
