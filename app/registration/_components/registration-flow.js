"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EthereumWallet } from "@core/wallet/ethereumWallet";
import { BrowserWallet } from "@core/wallet/browserWallet";
import StepIndicator from "@components/StepIndicator";
import IntroStep from "./step-0-intro";
import EthereumWalletCreate from "./step-1-ethereum-create";
import BrowserWalletCreate from "./step-1-browser-create";
import SuccessStep from "./step-2-success";
import {
    WALLET_SIGNING_MESSAGE,
    WALLET_TYPE_BROWSER,
    WALLET_TYPE_ETHEREUM,
} from "@core/constants";
import { AuthData, IdentityData } from "@core/auth";
import { Profiles } from "@/app/_core/libera/Profiles";

export default function RegistrationFlow() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [walletType, setWalletType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [didIdentifier, setDidIdentifier] = useState("");
    let [didCreated, setDidCreated] = useState(false);
    const [walletAddress, setWalletAddress] = useState("");
    const [keyPair, setKeyPair] = useState(null);
    const [newBrowserWallet, setNewBrowserWallet] = useState(null);
    const [blockchainVerification, setBlockchainVerification] = useState({
        verified: false,
        checking: false,
    });
    const [signature, setSignature] = useState(null);

    // Initialize providers when component mounts
    useEffect(() => {
        EthereumWallet.initialize();
    }, []);

    const restartProcess = () => {
        setStep(0);
        setWalletType(null);
        setNewBrowserWallet(null);
        setDidCreated(false);
        setDidIdentifier("");
        setWalletAddress("");
    };

    // Handle wallet connection (MetaMask)
    const handleConnectEthWallet = async () => {
        try {
            setLoading(true);
            setError("");
            setWalletType(WALLET_TYPE_ETHEREUM);

            // Connect wallet and get DID
            const wallet = EthereumWallet.retrieve();
            const { address } = await wallet.getCurrentWalletInfo();
            const did = EthereumWallet.didFromEthAddress(address);
            setWalletAddress(address);
            setDidIdentifier(did);

            // Verify ownership of the wallet and generate keys if needed
            setBlockchainVerification({ verified: false, checking: true });

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
            setDidCreated(true);
            setBlockchainVerification({
                verified: true,
                checking: false,
                registrationTime: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Error connecting wallet:", err);
            if (err.message.includes("Already processing")) {
                setError(
                    "Wallet connection already in progress. Please wait. Also try checking if the wallet provider (e.g. MetaMask) does not have any pending requests and is logged in properly."
                );
                return;
            }
            setError(err.message || "Failed to connect wallet");
        } finally {
            setLoading(false);
        }
    };

    // Handle browser wallet finalization after user confirms recovery phrase
    const handleFinalizeBrowserWallet = async () => {
        try {
            setLoading(true);
            setError("");
            if (!newBrowserWallet) {
                throw new Error("Browser wallet creation failed");
            }

            // Store wallet in browser local storage
            newBrowserWallet.store();

            const did = newBrowserWallet.generateDid();
            setDidIdentifier(did);
            setWalletAddress(newBrowserWallet.address);

            // Create signature for DID verification
            const signingRequest = WALLET_SIGNING_MESSAGE(did);
            const signature = await newBrowserWallet.sign(signingRequest);
            if (!signature) {
                throw new Error("Failed to sign message. Please try again.");
            }

            // Verify the signature
            const isValid = await newBrowserWallet.verifySignature(
                signingRequest,
                signature
            );
            if (!isValid) {
                throw new Error("Signature verification failed. Please try again.");
            }

            didCreated = true;
            setDidCreated(true);
            setSignature(signature);

            await handleRegistration();
        } catch (err) {
            setError(err.message || "Failed to set up browser wallet");
        } finally {
            setLoading(false);
        }
    };

    // Handle registration completion
    const handleRegistration = async () => {
        if (!didCreated) {
            console.error("DID not created yet");
            setError(
                "Please connect your wallet or create a browser wallet to continue"
            );
            return;
        }

        try {
            setLoading(true);

            // Final process is to save the identity and auth data into local storage, submit the signed identity request to IPFS, and register on the blockchain if needed.

            if (walletType === WALLET_TYPE_BROWSER) {
                if (!newBrowserWallet) {
                    throw new Error("Browser wallet not created properly");
                }

                newBrowserWallet.store();
            }

            // Save into local storage
            const authData = new AuthData({
                did: didIdentifier,
                expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                walletAddress: walletAddress,
                walletType: walletType || WALLET_TYPE_ETHEREUM,
                verified: blockchainVerification.verified,
            });
            authData.save();

            const identity = {
                did: didIdentifier,
                displayName: displayName || `User-${walletAddress.substring(2, 8)}`,
                walletAddress: walletAddress,
                walletType: walletType || WALLET_TYPE_ETHEREUM,
                createdAt: new Date().toISOString(),
                blockchainVerified: blockchainVerification.verified,
                signature: signature || null,
            };
            const identityData = new IdentityData(identity);
            identityData.save();

            // Store on IPFS
            try {
                const profileEtag = await Profiles.saveProfile(didIdentifier, identity);
                if (!profileEtag) {
                    throw new Error("Failed to upload profile to IPFS");
                }
            } catch (ipfsError) {
                console.error("IPFS upload error:", ipfsError);
                setError(`Failed to upload profile to IPFS: ${ipfsError.message}`);
                return;
            }

            setStep(2);
        } catch (err) {
            console.error("Registration error:", err);
            setError(`Registration failed: ${err.message || "Please try again."}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg md:max-w-2xl">
            <div className="bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-700">
                <StepIndicator step={step} count={3} />

                {/* Step content */}
                {step === 0 && walletType === null && (
                    <IntroStep
                        loading={loading}
                        error={error}
                        onNext={async (walletType) => {
                            setWalletType(walletType);

                            if (walletType === WALLET_TYPE_BROWSER) {
                                // Requires some more setting up

                                // Handle browser wallet creation
                                try {
                                    setLoading(true);
                                    setError("");

                                    // Generate a new browser wallet
                                    const wallet = BrowserWallet.createNew();
                                    setNewBrowserWallet(wallet);
                                    setDidIdentifier(wallet.generateDid());
                                    setWalletAddress(wallet.address);
                                } catch (err) {
                                    console.error("Error creating browser wallet:", err);
                                    setError(err.message || "Failed to create browser wallet");
                                    restartProcess();
                                    return;
                                } finally {
                                    setLoading(false);
                                }
                            } else if (walletType === WALLET_TYPE_ETHEREUM) {
                                // For Ethereum wallet, we will try obtaining the current wallet data
                                try {
                                    setLoading(true);
                                    setError("");

                                    const wallet = EthereumWallet.retrieve();
                                    const walletInfo = await wallet.getCurrentWalletInfo();

                                    if (!walletInfo) {
                                        throw new Error(
                                            "No Ethereum wallet found. Please try checking if your wallet provider is loaded correctly."
                                        );
                                    }

                                    setWalletAddress(walletInfo.address);
                                } catch (err) {
                                    console.error("Error retrieving Ethereum wallet:", err);
                                    setError(err.message || "Failed to retrieve Ethereum wallet");
                                    restartProcess();
                                    return;
                                } finally {
                                    setLoading(false);
                                }
                            }

                            setStep(1);
                        }}
                    />
                )}

                {step === 1 && walletType === WALLET_TYPE_BROWSER && (
                    <BrowserWalletCreate
                        loading={loading}
                        newWallet={newBrowserWallet}
                        error={error}
                        onCreateWallet={handleFinalizeBrowserWallet}
                        onBack={restartProcess}
                    />
                )}

                {step === 1 && walletType == WALLET_TYPE_ETHEREUM && (
                    <EthereumWalletCreate
                        didCreated={didCreated}
                        loading={loading}
                        onConnectEthWallet={
                            walletType === WALLET_TYPE_ETHEREUM
                                ? handleConnectEthWallet
                                : null
                        }
                        didIdentifier={didIdentifier}
                        blockchainVerification={blockchainVerification}
                        keyPair={keyPair}
                        walletAddress={walletAddress}
                        displayName={displayName}
                        onDisplayNameChange={setDisplayName}
                        error={error}
                        onBack={restartProcess}
                        onNext={handleRegistration}
                        walletType={walletType}
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
                        walletType={walletType}
                    />
                )}

                {/* Footer info */}
                <div className="mt-12">
                    <p className="text-center text-xs text-gray-500">
                        By creating a DID, you retain full control of your identity through
                        decentralized blockchain technology.
                    </p>
                    {step < 2 && (
                        <div className="mt-4">
                            <p className="text-center text-sm text-gray-300">
                                Already have a LiberaChain DID?
                            </p>
                            <Link href="/login" className="mt-2 block">
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
    );
}
