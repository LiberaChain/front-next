import {
  LOCALSTORAGE_LIBREACHAIN_AUTH,
  LOCALSTORAGE_LIBREACHAIN_IDENTITY,
  WALLET_TYPE_ETHEREUM,
} from "@core/constants";

const DEBUG_LOGIN = false;

export class AuthData {
  constructor(authData) {
    this.did = authData.did || null;
    this.expiry = authData.expiry || Date.now() + 24 * 60 * 60 * 1000; // Default to 24 hours
    this.walletAddress = authData.walletAddress || null;
    this.walletType = authData.walletType || WALLET_TYPE_ETHEREUM;
    this.verified = authData.verified || false;
  }

  save() {
    Auth.saveAuthData({
      did: this.did,
      expiry: this.expiry,
      walletAddress: this.walletAddress,
      walletType: this.walletType,
      verified: this.verified,
    });
  }
}

export class IdentityData {
  constructor(identityData) {
    this.did = identityData.did || null;
    this.displayName =
      identityData.displayName ||
      `User-${Math.random().toString(36).substring(2, 8)}`;
    this.walletAddress = identityData.walletAddress || null;
    this.walletType = identityData.walletType || WALLET_TYPE_ETHEREUM;
    this.createdAt = identityData.createdAt || new Date().toISOString();
    // this.messagingKeyAddress = identityData.messagingKeyAddress || null;
    this.blockchainVerified = identityData.blockchainVerified || false;
    this.signature = identityData.signature || null;
  }

  save() {
    Auth.saveIdentityData({
      did: this.did,
      displayName: this.displayName,
      walletAddress: this.walletAddress,
      walletType: this.walletType,
      createdAt: this.createdAt,
      // messagingKeyAddress: this.messagingKeyAddress,
      blockchainVerified: this.blockchainVerified,
      signature: this.signature,
    });
  }
}

export class Auth {
  static getAuthData() {
    try {
      const authData = localStorage.getItem(LOCALSTORAGE_LIBREACHAIN_AUTH);
      if (!authData) {
        return null;
      }

      try {
        return JSON.parse(authData);
      } catch (parseError) {
        console.error("Error parsing auth data:", parseError, authData);
        return null;
      }
    } catch (error) {
      console.error("Error retrieving auth data:", error);
      return null;
    }
  }

  static getAuth() {
    const authData = Auth.getAuthData();
    if (!authData) {
      console.error("No auth data found");
      return null;
    }
    // Create and return an AuthData instance
    return new AuthData(authData);
  }

  static saveAuthData(authData) {
    if (!authData || typeof authData !== "object") {
      console.error("Invalid auth data provided:", authData);
      return false;
    }

    // Store in localStorage
    localStorage.setItem(
      LOCALSTORAGE_LIBREACHAIN_AUTH,
      JSON.stringify(authData)
    );

    return true;
  }

  static getIdentityData() {
    try {
      const identityData = localStorage.getItem(
        LOCALSTORAGE_LIBREACHAIN_IDENTITY
      );
      if (!identityData) {
        return null;
      }

      try {
        return JSON.parse(identityData);
      } catch (parseError) {
        console.error("Error parsing identity data:", parseError, identityData);
        return null;
      }
    } catch (error) {
      console.error("Error retrieving identity data:", error);
      return null;
    }
  }

  static getIdentity() {
    const identityData = Auth.getIdentityData();
    if (!identityData) {
      console.error("No identity data found");
      return null;
    }

    // Create and return an IdentityData instance
    return new IdentityData(identityData);
  }

  static saveIdentityData(identityData) {
    if (!identityData || typeof identityData !== "object") {
      console.error("Invalid identity data provided:", identityData);
      return false;
    }

    // Store in localStorage
    localStorage.setItem(
      LOCALSTORAGE_LIBREACHAIN_IDENTITY,
      JSON.stringify(identityData)
    );

    return true;
  }

  static clearAuthData(removeIdentity = false) {
    try {
      localStorage.removeItem(LOCALSTORAGE_LIBREACHAIN_AUTH);
      if (removeIdentity) {
        localStorage.removeItem(LOCALSTORAGE_LIBREACHAIN_IDENTITY);
      }
      // localStorage.removeItem(LOCALSTORAGE_LIBREACHAIN_MESSAGING_KEYS);
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  }

  static isLoggedIn() {
    try {
      // Check all required auth items
      const liberaChainAuth = Auth.getAuthData();
      const liberaChainIdentity = Auth.getIdentityData();

      if (!liberaChainAuth || !liberaChainIdentity) {
        if (DEBUG_LOGIN) {
          console.error("Missing required auth items:", {
            hasAuth: !!liberaChainAuth,
            hasIdentity: !!liberaChainIdentity,
          });
        }
        return false;
      }

      // Check if auth has expired
      if (liberaChainAuth.expiry && liberaChainAuth.expiry < Date.now()) {
        console.error("Auth has expired, removing auth data");
        localStorage.removeItem(LOCALSTORAGE_LIBREACHAIN_AUTH);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Auth check error:", error);
      return false;
    }
  }
}
