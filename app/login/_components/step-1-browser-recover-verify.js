"use client";

import { CircleNotchIcon, InfoIcon } from "@phosphor-icons/react";
import { ethers } from "ethers";
import { useState, useEffect } from "react";

export default function BrowserWalletRecoverVerification({
  loading,
  onRecover,
  onBack,
  error,
}) {
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [isPasting, setIsPasting] = useState(false);
  const [isValidMnemonic, setIsValidMnemonic] = useState(false);

  // Track word count for visual feedback
  useEffect(() => {
    const words = recoveryPhrase.trim()
      ? recoveryPhrase.trim().split(/\s+/)
      : [];
    setWordCount(words.length);

    if (words.length === 12) {
      // Check if the recovery phrase is a valid mnemonic
      try {
        setIsValidMnemonic(
          ethers.Mnemonic.isValidMnemonic(recoveryPhrase.trim())
        );
      } catch (error) {
        setIsValidMnemonic(false);
      }
    }
  }, [recoveryPhrase]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onRecover(recoveryPhrase.trim());
  };

  const handlePaste = () => {
    setIsPasting(true);
    setTimeout(() => setIsPasting(false), 500);
  };

  // Word count indicator color
  const getWordCountColor = () => {
    if (wordCount === 12) return "text-green-400";
    if (wordCount > 0) return "text-yellow-400";
    return "text-gray-400";
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-center text-white">
          Recover Browser Wallet
        </h3>
        <p className="text-sm text-gray-400">
          You can import your existing identity by entering your 12-word
          recovery phrase. This will restore your browser-based wallet and allow
          you to access your decentralized identity.
        </p>
      </div>

      <div className="bg-gray-700 p-5 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-300 mb-4">
            Enter your recovery phrase to restore your browser-based wallet
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="recoveryPhrase"
                  className="block text-sm font-medium text-gray-300 text-left"
                >
                  Recovery Phrase
                </label>
                <span className={`text-xs font-medium ${getWordCountColor()}`}>
                  {wordCount}/12 words
                </span>
              </div>

              <div
                className={`relative transition-all duration-200 ${
                  isPasting ? "border-2 border-blue-500 rounded-md" : ""
                }`}
              >
                <textarea
                  id="recoveryPhrase"
                  value={recoveryPhrase}
                  onChange={(e) => setRecoveryPhrase(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Enter your 12-word recovery phrase"
                  className="bg-gray-800 text-white w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-400 text-left">
                  Enter all 12 words separated by spaces
                </p>
                <button
                  type="button"
                  onClick={() => setRecoveryPhrase("")}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="rounded-md bg-gray-800/50 p-3 mb-4 text-left">
              <div className="flex">
                <InfoIcon size={20} className="text-blue-400 mr-2" />
                <p className="text-xs text-blue-300">
                  Make sure to enter the words in the correct order, with spaces
                  between them.
                </p>
              </div>
            </div>

            {(!isValidMnemonic && wordCount >= 12 || wordCount > 12) && (
              <div className="rounded-md bg-yellow-900/30 p-3 mb-4 text-yellow-400 text-sm text-left">
                <div className="flex items-center space-x-2">
                  <InfoIcon size={40} className="text-yellow-400 mr-2" />
                  The recovery phrase you entered does not appear to be a valid
                  mnemonic for recovering a wallet. Please check the words and
                  try again.
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-900/30 p-3 mb-4 text-red-400 text-sm text-center">
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || wordCount !== 12}
              className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircleNotchIcon className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" />
                  Recovering...
                </>
              ) : (
                "Recover Wallet"
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <button
          type="button"
          className="text-sm text-emerald-500 hover:text-emerald-400"
          onClick={onBack}
        >
          Back to login options
        </button>
      </div>
    </div>
  );
}
