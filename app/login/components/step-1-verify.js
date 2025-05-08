import Image from 'next/image';

export default function DidVerification({
  isWalletConnected,
  loading,
  connectWallet,
  blockchainVerification,
  userDid,
  didChallenge,
  handleDidVerify,
  onBack
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center text-white">DID Authentication</h3>
      
      <div className="bg-gray-700 p-5 rounded-lg">
        {!isWalletConnected ? (
          <div className="text-center">
            <p className="text-sm text-gray-300 mb-4">
              Connect your Ethereum wallet to authenticate with your decentralized identity
            </p>
            <button
              onClick={connectWallet}
              disabled={loading}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : "Connect Wallet"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <Image 
                src="/qr.png" 
                alt="QR Code" 
                width={180} 
                height={180} 
                className="mx-auto border-4 border-white p-1 rounded-md"
              />
            </div>
            
            {/* Show blockchain verification status */}
            {blockchainVerification.checking && (
              <div className="rounded-md bg-gray-800 p-3 mb-4">
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-gray-300">Verifying blockchain registration...</span>
                </div>
              </div>
            )}
            
            {blockchainVerification.verified && !blockchainVerification.checking && (
              <div className="rounded-md bg-green-900/30 p-3 mb-4">
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="text-sm font-medium text-green-400">Verified on blockchain</span>
                    <p className="text-xs text-gray-300">
                      Registered on {new Date(blockchainVerification.registrationTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-300 mb-4 text-center">
              Scan this QR code with your DID wallet app to authenticate
            </p>
            
            <div className="text-xs text-gray-400 p-2 bg-gray-800 rounded mb-2 overflow-x-auto text-center">
              <code>{userDid}</code>
            </div>
            
            <div className="text-xs text-gray-300 p-2 rounded mb-4">
              <p className="text-center font-medium mb-2">Challenge to sign:</p>
              <div className="bg-gray-800 p-2 rounded">
                <code>{didChallenge}</code>
              </div>
            </div>
            
            <button
              onClick={handleDidVerify}
              disabled={loading || !blockchainVerification.verified}
              className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying signature...
                </>
              ) : (
                <>
                  {!blockchainVerification.verified ? "Account Not Verified" : "Sign & Verify"}
                </>
              )}
            </button>
          </>
        )}
      </div>
      
      <div className="flex items-center justify-center">
        <button
          type="button"
          className="text-sm text-emerald-500 hover:text-emerald-400"
          onClick={onBack}
        >
          Back to login options
        </button>
      </div>
    </div>
  );
}