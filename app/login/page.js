"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  initializeProviders,
  checkUserRegistration,
  connectWallet,
  signChallenge,
  verifySignature,
  generateChallenge,
  storeAuthInLocalStorage,
} from "./_utils/loginUtils";
import LoginStart from "./_components/step-0-start";
import DidVerification from "./_components/step-1-verify";
import LoginSuccess from "./_components/step-2-success";

// export const metadata = {
//   title: "Login",
// };

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [didChallenge, setDidChallenge] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userDid, setUserDid] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [blockchainVerification, setBlockchainVerification] = useState({
    verified: false,
    checking: false,
  });

  // Initialize providers when component mounts
  useEffect(() => {
    initializeProviders();
  }, []);

  // Generate challenge when entering verification step
  useEffect(() => {
    if (step === 1 && !didChallenge) {
      setDidChallenge(generateChallenge());
    }
  }, [step, didChallenge]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      setError("");

      const { did, address } = await connectWallet();
      setUserDid(did);
      setWalletAddress(address);
      setIsWalletConnected(true);

      // Verify registration
      setBlockchainVerification({ verified: false, checking: true });
      const verification = await checkUserRegistration(did);
      setBlockchainVerification(verification);

      if (!verification.verified) {
        setError(
          "Your account is not registered on the blockchain. Redirecting to registration..."
        );
        setTimeout(() => {
          router.push("/registration");
        }, 2000);
        return;
      }
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  // Handle DID verification
  const handleDidVerify = async () => {
    if (!isWalletConnected || !userDid) {
      await handleConnectWallet();
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Verify registration if not already verified
      if (!blockchainVerification.verified) {
        const verification = await checkUserRegistration(userDid);
        setBlockchainVerification(verification);
        if (!verification.verified) {
          throw new Error(
            "Account not found on blockchain. Please register first."
          );
        }
      }

      // Sign and verify the challenge
      const signature = await signChallenge(didChallenge);
      const isValid = await verifySignature(
        didChallenge,
        signature,
        walletAddress
      );

      if (!isValid) {
        throw new Error("Signature verification failed");
      }

      // Store authentication and proceed
      storeAuthInLocalStorage(userDid, walletAddress, blockchainVerification);
      setStep(2);

      // Navigate after successful verification
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/dashboard");
    } catch (err) {
      setError(`DID verification failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle QR code authentication
  const handleQrCodeAuth = () => {
    setStep(1);
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
          Sign in with your DID
        </h2>
        <p className="mt-2 text-center text-sm text-gray-100">
          Access your decentralized identity on LiberaChain
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
          {error && (
            <div className="mb-6 rounded-md bg-red-900/40 p-4">
              <div className="flex">
                <div className="text-sm text-red-400">{error}</div>
              </div>
            </div>
          )}

          {step === 0 && (
            <LoginStart
              onConnectWallet={() => {
                setStep(1);
                handleConnectWallet();
              }}
              onQrCodeAuth={handleQrCodeAuth}
            />
          )}

          {step === 1 && (
            <DidVerification
              isWalletConnected={isWalletConnected}
              loading={loading}
              connectWallet={handleConnectWallet}
              blockchainVerification={blockchainVerification}
              userDid={userDid}
              didChallenge={didChallenge}
              handleDidVerify={handleDidVerify}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && <LoginSuccess />}

          {/* Footer info */}
          {step < 2 && (
            <div className="mt-6">
              <p className="text-center text-sm text-gray-300">
                Don&apos;t have a DID yet?
              </p>
              <Link href="/registration" className="mt-2 block">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md border border-emerald-500 py-2 px-4 text-sm font-medium text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-400 transition-colors duration-200 focus:outline-none cursor-pointer"
                >
                  Create your decentralized identity
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
