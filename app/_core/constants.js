export const LOCALSTORAGE_LIBREACHAIN_AUTH = "liberaChainAuth";
export const LOCALSTORAGE_LIBREACHAIN_IDENTITY = "liberaChainIdentity";
// export const LOCALSTORAGE_LIBREACHAIN_MESSAGING_KEYS = "liberaChainMessagingKeys";
export const LOCALSTORAGE_LIBERACHAIN_BROWSER_WALLET =
  "liberaChainBrowserWallet";

export const WALLET_TYPE_ETHEREUM = "ethereum";
export const WALLET_TYPE_BROWSER = "browser";

export const WALLET_SIGNING_MESSAGE = (did) =>
  `Signing this message verifies the ownership of digital identity: ${did}. This proves the ownership of this DID and access to LiberaChain under this identity.`;
