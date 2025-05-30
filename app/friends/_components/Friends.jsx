"use client";

import Link from "next/link";
import Header from "../_components/Header";
import FriendRequests from "../dashboard/_components/FriendRequests";
import AddFriend from "../dashboard/_components/AddFriend";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { getIpfsStatus } from "../_core/utils/ipfsService";

// export const metadata = {
//   title: "Friends",
// };

export default function Friends() {
  //   const router = useRouter();
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

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Header title="Friends">
        <Link
          href="/dashboard"
          className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
        >
          Dashboard
        </Link>
      </Header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Friend Requests Section */}
          <FriendRequests
            pendingRequests={pendingRequests}
            sentRequests={sentRequests}
            loadingRequests={loadingRequests}
            processingAction={processingAction}
            setShowFriendRequests={setShowFriendRequests}
          />

          {/* Add Friend Section */}
          <AddFriend
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            searching={searching}
            searchResult={searchResult}
            handleFriendRequest={handleFriendRequest}
            processingRequest={processingRequest}
            friendRequestResult={friendRequestResult}
            showQrScanner={showQrScanner}
            toggleQrScanner={toggleQrScanner}
            stopQrScanner={stopQrScanner}
            ipfsStatus={ipfsStatus}
          />

          {/* Debug Friend Requests Section */}
          <div className="mt-8 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <h2 className="text-lg font-medium text-white">
              Debug Friend Requests
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Use these controls to troubleshoot friend request issues
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (profileData?.did) {
                    console.log(
                      "Forcing check for friend requests for DID:",
                      profileData.did
                    );
                    forceCheckFriendRequests(profileData.did);
                    setTimeout(() => {
                      checkForFriendRequests();
                    }, 1000); // Refresh UI after giving the checker time to work
                  } else {
                    console.error(
                      "Cannot force check requests: No profile DID available"
                    );
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-yellow-500 text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Force Check Requests
              </button>

              <button
                onClick={() => {
                  console.log("Resetting request tracking and forcing check");
                  resetProcessedRequests();
                  setTimeout(() => {
                    if (profileData?.did) {
                      forceCheckFriendRequests(profileData.did);
                      setTimeout(() => {
                        checkForFriendRequests();
                      }, 1000); // Refresh UI after giving the checker time to work
                    }
                  }, 500);
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-purple-500 text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset Processed Requests
              </button>
            </div>

            <div className="mt-4">
              <div className="p-3 rounded-md bg-blue-900/20 border border-blue-800">
                <p className="text-sm text-blue-400">
                  <strong>How to test friend requests:</strong>
                </p>
                <ol className="mt-2 text-xs text-blue-300 list-decimal list-inside space-y-1">
                  <li>
                    Login with two different users (use two browser windows or
                    incognito mode)
                  </li>
                  <li>Send a friend request from one user to the other</li>
                  <li>
                    In the recipient&apos;s dashboard, click &quot;Reset
                    Processed Requests&quot;
                  </li>
                  <li>
                    Then click &quot;Force Check for Requests&quot; to
                    immediately check for new requests
                  </li>
                  <li>
                    The friend request should now appear in the pending requests
                    list
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  // Display the current state of localStorage for debugging
                  console.log(
                    "liberaChainMockIpfs:",
                    JSON.parse(
                      localStorage.getItem("liberaChainMockIpfs") || "{}"
                    )
                  );
                  console.log(
                    "liberaChainFriendRequests:",
                    JSON.parse(
                      localStorage.getItem("liberaChainFriendRequests") || "{}"
                    )
                  );
                  console.log(
                    "liberaChainProcessedRequests:",
                    JSON.parse(
                      localStorage.getItem("liberaChainProcessedRequests") ||
                        "{}"
                    )
                  );
                  console.log(
                    "liberaChainProcessedFallbackRequests:",
                    JSON.parse(
                      localStorage.getItem(
                        "liberaChainProcessedFallbackRequests"
                      ) || "{}"
                    )
                  );
                  console.log(
                    "liberaChainSentFriendRequests:",
                    JSON.parse(
                      localStorage.getItem("liberaChainSentFriendRequests") ||
                        "{}"
                    )
                  );
                  console.log(
                    "liberaChainFriendships:",
                    JSON.parse(
                      localStorage.getItem("liberaChainFriendships") || "{}"
                    )
                  );
                }}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center mb-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Print Storage Debug Info to Console
              </button>

              {/* New section to view all IPFS content */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white flex items-center justify-between">
                  <span>Raw IPFS Friend Requests</span>
                  <button
                    onClick={() => {
                      const debugContent =
                        document.getElementById("debug-ipfs-content");
                      if (debugContent) {
                        const mockIpfsStore = JSON.parse(
                          localStorage.getItem("liberaChainMockIpfs") || "{}"
                        );
                        let friendRequestHTML = "";

                        // Find all friend request files in mock IPFS
                        Object.entries(mockIpfsStore).forEach(
                          ([key, content]) => {
                            if (key.includes("friend-request")) {
                              try {
                                const requestData = JSON.parse(content);
                                const timestamp = new Date(
                                  requestData.timestamp
                                ).toLocaleString();
                                const isForCurrentUser =
                                  requestData.to === profileData?.did;
                                const processed = JSON.parse(
                                  localStorage.getItem(
                                    "liberaChainProcessedRequests"
                                  ) || "{}"
                                )[key];

                                friendRequestHTML += `
                                <div class="p-2 mb-2 ${
                                  isForCurrentUser
                                    ? "bg-green-900/20 border-green-800/30"
                                    : "bg-gray-700"
                                } rounded-md border">
                                  <div class="text-xs ${
                                    isForCurrentUser
                                      ? "text-green-400 font-bold"
                                      : "text-gray-300"
                                  }">File: ${key}</div>
                                  <div class="grid grid-cols-2 gap-1 mt-1 text-xs">
                                    <div class="text-gray-400">From:</div>
                                    <div class="text-blue-400">${
                                      requestData.from
                                    }</div>
                                    <div class="text-gray-400">To:</div>
                                    <div class="text-blue-400">${
                                      requestData.to
                                    }</div>
                                    <div class="text-gray-400">Status:</div>
                                    <div class="text-yellow-400">${
                                      requestData.status
                                    }</div>
                                    <div class="text-gray-400">Time:</div>
                                    <div class="text-gray-300">${timestamp}</div>
                                    <div class="text-gray-400">Processed:</div>
                                    <div class="text-gray-300">${
                                      processed
                                        ? new Date(processed).toLocaleString()
                                        : "No"
                                    }</div>
                                  </div>
                                </div>
                              `;
                              } catch (err) {
                                friendRequestHTML += `
                                <div class="p-2 mb-2 bg-red-900/20 rounded-md border border-red-800/30">
                                  <div class="text-xs text-red-400">Error parsing: ${key}</div>
                                  <div class="text-xs text-gray-400">${err.message}</div>
                                </div>
                              `;
                              }
                            }
                          }
                        );

                        if (friendRequestHTML === "") {
                          friendRequestHTML =
                            '<div class="p-2 text-gray-400 text-center">No friend requests found in IPFS</div>';
                        }

                        debugContent.innerHTML = friendRequestHTML;
                      }
                    }}
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh IPFS Data
                  </button>
                </h3>
                <div className="mt-2 p-3 bg-gray-900 rounded-md border border-gray-700 max-h-96 overflow-y-auto">
                  <div id="debug-ipfs-content" className="text-xs">
                    <div className="p-2 text-gray-400 text-center">
                      Click &quot;Refresh IPFS Data&quot; to view all friend
                      requests in IPFS
                    </div>
                  </div>
                </div>
              </div>

              {/* Display all processed requests tracking */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white flex items-center justify-between">
                  <span>Processed Request Tracking</span>
                  <button
                    onClick={() => {
                      const processedContent = document.getElementById(
                        "debug-processed-content"
                      );
                      if (processedContent) {
                        const processed = JSON.parse(
                          localStorage.getItem(
                            "liberaChainProcessedRequests"
                          ) || "{}"
                        );
                        const processedFallback = JSON.parse(
                          localStorage.getItem(
                            "liberaChainProcessedFallbackRequests"
                          ) || "{}"
                        );
                        const processedDirect = JSON.parse(
                          localStorage.getItem(
                            "liberaChainProcessedDirectRequests"
                          ) || "{}"
                        );

                        let processedHTML =
                          '<div class="mb-3"><strong class="text-blue-400">IPFS Processed:</strong>';

                        if (Object.keys(processed).length === 0) {
                          processedHTML +=
                            '<div class="pl-2 text-gray-400">No processed IPFS requests</div>';
                        } else {
                          processedHTML += '<ul class="list-disc pl-5">';
                          Object.entries(processed).forEach(
                            ([key, timestamp]) => {
                              processedHTML += `<li class="text-gray-300">${key.substring(
                                0,
                                30
                              )}... - ${new Date(
                                timestamp
                              ).toLocaleString()}</li>`;
                            }
                          );
                          processedHTML += "</ul>";
                        }
                        processedHTML += "</div>";

                        processedHTML +=
                          '<div class="mb-3"><strong class="text-blue-400">Fallback Processed:</strong>';
                        if (Object.keys(processedFallback).length === 0) {
                          processedHTML +=
                            '<div class="pl-2 text-gray-400">No processed fallback requests</div>';
                        } else {
                          processedHTML += '<ul class="list-disc pl-5">';
                          Object.entries(processedFallback).forEach(
                            ([key, timestamp]) => {
                              processedHTML += `<li class="text-gray-300">${key.substring(
                                0,
                                30
                              )}... - ${new Date(
                                timestamp
                              ).toLocaleString()}</li>`;
                            }
                          );
                          processedHTML += "</ul>";
                        }
                        processedHTML += "</div>";

                        processedHTML +=
                          '<div><strong class="text-blue-400">Direct Processed:</strong>';
                        if (Object.keys(processedDirect).length === 0) {
                          processedHTML +=
                            '<div class="pl-2 text-gray-400">No processed direct requests</div>';
                        } else {
                          processedHTML += '<ul class="list-disc pl-5">';
                          Object.entries(processedDirect).forEach(
                            ([key, timestamp]) => {
                              processedHTML += `<li class="text-gray-300">${key.substring(
                                0,
                                30
                              )}... - ${new Date(
                                timestamp
                              ).toLocaleString()}</li>`;
                            }
                          );
                          processedHTML += "</ul>";
                        }
                        processedHTML += "</div>";

                        processedContent.innerHTML = processedHTML;
                      }
                    }}
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh Processed Data
                  </button>
                </h3>
                <div className="mt-2 p-3 bg-gray-900 rounded-md border border-gray-700 max-h-64 overflow-y-auto">
                  <div id="debug-processed-content" className="text-xs">
                    <div className="p-2 text-gray-400 text-center">
                      Click &quot;Refresh Processed Data&quot; to view tracking
                      information
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
