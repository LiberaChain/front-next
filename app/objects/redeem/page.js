"use client";

import AuthenticatedContentWrapper from "@/app/_components/AuthenticatedContentWrapper";
import IPFSCIDLink from "@/app/_components/IPFSCIDLink";
import { FilebaseIPFSProvider } from "@/app/_core/storage/ipfs/FilebaseIPFSService";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRightIcon, CheckCircleIcon, CircleNotchIcon, MapPinIcon, QrCodeIcon, WarningIcon } from "@phosphor-icons/react";
import QRScanner from "@/app/_components/QRScanner";

export default function RedeemObjectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [redeemCode, setRedeemCode] = useState(searchParams.get('redeem') || null);
    // const redeemCode = searchParams.get('redeem');
    const [key, setKey] = useState(searchParams.get('key') || null);
    // const key = searchParams.get('key');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [object, setObject] = useState(null);
    const [redeeming, setRedeeming] = useState(false);
    const [redeemSuccess, setRedeemSuccess] = useState(false);

    // Load object data from IPFS based on DID in the URL
    useEffect(() => {
        async function loadObjectData() {
            setError(null);

            if (!redeemCode || !key) {
                // setError("Missing redeem code or key in the URL");
                setLoading(false);
                return;
            }

            try {
                console.log("Loading object data for DID:", redeemCode);
                setLoading(true);

                if (!redeemCode.startsWith("did:libera:object:")) {
                    throw new Error("Invalid redeem code format");
                }

                // The redeemCode is the object's DID, which contains the Ethereum address
                const objectAddress = redeemCode.replace("did:libera:object:", "");

                // Try to fetch object data from IPFS using Filebase
                const ipfs = FilebaseIPFSProvider.getInstance();
                const filePath = `objects/${objectAddress}.json`;

                // Check if the file exists in IPFS
                const exists = await ipfs.fileExists(filePath);
                if (!exists) {
                    throw new Error("Object data not found on IPFS");
                }

                // Get the latest CID
                const cid = await ipfs.getLatestCID(filePath);
                if (!cid) {
                    throw new Error("Could not retrieve object CID");
                }

                // Fetch the object data from IPFS
                const response = await ipfs.fetchFileByCID(cid);
                if (!response) {
                    throw new Error(`Failed to fetch object data: ${response.statusText}`);
                }

                const objectData = JSON.parse(await response.text());
                console.log("Object data retrieved:", objectData);

                // Validate the object data contains required fields
                if (!objectData.did || objectData.did !== redeemCode) {
                    throw new Error("Invalid object data: DID mismatch");
                }

                // Set the object data and the CID
                setObject({ ...objectData, cid });

            } catch (error) {
                console.error("Error loading object data:", error);
                setError(error.message || "Failed to load object data");
            } finally {
                setLoading(false);
            }
        }

        loadObjectData();
    }, [redeemCode, key]);

    // Handle redemption of the object
    const handleRedeem = async () => {
        if (!object || !key) {
            setError("Missing object data or private key");
            return;
        }

        try {
            setRedeeming(true);
            setError(null);

            // Create a wallet instance from the private key
            const objectWallet = new ethers.Wallet(key);

            // Get the current user's address from local storage or context
            let userProfileData = localStorage.getItem("liberaChainIdentity");
            if (!userProfileData) {
                throw new Error("You need to be logged in to redeem objects");
            }

            const userProfile = JSON.parse(userProfileData);
            const userDid = userProfile?.did;
            // const userAddress = userProfile.did?.replace("did:libera:", "") || "";

            if (!userDid) {
                throw new Error("Could not determine user's address");
            }

            // Create redemption data with timestamp
            const redemptionData = {
                objectDid: object.did,
                userDid: userProfile.did,
                timestamp: new Date().toISOString(),
                action: "redeem"
            };

            // Sign the redemption data with object's private key
            const dataToSign = JSON.stringify(redemptionData);
            const messageHash = ethers.hashMessage(dataToSign);
            const signature = await objectWallet.signMessage(dataToSign);

            // Verify the signature to ensure it's valid
            const recoveredAddress = ethers.verifyMessage(dataToSign, signature);
            console.log("Signature verification:", recoveredAddress === objectWallet.address);

            // Create the redemption record
            const redemptionRecord = {
                ...redemptionData,
                signature,
                verified: true,
            };

            // Store in user's profile redemptions in IPFS
            const ipfs = FilebaseIPFSProvider.getInstance();
            const userRedemptionsPath = `redemptions/${userProfile.did}/${object.did}.json`;

            // Upload the redemption record
            const uploadResult = await ipfs.uploadFile(userRedemptionsPath, JSON.stringify(redemptionRecord));
            console.log("Redemption record saved to IPFS:", uploadResult);

            // Get the CID of the uploaded file
            const cid = await ipfs.getLatestCID(userRedemptionsPath);
            console.log("Redemption record CID:", cid);

            // Also store locally for offline access
            let redemptions = localStorage.getItem("liberaChainRedemptions");
            redemptions = redemptions ? JSON.parse(redemptions) : [];
            redemptions.push({
                ...redemptionRecord,
                cid
            });
            localStorage.setItem("liberaChainRedemptions", JSON.stringify(redemptions));

            setRedeemSuccess(true);
            console.log("Object successfully redeemed!");

        } catch (error) {
            console.error("Error redeeming object:", error);
            setError(error.message || "Failed to redeem object");
        } finally {
            setRedeeming(false);
        }
    };

    const handleReturnHome = () => {
        router.push('/objects');
    };

    const handleCodeScan = (result) => {
        console.log("QR Code scanned:", result);
        let scannedCode = result[0]?.rawValue;
        if (!scannedCode) {
            setError("No valid QR code detected. Please try again.");
            return;
        }

        scannedCode = `${scannedCode}`.trim();
        console.log("Scanned QR Code:", scannedCode);
        if (!scannedCode.startsWith("http://") && !scannedCode.startsWith("https://")) {
            setError("Invalid QR code format. Please scan a valid object QR code.");
            return;
        }

        if (!scannedCode.includes("/objects/redeem?")) {
            setError("The QR code is not meant for redeeming objects.");
            return;
        }

        const url = new URL(scannedCode);
        const redeemParam = url.searchParams.get("redeem");
        const keyParam = url.searchParams.get("key");
        if (!redeemParam || !keyParam || !redeemParam.startsWith("did:libera:object:")) {
            setError("The QR code does not contain valid redeem parameters.");
            return;
        }

        console.log("Parsed redeem code:", redeemParam, "Key:", keyParam);

        setKey(keyParam);
        setRedeemCode(redeemParam);
        setLoading(true);
        setError(null);
    }

    return (
        <AuthenticatedContentWrapper title="Redeem Object" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 grid grid-cols-1 gap-6">
            <div className="mx-auto md:col-span-2 space-y-6">
                {/* Loading State */}
                {loading && (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
                        <CircleNotchIcon className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-medium text-white mb-2">Loading Object Data</h2>
                        <p className="text-gray-400">Retrieving information from the decentralized network...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                        <div className="flex items-center justify-center mb-6">
                            <WarningIcon className="w-16 h-16 text-red-500" />
                        </div>
                        <h2 className="text-xl font-medium text-white mb-4 text-center">Error Loading Object</h2>
                        <p className="text-red-400 text-center mb-6">{error}</p>
                        <div className="flex justify-center">
                            <button
                                onClick={handleReturnHome}
                                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                            >
                                Return to Objects
                            </button>
                        </div>
                    </div>
                )}

                {!object && (!redeemCode || !key) && (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                        <div className="flex items-center justify-center mb-6">
                            <QrCodeIcon className="w-16 h-16 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-medium text-emerald-400 mb-4 text-center">Redeem an Object</h2>
                        <p className="text-gray-300 text-center mb-2">
                            You can use your camera to scan the QR code of an object to redeem it.
                        </p>
                        <p className="text-gray-400 text-center mb-6">
                            Alternative to that is to use the link that is embedded into the QR code.
                        </p>
                        <div className="flex justify-center my-6">
                            <div className="flex-1">
                                <QRScanner
                                    hideAfterScan={true}
                                    onScan={handleCodeScan}
                                />
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={handleReturnHome}
                                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                            >
                                Return to Objects
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Redemption State */}
                {redeemSuccess && !loading && !error && (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                        <div className="flex items-center justify-center mb-6">
                            <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-medium text-emerald-400 mb-4 text-center">Successfully Redeemed!</h2>
                        <p className="text-gray-300 text-center mb-2">
                            You have successfully redeemed <span className="text-emerald-400 font-semibold">{object?.name}</span>
                        </p>
                        <p className="text-gray-400 text-center mb-6">
                            A cryptographically signed record has been stored in your profile.
                        </p>
                        <div className="flex justify-center">
                            <button
                                onClick={handleReturnHome}
                                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                            >
                                Return to Objects
                            </button>
                        </div>
                    </div>
                )}

                {/* Object Details */}
                {object && !loading && !error && !redeemSuccess && (
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="flex items-center mb-6">
                            <QrCodeIcon className="w-10 h-10 text-emerald-500 mr-3" />
                            <h2 className="text-xl font-medium text-white">Redeem {object.type}</h2>
                        </div>

                        <div className="bg-gray-700 rounded-lg p-6 mb-6 border border-gray-600">
                            <h3 className="text-lg font-medium text-emerald-400 mb-2">{object.name}</h3>
                            <p className="text-gray-300 mb-4">{object.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm text-gray-400">Type</p>
                                    <p className="text-md text-white capitalize">{object.type}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Created</p>
                                    <p className="text-md text-white">
                                        {new Date(object.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                {object.coordinates && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-gray-400 flex items-center">
                                            <MapPinIcon size={16} className="inline mr-1" />
                                            Location
                                        </p>
                                        <p className="text-md text-white">{object.coordinates}</p>
                                    </div>
                                )}
                                {object.reward && (
                                    <div className="md:col-span-2">
                                        <p className="text-sm text-gray-400">Reward</p>
                                        <p className="text-md text-emerald-400">{object.reward}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-600">
                                <p className="text-sm text-gray-400">DID (Decentralized Identifier)</p>
                                <p className="text-xs text-gray-300 break-all">{object.did}</p>
                            </div>

                            {object.cid && (
                                <div className="mt-2">
                                    <p className="text-sm text-gray-400">IPFS CID</p>
                                    <p className="text-xs text-gray-300">
                                        <IPFSCIDLink cid={object.cid} />
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
                            <h3 className="text-lg font-medium text-white mb-4">Redeem This {object.type}</h3>

                            <p className="text-gray-300 mb-4">
                                Redeeming this {object.type} will create a cryptographically signed record
                                that proves you interacted with it. This record will be stored in your profile.
                            </p>

                            {object.reward && (
                                <div className="bg-emerald-900/30 p-4 rounded mb-4">
                                    <p className="text-emerald-300 font-medium">Reward Available</p>
                                    <p className="text-emerald-200">{object.reward}</p>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    onClick={handleRedeem}
                                    disabled={redeeming}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                                >
                                    {redeeming ? (
                                        <>
                                            <CircleNotchIcon className="w-5 h-5 mr-2 animate-spin" />
                                            Redeeming...
                                        </>
                                    ) : (
                                        <>
                                            Redeem Now
                                            <ArrowRightIcon className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedContentWrapper>
    );
}
