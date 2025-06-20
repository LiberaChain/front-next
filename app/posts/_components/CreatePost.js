"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { BlockchainPosts } from "@/app/_core/blockchain/BlockchainPosts";
import { Posts } from "@/app/_core/libera/Posts";
import { Auth } from "@/app/_core/auth";
import { QrCodeIcon } from "@phosphor-icons/react";

export default function CreatePost() {
    const router = useRouter();
    const [posting, setPosting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // QR Code scanning
    const scannerRef = useRef(null);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [scannerInitialized, setScannerInitialized] = useState(false);
    const [scannedLocationDid, setScannedLocationDid] = useState("");
    const [scannedLocationName, setScannedLocationName] = useState("");
    const [locationInfo, setLocationInfo] = useState(null);

    // For post creation
    const [postContent, setPostContent] = useState("");
    const [postTitle, setPostTitle] = useState("");
    const [postVisibility, setPostVisibility] = useState("public");
    const [postStorage, setPostStorage] = useState("ipfs"); // 'ipfs' or 'blockchain'
    const [blockchainFee, setBlockchainFee] = useState("0.001");
    const [canUseBlockchain, setCanUseBlockchain] = useState(false);
    const [showFeeWarning, setShowFeeWarning] = useState(false);
    const [donationAmount, setDonationAmount] = useState("0"); // Amount to donate beyond required fee
    const [selectedDonationPreset, setSelectedDonationPreset] = useState("");

    // Donation presets
    const donationPresets = [
        { label: "No donation", value: "0" },
        { label: "Small (0.005 ETH)", value: "0.005" },
        { label: "Medium (0.01 ETH)", value: "0.01" },
        { label: "Large (0.05 ETH)", value: "0.05" },
        { label: "Custom", value: "custom" },
    ];

    // For import
    const [importUrl, setImportUrl] = useState("");
    const [importComment, setImportComment] = useState("");
    const [importTitle, setImportTitle] = useState("");
    const [importVisibility, setImportVisibility] = useState("public");

    const [profileData, setProfileData] = useState(null);
    const [postMode, setPostMode] = useState("create"); // 'create', 'import'

    // Check if user is authenticated on component mount
    useEffect(() => {
        const checkAuth = () => {
            try {
                if (!Auth.isLoggedIn()) {
                    // User is not authenticated, redirect to login
                    router.push("/login");
                    return;
                }

                const profileData = Auth.getIdentityData();
                // Load user profile data
                if (profileData) {
                    console.log("User profile data loaded:", profileData);
                    setProfileData(profileData);
                }
            } catch (err) {
                console.error("Error checking authentication:", err);
                router.push("/login");
            }
        };

        checkAuth();
    }, [router]);

    // Check blockchain posting ability
    useEffect(() => {
        const checkBlockchainAbility = async () => {
            try {
                // Check if user can post to blockchain
                const balanceResult = await Posts.checkBlockchainPostingAbility();
                setCanUseBlockchain(balanceResult.success && balanceResult.hasBalance);

                // Get current fee
                const feeResult = await BlockchainPosts.getBlockchainPostFee();
                if (feeResult.success) {
                    setBlockchainFee(feeResult.fee);
                }
            } catch (error) {
                console.error("Error checking blockchain posting ability:", error);
                setCanUseBlockchain(false);
            }
        };

        if (profileData?.walletAddress) {
            checkBlockchainAbility();
        }
    }, [profileData]);

    // Function to create a signable message from post data
    const createSignableMessage = (postData) => {
        return `Post on LiberaChain:\n\nTitle: ${postData.title}\nContent: ${postData.content}\nTimestamp: ${postData.timestamp}\nAuthor DID: ${postData.authorDid}`;
    };

    // Function to sign post with wallet
    const signPost = async (postData) => {
        try {
            if (!window.ethereum) {
                throw new Error("Wallet not connected");
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Create a message that includes all relevant post data
            const message = createSignableMessage(postData);

            // Sign the message with the user's private key
            const signature = await signer.signMessage(message);
            return signature;
        } catch (err) {
            console.error("Error signing post:", err);
            throw err;
        }
    };

    // Function to verify a post's signature
    const verifyPostSignature = async (postData, signature) => {
        try {
            if (!signature) {
                return false;
            }

            const message = createSignableMessage(postData);
            const messageHash = ethers.hashMessage(message);
            const recoveredAddress = ethers.recoverAddress(
                messageHash,
                signature
            );

            // For blockchain posts or posts with DIDs, verify against the author's DID
            if (postData.authorDid) {
                const ethAddress = postData.authorDid.split(":")[2]; // Extract address from did:ethr:0x...
                return recoveredAddress.toLowerCase() === ethAddress.toLowerCase();
            }

            return false;
        } catch (err) {
            console.error("Error verifying signature:", err);
            return false;
        }
    };

    // Handle post submission
    const handlePostSubmit = async (e) => {
        e.preventDefault();

        if (!profileData?.did) {
            setError("You must be logged in to post");
            return;
        }

        if (!postContent.trim()) {
            setError("Post content cannot be empty");
            return;
        }

        try {
            setPosting(true);
            setError("");
            setSuccess("");

            // Prepare post data
            const postData = {
                title: postTitle.trim() || "Untitled Post",
                content: postContent,
                authorDid: profileData.did,
                authorName:
                    profileData.displayName ||
                    `User-${profileData.wallet?.substring(2, 8)}`,
                timestamp: Date.now(),
                contentType: "text",
                visibility: postVisibility,
            };

            // Sign the post data
            const signature = await signPost(postData);
            const isValid = await verifyPostSignature(postData, signature);

            if (!isValid) {
                throw new Error("Post signature verification failed");
            }

            // Add signature to post data
            postData.signature = signature;

            // Add location data if available
            if (scannedLocationDid) {
                postData.locationDid = scannedLocationDid;
                postData.locationName = scannedLocationName;

                // Add additional location metadata if available
                if (locationInfo) {
                    postData.locationInfo = locationInfo;
                }
            }

            // Choose storage method based on user selection
            if (postStorage === "blockchain") {
                // Add donation amount if applicable
                const options = {};
                if (donationAmount && donationAmount !== "0") {
                    options.donationAmount = donationAmount;
                }

                // Post directly to blockchain with optional donation
                const blockchainResult = await BlockchainPosts.createBlockchainPost(postData, options);

                if (!blockchainResult.success) {
                    throw new Error(
                        "Failed to post to blockchain: " +
                        (blockchainResult.error || "Unknown error")
                    );
                }

                // Success! Clear form and show message
                setPostTitle("");
                setPostContent("");
                setPostVisibility("public");
                setDonationAmount("0");
                setSelectedDonationPreset("");
                setScannedLocationDid("");
                setScannedLocationName("");
                setLocationInfo(null);

                // Include donation information in success message if applicable
                let successMsg = `Post published successfully to blockchain! Transaction: ${blockchainResult.transactionHash.substring(
                    0,
                    10
                )}...`;
                if (blockchainResult.donation && blockchainResult.donation !== "0") {
                    successMsg += ` Thank you for your donation of ${blockchainResult.donation} ETH!`;
                }
                setSuccess(successMsg);
            } else {
                // Use traditional IPFS posting
                const { cid } = await Posts.createIPFSPost(postData);

                if (!cid) {
                    throw new Error("Failed to upload post to IPFS");
                }

                // Store post metadata
                // const metadataResult = storePostMetadata(cid, {
                //     authorDid: profileData.did,
                //     authorName:
                //         profileData.displayName ||
                //         `User-${profileData.wallet?.substring(2, 8)}`,
                //     visibility: postVisibility,
                //     contentPreview:
                //         postContent.substring(0, 100) +
                //         (postContent.length > 100 ? "..." : ""),
                //     locationDid: scannedLocationDid || null,
                //     locationName: scannedLocationName || null,
                // });

                // if (!metadataResult) {
                //     throw new Error("Failed to store post metadata");
                // }

                // Success! Clear form and show message
                setPostTitle("");
                setPostContent("");
                setPostVisibility("public");
                setScannedLocationDid("");
                setScannedLocationName("");
                setLocationInfo(null);
                setSuccess("Post published successfully to IPFS!");
            }

            // Reload posts to show the new one
            // await loadPosts();

            // Clear success message after a delay
            setTimeout(() => {
                setSuccess("");
            }, 5000);
        } catch (error) {
            console.error("Error creating post:", error);
            setError(`Failed to create post: ${error.message || "Please try again"}`);
        } finally {
            setPosting(false);
        }
    };

    // Handle import submission
    const handleImportSubmit = async (e) => {
        e.preventDefault();

        if (!profileData?.did) {
            setError("You must be logged in to import content");
            return;
        }

        if (!importUrl.trim()) {
            setError("URL cannot be empty");
            return;
        }

        try {
            setImporting(true);
            setError("");
            setSuccess("");

            // Create imported post
            const result = await Posts.createImportedPost(
                {
                    url: importUrl,
                    comment: importComment,
                    title: importTitle,
                    visibility: importVisibility,
                },
                profileData
            );

            if (!result || !result.success) {
                throw new Error("Failed to import content");
            }

            // Success! Clear form and show message
            setImportUrl("");
            setImportComment("");
            setImportTitle("");
            setImportVisibility("public");
            setSuccess("Content imported successfully!");

            // Clear success message after a delay
            setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (error) {
            console.error("Error importing content:", error);
            setError(
                `Failed to import content: ${error.message || "Please try again"}`
            );
        } finally {
            setImporting(false);
        }
    };

    // Handle adding a comment
    const handleAddComment = async (postCid, postAuthorDid) => {
        if (!profileData?.did) {
            setError("You must be logged in to comment");
            return;
        }

        if (!commentContent.trim()) {
            setError("Comment cannot be empty");
            return;
        }

        try {
            setCommenting(true);
            setError("");

            // Check if user is a friend of the post author
            const isFriend = checkFriendship(profileData.did, postAuthorDid);

            if (!isFriend) {
                setError("Only friends of the post author can comment");
                setCommenting(false);
                return;
            }

            // Create the comment
            const result = await addCommentToPost(postCid, {
                authorDid: profileData.did,
                authorName:
                    profileData.displayName ||
                    `User-${profileData.wallet?.substring(2, 8)}`,
                content: commentContent,
            });

            if (!result || !result.success) {
                throw new Error("Failed to add comment");
            }

            // Clear the comment form
            setCommentContent("");
            setActiveCommentPostCid(null);

            // Reload comments for this post
            const updatedComments = getPostComments(postCid);
            setCommentsMap((prev) => ({
                ...prev,
                [postCid]: updatedComments,
            }));
        } catch (error) {
            console.error("Error adding comment:", error);
            setError(`Failed to add comment: ${error.message || "Please try again"}`);
        } finally {
            setCommenting(false);
        }
    };

    // Handle deleting a comment
    const handleDeleteComment = async (postCid, commentId) => {
        if (!profileData?.did) {
            setError("You must be logged in to delete a comment");
            return;
        }

        try {
            setError("");

            // Delete the comment
            const result = await deleteComment(postCid, commentId, profileData.did);

            if (!result || !result.success) {
                throw new Error("Failed to delete comment");
            }

            // Reload comments for this post
            const updatedComments = getPostComments(postCid);
            setCommentsMap((prev) => ({
                ...prev,
                [postCid]: updatedComments,
            }));
        } catch (error) {
            console.error("Error deleting comment:", error);
            setError(
                `Failed to delete comment: ${error.message || "Please try again"}`
            );
        }
    };

    // Handle post mode switch (create or import)
    const handlePostModeChange = (mode) => {
        setPostMode(mode);
        setError("");
        setSuccess("");
    };

    // Handle storage type change
    const handleStorageTypeChange = (type) => {
        setPostStorage(type);
        setShowFeeWarning(type === "blockchain");
    };

    // Get icon for post source
    const getSourceIcon = (source) => {
        switch (source) {
            case "facebook":
                return (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                );
            case "x":
                return (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                    </svg>
                );
            case "reddit":
                return (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                    </svg>
                );
            case "youtube":
                return (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                );
            case "instagram":
                return (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.261-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                    </svg>
                );
            case "linkedin":
                return (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                );
            default:
                return (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.8 3A2.8 2.8 0 0 1 17.6 5.8V18.2A2.8 2.8 0 0 1 14.8 21H9.2A2.8 2.8 0 0 1 6.4 18.2V5.8A2.8 2.8 0 0 1 9.2 3h5.6m0-1.5H9.2C7 1.5 5 3.3 5 5.8V18.2C5 20.6 7 22.5 9.2 22.5h5.6c2.3 0 4.2-1.9 4.2-4.3V5.8c0-2.5-2-4.3-4.2-4.3z" />
                        <path d="M12 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 1.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 1.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
                    </svg>
                );
        }
    };

    // Toggle QR Scanner
    const toggleQrScanner = () => {
        if (showQrScanner) {
            stopQrScanner();
        } else {
            setShowQrScanner(true);
            // Start scanning after the component is rendered
            setTimeout(() => {
                startQrScanner();
            }, 500);
        }
    };

    // Start QR code scanning
    const startQrScanner = async () => {
        if (!scannerRef.current) return;

        try {
            await scannerRef.current
                .start(
                    { facingMode: "environment" },
                    async (decodedText) => {
                        // Try to parse the scanned data as JSON first (for cryptographically secured QR codes)
                        try {
                            const qrData = JSON.parse(decodedText);

                            // If this is a location QR code with privateKey and locationDid
                            if (qrData && qrData.privateKey && qrData.locationDid) {
                                // Stop scanning once we've found a valid QR code
                                await scannerRef.current.stop();
                                setShowQrScanner(false);

                                // Show processing indicator
                                setSuccess("Verifying location data...");

                                try {
                                    // Verify the QR code cryptographically
                                    const verificationResult = await verifyLocationQRCode(qrData);

                                    if (
                                        verificationResult.isValid &&
                                        verificationResult.locationData
                                    ) {
                                        // Set the scanned location information
                                        setScannedLocationDid(qrData.locationDid);
                                        setScannedLocationName(
                                            verificationResult.locationData.locationName
                                        );

                                        // Set additional location metadata if available
                                        const locationInfo = {
                                            coordinates: verificationResult.locationData.coordinates,
                                            orgDid: verificationResult.locationData.orgDid,
                                            reward: verificationResult.locationData.reward,
                                            type: verificationResult.locationData.type,
                                            verified: true,
                                            timestamp: qrData.timestamp,
                                            ipfsCid: verificationResult.locationData.ipfsCid,
                                        };

                                        setLocationInfo(locationInfo);

                                        // Show success notification
                                        setSuccess(
                                            `Successfully verified ${locationInfo.type || "location"
                                            }: ${verificationResult.locationData.locationName}`
                                        );
                                        setTimeout(() => setSuccess(""), 3000);
                                    } else {
                                        // Failed verification
                                        setError(
                                            `Verification failed: ${verificationResult.error || "Invalid location QR code"
                                            }`
                                        );
                                        setTimeout(() => setError(""), 3000);
                                    }
                                } catch (verifyError) {
                                    console.error(
                                        "Error verifying location QR code:",
                                        verifyError
                                    );
                                    setError(`Verification error: ${verifyError.message}`);
                                    setTimeout(() => setError(""), 3000);
                                }

                                return;
                            }
                        } catch (jsonError) {
                            // Not JSON data, continue to check if it's a DID string
                            console.log(
                                "QR code is not JSON data, checking if it's a DID string"
                            );
                        }

                        // Check for regular DID format strings (for backward compatibility)
                        if (decodedText && decodedText.startsWith("did:ethr:")) {
                            // Stop scanning once we've found a valid DID
                            scannerRef.current
                                .stop()
                                .then(() => {
                                    setShowQrScanner(false);

                                    try {
                                        // Parse the location DID
                                        const didParts = decodedText.split(":");
                                        if (didParts.length >= 4) {
                                            const locationType = didParts[2];

                                            // Check if this is a location DID
                                            if (
                                                locationType === "location" ||
                                                locationType === "object"
                                            ) {
                                                // Extract location name if available
                                                const locationName =
                                                    didParts.length > 3
                                                        ? didParts[3]
                                                        : "Unknown location";

                                                // Set the scanned location information
                                                setScannedLocationDid(decodedText);
                                                setScannedLocationName(locationName.replace(/-/g, " "));

                                                // Check if there's any additional metadata in the DID
                                                let locationInfo = {};
                                                if (didParts.length > 4) {
                                                    try {
                                                        // Additional metadata might be encoded in the DID
                                                        const coordinates = didParts[4]; // Might contain lat,long
                                                        const orgDid =
                                                            didParts.length > 5 ? didParts[5] : null; // Organization DID
                                                        const reward =
                                                            didParts.length > 6 ? didParts[6] : null; // Potential reward

                                                        locationInfo = {
                                                            coordinates,
                                                            orgDid,
                                                            reward,
                                                            verified: false, // Legacy QR codes aren't cryptographically verified
                                                        };

                                                        setLocationInfo(locationInfo);
                                                    } catch (err) {
                                                        console.error(
                                                            "Error parsing location metadata:",
                                                            err
                                                        );
                                                    }
                                                }

                                                // Show success notification
                                                setSuccess(
                                                    `Scanned ${locationType}: ${locationName.replace(
                                                        /-/g,
                                                        " "
                                                    )}`
                                                );
                                                setTimeout(() => setSuccess(""), 3000);
                                            } else {
                                                // Not a location/object DID
                                                setError(
                                                    "This QR code is not a location or object identifier"
                                                );
                                                setTimeout(() => setError(""), 3000);
                                            }
                                        } else {
                                            throw new Error("Invalid DID format");
                                        }
                                    } catch (err) {
                                        console.error("Error processing location DID:", err);
                                        setError("Invalid location QR code format");
                                        setTimeout(() => setError(""), 3000);
                                    }
                                })
                                .catch(console.error);
                        } else {
                            // Not a recognizable QR code format
                            console.error("Unrecognized QR code format:", decodedText);
                            setError("Unrecognized QR code format");
                            setTimeout(() => setError(""), 3000);
                        }
                    },
                    (errorMessage) => {
                        console.error("QR Scan error:", errorMessage);
                    }
                )
                .catch((err) => {
                    console.error("Failed to start scanning:", err);
                });
        } catch (error) {
            console.error("Error starting QR scanner:", error);
        }
    };

    // Stop QR code scanning
    const stopQrScanner = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current
                .stop()
                .then(() => {
                    console.log("QR Scanner stopped");
                })
                .catch(console.error);
        }
        setShowQrScanner(false);
    };

    // Clear scanned location
    const clearScannedLocation = () => {
        setScannedLocationDid("");
        setScannedLocationName("");
        setLocationInfo(null);
    };

    // Initialize QR scanner when showQrScanner changes
    useEffect(() => {
        if (showQrScanner && !scannerInitialized) {
            // Initialize HTML5 QR Scanner
            const initScanner = async () => {
                try {
                    // Import the HTML5 QR scanner library dynamically
                    const { Html5QrcodeScanner } = await import("html5-qrcode");

                    // Create scanner instance if not already initialized
                    if (!scannerRef.current) {
                        scannerRef.current = new Html5QrcodeScanner("location-qr-reader", {
                            fps: 10,
                            qrbox: 250,
                            rememberLastUsedCamera: true,
                            aspectRatio: 1.0,
                        });

                        setScannerInitialized(true);
                        console.log("QR scanner initialized");

                        // Start scanning automatically
                        startQrScanner();
                    }
                } catch (error) {
                    console.error("Error initializing QR scanner:", error);
                }
            };

            initScanner();
        }

        // Cleanup scanner on unmount
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [showQrScanner, scannerInitialized]);

    return (
        <div className="md:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
                <h2 className="text-lg font-medium text-white">Create Post</h2>

                {/* Post/Import Tab Navigation */}
                <div className="mt-4 border-b border-gray-700">
                    <div className="flex -mb-px">
                        <button
                            className={`mr-4 py-2 px-1 ${postMode === "create"
                                ? "border-b-2 border-emerald-500 text-emerald-500"
                                : "text-gray-400 hover:text-gray-300"
                                }`}
                            onClick={() => handlePostModeChange("create")}
                        >
                            Create Post
                        </button>
                        <button
                            className={`py-2 px-1 ${postMode === "import"
                                ? "border-b-2 border-blue-500 text-blue-500"
                                : "text-gray-400 hover:text-gray-300"
                                }`}
                            onClick={() => handlePostModeChange("import")}
                        >
                            Import Link
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-md bg-red-900/40 p-4">
                        <div className="flex">
                            <div className="text-sm text-red-400">{error}</div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mt-4 rounded-md bg-green-900/40 p-4">
                        <div className="flex">
                            <div className="text-sm text-green-400">{success}</div>
                        </div>
                    </div>
                )}

                {/* Create Post Form */}
                {postMode === "create" && (
                    <form onSubmit={handlePostSubmit} className="mt-4 space-y-4">
                        <div>
                            <label
                                htmlFor="post-title"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Title (optional)
                            </label>
                            <div className="mt-1">
                                <input
                                    id="post-title"
                                    name="title"
                                    type="text"
                                    value={postTitle}
                                    onChange={(e) => setPostTitle(e.target.value)}
                                    placeholder="Post title"
                                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="post-content"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Content
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="post-content"
                                    name="content"
                                    value={postContent}
                                    onChange={(e) => setPostContent(e.target.value)}
                                    placeholder="What's on your mind?"
                                    rows={4}
                                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="post-visibility"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Visibility
                            </label>
                            <div className="mt-1">
                                <select
                                    id="post-visibility"
                                    name="visibility"
                                    value={postVisibility}
                                    onChange={(e) => setPostVisibility(e.target.value)}
                                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                >
                                    <option value="public">Public (visible to everyone)</option>
                                    <option value="friends-only">Friends Only</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="post-storage"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Storage Method
                            </label>
                            <div className="mt-1">
                                <div className="flex space-x-4">
                                    <div className="flex items-center">
                                        <input
                                            id="storage-ipfs"
                                            name="storage"
                                            type="radio"
                                            checked={postStorage === "ipfs"}
                                            onChange={() => handleStorageTypeChange("ipfs")}
                                            className="h-4 w-4 border-gray-600 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <label
                                            htmlFor="storage-ipfs"
                                            className="ml-2 block text-sm text-gray-300"
                                        >
                                            IPFS (Free)
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="storage-blockchain"
                                            name="storage"
                                            type="radio"
                                            checked={postStorage === "blockchain"}
                                            onChange={() => handleStorageTypeChange("blockchain")}
                                            disabled={!canUseBlockchain}
                                            className="h-4 w-4 border-gray-600 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                                        />
                                        <label
                                            htmlFor="storage-blockchain"
                                            className={`ml-2 block text-sm ${canUseBlockchain ? "text-gray-300" : "text-gray-500"
                                                }`}
                                        >
                                            Blockchain (Fee: {blockchainFee} ETH)
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {showFeeWarning && (
                            <div className="rounded-md bg-yellow-900/30 p-3 border border-yellow-800/50">
                                <div className="flex">
                                    <div className="text-sm text-yellow-500">
                                        <span className="font-bold">Warning:</span> Posting directly
                                        to the blockchain will incur a transaction fee of
                                        approximately {blockchainFee} ETH. Your content will be
                                        permanently stored on the blockchain and cannot be removed.
                                    </div>
                                </div>
                            </div>
                        )}

                        {postStorage === "blockchain" && !canUseBlockchain && (
                            <div className="rounded-md bg-red-900/30 p-3 border border-red-800/50">
                                <div className="flex">
                                    <div className="text-sm text-red-500">
                                        <span className="font-bold">Error:</span> You don't have
                                        enough ETH to post to the blockchain. Make sure your wallet
                                        is connected and has sufficient funds.
                                    </div>
                                </div>
                            </div>
                        )}

                        {postStorage === "blockchain" && canUseBlockchain && (
                            <div>
                                <label
                                    htmlFor="donation-amount"
                                    className="block text-sm font-medium text-gray-300"
                                >
                                    Donation Amount (optional)
                                </label>
                                <div className="mt-1">
                                    <select
                                        id="donation-preset"
                                        name="donation-preset"
                                        value={selectedDonationPreset}
                                        onChange={(e) => {
                                            const selectedValue = e.target.value;
                                            setSelectedDonationPreset(selectedValue);
                                            setDonationAmount(
                                                selectedValue === "custom" ? "" : selectedValue
                                            );
                                        }}
                                        className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                    >
                                        {donationPresets.map((preset) => (
                                            <option key={preset.value} value={preset.value}>
                                                {preset.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedDonationPreset === "custom" && (
                                    <div className="mt-2">
                                        <input
                                            id="donation-amount"
                                            name="donation-amount"
                                            type="number"
                                            step="0.001"
                                            value={donationAmount}
                                            onChange={(e) => setDonationAmount(e.target.value)}
                                            placeholder="Enter custom donation amount in ETH"
                                            className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Location/Object
                                </label>
                                <button
                                    type="button"
                                    onClick={toggleQrScanner}
                                    className={`text-xs px-2 py-1 rounded-md flex items-center
                                         ${showQrScanner
                                        ? "bg-red-600 text-white"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                        }`}
                                >
                                    {showQrScanner ? "Cancel Scanning" : (<><QrCodeIcon className="inline h-5 w-5 mr-1" />Scan QR Code</>)}
                                </button>
                            </div>

                            {/* QR Scanner */}
                            {showQrScanner && (
                                <div className="mt-2 bg-gray-700 rounded-lg p-4">
                                    <h3 className="text-md font-medium text-white mb-2">
                                        Scan Location/Object QR Code
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Point your camera at a location or object QR code to
                                        associate it with your post
                                    </p>
                                    <div
                                        id="location-qr-reader"
                                        className="w-full mx-auto bg-black rounded-lg overflow-hidden"
                                    ></div>
                                </div>
                            )}

                            {/* Scanned Location Info */}
                            {scannedLocationDid && !showQrScanner && (
                                <div className="mt-2 bg-gray-700 rounded-lg p-4 border border-emerald-800">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-md font-medium text-emerald-400 mb-1">
                                                {scannedLocationName}
                                            </h3>
                                            <p className="text-xs text-gray-400">
                                                {scannedLocationDid.substring(0, 15)}...
                                                {scannedLocationDid.substring(
                                                    scannedLocationDid.length - 6
                                                )}
                                            </p>

                                            {locationInfo && (
                                                <div className="mt-2 text-xs">
                                                    {locationInfo.coordinates && (
                                                        <p className="text-gray-300">
                                                            <span className="text-gray-400">
                                                                Coordinates:
                                                            </span>{" "}
                                                            {locationInfo.coordinates}
                                                        </p>
                                                    )}

                                                    {locationInfo.orgDid && (
                                                        <p className="text-gray-300">
                                                            <span className="text-gray-400">
                                                                Organization:
                                                            </span>{" "}
                                                            {locationInfo.orgDid.substring(0, 15)}...
                                                        </p>
                                                    )}

                                                    {locationInfo.reward && (
                                                        <p className="text-emerald-400 font-medium mt-1">
                                                            <span className="text-emerald-500">
                                                                💰 Reward available:
                                                            </span>{" "}
                                                            {locationInfo.reward}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={clearScannedLocation}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!scannedLocationDid && !showQrScanner && (
                                <div className="mt-2 bg-gray-700 rounded-lg p-4 border border-gray-600">
                                    <p className="text-sm text-gray-400 italic">
                                        No location/object associated with this post. Scan a QR code
                                        to add one.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={
                                    posting || (postStorage === "blockchain" && !canUseBlockchain)
                                }
                                className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {posting ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Publishing...
                                    </>
                                ) : (
                                    `Publish Post ${postStorage === "blockchain" ? "to Blockchain" : "to IPFS"
                                    }`
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {/* Import Post Form */}
                {postMode === "import" && (
                    <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
                        <div>
                            <label
                                htmlFor="import-url"
                                className="block text-sm font-medium text-gray-300"
                            >
                                External Link URL
                            </label>
                            <div className="mt-1">
                                <input
                                    id="import-url"
                                    name="url"
                                    type="url"
                                    value={importUrl}
                                    onChange={(e) => setImportUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                    required
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                                Paste a link from Facebook, X (Twitter), Reddit, etc.
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="import-title"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Title (optional)
                            </label>
                            <div className="mt-1">
                                <input
                                    id="import-title"
                                    name="title"
                                    type="text"
                                    value={importTitle}
                                    onChange={(e) => setImportTitle(e.target.value)}
                                    placeholder="Title for imported content"
                                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="import-comment"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Your Comment (optional)
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="import-comment"
                                    name="comment"
                                    value={importComment}
                                    onChange={(e) => setImportComment(e.target.value)}
                                    placeholder="Add your thoughts about this content"
                                    rows={3}
                                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="import-visibility"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Visibility
                            </label>
                            <div className="mt-1">
                                <select
                                    id="import-visibility"
                                    name="visibility"
                                    value={importVisibility}
                                    onChange={(e) => setImportVisibility(e.target.value)}
                                    className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                                >
                                    <option value="public">Public (visible to everyone)</option>
                                    <option value="friends-only">Friends Only</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={importing}
                                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {importing ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Importing...
                                    </>
                                ) : (
                                    "Import Content"
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Post storage explainer */}
            <div className="mt-6 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
                <h3 className="text-sm font-medium text-white">How Posts Work</h3>
                <p className="mt-2 text-xs text-gray-400">
                    Choose where to store your post:
                </p>
                <ul className="mt-2 text-xs text-gray-400 space-y-2">
                    <li className="flex items-start">
                        <span className="text-emerald-400 mr-2">•</span>
                        <span>
                            <strong>IPFS:</strong> Content is stored on a distributed network.
                            Free, but could be lost if not pinned.
                        </span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-purple-400 mr-2">•</span>
                        <span>
                            <strong>Blockchain:</strong> Content is permanently stored
                            on-chain. Costs a small fee, but lasts forever.
                        </span>
                    </li>
                </ul>

                {postMode === "import" && (
                    <div className="mt-4 rounded-md bg-blue-900/20 p-4">
                        <p className="text-xs text-blue-300">
                            <strong>About importing content:</strong> When you import external
                            content, a reference to the original source is stored in IPFS
                            along with your comments. This creates a decentralized pointer to
                            the content without copying it entirely.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
