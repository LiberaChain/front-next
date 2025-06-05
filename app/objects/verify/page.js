"use client";

import AuthenticatedContentWrapper from "@/app/_components/AuthenticatedContentWrapper";
import IPFSCIDLink from "@/app/_components/IPFSCIDLink";
import { FilebaseIPFSProvider } from "@/app/_core/storage/ipfs/FilebaseIPFSService";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRightIcon, CheckCircleIcon, CircleNotchIcon, MapPinIcon, QrCodeIcon, QuestionMarkIcon, WarningIcon } from "@phosphor-icons/react";
import QRScanner from "@/app/_components/QRScanner";

export default function VerifyObjectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [objectDid, setObjectDid] = useState(searchParams.get('did') || null);
    // const objectDid = searchParams.get('did');
    const [signature, setSignature] = useState(searchParams.get('signature') || null);
    // const key = searchParams.get('key');
    const [redemptionCid, setRedemptionCID] = useState(searchParams.get('cid') || null);
    // const cid = searchParams.get('cid');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [object, setObject] = useState(null);
    const [redemption, setRedemption] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [verifySuccess, setVerifySuccess] = useState(false);

    // Load object data from IPFS based on DID in the URL
    useEffect(() => {
        async function loadObjectData() {
            setError(null);

            if (!objectDid) {
                // setError("Missing object DID");
                setLoading(false);
                return;
            }

            try {
                console.log("Loading object data for DID:", objectDid);
                setLoading(true);

                if (!objectDid.startsWith("did:libera:object:")) {
                    throw new Error("Invalid redeem code format");
                }

                // The objectDid is the object's DID, which contains the Ethereum address
                const objectAddress = objectDid.replace("did:libera:object:", "");

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
                if (!objectData.did || objectData.did !== objectDid) {
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
    }, [objectDid]);

    useEffect(() => {
        async function loadRedemptionCid() {
            // setError(null);

            if (!redemptionCid) {
                return;
            }

            console.log("Loading redemption CID:", redemptionCid);

            setLoading(true);

            try {
                // Fetch redemption data from IPFS using Filebase
                const ipfs = FilebaseIPFSProvider.getInstance();
                const file = await ipfs.fetchFileByCID(redemptionCid);
                const redemptionData = JSON.parse(await file.text());

                console.log("Redemption data retrieved:", redemptionData);

                if (!redemptionData || !redemptionData.objectDid || !redemptionData.userDid) {
                    throw new Error("Invalid redemption data");
                }

                setRedemption(redemptionData);
            } catch (error) {
                console.error("Error loading redemption data:", error);
                setError(`Failed to load redemption data: ${error.message}`);
            } finally {
                setLoading(false);
            }
        }

        loadRedemptionCid();
    }, [redemptionCid]);

    // // Handle verification of the object
    const handleVerification = async () => {
        try {
            if (!object) {
                setError("Missing object data");
                return;
            }

            if (!signature) {
                setError("Missing signature for verification");
                return;
            }

            if (!redemption) {
                setError("Missing redemption data for verification");
                return;
            }

            setVerifying(true);
            setVerifySuccess(false);
            setError(null);

            // Get the address from the object's DID
            const objectAddress = object.did.replace("did:libera:object:", "");

            const redemptionDataToSign = {
                objectDid: object.did,
                userDid: redemption.userDid,
                timestamp: redemption.timestamp,
                action: "redeem"
            };

            const dataToSign = JSON.stringify(redemptionDataToSign);
            const signatureValid = ethers.verifyMessage(dataToSign, signature);

            if (signatureValid.toLowerCase() !== objectAddress.toLowerCase()) {
                throw new Error("Invalid signature - redemption verification failed");
            }

            setVerifySuccess(true);

            console.log("Object successfully verified!");

        } catch (error) {
            console.error("Error verifying object:", error);
            setError(error.message || "Failed to verify object");
        } finally {
            setVerifying(false);
        }
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

        if (!scannedCode.includes("/objects/verify?")) {
            setError("The QR code is not meant for verifying redeemed objects.");
            return;
        }

        const url = new URL(scannedCode);
        const didParam = url.searchParams.get("did");
        const signatureParam = url.searchParams.get("signature");
        const redemptionCidParam = url.searchParams.get("cid");
        if (!didParam || !signatureParam || !redemptionCidParam || !didParam.startsWith("did:libera:object:")) {
            setError("The QR code does not contain valid verification parameters.");
            return;
        }

        if (objectDid && objectDid !== didParam) {
            setError("The QR code does not match the currently selected object DID. Please scan the correct QR code.");
            return;
        }

        console.log("Parsed verify code: ", { didParam, signatureParam });

        setObjectDid(didParam);
        setSignature(signatureParam);
        setRedemptionCID(redemptionCidParam);
        setLoading(true);
        setError(null);
    }

    const handleReturnHome = () => {
        router.push('/objects');
    };

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

                {/* Object Details */}
                {object && !loading && !error && (
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="flex items-center mb-6">
                            <QrCodeIcon className="w-10 h-10 text-emerald-500 mr-3" />
                            <h2 className="text-xl font-medium text-white">Verify {object.type}</h2>
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
                                    <div className="md:col-span-2 bg-emerald-900/30 p-4 rounded mb-4">
                                        <p className="text-sm text-gray-400">Reward for this {object.type}:</p>
                                        <p className="text-emerald-200">{object.reward}</p>
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
                            <h3 className="text-lg font-medium text-white mb-4">Verify This {object.type}</h3>

                            <p className="text-gray-300 mb-4">
                                Verification of this {object.type} will validate whether the object redemption is genuine and
                                has not been tampered with. This process ensures that the object was legitimately obtained and
                                the user can claim any associated rewards. Your verification helps maintain the integrity of the reward system.
                            </p>

                            {signature && (

                                <div className="bg-gray-800 p-4 rounded mb-4">
                                    <p className="text-sm text-gray-400">Signature</p>
                                    <p className="text-xs text-gray-300 break-all">{signature}</p>
                                </div>
                            )}

                            {redemption && (
                                <>
                                    <div className="bg-gray-800 p-4 rounded mb-4">
                                        <p className="text-sm text-gray-400">Redemption CID</p>
                                        <p className="text-xs text-gray-300 break-all">
                                            <IPFSCIDLink cid={redemptionCid} />
                                        </p>
                                    </div>

                                    <div className="bg-gray-800 p-4 rounded mb-4">
                                        <p className="text-sm text-gray-400">Date of Redemption</p>
                                        <p className="text-xs text-gray-300 break-all">
                                            {new Date(redemption.timestamp).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="bg-gray-800 p-4 rounded mb-4">
                                        <p className="text-sm text-gray-400">User DID</p>
                                        <p className="text-xs text-gray-300 break-all">
                                            {redemption.userDid}
                                        </p>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-center items-center">
                                {verifying ? (
                                    <button
                                        disabled={verifying}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center disabled:opacity-50"
                                    >
                                        <CircleNotchIcon className="w-5 h-5 mr-2 animate-spin" />
                                        Verifying...
                                    </button>
                                ) : (
                                    <div className="flex-1">
                                        <QRScanner
                                            onScan={handleCodeScan}
                                        />

                                        {objectDid && signature && (
                                            <button
                                                onClick={handleVerification}
                                                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors flex items-center"
                                            >
                                                <QuestionMarkIcon className="w-5 h-5 mr-2" />
                                                Verify {object.type}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
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

                {/* Success Verification State */}
                {verifySuccess && !loading && !error && (
                    <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
                        <div className="flex items-center justify-center mb-6">
                            <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-medium text-emerald-400 mb-4 text-center">Successfully Verified.</h2>
                        <p className="text-gray-300 text-center mb-2">
                            The <span className="text-emerald-400 font-semibold">{object?.name}</span> is has really been obtained by the user.
                        </p>
                        <p className="text-gray-400 text-center mb-6">
                            This grants user the right for any rewards associated with this object.
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
            </div>
        </AuthenticatedContentWrapper>
    );
}
