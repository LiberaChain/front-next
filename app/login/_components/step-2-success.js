"use client";

import { WALLET_TYPE_ETHEREUM } from "@/app/_core/constants";
import { UserCircleCheckIcon } from "@phosphor-icons/react";

export default function LoginSuccess({
  displayName,
  walletAddress,
  didIdentifier,
  walletType,
}) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-600 mb-4">
        <UserCircleCheckIcon className="w-6 h-6 text-white" />
      </div>

      <div>
        <h3 className="text-lg font-medium text-white">
          Verification Successful!
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          You have succesfully proven your decentralized digital identity. You
          can now access your content and interact with the LiberaChain
          ecosystem.
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
        </div>
      </div>
    </div>
  );
}
