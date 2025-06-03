import { CheckIcon, CircleNotchIcon, CrossIcon, PencilSimpleIcon, QrCodeIcon, UserCircleIcon, XIcon } from "@phosphor-icons/react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";
import { Profiles } from "@core/libera/Profiles";
import IPFSCIDLink from "@/app/_components/IPFSCIDLink";

export default function UserProfile({ profileData, ipfsProfile, onIpsfProfileChange }) {
    const [showQrCode, setShowQrCode] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Set initial username
        setNewUsername(ipfsProfile?.username || profileData?.displayName || "");
    }, [ipfsProfile?.username, profileData?.displayName]);

    useEffect(() => {
        // Automatically hide QR code
        let timer;
        if (showQrCode) {
            timer = setTimeout(() => {
                setShowQrCode(false);
            }, 15000); // 15 seconds
        }
        return () => clearTimeout(timer); // Cleanup timer on unmount
    }, [showQrCode]);

    // Generate QR code URL that works with external scanners
    const generateQrCodeUrl = (did) => {
        // If running in a deployed environment, use the actual domain
        // For development, use localhost
        const baseUrl =
            typeof window !== "undefined"
                ? window.location.origin
                : "http://localhost:3000";

        // Create a URL that will open the app and navigate to the dashboard with the DID as a parameter
        return `${baseUrl}/dashboard?addFriend=${encodeURIComponent(did)}`;
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <div className="flex items-center space-x-4">
                <div className="bg-emerald-600 rounded-full p-3">
                    <UserCircleIcon weight="fill" className="h-8 w-8 text-white" />
                </div>
                <div className="flex-grow">
                    <div className="flex items-center gap-2">
                        {isEditingUsername ? (
                            <div className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="text-md font-bold bg-gray-700 text-white rounded px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 max-w-[160]"
                                    autoFocus
                                />
                                <button
                                    onClick={async () => {
                                        try {
                                            setIsSaving(true);
                                            const updatedProfile = {
                                                ...ipfsProfile,
                                                username: newUsername,
                                                did: profileData.did,
                                                updatedAt: new Date().toISOString()
                                            };
                                            if (onIpsfProfileChange) {
                                                await onIpsfProfileChange(updatedProfile);
                                            }

                                            setIsEditingUsername(false);
                                        } catch (error) {
                                            console.error("Error saving username:", error);
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    disabled={isSaving || !newUsername.trim() || newUsername === ipfsProfile?.username}
                                    className="text-emerald-400 hover:text-emerald-300 px-1 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                    {isSaving ? (
                                        <>
                                            <CircleNotchIcon className="animate-spin h-4 w-4" />
                                            Saving...
                                        </>
                                    ) : (
                                        <CheckIcon className="h-4 w-4" />
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingUsername(false);
                                        setNewUsername(ipfsProfile?.username || profileData?.displayName || "");
                                    }}
                                    className="text-gray-400 hover:text-gray-300 px-1 py-1 rounded"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-white">
                                    {ipfsProfile?.username ||
                                        profileData?.displayName ||
                                        "Anonymous User"}
                                </h2>
                                <button
                                    onClick={() => setIsEditingUsername(true)}
                                    className="text-gray-400 hover:text-emerald-400 transition-colors duration-200"
                                >
                                    <PencilSimpleIcon weight="duotone" className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-gray-400">Decentralized Identity</p>
                </div>
            </div>

            <div className="mt-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-300">Your DID</h3>
                    <button
                        onClick={() => setShowQrCode(!showQrCode)}
                        className="text-xs px-3 text-emerald-400 hover:text-emerald-300 flex items-center outline focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md p-1 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <QrCodeIcon className="h-4 w-4 mr-1" weight="bold" />
                        {showQrCode ? "Hide QR code" : "Reveal QR code"}
                    </button>
                </div>
                <div className="mt-1 bg-gray-700 rounded-md p-2">
                    <code className="text-xs text-emerald-400 break-all">
                        {profileData?.did || "Not available"}
                    </code>
                </div>

                {showQrCode && profileData?.did && (
                    <div className="mt-4 flex justify-center flex-col items-center">
                        <div className="bg-white p-4 rounded-lg">
                            <QRCodeCanvas
                                value={generateQrCodeUrl(profileData.did)}
                                size={250}
                                level="M"
                                imageSettings={{
                                    src: "/logo-dark.svg", // Path to your logo
                                    height: 70,
                                    width: 70,
                                    excavate: true, // Ensures the logo doesn't obscure the QR code
                                }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                            Scan with any camera app to add as friend. Show at places that
                            support LiberaChain to get extra benefits!
                            <br />
                            QR code dissappears after 15 seconds.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-300">Wallet Address</h3>
                <div className="mt-1 bg-gray-700 rounded-md p-2">
                    <code className="text-xs text-blue-400 break-all">
                        {profileData?.walletAddress || "Not available"}
                    </code>
                </div>
            </div>

            <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-300">Account Created</h3>
                <p className="text-sm text-gray-400">
                    {profileData?.createdAt
                        ? new Date(profileData.createdAt).toLocaleString()
                        : "Unknown"}
                    {" "}
                    <br />
                    {ipfsProfile?.cid && (
                        <span className="text-xs text-gray-500">
                            Distributed on IPFS under CID:
                            <IPFSCIDLink cid={ipfsProfile.cid} />
                        </span>
                    )}
                </p>
            </div>
        </div >
    );
}
