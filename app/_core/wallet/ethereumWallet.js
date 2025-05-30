import { ethers } from "ethers";
import { Resolver } from "did-resolver";
import { getResolver as getEthrResolver } from "ethr-did-resolver";

const DEBUG_ETH_WALLET = false;

export const ethereumNetworkProviderConfig = {
  name: "holesky",
  chainId: 17000,
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://ethereum-holesky-rpc.publicnode.com",
};
// export const ethereumNetworkProviderConfig = {
//   name: "localhost",
//   rpcUrl: "http://localhost:8545",
// };

export class EthereumWallet {
  constructor() {}

  async getCurrentWalletInfo() {
    if (!EthereumWallet.initialized) {
      EthereumWallet.initialize();
    }

    if (EthereumWallet.web3Provider) {
      if (DEBUG_ETH_WALLET) {
        console.log(
          "EthereumWallet.web3Provider:",
          EthereumWallet.web3Provider
        );
      }

      try {
        const currentAccount = await EthereumWallet.web3Provider.send(
          "eth_accounts",
          []
        );
        if (DEBUG_ETH_WALLET) {
          console.log("Current accounts:", currentAccount);
        }
        if (!currentAccount || currentAccount.length === 0) {
          throw new Error(
            "No Ethereum accounts found. Please connect your wallet."
          );
        }

        const signer = await EthereumWallet.web3Provider.getSigner();
        // const signer = EthereumWallet.provider.getSigner(currentAccount[0]);
        if (DEBUG_ETH_WALLET) {
          console.log("Signer:", signer);
        }
        if (!signer) {
          throw new Error("No signer available. Please connect your wallet.");
        }

        const address = await signer.getAddress();
        if (DEBUG_ETH_WALLET) {
          console.log("Wallet address:", address);
        }
        if (!address) {
          throw new Error("Failed to get wallet address.");
        }

        return { address, web3Provider: EthereumWallet.web3Provider };
      } catch (error) {
        console.error("Error getting current wallet info:", error);
        throw new Error("Failed to get current wallet info. " + error.message);
      }
    }

    return null;
  }

  getGasPrice = async () => {
    if (!EthereumWallet.provider) {
      throw new Error("Provider not initialized. Please connect your wallet.");
    }

    try {
      const gasPrice = (await EthereumWallet.provider.getFeeData()).gasPrice;
      return gasPrice;
    } catch (error) {
      console.error("Error fetching gas price:", error);
      throw error;
    }
  };

  async sign(message) {
    if (!EthereumWallet.web3Provider) {
      throw new Error(
        "Web3 provider not initialized. Please connect your wallet."
      );
    }

    try {
      const signer = await EthereumWallet.web3Provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error("Error signing message:", error);
      throw new Error("Failed to sign message: " + error.message);
    }
  }

  async verifySignature(message, signature) {
    if (!EthereumWallet.web3Provider) {
      throw new Error(
        "Web3 provider not initialized. Please connect your wallet."
      );
    }

    try {
      const signer = await EthereumWallet.web3Provider.getSigner();
      const address = await signer.getAddress();
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error("Error verifying signature:", error);
      return false;
    }
  }

  static available() {
    if (typeof window === "undefined" || !window.ethereum) {
      // No Ethereum provider available
      return false;
    }

    return true;
  }

  static initialized = false;
  static resolver = null;
  static provider = null;
  static web3Provider = null;

  static initialize() {
    if (EthereumWallet.initialized) {
      return; // Already initialized
    }

    EthereumWallet.initialized = true;

    // Initialize DID resolver and ethers provider so they are prepared for use
    try {
      const resolver = new Resolver(
        getEthrResolver({ networks: [ethereumNetworkProviderConfig] })
      );
      const provider = new ethers.JsonRpcProvider(
        ethereumNetworkProviderConfig.rpcUrl,
        "holesky"
      );
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      window.ethereum.enable();

      EthereumWallet.resolver = resolver;
      EthereumWallet.provider = provider;
      EthereumWallet.web3Provider = web3Provider;

      return { resolver, provider, web3Provider };
    } catch (err) {
      console.error("Error initializing blockchain connections:", err);
      return { resolver: null, provider: null, web3Provider: null };
    }
  }

  static retrieve() {
    EthereumWallet.initialize();

    return new EthereumWallet();
  }

  static didFromEthAddress(address) {
    // Generate a DID based on the address
    return `did:ethr:${address}`;
  }
}
