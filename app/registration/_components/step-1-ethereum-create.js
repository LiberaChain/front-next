import { WALLET_TYPE_BROWSER, WALLET_TYPE_ETHEREUM } from "@core/constants";
import { CircleNotchIcon, VaultIcon } from "@phosphor-icons/react";

export default function EthereumWalletCreate({
  didCreated,
  loading,
  onConnectEthWallet,
  didIdentifier,
  blockchainVerification,
  keyPair,
  walletAddress,
  displayName,
  onDisplayNameChange,
  error,
  onBack,
  onNext,
  walletType,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-white">Connect Your Wallet</h3>
        <p className="mt-1 text-sm text-gray-400">
          A decentralized identifier (DID) is a unique identity that you
          control, not any central authority. When using the crypto wallet, need
          to confirm the ownership of the wallet by signing a login request
          message.
        </p>
      </div>

      {walletAddress && (
        <div className="rounded-md bg-gray-700 p-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">
              Available Wallet:{" "}
              <span className="text-emerald-400 font-medium">
                {walletAddress.substring(0, 7)}...{walletAddress.slice(-5)}
              </span>
            </span>
          </div>
        </div>
      )}

      {!didCreated && walletType === WALLET_TYPE_ETHEREUM ? (
        <div className="flex flex-col items-center justify-center py-4">
          <button
            onClick={onConnectEthWallet}
            disabled={loading}
            className="flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <CircleNotchIcon className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                Connecting...
              </>
            ) : (
              <>
                <VaultIcon className="h-5 w-5 mr-2" />
                Connect Wallet (sign a request to prove ownership)
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md bg-gray-700 p-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-300">
                Your DID:
              </span>
              <code className="mt-1 text-xs text-emerald-400 break-all">
                {didIdentifier}
              </code>
              <p className="mt-2 text-xs text-gray-400">
                This is your unique decentralized identifier{" "}
                {walletType === WALLET_TYPE_ETHEREUM
                  ? "derived from your wallet address."
                  : "stored in your browser."}
              </p>
            </div>
          </div>

          {/* Show blockchain verification status for MetaMask users */}
          {walletType === WALLET_TYPE_ETHEREUM && (
            <>
              {blockchainVerification.checking && (
                <div className="rounded-md bg-gray-700 p-4">
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="text-sm text-gray-300">
                      Checking blockchain registration...
                    </span>
                  </div>
                </div>
              )}

              {blockchainVerification.verified &&
                !blockchainVerification.checking && (
                  <div className="rounded-md bg-green-900/30 p-4">
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <span className="text-sm font-medium text-green-400">
                          Wallet ownership verified
                        </span>
                        <p className="text-xs text-gray-300 mt-1">
                          Your identity was verified on{" "}
                          {new Date(
                            blockchainVerification.registrationTime
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}

          {/* Show IPFS badge for browser wallet users */}
          {walletType === WALLET_TYPE_BROWSER && (
            <div className="rounded-md bg-indigo-900/30 p-4">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-indigo-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className="text-sm font-medium text-indigo-400">
                    IPFS Profile Ready
                  </span>
                  <p className="text-xs text-gray-300 mt-1">
                    Your identity will be stored on IPFS decentralized storage
                  </p>
                </div>
              </div>
            </div>
          )}

          {!blockchainVerification.verified &&
            !blockchainVerification.checking &&
            keyPair && (
              <div className="rounded-md bg-gray-700 p-4">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-300">
                    Messaging Key Generated:
                  </span>
                  <code className="mt-1 text-xs text-emerald-400 break-all">
                    {keyPair.address}
                  </code>
                  <p className="mt-2 text-xs text-gray-400">
                    A secure messaging key pair has been generated.
                    {walletType === WALLET_TYPE_ETHEREUM
                      ? "Your public key will be stored on-chain, and your private key will be securely stored in your local wallet."
                      : "Your keys will be securely stored in your browser for encrypted communications."}
                  </p>
                </div>
              </div>
            )}

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-300"
            >
              Display Name (optional)
            </label>
            <div className="mt-1">
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder={`User-${
                  walletAddress ? walletAddress.substring(2, 8) : "XXX"
                }`}
                className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                A human-readable name for your DID. You can change it later, or
                never.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-900/40 p-4">
          <div className="flex">
            <div className="text-sm text-red-400">{error}</div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onNext();
        }}
        className="space-y-6"
      >
        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={
              (!didCreated && walletType === WALLET_TYPE_ETHEREUM) || loading
            }
            className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <CircleNotchIcon className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                {walletType === WALLET_TYPE_BROWSER
                  ? "Completing..."
                  : blockchainVerification.verified
                  ? "Completing..."
                  : "Registering on Blockchain..."}
              </>
            ) : walletType === WALLET_TYPE_BROWSER ? (
              "Complete Registration"
            ) : blockchainVerification.verified ? (
              "Complete Registration"
            ) : (
              "Register on Blockchain"
            )}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-center">
        <button
          type="button"
          className="text-sm text-emerald-500 hover:text-emerald-400"
          onClick={onBack}
          disabled={loading}
        >
          Back to options
        </button>
      </div>
    </div>
  );
}
