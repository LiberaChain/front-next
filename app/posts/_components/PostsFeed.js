"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Posts } from '@core/libera/Posts';

import { CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Auth } from "@/app/_core/auth";
import { BlockchainPosts } from "@/app/_core/blockchain/BlockchainPosts";
import { ethers } from "ethers";
import IPFSCIDLink from "@/app/_components/IPFSCIDLink";
// import { verifyLocationQRCode } from "../../_core/utils/qrCodeService";

export default function PostsFeed() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [commenting, setCommenting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(Date.now());

    // QR Code scanning
    const scannerRef = useRef(null);
    const [showQrScanner, setShowQrScanner] = useState(false);
    const [scannerInitialized, setScannerInitialized] = useState(false);
    const [scannedLocationDid, setScannedLocationDid] = useState("");
    const [scannedLocationName, setScannedLocationName] = useState("");
    const [locationInfo, setLocationInfo] = useState(null);

    // For post creation
    const [blockchainFee, setBlockchainFee] = useState("0.001");
    const [canUseBlockchain, setCanUseBlockchain] = useState(false);

    // For comments
    const [commentContent, setCommentContent] = useState("");
    const [activeCommentPostCid, setActiveCommentPostCid] = useState(null);
    const [commentsMap, setCommentsMap] = useState({});
    const [expandedPosts, setExpandedPosts] = useState({});

    const [profileData, setProfileData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [displayMode, setDisplayMode] = useState("all"); // 'all', 'mine'

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
                    setProfileData(profileData);
                }

                loadPosts();

                // Set up background refresh interval
                const interval = setInterval(() => {
                    console.log("Auto-refreshing posts in background...");
                    setLastRefresh(Date.now());
                    loadPosts(true); // Pass true to indicate this is a background refresh
                }, 15000); // 15 seconds

                setRefreshInterval(interval);
            } catch (err) {
                console.error("Error checking authentication:", err);
                router.push("/login");
            } finally {
                setLoading(false);
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

        if (profileData?.wallet) {
            checkBlockchainAbility();
        }
    }, [profileData]);

    // Load posts based on current display mode
    const loadPosts = async (isBackgroundRefresh = false) => {
        try {
            // Only show loading indicator for initial/manual refreshes
            if (!isBackgroundRefresh) {
                setLoading(true);
                // Clear existing posts while loading to avoid showing "No posts" message temporarily
                setPosts([]);
            }

            console.log("Loading posts... Display mode:", displayMode);

            let loadedPosts = [];

            // if (displayMode === "mine" && profileData?.did) {
            //     // Load only user's posts
            //     loadedPosts = await getUserPosts(profileData.did);
            // } else {
            // Load all public posts
            loadedPosts = await Posts.getPublicPosts();
            // }

            // Load comments for all posts
            const newCommentsMap = {};
            loadedPosts.forEach((post) => {
                const postComments = Posts.getPostComments(post.cid || post.postId);
                newCommentsMap[post.cid || post.postId] = postComments;
            });
            setCommentsMap(newCommentsMap);

            // Update posts state with the loaded data
            setPosts(loadedPosts);
        } catch (error) {
            console.error("Error loading posts:", error);
            if (!isBackgroundRefresh) {
                setError("Failed to load posts. Please try again.");
            }
        } finally {
            // Only set loading to false after everything is done
            if (!isBackgroundRefresh) {
                setLoading(false);
            }
        }
    };

    // Function to create a signable message from post data
    const createSignableMessage = (postData) => {
        return `Post on LiberaChain:\n\nTitle: ${postData.title}\nContent: ${postData.content}\nTimestamp: ${postData.timestamp}\nAuthor DID: ${postData.authorDid}`;
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
            const isFriend = false; //checkFriendship(profileData.did, postAuthorDid);

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

    // Toggle comment section for a post
    const toggleComments = (postCid) => {
        setExpandedPosts((prev) => ({
            ...prev,
            [postCid]: !prev[postCid],
        }));
    };

    // Check if user can comment on a post
    const canComment = (postAuthorDid) => {
        if (!profileData?.did) return false;
        return false;//checkFriendship(profileData.did, postAuthorDid);
    };

    // Handle display mode change
    const handleDisplayModeChange = (mode) => {
        setDisplayMode(mode);
        // Reload posts whenever display mode changes
        loadPosts();
    };

    // Format date for display
    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString();
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
        <div className="md:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium text-white">Posts</h2>

                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400">
                            Last updated: {new Date(lastRefresh).toLocaleTimeString()}
                        </span>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleDisplayModeChange("all")}
                                className={`px-3 py-1 text-xs rounded-md ${displayMode === "all"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                            >
                                All Posts
                            </button>
                            <button
                                onClick={() => handleDisplayModeChange("mine")}
                                className={`px-3 py-1 text-xs rounded-md ${displayMode === "mine"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                            >
                                My Posts
                            </button>

                            <button
                                onClick={() => loadPosts()}
                                disabled={loading}
                                className="px-3 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                title="Refresh posts"
                            >
                                {loading ? (
                                    <svg
                                        className="animate-spin h-4 w-4"
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
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {loading && posts.length === 0 ? (
                    <div className="mt-6 flex justify-center">
                        <svg
                            className="animate-spin h-8 w-8 text-emerald-500"
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
                    </div>
                ) : (<>  </>)}

                <div className="mt-6 space-y-6">
                    {posts && posts.length > 0 ? (
                        posts.map((post) => (
                            <div
                                key={post.cid || post.postId}
                                className="bg-gray-700 rounded-md p-4 border border-gray-600"
                            >
                                <div className="flex justify-between">
                                    <div>
                                        <h3 className="text-md font-medium text-white">
                                            {post.title}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            By {post.authorName}{" "}
                                            <span className="text-gray-500">
                                                ({post.authorDid.substring(9, 15)}...)
                                            </span>
                                            <br />
                                            {formatDate(post.timestamp)}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {post.type === "imported" && post.source && (
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300`}
                                            >
                                                <span className="mr-1 text-gray-400">From</span>
                                                <span className="flex items-center">
                                                    <span className="mr-1">{post.source}</span>
                                                    <span className="text-gray-400">
                                                        {getSourceIcon(post.source)}
                                                    </span>
                                                </span>
                                            </span>
                                        )}

                                        <span
                                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${post.visibility === "public"
                                                ? "bg-green-900/30 text-green-400"
                                                : "bg-blue-900/30 text-blue-400"
                                                }`}
                                        >
                                            {post.visibility === "public"
                                                ? "Public"
                                                : "Friends Only"}
                                        </span>

                                        {post.source === "blockchain" && (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-900/30 text-purple-400">
                                                On-Chain
                                            </span>
                                        )}

                                        {post.source === "ipfs" && (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-900/30 text-emerald-400">
                                                IPFS
                                            </span>
                                        )}

                                        {post.donation && parseFloat(post.donation) > 0 && (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-3 w-3 mr-1"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                    />
                                                </svg>
                                                Donated {post.donation} ETH
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 text-gray-200 whitespace-pre-line">
                                    {post.content}
                                </div>

                                {/* Location Information */}
                                {post.locationDid && (
                                    <div className="mt-3 bg-gray-800/50 rounded-md p-3 border border-emerald-800/50">
                                        <div className="flex items-start">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-5 w-5 text-emerald-400 mr-2 flex-shrink-0"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                                />
                                            </svg>
                                            <div>
                                                <div className="flex items-center">
                                                    <span className="text-sm font-medium text-emerald-400">
                                                        {post.locationName || "Location"}
                                                    </span>
                                                    {post.locationInfo &&
                                                        post.locationInfo.verified && (
                                                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-900/40 text-green-400 rounded-sm flex items-center">
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    className="h-3 w-3 mr-0.5"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                                                    />
                                                                </svg>
                                                                Verified
                                                            </span>
                                                        )}
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        {post.locationDid?.substring(0, 10)}...
                                                    </span>
                                                </div>

                                                {post.locationInfo && (
                                                    <div className="mt-1 text-xs">
                                                        {post.locationInfo.type &&
                                                            post.locationInfo.type !== "location" && (
                                                                <p className="text-gray-400 capitalize">
                                                                    <span className="text-gray-500">Type:</span>{" "}
                                                                    {post.locationInfo.type}
                                                                </p>
                                                            )}

                                                        {post.locationInfo.coordinates && (
                                                            <p className="text-gray-400">
                                                                <span className="text-gray-500">
                                                                    Coordinates:
                                                                </span>{" "}
                                                                {post.locationInfo.coordinates}
                                                            </p>
                                                        )}

                                                        {post.locationInfo.orgDid && (
                                                            <p className="text-gray-400">
                                                                <span className="text-gray-500">
                                                                    Organization:
                                                                </span>{" "}
                                                                {post.locationInfo.orgDid.substring(0, 15)}
                                                                ...
                                                            </p>
                                                        )}

                                                        {post.locationInfo.reward && (
                                                            <p className="text-emerald-400 font-medium">
                                                                <span className="text-emerald-500">
                                                                    💰 Reward available:
                                                                </span>{" "}
                                                                {post.locationInfo.reward}
                                                            </p>
                                                        )}

                                                        {post.locationInfo.ipfsCid && (
                                                            <p className="text-blue-400 mt-1 text-xs">
                                                                <span className="text-gray-500">IPFS:</span>{" "}
                                                                {post.locationInfo.ipfsCid.substring(0, 12)}
                                                                ...
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {post.type === "imported" && post.url && (
                                    <div className="mt-4 bg-gray-800/50 rounded-md p-3 border border-gray-600">
                                        <div className="flex items-center">
                                            <span className="text-xs text-gray-400 mr-2">
                                                Imported link:
                                            </span>
                                            <a
                                                href={post.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-400 hover:underline truncate break-all"
                                            >
                                                {post.url}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 pt-2 border-t border-gray-600 flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <div className="text-xs text-gray-400">
                                            {post.source === "blockchain" ? (
                                                <span title={`On-chain post ID: ${post.postId}`}>
                                                    Blockchain ID: {post.postId?.substring(0, 10)}
                                                    ...
                                                </span>
                                            ) : post.cid ? (
                                                <span title={`IPFS CID: ${post.cid}`}>
                                                    IPFS CID:
                                                    <IPFSCIDLink cid={post.cid} />
                                                </span>
                                            ) : null}
                                        </div>

                                        {post.signature && (
                                            <div className="flex items-center ml-4">
                                                {post.verified ? (
                                                    <span
                                                        className="text-green-500 flex items-center"
                                                        title="Post signature verified"
                                                    >
                                                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            const isValid = await verifyPostSignature(
                                                                post,
                                                                post.signature
                                                            );
                                                            if (isValid) {
                                                                toast.success(
                                                                    "Post signature verified successfully!"
                                                                );
                                                            } else {
                                                                toast.error(
                                                                    "Post signature verification failed. Content may have been tampered with."
                                                                );
                                                            }
                                                        }}
                                                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-white flex items-center"
                                                    >
                                                        <ShieldCheckIcon className="h-4 w-4 mr-1" />
                                                        Verify Signature
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Comments Section */}
                                {expandedPosts[post.cid || post.postId] && (
                                    <div className="mt-4 pt-3 border-t border-gray-600">
                                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                                            Comments
                                        </h4>

                                        {/* List of comments */}
                                        {commentsMap[post.cid]?.length > 0 ? (
                                            <div className="space-y-3">
                                                {commentsMap[post.cid].map((comment) => (
                                                    <div
                                                        key={comment.id}
                                                        className="bg-gray-800 rounded p-3 text-sm"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <span className="font-medium text-emerald-400">
                                                                    {comment.authorName}
                                                                </span>
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    {formatDate(comment.timestamp)}
                                                                </span>
                                                            </div>

                                                            {/* Delete comment button - only visible for your own comments */}
                                                            {profileData?.did === comment.authorDid && (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDeleteComment(post.cid, comment.id)
                                                                    }
                                                                    className="text-xs text-red-400 hover:text-red-300"
                                                                    title="Delete comment"
                                                                >
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        className="h-4 w-4"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                        stroke="currentColor"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            strokeWidth={2}
                                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                        />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-300 mt-1">
                                                            {comment.content}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">No comments yet</p>
                                        )}

                                        {/* Add comment form */}
                                        {canComment(post.authorDid) ? (
                                            <div className="mt-3">
                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleAddComment(post.cid, post.authorDid);
                                                    }}
                                                >
                                                    <div className="flex items-start space-x-2">
                                                        <textarea
                                                            value={
                                                                activeCommentPostCid === post.cid
                                                                    ? commentContent
                                                                    : ""
                                                            }
                                                            onChange={(e) => {
                                                                setCommentContent(e.target.value);
                                                                setActiveCommentPostCid(post.cid);
                                                            }}
                                                            onClick={() =>
                                                                setActiveCommentPostCid(post.cid)
                                                            }
                                                            placeholder="Write a comment..."
                                                            rows={1}
                                                            className="flex-grow bg-gray-900 text-white text-sm rounded-md border border-gray-600 px-3 py-2 placeholder-gray-500"
                                                        ></textarea>
                                                        <button
                                                            type="submit"
                                                            disabled={
                                                                commenting ||
                                                                activeCommentPostCid !== post.cid ||
                                                                !commentContent.trim()
                                                            }
                                                            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                                        >
                                                            {commenting &&
                                                                activeCommentPostCid === post.cid ? (
                                                                <svg
                                                                    className="animate-spin h-4 w-4"
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
                                                            ) : (
                                                                "Post"
                                                            )}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        ) : (
                                            <div className="mt-3 bg-gray-800/50 p-3 rounded-md">
                                                <p className="text-sm text-yellow-500">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-4 w-4 inline mr-1"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                        />
                                                    </svg>
                                                    Only friends of the post author can comment
                                                </p>
                                            </div>
                                        )}

                                        {error && activeCommentPostCid === post.cid && (
                                            <p className="mt-2 text-sm text-red-400">{error}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8">
                            <svg
                                className="animate-spin h-10 w-10 text-emerald-500 mx-auto mb-4"
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
                            <p className="text-gray-400">Loading posts...</p>
                        </div>
                    )}

                    {posts.length === 0 && !loading && (
                        <div className="text-center py-8">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-10 w-10 text-gray-500 mx-auto mb-4"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    className="opacity-50"
                                />
                            </svg>
                            <p className="text-gray-400">No posts found yet. But don't worry, we will keep searching!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
