"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  searchUserByDid, 
  createFriendRequest, 
  generateAsymmetricKeys, 
  storeMessagingKeys, 
  retrieveMessagingKeys,
  storeUserProfileInIPFS,
  getUserProfileFromIPFS,
  setUserNameForDID,
  getBlockchainStatus,
  checkPendingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getAllFriendRequests
} from '../utils/blockchainTransactions';
import { hasIpfsCredentials, getIpfsStatus } from '../utils/ipfsService';
import { 
  initFriendRequestWatcher, 
  stopFriendRequestWatcher,
  forceCheckFriendRequests,
  resetProcessedRequests
} from '../utils/ipfsFriendWatcher';
import PublicKeyManager from '../components/blockchain/PublicKeyManager';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

export default function Dashboard() {
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [ipfsProfile, setIpfsProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [friendRequestResult, setFriendRequestResult] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [ipfsStatus, setIpfsStatus] = useState(getIpfsStatus());
  const [showIpfsDetails, setShowIpfsDetails] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  const [checkingBlockchain, setCheckingBlockchain] = useState(false);
  // New state for friend requests
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [processingAction, setProcessingAction] = useState({});
  const scannerRef = useRef(null);
  
  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check if user is authenticated
        const authData = localStorage.getItem('liberaChainAuth');
        const profileData = localStorage.getItem('liberaChainIdentity');
        
        if (!authData) {
          // User is not authenticated, redirect to login
          router.push('/login');
          return;
        }
        
        const auth = JSON.parse(authData);
        
        // Check if auth has expired
        if (auth.expiry && auth.expiry < Date.now()) {
          // Auth expired, redirect to login
          localStorage.removeItem('liberaChainAuth');
          router.push('/login');
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
        router.push('/login');
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
        console.log('Loaded IPFS profile:', ipfsProfileData);
      } else {
        console.log('No IPFS profile found for DID:', did);
      }
    } catch (error) {
      console.error('Error loading IPFS profile:', error);
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
        setPendingRequests(result.received.filter(req => req.status === 'pending'));
        setSentRequests(result.sent);
      } else {
        console.error('Failed to fetch friend requests:', result.error);
      }
    } catch (error) {
      console.error('Error checking for friend requests:', error);
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
  
  // Handle friend request acceptance
  const handleAcceptFriendRequest = async (requestId) => {
    try {
      setProcessingAction(prev => ({ ...prev, [requestId]: 'accepting' }));
      
      const result = await acceptFriendRequest(requestId);
      
      if (result.success) {
        // Update the UI by refreshing friend requests and friends list
        checkForFriendRequests();
        loadFriends();
      } else {
        console.error('Failed to accept friend request:', result.error);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setProcessingAction(prev => ({ ...prev, [requestId]: null }));
    }
  };
  
  // Handle friend request rejection
  const handleRejectFriendRequest = async (requestId) => {
    try {
      setProcessingAction(prev => ({ ...prev, [requestId]: 'rejecting' }));
      
      const result = await rejectFriendRequest(requestId);
      
      if (result.success) {
        // Update the UI by refreshing friend requests
        checkForFriendRequests();
      } else {
        console.error('Failed to reject friend request:', result.error);
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setProcessingAction(prev => ({ ...prev, [requestId]: null }));
    }
  };
  
  // Handle saving username to IPFS
  const handleSaveUsername = async () => {
    if (!profileData || !profileData.did || !username.trim()) return;
    
    try {
      setSavingUsername(true);
      setUsernameSuccess(false);
      setUsernameError(null);
      
      // Set username for this DID in IPFS
      const result = await setUserNameForDID(profileData.did, username);
      
      if (result && result.success) {
        setUsernameSuccess(true);
        
        // Also update the local profile data
        const updatedProfile = { ...profileData, displayName: username };
        setProfileData(updatedProfile);
        localStorage.setItem('liberaChainIdentity', JSON.stringify(updatedProfile));
        
        // Reload IPFS profile
        await loadIpfsProfile(profileData.did);
        
        console.log('Username set successfully in IPFS:', result);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUsernameSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error setting username:', error);
      setUsernameError(error.message || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  // Initialize scanner when QR scanner is shown
  useEffect(() => {
    if (showQrScanner && !scannerInitialized) {
      const initScanner = async () => {
        try {
          if (scannerRef.current) {
            const html5QrCode = new Html5Qrcode("qr-reader");
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
  }, [showQrScanner, scannerInitialized]);

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
      const updatedProfileData = JSON.parse(localStorage.getItem('liberaChainIdentity') || '{}');
      setProfileData(updatedProfileData);
      
      console.log("Generated and stored new messaging keys");
    } catch (error) {
      console.error("Error ensuring messaging keys:", error);
    }
  };

  // Generate QR code URL that works with external scanners
  const generateQrCodeUrl = (did) => {
    // If running in a deployed environment, use the actual domain
    // For development, use localhost
    // Note: In a production environment, update this with your actual domain
    const baseUrl = typeof window !== 'undefined' ? 
      window.location.origin : 
      'http://localhost:3000';
    
    // Create a URL that will open the app and navigate to the dashboard with the DID as a parameter
    return `${baseUrl}/dashboard?addFriend=${encodeURIComponent(did)}`;
  };

  // Use URL params if they exist (for QR code navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const friendToAdd = params.get('addFriend');
      
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
  }, []);

  // Handle logout
  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('liberaChainAuth');
    // Redirect to home
    router.push('/');
  };

  // Handle search for user by DID
  const handleSearch = async () => {
    if (!searchQuery || !searchQuery.trim()) return;
    
    try {
      setSearching(true);
      setSearchResult(null);
      
      // Format the query as a DID if it's not already
      const formattedQuery = searchQuery.startsWith('did:ethr:') 
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

  // Handle friend request
  const handleFriendRequest = async () => {
    if (!searchResult || !searchResult.found) return;
    
    try {
      setProcessingRequest(true);
      
      // Create friend request with encrypted symmetric key
      const result = await createFriendRequest(searchResult.did, searchResult.publicKey);
      
      // Log the result to console for copying
      console.log("Friend request data (copy this):", JSON.stringify(result, null, 2));
      
      // Set the result for display
      setFriendRequestResult(result);
    } catch (error) {
      console.error("Error creating friend request:", error);
      setFriendRequestResult({ error: error.message });
    } finally {
      setProcessingRequest(false);
    }
  };

  // Start QR code scanning
  const startQrScanner = async () => {
    if (!scannerRef.current) return;
    
    try {
      await scannerRef.current.start(
       
        (decodedText) => {
          // Handle both direct DID scans and URL-based QR codes
          let didToSearch = decodedText;
          
          // If this is a URL with our addFriend parameter, extract the DID
          if (decodedText.includes('addFriend=')) {
            try {
              const url = new URL(decodedText);
              const params = new URLSearchParams(url.search);
              const extractedDid = params.get('addFriend');
              if (extractedDid) {
                didToSearch = decodeURIComponent(extractedDid);
              }
            } catch (err) {
              console.error("Failed to parse URL from QR code:", err);
            }
          }
          
          // Check if the decoded text is a valid DID
          if (didToSearch && didToSearch.startsWith('did:ethr:')) {
            // Stop scanning once we've found a valid DID
            scannerRef.current.stop().then(() => {
              setShowQrScanner(false);
              // Set the search query to the scanned DID
              setSearchQuery(didToSearch);
              // Automatically search for this DID
              setTimeout(() => {
                handleSearch();
              }, 500);
            }).catch(console.error);
          }
        },
        (errorMessage) => {
          console.error("QR Scan error:", errorMessage);
        }
      ).catch((err) => {
        console.error("Failed to start scanning:", err);
      });
    } catch (error) {
      console.error("Error starting QR scanner:", error);
    }
  };

  // Stop QR code scanning
  const stopQrScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        console.log("QR Scanner stopped");
      }).catch(console.error);
    }
    setShowQrScanner(false);
  };

  // Toggle QR Scanner
  const toggleQrScanner = () => {
    if (showQrScanner) {
      stopQrScanner();
    } else {
      setShowQrScanner(true);
      setShowQrCode(false);
      // We'll start scanning after the component is rendered
      setTimeout(() => {
        startQrScanner();
      }, 500);
    }
  };

  // Toggle QR Code
  const toggleQrCode = () => {
    setShowQrCode(!showQrCode);
    if (showQrScanner) {
      stopQrScanner();
    }
  };

  // Load user's friends from localStorage
  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      
      if (!profileData || !profileData.did) {
        setFriendsList([]);
        return;
      }
      
      // Get friendships from localStorage
      const friendships = JSON.parse(localStorage.getItem('liberaChainFriendships') || '{}');
      const userFriends = friendships[profileData.did] || [];
      
      console.log("User friends DIDs:", userFriends);
      
      // For each friend DID, get their profile information
      const friendsData = await Promise.all(
        userFriends.map(async (did) => {
          // First try to get from IPFS
          const ipfsProfile = await getUserProfileFromIPFS(did);
          
          // If we have IPFS data, use that
          if (ipfsProfile && ipfsProfile.username) {
            return {
              did: did,
              displayName: ipfsProfile.username
            };
          }
          
          // Otherwise, search for user by DID (this is a fallback)
          const userInfo = await searchUserByDid(did);
          if (userInfo && userInfo.found) {
            return {
              did: did,
              displayName: userInfo.displayName
            };
          }
          
          // If all else fails, return minimal info
          return {
            did: did,
            displayName: `User-${did.substring(9, 13)}` // Extract part of the DID as a minimal identifier
          };
        })
      );
      
      console.log("Loaded friends data:", friendsData);
      setFriendsList(friendsData);
    } catch (error) {
      console.error("Error loading friends:", error);
      setFriendsList([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Load friends when profile data changes
  useEffect(() => {
    if (profileData && profileData.did) {
      loadFriends();
    }
  }, [profileData]);

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


  // Show loading state
  if (loading) {
    return (
      <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-base text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <Image 
                    src="/logo.svg" 
                    alt="LiberaChain" 
                    width={32} 
                    height={32} 
                    className="h-8 w-auto" 
                  />
                </Link>
                <span className="ml-2 text-white font-semibold text-lg">LiberaChain</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile section */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <div className="flex items-center space-x-4">
                <div className="bg-emerald-600 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{ipfsProfile?.username || profileData?.displayName || "Anonymous User"}</h2>
                  <p className="text-sm text-gray-400">Decentralized Identity</p>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-300">Your DID</h3>
                  <button 
                    onClick={toggleQrCode}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    {showQrCode ? "Hide QR" : "Show QR"}
                  </button>
                </div>
                <div className="mt-1 bg-gray-700 rounded-md p-2">
                  <code className="text-xs text-emerald-400 break-all">{profileData?.did || "Not available"}</code>
                </div>
                
                {showQrCode && profileData?.did && (
                  <div className="mt-4 flex justify-center flex-col items-center">
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeCanvas 
                        value={generateQrCodeUrl(profileData.did)} 
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Scan with any camera app to add as friend
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-300">Wallet Address</h3>
                <div className="mt-1 bg-gray-700 rounded-md p-2">
                  <code className="text-xs text-blue-400 break-all">{profileData?.wallet || "Not available"}</code>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-300">Account Created</h3>
                <p className="text-sm text-gray-400">
                  {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleString() : "Unknown"}
                </p>
              </div>
            </div>

            {/* Edit Profile Section - NEW */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white">Edit Profile</h2>
              <p className="mt-1 text-sm text-gray-400">
                Your profile information will be stored in IPFS and linked to your DID
              </p>
              
              <div className="mt-6">
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="text"
                    name="username"
                    id="username"
                    className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 pl-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    placeholder="Set your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={30}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-400 sm:text-sm" id="username-max">
                      {username.length}/30
                    </span>
                  </div>
                </div>
                
                {/* Status messages */}
                {usernameSuccess && (
                  <div className="mt-2 text-sm text-emerald-400">
                    Username updated successfully in IPFS!
                  </div>
                )}
                
                {usernameError && (
                  <div className="mt-2 text-sm text-red-400">
                    Error: {usernameError}
                  </div>
                )}
                
                <div className="mt-4">
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                      (savingUsername || !username.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleSaveUsername}
                    disabled={savingUsername || !username.trim()}
                  >
                    {savingUsername ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>Save Username</>
                    )}
                  </button>
                </div>
              </div>
              
              {ipfsProfile && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-300">IPFS Profile Information</h3>
                  
                  <div className="mt-2 bg-gray-700/50 rounded-md p-3">
                    <div className="text-xs text-gray-300">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-gray-400">Username:</div>
                        <div className="col-span-2 text-emerald-400">{ipfsProfile.username || "Not set"}</div>
                        
                        <div className="text-gray-400">Last Updated:</div>
                        <div className="col-span-2">
                          {ipfsProfile.updatedAt ? new Date(ipfsProfile.updatedAt).toLocaleString() : "Unknown"}
                        </div>
                        
                        {ipfsProfile.cid && (
                          <>
                            <div className="text-gray-400">IPFS CID:</div>
                            <div className="col-span-2 text-xs text-blue-400 break-all">{ipfsProfile.cid}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="mt-2 text-xs text-gray-400">
                    Your profile is stored in IPFS and linked to your DID for decentralized access
                  </p>
                </div>
              )}
              
              {profileData?.did && !ipfsProfile && (
                <div className="mt-4">
                  <div className="p-3 rounded-md bg-blue-900/20 border border-blue-800">
                    <p className="text-sm text-blue-400">
                      Your profile hasn't been stored in IPFS yet. Set a username above to create your IPFS profile.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white">Quick Actions</h2>
              <div className="mt-6 grid grid-cols-1 gap-4">
                <Link 
                  href="/chat"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  Go to Chats
                </Link>
                <Link 
                  href="/posts"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  Social Posts
                </Link>
                
                {/* Friend Request Notification Button */}
                <button
                  onClick={() => setShowFriendRequests(!showFriendRequests)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 0114 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Friend Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={checkForFriendRequests}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Status
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white">Network Status</h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Blockchain Network</span>
                  {checkingBlockchain ? (
                    <svg className="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : blockchainStatus?.connected ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {blockchainStatus?.isMock ? 'Not Connected' : 'Disconnected'}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">DID Resolver</span>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Network</span>
                  <span className="text-sm text-gray-300">
                    {blockchainStatus?.name ? `${blockchainStatus.name.charAt(0).toUpperCase() + blockchainStatus.name.slice(1)} Testnet` : 'Sepolia Testnet'}
                  </span>
                </div>
                {blockchainStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Chain ID</span>
                    <span className="text-sm text-gray-300">{blockchainStatus.chainId}</span>
                  </div>
                )}
                {blockchainStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Latest Block</span>
                    <span className="text-sm text-gray-300">{blockchainStatus.latestBlock}</span>
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={() => setShowBlockchainDetails(!showBlockchainDetails)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center mr-4"
                  >
                    {showBlockchainDetails ? 'Hide Blockchain Details' : 'Show Blockchain Details'}
                  </button>
                </div>
                
                {showBlockchainDetails && blockchainStatus && (
                  <div className="mt-2 p-3 bg-gray-700 rounded-md text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-gray-400">RPC URL:</span>
                      <span className="text-gray-300 break-all">{blockchainStatus.rpcUrl}</span>
                      
                      <span className="text-gray-400">Registry:</span>
                      <span className="text-gray-300 break-all">{blockchainStatus.registry}</span>
                      
                      <span className="text-gray-400">Network Name:</span>
                      <span className="text-gray-300">{blockchainStatus.networkName}</span>
                      
                      <span className="text-gray-400">Connection Status:</span>
                      <span className={`text-${blockchainStatus.connected ? 'emerald' : 'red'}-400`}>
                        {blockchainStatus.status}
                      </span>
                    </div>
                    
                    {blockchainStatus.isMock && (
                      <div className="mt-2 p-2 bg-gray-800/50 rounded border border-yellow-800/30">
                        <p className="text-yellow-400">
                          Using mocked blockchain data. Connection to network failed.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">IPFS</span>
                  {ipfsStatus.connected ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Local Storage Mode
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Storage Mode</span>
                  <span className="text-sm text-gray-300">{ipfsStatus.mode === 'distributed' ? 'Distributed (IPFS)' : 'Local (Browser Storage)'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Gateway</span>
                  <span className="text-sm text-gray-300">{ipfsStatus.gateway}</span>
                </div>
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={() => setShowIpfsDetails(!showIpfsDetails)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
                  >
                    {showIpfsDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                
                {showIpfsDetails && (
                  <div className="mt-2 p-3 bg-gray-700 rounded-md text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-gray-400">Node Type:</span>
                      <span className="text-gray-300">{ipfsStatus.nodeType}</span>
                      
                      <span className="text-gray-400">API Endpoint:</span>
                      <span className="text-gray-300">{ipfsStatus.apiEndpoint}</span>
                      
                      <span className="text-gray-400">Health:</span>
                      <span className="text-gray-300">{ipfsStatus.health}</span>
                      
                      {ipfsStatus.mode === 'local_storage' && (
                        <>
                          <span className="text-gray-400">Local Storage Items:</span>
                          <span className="text-gray-300">{ipfsStatus.storageCount}</span>
                        </>
                      )}
                    </div>
                    
                    {ipfsStatus.mode === 'local_storage' && (
                      <div className="mt-2 p-2 bg-gray-800/50 rounded border border-yellow-800/30">
                        <p className="text-yellow-400">
                          Using browser storage as IPFS fallback. Your content is not distributed to the IPFS network.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">IPFS State</span>
                  <span className="text-sm text-gray-300">{ipfsStatus.state || 'Unknown'}</span>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-700">
                  <div className="flex items-center text-sm text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Your connection is secure and decentralized</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Friend Requests Section - NEW */}
          {showFriendRequests && (
            <div className="mt-8 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white flex items-center justify-between">
                <span>Friend Requests</span>
                <button 
                  onClick={() => setShowFriendRequests(false)}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </h2>
              
              {loadingRequests ? (
                <div className="flex justify-center items-center py-8">
                  <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-white mb-4">Pending Requests</h3>
                    
                    {pendingRequests.length > 0 ? (
                      <div className="space-y-4">
                        {pendingRequests.map((request) => (
                          <div key={request.id} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-emerald-400 font-medium">{request.fromName}</h4>
                                <p className="text-xs text-gray-400">{request.from}</p>
                                <p className="text-sm text-gray-300 mt-2">{request.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(request.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAcceptFriendRequest(request.id)}
                                  disabled={processingAction[request.id]}
                                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                                    processingAction[request.id] === 'accepting'
                                      ? 'bg-gray-500 cursor-not-allowed'
                                      : 'bg-emerald-600 hover:bg-emerald-700'
                                  } text-white`}
                                >
                                  {processingAction[request.id] === 'accepting' ? (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleRejectFriendRequest(request.id)}
                                  disabled={processingAction[request.id]}
                                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                                    processingAction[request.id] === 'rejecting'
                                      ? 'bg-gray-500 cursor-not-allowed'
                                      : 'bg-red-600 hover:bg-red-700'
                                  } text-white`}
                                >
                                  {processingAction[request.id] === 'rejecting' ? (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : 'Reject'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-700 p-6 rounded-lg text-center">
                        <p className="text-gray-400">No pending friend requests</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium text-white mb-4">Sent Requests</h3>
                    
                    {sentRequests.length > 0 ? (
                      <div className="space-y-4">
                        {sentRequests.map((request) => (
                          <div key={request.id} className="bg-gray-700 rounded-lg p-4">
                            <div>
                              <div className="flex justify-between">
                                <h4 className="text-blue-400 font-medium">To: {request.to}</h4>
                                <span className="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300">
                                  {request.status === 'pending' ? 'Pending' : 
                                   request.status === 'accepted' ? 'Accepted' : 'Rejected'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mt-2">{request.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(request.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-700 p-6 rounded-lg text-center">
                        <p className="text-gray-400">No sent friend requests</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Add Friend Section - NEW */}
          <div className="mt-8 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <h2 className="text-lg font-medium text-white">Add Friend</h2>
            <p className="mt-1 text-sm text-gray-400">
              Search for friends by their DID (Decentralized Identifier)
            </p>
            
            <div className="mt-6">
              <div className="flex">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    className="block w-full bg-gray-700 border border-gray-600 rounded-l-md py-2 pl-3 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    placeholder="Enter DID (did:ethr:...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
                    (searching || !searchQuery.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {searching ? (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  Search
                </button>
                <button 
                  onClick={toggleQrScanner}
                  className="ml-2 inline-flex items-center px-3 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H5v3a1 1 0 01-2 0V4zm1 9a1 1 0 110 2h3a1 1 0 110 2H4a1 1 0 01-1-1v-3a1 1 0 011-1zm11-9a1 1 0 011 1v3a1 1 0 11-2 0V5h-3a1 1 0 110-2h4a1 1 0 011 1zm-1 9a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 110-2h3v-3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* QR Scanner */}
              {showQrScanner && (
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-white">Scan QR Code</h3>
                    <button 
                      onClick={stopQrScanner}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div id="qr-reader" className="w-full bg-gray-800 rounded-md overflow-hidden" style={{height: '240px'}}></div>
                  <p className="mt-2 text-xs text-gray-400">
                    Point your camera at a friend's QR code to add them
                  </p>
                </div>
              )}
            </div>
            
            {/* Search Results */}
            {searchResult && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Search Results</h3>
                
                {searchResult.error ? (
                  <div className="bg-red-900/20 p-4 rounded-md border border-red-800/30">
                    <p className="text-red-400">{searchResult.error}</p>
                  </div>
                ) : searchResult.found ? (
                  <div className="bg-gray-700 p-4 rounded-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-emerald-400 font-medium">{searchResult.displayName || "Unknown User"}</h4>
                        <p className="text-xs text-gray-400 break-all mt-1">{searchResult.did}</p>
                      </div>
                      <button
                        onClick={handleFriendRequest}
                        disabled={processingRequest}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          processingRequest
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        } text-white`}
                      >
                        {processingRequest ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <>Send Friend Request</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700 p-4 rounded-md">
                    <p className="text-gray-400">No user found with that DID</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Friend Request Result */}
            {friendRequestResult && (
              <div className="mt-4">
                {friendRequestResult.error ? (
                  <div className="bg-red-900/20 p-4 rounded-md border border-red-800/30">
                    <p className="text-red-400">Error: {friendRequestResult.error}</p>
                  </div>
                ) : friendRequestResult.success ? (
                  <div className="bg-emerald-900/20 p-4 rounded-md border border-emerald-800/30">
                    <p className="text-emerald-400">Friend request sent successfully!</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {ipfsStatus.connected 
                        ? "The request has been stored in IPFS and will be visible when your friend logs in."
                        : "The request has been stored locally and will be visible when your friend logs in."}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          {/* Debug Friend Requests Section */}
          <div className="mt-8 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <h2 className="text-lg font-medium text-white">Debug Friend Requests</h2>
            <p className="mt-1 text-sm text-gray-400">
              Use these controls to troubleshoot friend request issues
            </p>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  if (profileData?.did) {
                    console.log('Forcing check for friend requests for DID:', profileData.did);
                    forceCheckFriendRequests(profileData.did);
                    setTimeout(() => {
                      checkForFriendRequests();
                    }, 1000); // Refresh UI after giving the checker time to work
                  } else {
                    console.error('Cannot force check requests: No profile DID available');
                  }
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-yellow-500 text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Force Check for
              <button
                onClick={() => {
                  console.log('Resetting request tracking and forcing check');
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
                  <li>Login with two different users (use two browser windows or incognito mode)</li>
                  <li>Send a friend request from one user to the other</li>
                  <li>In the recipient's dashboard, click "Reset Processed Requests"</li>
                  <li>Then click "Force Check for Requests" to immediately check for new requests</li>
                  <li>The friend request should now appear in the pending requests list</li>
                </ol>
              </div>
            </div>
            
            <div className="mt-4">
              <button 
                onClick={() => {
                  // Display the current state of localStorage for debugging
                  console.log('liberaChainMockIpfs:', JSON.parse(localStorage.getItem('liberaChainMockIpfs') || '{}'));
                  console.log('liberaChainFriendRequests:', JSON.parse(localStorage.getItem('liberaChainFriendRequests') || '{}'));
                  console.log('liberaChainProcessedRequests:', JSON.parse(localStorage.getItem('liberaChainProcessedRequests') || '{}'));
                  console.log('liberaChainProcessedFallbackRequests:', JSON.parse(localStorage.getItem('liberaChainProcessedFallbackRequests') || '{}'));
                  console.log('liberaChainSentFriendRequests:', JSON.parse(localStorage.getItem('liberaChainSentFriendRequests') || '{}'));
                  console.log('liberaChainFriendships:', JSON.parse(localStorage.getItem('liberaChainFriendships') || '{}'));
                }}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Print Storage Debug Info to Console
              </button>
              
              {/* New section to view all IPFS content */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white flex items-center justify-between">
                  <span>Raw IPFS Friend Requests</span>
                  <button
                    onClick={() => {
                      const debugContent = document.getElementById('debug-ipfs-content');
                      if (debugContent) {
                        const mockIpfsStore = JSON.parse(localStorage.getItem('liberaChainMockIpfs') || '{}');
                        let friendRequestHTML = '';
                        
                        // Find all friend request files in mock IPFS
                        Object.entries(mockIpfsStore).forEach(([key, content]) => {
                          if (key.includes('friend-request')) {
                            try {
                              const requestData = JSON.parse(content);
                              const timestamp = new Date(requestData.timestamp).toLocaleString();
                              const isForCurrentUser = requestData.to === profileData?.did;
                              const processed = JSON.parse(localStorage.getItem('liberaChainProcessedRequests') || '{}')[key];
                              
                              friendRequestHTML += `
                                <div class="p-2 mb-2 ${isForCurrentUser ? 'bg-green-900/20 border-green-800/30' : 'bg-gray-700'} rounded-md border">
                                  <div class="text-xs ${isForCurrentUser ? 'text-green-400 font-bold' : 'text-gray-300'}">File: ${key}</div>
                                  <div class="grid grid-cols-2 gap-1 mt-1 text-xs">
                                    <div class="text-gray-400">From:</div>
                                    <div class="text-blue-400">${requestData.from}</div>
                                    <div class="text-gray-400">To:</div>
                                    <div class="text-blue-400">${requestData.to}</div>
                                    <div class="text-gray-400">Status:</div>
                                    <div class="text-yellow-400">${requestData.status}</div>
                                    <div class="text-gray-400">Time:</div>
                                    <div class="text-gray-300">${timestamp}</div>
                                    <div class="text-gray-400">Processed:</div>
                                    <div class="text-gray-300">${processed ? new Date(processed).toLocaleString() : 'No'}</div>
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
                        });
                        
                        if (friendRequestHTML === '') {
                          friendRequestHTML = '<div class="p-2 text-gray-400 text-center">No friend requests found in IPFS</div>';
                        }
                        
                        debugContent.innerHTML = friendRequestHTML;
                      }
                    }}
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh IPFS Data
                  </button>
                </h3>
                <div className="mt-2 p-3 bg-gray-900 rounded-md border border-gray-700 max-h-96 overflow-y-auto">
                  <div id="debug-ipfs-content" className="text-xs">
                    <div className="p-2 text-gray-400 text-center">Click "Refresh IPFS Data" to view all friend requests in IPFS</div>
                  </div>
                </div>
              </div>
              
              {/* Display all processed requests tracking */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-white flex items-center justify-between">
                  <span>Processed Request Tracking</span>
                  <button
                    onClick={() => {
                      const processedContent = document.getElementById('debug-processed-content');
                      if (processedContent) {
                        const processed = JSON.parse(localStorage.getItem('liberaChainProcessedRequests') || '{}');
                        const processedFallback = JSON.parse(localStorage.getItem('liberaChainProcessedFallbackRequests') || '{}');
                        const processedDirect = JSON.parse(localStorage.getItem('liberaChainProcessedDirectRequests') || '{}');
                        
                        let processedHTML = '<div class="mb-3"><strong class="text-blue-400">IPFS Processed:</strong>';
                        
                        if (Object.keys(processed).length === 0) {
                          processedHTML += '<div class="pl-2 text-gray-400">No processed IPFS requests</div>';
                        } else {
                          processedHTML += '<ul class="list-disc pl-5">';
                          Object.entries(processed).forEach(([key, timestamp]) => {
                            processedHTML += `<li class="text-gray-300">${key.substring(0, 30)}... - ${new Date(timestamp).toLocaleString()}</li>`;
                          });
                          processedHTML += '</ul>';
                        }
                        processedHTML += '</div>';
                        
                        processedHTML += '<div class="mb-3"><strong class="text-blue-400">Fallback Processed:</strong>';
                        if (Object.keys(processedFallback).length === 0) {
                          processedHTML += '<div class="pl-2 text-gray-400">No processed fallback requests</div>';
                        } else {
                          processedHTML += '<ul class="list-disc pl-5">';
                          Object.entries(processedFallback).forEach(([key, timestamp]) => {
                            processedHTML += `<li class="text-gray-300">${key.substring(0, 30)}... - ${new Date(timestamp).toLocaleString()}</li>`;
                          });
                          processedHTML += '</                          </ul>';
                        }
                        processedHTML += '</div>';
                        
                        processedHTML += '<div><strong class="text-blue-400">Direct Processed:</strong>';
                        if (Object.keys(processedDirect).length === 0) {
                          processedHTML += '<div class="pl-2 text-gray-400">No processed direct requests</div>';
                        } else {
                          processedHTML += '<ul class="list-disc pl-5">';
                          Object.entries(processedDirect).forEach(([key, timestamp]) => {
                            processedHTML += `<li class="text-gray-300">${key.substring(0, 30)}... - ${new Date(timestamp).toLocaleString()}</li>`;
                          });
                          processedHTML += '</ul>';
                        }
                        processedHTML += '</div>';
                        
                        processedContent.innerHTML = processedHTML;
                      }
                    }}
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Processed Data
                  </button>
                </h3>
                <div className="mt-2 p-3 bg-gray-900 rounded-md border border-gray-700 max-h-64 overflow-y-auto">
                  <div id="debug-processed-content" className="text-xs">
                    <div className="p-2 text-gray-400 text-center">Click "Refresh Processed Data" to view tracking information</div>
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