import { ethers } from "ethers";
import { LOCALSTORAGE_LIBERACHAIN_BROWSER_WALLET } from "../constants";

// This provides utilities required for manipulating browser-based wallet. The wallet is stored in localStorage and can be used to sign messages, verify signatures, and recover from a mnemonic phrase.
// This is based on the BIP-39 standard for mnemonic phrases and uses the ethers.js library for cryptographic operations.

export class BrowserWallet {
  constructor(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid wallet data provided");
    }

    this.mnemonic = data.mnemonic;
    this.privateKey = data.privateKey;
    this.publicKey = data.publicKey;
    this.address = data.address;
    this.type = data.type || "browser";
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  toData() {
    return {
      mnemonic: this.mnemonic,
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address,
      type: this.type,
      createdAt: this.createdAt,
    };
  }

  type() {
    return this.type || "browser";
  }

  store() {
    return BrowserWallet.storeData(this.toData());
  }

  getMnemonic() {
    if (!this.mnemonic) {
      throw new Error("Mnemonic not available in this wallet");
    }
    return this.mnemonic;
  }

  generateDid() {
    // Generate a DID based on the public key (address)
    return `did:libera:${this.address}`;
  }

  async sign(message) {
    try {
      const wallet = new ethers.Wallet(this.privateKey);

      return await wallet.signMessage(message);
    } catch (error) {
      console.error("Error signing message:", error);
      throw new Error("Failed to sign message with browser wallet");
    }
  }

  async verifySignature(message, signature) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === this.address.toLowerCase();
    } catch (error) {
      console.error("Error verifying signature:", error);
      return false;
    }
  }

  static exists() {
    try {
      return !!localStorage.getItem(LOCALSTORAGE_LIBERACHAIN_BROWSER_WALLET);
    } catch (error) {
      console.error("Error checking browser wallet existence:", error);
      return false;
    }
  }

  static retrieve() {
    const walletData = localStorage.getItem(
      LOCALSTORAGE_LIBERACHAIN_BROWSER_WALLET
    );
    return walletData ? new BrowserWallet(JSON.parse(walletData)) : null;
  }

  static clear() {
    try {
      localStorage.removeItem(LOCALSTORAGE_LIBERACHAIN_BROWSER_WALLET);
      return true;
    } catch (error) {
      console.error("Error clearing browser wallet:", error);
      return false;
    }
  }

  static storeData(data) {
    try {
      localStorage.setItem(
        LOCALSTORAGE_LIBERACHAIN_BROWSER_WALLET,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      console.error("Error storing browser wallet:", error);
      return false;
    }
  }

  static createNew() {
    try {
      // Use ethers.js to create a new random wallet
      const wallet = ethers.Wallet.createRandom();

      const walletData = {
        mnemonic: wallet.mnemonic.phrase,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        address: wallet.address,
        type: "browser",
        createdAt: new Date().toISOString(),
      };

      return new BrowserWallet(walletData);
    } catch (error) {
      console.error("Error creating browser wallet:", error);
      throw new Error("Failed to create browser wallet");
    }
  }

  static recoverFromMnemonic(mnemonic) {
    try {
      // Use ethers.js to create a wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);

      const walletData = {
        mnemonic: wallet.mnemonic.phrase,
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey,
        address: wallet.address,
        type: "browser",
        createdAt: new Date().toISOString(),
      };

      return new BrowserWallet(walletData);
    } catch (error) {
      console.error("Error recovering browser wallet from mnemonic:", error);
      throw new Error("Failed to recover browser wallet from recovery phrase");
    }
  }
}
