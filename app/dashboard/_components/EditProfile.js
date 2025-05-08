export default function EditProfile({
  username,
  onUsernameChange,
  savingUsername,
  usernameSuccess,
  usernameError,
  onSaveUsername,
  ipfsProfile,
  profileData
}) {
  return (
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
            onChange={(e) => onUsernameChange(e.target.value)}
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
            onClick={onSaveUsername}
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
              Your profile hasn&apos;t been stored in IPFS yet. Set a username above to create your IPFS profile.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}