"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  searchUserByDid,
  createFriendRequest,
  generateAsymmetricKeys,
  storeMessagingKeys,
  retrieveMessagingKeys,
  getUserProfileFromIPFS,
  getBlockchainStatus,
  getAllFriendRequests,
} from "../utils/blockchainTransactions";
import { getIpfsStatus } from "../utils/ipfsService";
import UserProfile from "./_components/UserProfile";
import EditProfile from "./_components/EditProfile";
import QuickActions from "./_components/QuickActions";
import NetworkStatus from "./_components/NetworkStatus";
import ContentWrapper from "../_components/ContentWrapper";
import { useRequireAuth } from "../_components/auth";

// export const metadata = {
//   title: "Dashboard",
// };

export default function Dashboard() {
  const router = useRouter();
  const auth = useRequireAuth();
  const [profileData, setProfileData] = useState(null);
  const [ipfsProfile, setIpfsProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [friendRequestResult, setFriendRequestResult] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [ipfsStatus, setIpfsStatus] = useState(getIpfsStatus());
  const [showIpfsDetails, setShowIpfsDetails] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  const [checkingBlockchain, setCheckingBlockchain] = useState(false);
  // Friend requests state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [processingAction, setProcessingAction] = useState({});
  const [sendingFunds, setSendingFunds] = useState(false);
  const [sendFundsAmount, setSendFundsAmount] = useState("");
  const [sendFundsError, setSendFundsError] = useState(null);
  const [sendFundsSuccess, setSendFundsSuccess] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const scannerRef = useRef(null);

  // Toggle QR code visibility
  const toggleQrCode = () => {
    setShowQrCode((prev) => !prev);
  };

  // Toggle QR scanner
  const toggleQrScanner = () => {
    if (showQrScanner) {
      stopQrScanner();
    } else {
      setShowQrScanner(true);
    }
  };

  // Stop QR scanner
  const stopQrScanner = async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (error) {
      console.error("Error stopping QR scanner:", error);
    }
    setShowQrScanner(false);
  };

  // Handle search for user by DID
  const handleSearch = async () => {
    if (!searchQuery || !searchQuery.trim()) return;

    try {
      setSearching(true);
      setSearchResult(null);

      // Format the query as a DID if it's not already
      const formattedQuery = searchQuery.startsWith("did:ethr:")
        ? searchQuery
        : `did:ethr:${searchQuery}`;

      // Search for user by DID
      const result = await searchUserByDid(formattedQuery);
      setSearchResult(result);

      if (!result) {
        console.log("User not found with DID:", formattedQuery);
      }
    } catch (error) {
      console.error("Error searching for user:", error);
      setSearchResult({ error: "Error searching for user" });
    } finally {
      setSearching(false);
    }
  };

  // Initialize QR scanner when shown
  useEffect(() => {
    if (showQrScanner && !scannerInitialized) {
      const initScanner = async () => {
        try {
          if (scannerRef.current) {
            const html5QrCode = new Html5Qrcode("qr-reader");

            await html5QrCode.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: 250,
              },
              (decodedText) => {
                // Handle successful scan
                console.log("QR Code detected:", decodedText);
                // Parse the URL to get the DID
                try {
                  const url = new URL(decodedText);
                  const friendToAdd = url.searchParams.get("addFriend");
                  if (friendToAdd) {
                    setSearchQuery(friendToAdd);
                    setTimeout(() => {
                      handleSearch();
                    }, 500);
                    stopQrScanner();
                  }
                } catch (error) {
                  console.error("Error parsing QR code URL:", error);
                }
              },
              (errorMessage) => {
                // Ignore errors while scanning is in progress
                console.debug("QR Code scanning in progress...");
              }
            );

            scannerRef.current = html5QrCode;
            setScannerInitialized(true);
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
  }, [showQrScanner, scannerInitialized, handleSearch]);

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check if user is authenticated
        const authData = localStorage.getItem("liberaChainAuth");
        const profileData = localStorage.getItem("liberaChainIdentity");

        if (!authData) {
          // User is not authenticated, redirect to login
          router.push("/login");
          return;
        }

        const auth = JSON.parse(authData);

        // Check if auth has expired
        if (auth.expiry && auth.expiry < Date.now()) {
          // Auth expired, redirect to login
          localStorage.removeItem("liberaChainAuth");
          router.push("/login");
          return;
        }

        // Load user profile data
        if (profileData) {
          const parsedProfile = JSON.parse(profileData);
          setProfileData(parsedProfile);

          // After loading local profile, check for IPFS profile
          if (parsedProfile.did) {
            loadIpfsProfile(parsedProfile.did);
          }
        }

        // Ensure messaging keys exist
        ensureMessagingKeys();
      } catch (err) {
        console.error("Error checking authentication:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load user profile from IPFS
  const loadIpfsProfile = async (did) => {
    try {
      const ipfsProfileData = await getUserProfileFromIPFS(did);

      if (ipfsProfileData) {
        setIpfsProfile(ipfsProfileData);
        // If we have a username in the IPFS profile, set the input field
        if (ipfsProfileData.username) {
          setUsername(ipfsProfileData.username);
        }
        console.log("Loaded IPFS profile:", ipfsProfileData);
      } else {
        console.log("No IPFS profile found for DID:", did);
      }
    } catch (error) {
      console.error("Error loading IPFS profile:", error);
    }
  };

  // Check for pending friend requests
  const checkForFriendRequests = async () => {
    if (!profileData || !profileData.did) return;

    try {
      setLoadingRequests(true);

      // Get all friend requests (both sent and received)
      const result = await getAllFriendRequests();

      if (result.success) {
        setPendingRequests(
          result.received.filter((req) => req.status === "pending")
        );
        setSentRequests(result.sent);
      } else {
        console.error("Failed to fetch friend requests:", result.error);
      }
    } catch (error) {
      console.error("Error checking for friend requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Check for friend requests when profile data changes
  useEffect(() => {
    if (profileData && profileData.did) {
      checkForFriendRequests();
    }
  }, [profileData]);

  // Ensure messaging keys exist for the user
  const ensureMessagingKeys = async () => {
    try {
      // Check if keys already exist
      const existingKeys = retrieveMessagingKeys();
      if (existingKeys) {
        console.log("Messaging keys already exist");
        return;
      }

      // Generate new keys if they don't exist
      const keys = await generateAsymmetricKeys();
      storeMessagingKeys(keys.privateKey, keys.publicKey, keys.address);

      // Update profile data with messaging key address
      const updatedProfileData = JSON.parse(
        localStorage.getItem("liberaChainIdentity") || "{}"
      );
      setProfileData(updatedProfileData);

      console.log("Generated and stored new messaging keys");
    } catch (error) {
      console.error("Error ensuring messaging keys:", error);
    }
  };

  // Use URL params if they exist (for QR code navigation)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const friendToAdd = params.get("addFriend");

      if (friendToAdd) {
        // Clear the URL parameter to avoid repeated searches on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Set the search query and trigger search
        setSearchQuery(friendToAdd);
        setTimeout(() => {
          handleSearch();
        }, 500);
      }
    }
  }, [handleSearch]);

  // Handle friend request
  const handleFriendRequest = async () => {
    if (!searchResult || !searchResult.found) return;

    try {
      setProcessingRequest(true);

      // Create friend request with encrypted symmetric key
      const result = await createFriendRequest(
        searchResult.did,
        searchResult.publicKey
      );

      // Log the result to console for copying
      console.log(
        "Friend request data (copy this):",
        JSON.stringify(result, null, 2)
      );

      // Set the result for display
      setFriendRequestResult(result);
    } catch (error) {
      console.error("Error creating friend request:", error);
      setFriendRequestResult({ error: error.message });
    } finally {
      setProcessingRequest(false);
    }
  };

  // Check blockchain status
  useEffect(() => {
    const checkBlockchainStatus = async () => {
      try {
        setCheckingBlockchain(true);
        const status = await getBlockchainStatus();
        setBlockchainStatus(status);
      } catch (error) {
        console.error("Error checking blockchain status:", error);
      } finally {
        setCheckingBlockchain(false);
      }
    };

    checkBlockchainStatus();
  }, []);

  if (auth.loading) {
    return <ContentWrapper title="Dashboard"></ContentWrapper>;
  } else if (!auth.isAuthenticated) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 mx-auto text-emerald-500"
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
          <p className="mt-3 text-base text-gray-300">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ContentWrapper title="Dashboard">
        {/* Profile section */}
        <UserProfile
          profileData={profileData}
          ipfsProfile={ipfsProfile}
          showQrCode={showQrCode}
          onToggleQrCode={toggleQrCode}
        />

        {/* Quick Actions */}
        <QuickActions
          pendingRequests={pendingRequests}
          showFriendRequests={showFriendRequests}
          setShowFriendRequests={setShowFriendRequests}
          checkForFriendRequests={checkForFriendRequests}
        />

        {/* Edit Profile Section */}
        <EditProfile
          username={username}
          setUsername={setUsername}
          ipfsProfile={ipfsProfile}
          profileData={profileData}
          savingUsername={savingUsername}
          usernameSuccess={usernameSuccess}
          usernameError={usernameError}
        />

        {/* System Status */}
        <NetworkStatus
          ipfsStatus={ipfsStatus}
          blockchainStatus={blockchainStatus}
          checkingBlockchain={checkingBlockchain}
          showIpfsDetails={showIpfsDetails}
          setShowIpfsDetails={setShowIpfsDetails}
          showBlockchainDetails={showBlockchainDetails}
          setShowBlockchainDetails={setShowBlockchainDetails}
        />
      </ContentWrapper>

      {selectedFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-white mb-4">Send Funds</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Amount (ETH)
                </label>
                <input
                  type="number"
                  value={sendFundsAmount}
                  onChange={(e) => setSendFundsAmount(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                  placeholder="0.01"
                  step="0.001"
                  min="0"
                />
              </div>

              {sendFundsError && (
                <div className="p-2 bg-red-900/20 border border-red-800 rounded-md">
                  <p className="text-sm text-red-400">{sendFundsError}</p>
                </div>
              )}

              {sendFundsSuccess && (
                <div className="p-2 bg-emerald-900/20 border border-emerald-800 rounded-md">
                  <p className="text-sm text-emerald-400">
                    Successfully sent {sendFundsSuccess.amount} ETH
                  </p>
                  <p className="text-xs text-emerald-400 mt-1">
                    Transaction: {sendFundsSuccess.hash}
                  </p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() =>
                    handleSendFunds(selectedFriend, sendFundsAmount)
                  }
                  disabled={sendingFunds}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50"
                >
                  {sendingFunds ? "Sending..." : "Send"}
                </button>
                <button
                  onClick={() => {
                    setSelectedFriend(null);
                    setSendFundsAmount("");
                    setSendFundsError(null);
                    setSendFundsSuccess(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
