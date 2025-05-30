"use client";

import { EthereumWallet } from "@core/wallet/ethereumWallet";
import {
  connectWallet,
  checkUserRegistration,
  generateChallenge,
  signChallenge,
  verifySignature,
  storeAuthInLocalStorage,
} from "@core/auth/login";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoginOptions from "./step-0-start";
import LoginSuccess from "./step-2-success";
import BrowserWalletRecoverVerification from "./step-1-browser-recover-verify";
import StepIndicator from "@components/StepIndicator";
import { BrowserWallet } from "@core/wallet/browserWallet";
import {
  WALLET_SIGNING_MESSAGE,
  WALLET_TYPE_BROWSER,
  WALLET_TYPE_ETHEREUM,
} from "@core/constants";
import EthereumWalletVerification from "./step-1-ethereum-verify";
import { AuthData, IdentityData } from "@/app/_core/auth";

export default function LoginFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authOption, setAuthOption] = useState(null); // 'ethereum', 'browser', 'browser-recover'

  // User state
  const [walletConnected, setWalletConnected] = useState(false);
  let [userDid, setUserDid] = useState("");
  let [walletAddress, setWalletAddress] = useState("");
  const [didChallenge, setDidChallenge] = useState("");
  const [blockchainVerification, setBlockchainVerification] = useState({
    verified: false,
    checking: false,
  });
  const [ethereumWalletExists, setEthereumWalletExists] = useState(false);
  const [browserWalletAvailable, setBrowserWalletAvailable] = useState(false);
  let [signature, setSignature] = useState(null);
  let [walletType, setWalletType] = useState(null);

  // Initialize providers when component mounts
  useEffect(() => {
    EthereumWallet.initialize();
    setEthereumWalletExists(EthereumWallet.available());
    setBrowserWalletAvailable(BrowserWallet.exists());
  }, []);

  const restartProcess = () => {
    setStep(0);
    setWalletConnected(false);
    setUserDid("");
    setWalletAddress("");
    setDidChallenge("");
    setBlockchainVerification({
      verified: false,
      checking: false,
    });
  };

  const handleAuthMethodSelect = async (method) => {
    setLoading(true);
    setAuthOption(method);
    setError("");

    try {
      if (method === WALLET_TYPE_ETHEREUM) {
        // Initialize wallet info
        const wallet = EthereumWallet.retrieve();
        const { address } = await wallet.getCurrentWalletInfo();
        const did = EthereumWallet.didFromEthAddress(address);
        setWalletAddress(address);
        setWalletType(WALLET_TYPE_ETHEREUM);
        setUserDid(did);
      } else if (method === WALLET_TYPE_BROWSER) {
        // Initialize browser wallet
        const browserWallet = BrowserWallet.retrieve();
        const did = browserWallet.generateDid();
        setWalletAddress(browserWallet.address);
        setWalletType(WALLET_TYPE_BROWSER);
        setUserDid(did);

        return await handleBrowserWalletLoad();
      } else if (method === "browser-recover") {
        setWalletType(WALLET_TYPE_BROWSER);
      }

      setStep(1);
    } catch (err) {
      console.error("Error selecting auth method:", err);
      setError(err.message || "Failed to select authentication method");
    } finally {
      setLoading(false);
    }
  };

  // Handle wallet connection
  const handleConnectEthereumWallet = async () => {
    try {
      setLoading(true);
      setError("");
      setWalletType(WALLET_TYPE_ETHEREUM);

      // Connect wallet
      const wallet = EthereumWallet.retrieve();
      const { address } = await wallet.getCurrentWalletInfo();
      const did = EthereumWallet.didFromEthAddress(address);
      setWalletAddress(address);
      setUserDid(did);

      setBlockchainVerification({
        verified: false,
        checking: true,
      });

      const signingRequest = WALLET_SIGNING_MESSAGE(did);
      const signature = await wallet.sign(signingRequest);

      if (!signature) {
        throw new Error("Failed to sign message. Please try again.");
      }

      // Verify the signature
      const isValid = await wallet.verifySignature(signingRequest, signature);
      if (!isValid) {
        throw new Error("Signature verification failed. Please try again.");
      }

      setSignature(signature);
      setBlockchainVerification({
        verified: true,
        checking: false,
        registrationTime: new Date().toISOString(),
      });
      setWalletConnected(true);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  // Handle browser wallet loading
  const handleBrowserWalletLoad = async () => {
    try {
      setLoading(true);
      setWalletType(WALLET_TYPE_BROWSER);
      setError("");

      // Verify browser wallet with recovery phrase
      const wallet = BrowserWallet.retrieve();
      if (!wallet) {
        throw new Error(
          "Browser wallet not found. Please ensure the browser wallet is present and you have not cleared your browser data."
        );
      }

      const did = wallet.generateDid();
      const address = wallet.address;

      setUserDid(did);
      setWalletAddress(address);

      // Try to verify the wallet signature capability
      const signingRequest = WALLET_SIGNING_MESSAGE(did);
      const signature = await wallet.sign(signingRequest);
      if (!signature) {
        throw new Error(
          "Failed to sign the verification message using the browser wallet. The wallet might be corrupted or not properly initialized."
        );
      }

      const isValid = await wallet.verifySignature(
        signingRequest,
        signature,
        address
      );
      if (!isValid) {
        throw new Error(
          "Invalid signature from browser wallet. The wallet might be corrupted or not properly initialized."
        );
      }

      setSignature(signature);

      // Successful recovery, store the wallet data
      wallet.store();

      // Proceed to success step
      await handleLogin();
    } catch (err) {
      console.error("Error loading browser wallet:", err);
      setError(err.message || "Failed to load browser wallet");
    } finally {
      setLoading(false);
    }
  };

  // Handle browser wallet recovery
  const handleBrowserWalletRecover = async (recoveryPhrase) => {
    try {
      setLoading(true);
      walletType = WALLET_TYPE_BROWSER;
      setWalletType(WALLET_TYPE_BROWSER);
      setError("");

      // Verify browser wallet with recovery phrase
      const wallet = BrowserWallet.recoverFromMnemonic(recoveryPhrase);
      if (!wallet) {
        throw new Error(
          "Invalid recovery phrase or wallet could not be recovered from that phrase. Check for any mistakes."
        );
      }

      const did = wallet.generateDid();
      const address = wallet.address;

      userDid = did;
      walletAddress = address;
      setUserDid(did);
      setWalletAddress(address);

      // Try to verify the wallet signature capability
      const signingRequest = WALLET_SIGNING_MESSAGE(did);
      const signature = await wallet.sign(signingRequest);
      if (!signature) {
        throw new Error(
          "Failed to sign the verification message using the recovered wallet. Check the recovery phrase."
        );
      }

      const isValid = await wallet.verifySignature(
        signingRequest,
        signature,
        address
      );
      if (!isValid) {
        throw new Error(
          "Invalid signature from recovered wallet. Check the recovery phrase."
        );
      }

      setSignature(signature);

      // Successful recovery, store the wallet data
      wallet.store();

      // Proceed to success step
      await handleLogin();
    } catch (err) {
      console.error("Error recovering browser wallet:", err);
      setError(err.message || "Failed to recover browser wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (
      walletType !== WALLET_TYPE_BROWSER &&
      walletType !== WALLET_TYPE_ETHEREUM
    ) {
      setError(
        "Unsupported wallet type for login. Please use a browser or Ethereum wallet."
      );
      return;
    }

    // Save into local storage
    const authData = new AuthData({
      did: userDid,
      expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      walletAddress: walletAddress,
      walletType: walletType,
      // verified: blockchainVerification.verified,
    });
    authData.save();

    const displayName = null;

    const identityData = new IdentityData({
      did: userDid,
      displayName: displayName || `User-${walletAddress.substring(2, 8)}`,
      walletAddress: walletAddress,
      walletType: walletType,
      createdAt: new Date().toISOString(),
      // blockchainVerified: blockchainVerification.verified,
      signature: signature || null,
    });
    identityData.save();

    setStep(2);
  };

  // Handle navigation after successful login
  const handleNavigateToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg md:max-w-2xl">
      <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
        <StepIndicator step={step} count={3} />

        {/* Step content */}
        {step === 0 && (
          <LoginOptions
            loading={loading}
            onMethodSelect={handleAuthMethodSelect}
            browserWalletAvailable={browserWalletAvailable}
            ethereumWalletAvailable={ethereumWalletExists}
          />
        )}

        {step === 1 && authOption === WALLET_TYPE_ETHEREUM && (
          <EthereumWalletVerification
            isWalletConnected={walletConnected}
            loading={loading}
            connectWallet={handleConnectEthereumWallet}
            blockchainVerification={blockchainVerification}
            walletAddress={walletAddress}
            userDid={userDid}
            didChallenge={didChallenge}
            onNext={handleLogin}
            onBack={restartProcess}
            error={error}
            displayName={null}
          />
        )}

        {step === 1 && authOption === "browser-recover" && (
          <BrowserWalletRecoverVerification
            loading={loading}
            onRecover={handleBrowserWalletRecover}
            error={error}
            onBack={restartProcess}
          />
        )}

        {step === 2 && (
          <LoginSuccess
            displayName={""}
            walletAddress={walletAddress}
            didIdentifier={userDid}
            walletType={authOption}
          />
        )}

        {/* Footer */}
        <div className="mt-8">
          <p className="text-center text-xs text-gray-500">
            By signing in, you're accessing your decentralized identity via
            secure blockchain authentication.
          </p>
          {step === 2 && (
            <div className="mt-4">
              <button
                onClick={handleNavigateToDashboard}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        {step < 2 && (
          <div className="mt-12">
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
  );
}
