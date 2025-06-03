"use client";

import {
  CircleNotchIcon,
  ClipboardIcon,
  ClipboardTextIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

export default function BrowserWalletCreate({
  loading,
  onCreateWallet,
  onBack,
  newWallet,
}) {
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const [copied, setCopied] = useState(false);

  // Format mnemonic to display each word separately
  const formatMnemonic = (mnemonic) => {
    if (!mnemonic) return [];
    return mnemonic.split(" ");
  };

  const handleCopyPhrase = () => {
    if (newWallet?.mnemonic) {
      navigator.clipboard.writeText(newWallet.mnemonic);
      setCopied(true);

      // Reset copied state after 5 seconds
      setTimeout(() => {
        setCopied(false);
      }, 5000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (confirmRecovery) {
      onCreateWallet();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-white">
          Create Browser Wallet
        </h3>
        <p className="mt-1 text-sm text-gray-400">
          This approach creates a cryptographically secure wallet with its keys.
          The wallet is stored only inside your browser on this device, but by
          using the recovery phrase, you can restore it on any device or
          browser.
        </p>
      </div>

      <div className="bg-gray-700 p-5 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-4">
            We've generated a secure browser-based wallet for you. Save your
            recovery phrase now!
          </p>

          {newWallet ? (
            <>
              <div className="text-left mb-4">
                <span className="block text-sm font-medium text-gray-300">
                  Decentralized Identifier (DID):
                </span>
                <code className="text-emerald-400 break-all">
                  {newWallet.generateDid()}
                </code>
              </div>
              <div className="mb-4">
                <div className="text-left mb-2">
                  <span className="block text-sm font-medium text-gray-300">
                    Your Recovery Phrase:
                  </span>
                </div>
                <div className="bg-gray-800 p-3 rounded-md">
                  <div className="grid grid-cols-3 gap-2">
                    {formatMnemonic(newWallet.mnemonic).map((word, index) => (
                      <div key={index} className="p-1 text-center">
                        <span className="text-gray-500 text-xs mr-1 select-none">
                          {index + 1}.
                        </span>
                        <code className="text-emerald-400">{word}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-left">
                  <button
                    onClick={handleCopyPhrase}
                    className={`text-xs flex items-center ${
                      copied
                        ? "text-green-400"
                        : "text-blue-400 hover:text-blue-300"
                    }`}
                  >
                    {copied ? (
                      <>
                        <ClipboardTextIcon size={16} className="mr-1" />
                        Copied to clipboard!
                      </>
                    ) : (
                      <>
                        <ClipboardIcon size={16} className="mr-1" />
                        Copy to clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-md bg-yellow-900/40 p-3 mb-4 text-left">
                <div className="flex">
                  <WarningIcon size={40} className="text-yellow-400 mr-2" />
                  <div className="text-sm text-yellow-300">
                    <strong>Important:</strong> Write down your recovery phrase
                    and store it in a safe place. If you lose it, you'll
                    permanently lose access to your digital identity.
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} disabled={loading}>
                <div className="flex items-center mb-4">
                  <input
                    id="confirm-recovery"
                    type="checkbox"
                    checked={confirmRecovery}
                    onChange={(e) => setConfirmRecovery(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-500 rounded"
                  />
                  <label
                    htmlFor="confirm-recovery"
                    className="ml-2 block text-sm text-gray-300 text-left"
                  >
                    I confirm that I have saved my recovery phrase
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !confirmRecovery}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <CircleNotchIcon className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                      Creating...
                    </>
                  ) : (
                    "Continue with Browser Wallet"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex justify-center">
              <CircleNotchIcon className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </div>

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
