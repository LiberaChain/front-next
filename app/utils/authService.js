export async function isLoggedIn() {
  try {
    // Check all required auth items
    const liberaChainAuth = localStorage.getItem("liberaChainAuth");
    const liberaChainIdentity = localStorage.getItem("liberaChainIdentity");
    const messagingKeys = localStorage.getItem("liberaChainMessagingKeys");

    if (!liberaChainAuth || !liberaChainIdentity || !messagingKeys) {
      console.error("Missing required auth items:", {
        hasAuth: !!liberaChainAuth,
        hasIdentity: !!liberaChainIdentity,
        hasKeys: !!messagingKeys,
      });
      return false;
    }

    // Check if auth has expired
    const auth = JSON.parse(liberaChainAuth);
    if (auth.expiry && auth.expiry < Date.now()) {
      console.error("Auth has expired");
      localStorage.removeItem("liberaChainAuth");

      return false;
    }

    return true;
  } catch (error) {
    console.error("Auth check error:", error);

    return false;
  }
}
