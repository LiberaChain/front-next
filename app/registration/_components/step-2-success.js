import { WALLET_TYPE_ETHEREUM } from "@core/constants";
import { UserCircleCheckIcon } from "@phosphor-icons/react";

export default function SuccessStep({
  displayName,
  walletAddress,
  didIdentifier,
  keyPair,
  blockchainVerification,
  onNavigateToDashboard,
  walletType,
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-600">
        <UserCircleCheckIcon className="w-6 h-6 text-white" />
      </div>

      <div>
        <h3 className="text-lg font-medium text-white">
          Registration successful!
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          Your decentralized identity has been{" "}
          {blockchainVerification.verified ? "verified" : "created"}{" "}
          successfully.
        </p>
      </div>

      <div className="rounded-md bg-gray-700 p-4">
        <div className="flex flex-col text-left">
          <span className="text-sm font-medium text-gray-300">
            Display Name (optional):
          </span>
          <span className="text-sm text-emerald-400">
            {displayName || `User-${walletAddress.substring(2, 8)}`}
          </span>

          <span className="mt-2 text-sm font-medium text-gray-300">DID:</span>
          <code className="text-xs text-emerald-400 break-all">
            {didIdentifier}
          </code>

          <span className="mt-2 text-sm font-medium text-gray-300">
            Wallet Type:
          </span>
          <span className="text-xs text-emerald-400">
            {walletType === WALLET_TYPE_ETHEREUM
              ? "Crypto Wallet (Ethereum based)"
              : "Browser-based Wallet"}
          </span>

          {keyPair && (
            <>
              <span className="mt-2 text-sm font-medium text-gray-300">
                Messaging Address:
              </span>
              <code className="text-xs text-emerald-400 break-all">
                {keyPair.address}
              </code>
            </>
          )}

          <div className="mt-4 rounded-md bg-blue-900/30 p-2">
            <p className="text-xs text-blue-300">
              <strong>Important:</strong> Your identity is now securely
              registered on the blockchain.
              {walletType === WALLET_TYPE_ETHEREUM
                ? " Make sure you have backed up your wallet recovery phrase securely!"
                : " Make sure you have saved your browser wallet recovery phrase in a safe place!"}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={onNavigateToDashboard}
          className="inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
