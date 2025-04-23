"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { searchUserByDid, createFriendRequest, generateAsymmetricKeys, storeMessagingKeys, retrieveMessagingKeys } from '../utils/blockchainTransactions';

export default function Dashboard() {
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [friendRequestResult, setFriendRequestResult] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(false);

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
          setProfileData(JSON.parse(profileData));
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
                  <h2 className="text-xl font-bold text-white">{profileData?.displayName || "Anonymous User"}</h2>
                  <p className="text-sm text-gray-400">Decentralized Identity</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-300">Your DID</h3>
                <div className="mt-1 bg-gray-700 rounded-md p-2">
                  <code className="text-xs text-emerald-400 break-all">{profileData?.did || "Not available"}</code>
                </div>
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

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white">Quick Actions</h2>
              <div className="mt-6 grid grid-cols-1 gap-4">
                <Link 
                  href="/chat"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Go to Chat
                </Link>
                <button 
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  onClick={() => alert("Feature coming soon!")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  Manage Wallet
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white">Network Status</h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Blockchain Network</span>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">DID Resolver</span>
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Network</span>
                  <span className="text-sm text-gray-300">Sepolia Testnet</span>
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
          
          {/* Friend Request Section */}
          <div className="mt-8 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <h2 className="text-lg font-medium text-white">Add Friend</h2>
            <p className="mt-1 text-sm text-gray-400">
              Search for other users by their DID and add them as friends for secure encrypted messaging
            </p>
            
            <div className="mt-4 flex space-x-2">
              <input
                type="text"
                className="flex-1 bg-gray-700 rounded-md border border-gray-600 p-2 text-white text-sm focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter DID (did:ethr:0x...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>Search</>
                )}
              </button>
            </div>
            
            {/* Search Results */}
            {searchResult && (
              <div className="mt-4 p-4 rounded-md bg-gray-700">
                {searchResult.found ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-medium text-emerald-400">{searchResult.displayName}</h3>
                        <p className="text-xs text-gray-400 break-all">{searchResult.did}</p>
                      </div>
                      <button
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={handleFriendRequest}
                        disabled={processingRequest}
                      >
                        {processingRequest ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>Send Friend Request</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-red-400">User not found with this DID</p>
                    <p className="text-xs text-gray-400 mt-1">Make sure the DID is correct and try again</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Friend Request Result */}
            {friendRequestResult && !friendRequestResult.error && (
              <div className="mt-4 p-4 rounded-md bg-green-900/20 border border-green-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-medium text-emerald-400">Friend Request Created!</h3>
                  <span className="text-xs text-gray-400">
                    {new Date(friendRequestResult.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-2">
                  Friend request with encrypted symmetric key has been generated. Check your browser console to copy the data.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  <span className="font-medium">From:</span> {friendRequestResult.from}
                </p>
                <p className="text-xs text-gray-400">
                  <span className="font-medium">To:</span> {friendRequestResult.to}
                </p>
                <div className="mt-2">
                  <button
                    className="text-xs text-blue-400 hover:text-blue-300"
                    onClick={() => console.log("Friend request data:", JSON.stringify(friendRequestResult, null, 2))}
                  >
                    Print data to console again
                  </button>
                </div>
              </div>
            )}
            
            {/* Friend Request Error */}
            {friendRequestResult && friendRequestResult.error && (
              <div className="mt-4 p-4 rounded-md bg-red-900/20 border border-red-800">
                <h3 className="text-md font-medium text-red-400">Error Creating Friend Request</h3>
                <p className="text-sm text-gray-300 mt-1">{friendRequestResult.error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}