"use client";

import { WALLET_TYPE_BROWSER, WALLET_TYPE_ETHEREUM } from "@core/constants";
import { BrowserWallet } from "@core/wallet/browserWallet";
import { EthereumWallet } from "@core/wallet/ethereumWallet";
import { ExclamationMarkIcon } from "@phosphor-icons/react";

export default function IntroStep({ loading, onNext, error }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-white">
          Welcome to LiberaChain
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          LiberaChain uses decentralized identity (DID) technology to give you
          complete control over your digital identity. No email, no password, no
          central authority. You are in charge of your own identity.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/40 p-4">
          <div className="flex">
            <ExclamationMarkIcon
              className="h-5 w-5 text-red-400 mr-2"
              weight="bold"
            />
            <div className="text-sm text-red-400">{error}</div>
          </div>
        </div>
      )}

      <div className="rounded-md bg-gray-700 p-4">
        <h4 className="text-sm font-medium text-white mb-2">
          Choose your preferred authentication method:
        </h4>
        <div className="space-y-4">
          <button
            className="relative rounded-md border border-gray-600 bg-gray-800 p-4 hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:hover:bg-gray-800 text-left"
            onClick={() => onNext(WALLET_TYPE_ETHEREUM)}
            disabled={loading || !EthereumWallet.available()}
          >
            <div className="flex items-start">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-emerald-400 text-center">
                  Crypto Wallet (Recommended)
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  Connect MetaMask or another Ethereum wallet for maximum
                  security. Your wallet will verify your identity through
                  cryptographic signatures.
                </p>
                <ul className="mt-1 list-disc pl-5 space-y-1 text-xs text-gray-400">
                  <li>High security through blockchain cryptography</li>
                  <li>No need to remember passwords</li>
                  <li>Your public key is stored on-chain</li>
                  <li>Private keys never leave your wallet</li>
                </ul>

                {!EthereumWallet.available() && (
                  <p className="mt-2 text-xs text-red-400">
                    MetaMask or another Ethereum wallet is required to use this
                    option. Please install it first.
                  </p>
                )}
              </div>
            </div>
          </button>

          <button
            className="relative rounded-md border border-gray-600 bg-gray-800 p-4 hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:hover:bg-gray-800 text-left"
            disabled={loading}
            onClick={() => onNext(WALLET_TYPE_BROWSER)}
          >
            <div className="flex items-start">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-400 text-center">
                  Browser Wallet (Simple)
                </p>
                <p className="mt-1 text-xs text-gray-300">
                  Create a browser-based wallet without installing any
                  extensions. Less secure but more convenient.
                </p>
                <ul className="mt-1 list-disc pl-5 space-y-1 text-xs text-gray-400">
                  <li>No extensions or additional software needed</li>
                  <li>Recovery phrase provided for backup</li>
                  <li>Keys stored securely in your browser</li>
                  <li>Convenient but less secure than a crypto wallet</li>
                </ul>

                {BrowserWallet.exists() && (
                  <p className="mt-2 text-xs text-yellow-400">
                    An existing browser wallet was found in this browser. You
                    can use it for sign in or create a new one. Continuing will
                    overwrite the existing one.
                  </p>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
