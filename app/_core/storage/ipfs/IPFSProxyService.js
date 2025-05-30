export class IPFSProxyService {
  constructor() {
    if (IPFSProxyService.instance) {
      return IPFSProxyService.instance;
    }

    this.initialized = false;

    IPFSProxyService.instance = this;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
  }

  async getStatus() {
    const isConnected = true;

    return {
      connected: isConnected,
      state: "Connected",
      mode: isConnected ? "distributed" : "local_storage",
      gateway: isConnected ? this.getS3Gateway() : "mock (localStorage)",
      apiEndpoint: isConnected ? "S3-compatible API" : "none",
      nodeType: isConnected ? "Filebase S3" : "Local Mock",
      health: isConnected ? "healthy" : "simulated",
      storageCount: isConnected ? null : this.getLocalStorageItemCount(),
    };
  }

  getS3Gateway() {
    return process.env.NEXT_PUBLIC_S3_GATEWAY || "https://s3.filebase.com";
  }

  getLocalStorageItemCount() {
    return localStorage.length || 0;
  }

  async uploadFile(file) {
    return await this.ipfsService.uploadFile(file);
  }

  static instance = null;

  static getInstance() {
    if (!IPFSProxyService.instance) {
      IPFSProxyService.instance = new IPFSProxyService();
    }
    return IPFSProxyService.instance;
  }
}
