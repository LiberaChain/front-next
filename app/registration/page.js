"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  initializeProviders,
  connectWallet,
  verifyAndGenerateKeys,
  registerOnBlockchain,
  storeIdentityAndAuth,
} from "./_utils/registrationUtils";
import IntroStep from "./_components/step-0-intro";
import CreateDidStep from "./_components/step-1-create";
import SuccessStep from "./_components/step-2-success";

export default function Registration() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [didIdentifier, setDidIdentifier] = useState("");
  const [didCreated, setDidCreated] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [keyPair, setKeyPair] = useState(null);
  const [blockchainVerification, setBlockchainVerification] = useState({
    verified: false,
    checking: false,
  });

  // Initialize providers when component mounts
  useEffect(() => {
    initializeProviders();
  }, []);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      setError("");

      // Connect wallet and get DID
      const { did, address } = await connectWallet();
      setDidIdentifier(did);
      setWalletAddress(address);

      // Verify registration and generate keys if needed
      const verificationResult = await verifyAndGenerateKeys(did);
      setBlockchainVerification({
        verified: verificationResult.verified,
        checking: false,
        registrationTime: verificationResult.registrationTime,
        publicKey: verificationResult.publicKey,
      });

      if (verificationResult.keyPair) {
        setKeyPair(verificationResult.keyPair);
      }

      setDidCreated(true);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  // Handle registration completion
  const handleRegistration = async () => {
    if (!didCreated) {
      setError(
        "Please connect your wallet to create your decentralized identity"
      );
      return;
    }

    try {
      setLoading(true);

      // If already registered, just store identity data
      if (blockchainVerification.verified) {
        await storeIdentityAndAuth(
          didIdentifier,
          displayName,
          walletAddress,
          keyPair
        );
        setStep(2);
        return;
      }

      // Register on blockchain if needed
      if (keyPair) {
        await registerOnBlockchain(keyPair, didIdentifier);
      } else {
        throw new Error("Communication keys were not generated properly");
      }

      // Store identity data
      await storeIdentityAndAuth(
        didIdentifier,
        displayName,
        walletAddress,
        keyPair
      );

      setStep(2);
    } catch (err) {
      setError(`Registration failed: ${err.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/logo.svg"
            alt="LiberaChain Logo"
            width={80}
            height={80}
            className="mx-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Create your decentralized identity
        </h2>
        <p className="mt-2 text-center text-sm text-gray-100">
          Join the decentralized web with your own sovereign identity
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
          {/* Step indicators */}
          <div className="flex items-center justify-center mb-8">
            <div
              className={`h-2 w-2 rounded-full ${
                step >= 0 ? "bg-emerald-500" : "bg-gray-600"
              }`}
            ></div>
            <div
              className={`h-0.5 w-12 ${
                step >= 1 ? "bg-emerald-500" : "bg-gray-600"
              }`}
            ></div>
            <div
              className={`h-2 w-2 rounded-full ${
                step >= 1 ? "bg-emerald-500" : "bg-gray-600"
              }`}
            ></div>
            <div
              className={`h-0.5 w-12 ${
                step >= 2 ? "bg-emerald-500" : "bg-gray-600"
              }`}
            ></div>
            <div
              className={`h-2 w-2 rounded-full ${
                step >= 2 ? "bg-emerald-500" : "bg-gray-600"
              }`}
            ></div>
          </div>

          {/* Step content */}
          {step === 0 && <IntroStep error={error} onNext={() => setStep(1)} />}

          {step === 1 && (
            <CreateDidStep
              didCreated={didCreated}
              loading={loading}
              onConnectWallet={handleConnectWallet}
              didIdentifier={didIdentifier}
              blockchainVerification={blockchainVerification}
              keyPair={keyPair}
              walletAddress={walletAddress}
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              error={error}
              onBack={() => setStep(0)}
              onNext={handleRegistration}
            />
          )}

          {step === 2 && (
            <SuccessStep
              displayName={displayName}
              walletAddress={walletAddress}
              didIdentifier={didIdentifier}
              keyPair={keyPair}
              blockchainVerification={blockchainVerification}
              onNavigateToDashboard={() => router.push("/dashboard")}
            />
          )}

          {/* Footer info */}
          <div className="mt-8">
            <p className="text-center text-xs text-gray-500">
              By creating a DID, you retain full control of your identity
              through decentralized blockchain technology.
            </p>
            {step < 2 && (
              <div className="mt-4">
                <p className="text-center text-sm text-gray-300">
                  Already have a LiberaChain DID?
                </p>
                <Link href="/registration" className="mt-2 block">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-emerald-500 py-2 px-4 text-sm font-medium text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-400 transition-colors duration-200 focus:outline-none cursor-pointer"
                  >
                    Sign in
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
