import { useState, useRef } from 'react';

export default function AddFriend({
  searchQuery,
  setSearchQuery,
  searchResult,
  searching,
  processingRequest,
  friendRequestResult,
  onSearch,
  onSendRequest,
  onScanQR,
  onShowQR,
  showQrScanner,
  showQrCode,
  ipfsStatus
}) {
  const scannerRef = useRef(null);

  return (
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
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
          <button
            type="button"
            onClick={onSearch}
            disabled={!searchQuery.trim() || searching}
            className={`inline-flex items-center px-4 py-2 border border-l-0 border-gray-600 text-sm font-medium rounded-r-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
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
        </div>
        
        {/* QR Code Actions */}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={onScanQR}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            {showQrScanner ? 'Stop Scanning' : 'Scan QR Code'}
          </button>
          <button
            onClick={onShowQR}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            {showQrCode ? 'Hide QR Code' : 'Show My QR Code'}
          </button>
        </div>

        {/* QR Scanner */}
        {showQrScanner && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-white">Scan QR Code</h3>
              <button 
                onClick={onScanQR}
                className="text-xs text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div 
              id="qr-reader" 
              ref={scannerRef}
              className="w-full bg-gray-800 rounded-md overflow-hidden" 
              style={{height: '240px'}}
            ></div>
            <p className="mt-2 text-xs text-gray-400">
              Point your camera at a friend&apos;s QR code to add them
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
                  onClick={() => onSendRequest(searchResult)}
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
              <p className="text-xs text-emerald-400 mt-1">
                {ipfsStatus.connected 
                  ? "The request has been stored in IPFS and will be visible when your friend logs in."
                  : "The request has been stored locally and will be visible when your friend logs in."}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}