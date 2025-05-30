export class FilebaseIPFSProvider {
  constructor() {
    if (FilebaseIPFSProvider.instance) {
      return FilebaseIPFSProvider.instance;
    }
    FilebaseIPFSProvider.instance = this;
  }

  async getStatus() {
    const host = await this.getHost();
    const apiPort = await this.getApiPort();
    const gatewayPort = await this.getGatewayPort();

    const isConnected =
      Boolean(process.env.NEXT_PUBLIC_IPFS_HOST) &&
      Boolean(process.env.NEXT_PUBLIC_IPFS_API_PORT) &&
      Boolean(process.env.NEXT_PUBLIC_IPFS_GATEWAY_PORT);

    return {
      connected: isConnected,
      gateway: isConnected ? `https://${host}:${gatewayPort}` : "None",
      apiEndpoint: isConnected ? `http://${host}:${apiPort}` : "none",
      nodeType: isConnected ? "IPFS Node" : "Local Mock",
      health: isConnected ? "healthy" : "simulated",
      storageCount: isConnected ? null : getLocalStorageItemCount(),
      state: isConnected ? "IPNS Enabled" : "Local Only",
    };
  }

  async getHost() {
    return process.env.NEXT_PUBLIC_IPFS_HOST || "localhost";
  }

  async getApiPort() {
    return process.env.NEXT_PUBLIC_IPFS_API_PORT || "5001";
  }

  async getGatewayPort() {
    return process.env.NEXT_PUBLIC_IPFS_GATEWAY_PORT || "8080";
  }

  static instance = null;

  static getInstance() {
    if (!FilebaseIPFSProvider.instance) {
      FilebaseIPFSProvider.instance = new FilebaseIPFSProvider();
    }
    return FilebaseIPFSProvider.instance;
  }
}
