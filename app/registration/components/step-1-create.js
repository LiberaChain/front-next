export default function CreateDidStep({
  didCreated,
  loading,
  onConnectWallet,
  didIdentifier,
  blockchainVerification,
  keyPair,
  walletAddress,
  displayName,
  onDisplayNameChange,
  error,
  onBack,
  onNext
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Create your DID</h3>
        <p className="mt-1 text-sm text-gray-400">
          A decentralized identifier (DID) is a unique identity that you control, not any central authority.
        </p>
      </div>

      {!didCreated ? (
        <div className="flex flex-col items-center justify-center py-4">
          <button
            onClick={onConnectWallet}
            disabled={loading}
            className="flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415z" clipRule="evenodd" />
                </svg>
                Connect Wallet
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md bg-gray-700 p-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-300">Your DID:</span>
              <code className="mt-1 text-xs text-emerald-400 break-all">{didIdentifier}</code>
              <p className="mt-2 text-xs text-gray-400">
                This is your unique decentralized identifier derived from your wallet address. Keep it safe!
              </p>
            </div>
          </div>
          
          {blockchainVerification.checking && (
            <div className="rounded-md bg-gray-700 p-4">
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-300">Checking blockchain registration...</span>
              </div>
            </div>
          )}
          
          {blockchainVerification.verified && !blockchainVerification.checking && (
            <div className="rounded-md bg-green-900/30 p-4">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-green-400">Already registered on blockchain</span>
                  <p className="text-xs text-gray-300 mt-1">
                    Your identity was registered on {new Date(blockchainVerification.registrationTime).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!blockchainVerification.verified && !blockchainVerification.checking && keyPair && (
            <div className="rounded-md bg-gray-700 p-4">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-300">Messaging Key Generated:</span>
                <code className="mt-1 text-xs text-emerald-400 break-all">{keyPair.address}</code>
                <p className="mt-2 text-xs text-gray-400">
                  A secure messaging key pair has been generated. Your public key will be stored on-chain, 
                  and your private key will be securely stored in your local wallet.
                </p>
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-300">
              Display Name (optional)
            </label>
            <div className="mt-1">
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder={`User-${walletAddress ? walletAddress.substring(2, 8) : 'XXX'}`}
                className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                A human-readable name for your DID. This is stored locally and not on a central server.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-900/40 p-4">
          <div className="flex">
            <div className="text-sm text-red-400">{error}</div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }} className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex justify-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 shadow-sm hover:bg-gray-600 focus:outline-none"
          >
            Back
          </button>
          
          <button
            type="submit"
            disabled={!didCreated || loading}
            className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {blockchainVerification.verified ? 'Completing...' : 'Registering on Blockchain...'}
              </>
            ) : (blockchainVerification.verified ? "Complete Registration" : "Register on Blockchain")}
          </button>
        </div>
      </form>
    </div>
  );
}