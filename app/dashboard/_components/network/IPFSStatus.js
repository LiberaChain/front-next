import { useState } from "react";

export default function IPFSStatus({ status, checkingIpfs, onRefresh }) {
  const [showDetails, setShowDetails] = useState(false);

  console.log("IPFSStatus", status, checkingIpfs);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">IPFS Node</span>
        {checkingIpfs ? (
          <svg
            className="animate-spin h-4 w-4 text-emerald-500"
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
        ) : status?.connected ? (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            {status.state}
          </span>
        ) : (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            {status.state}
          </span>
        )}
      </div>

      {status && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Gateway</span>
            <span className="text-sm text-gray-300">{status.gateway}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Peer ID</span>
            <span className="text-sm text-gray-300 font-mono">
              {status.peerId ? status.peerId.slice(0, 10) + "..." : "Unknown"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Connected Peers</span>
            <span className="text-sm text-gray-300">{status.peers || 0}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Storage</span>
            <span className="text-sm text-gray-300">
              {status.storage
                ? `${(status.storage.used / 1024 / 1024).toFixed(2)} MB used`
                : "Unknown"}
            </span>
          </div>
        </>
      )}

      {status?.connected ? (
        <div className="mt-4 bg-emerald-900/20 p-3 rounded-md border border-emerald-800/30">
          <div className="flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-emerald-400 mt-0.5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm text-emerald-400">
                Your data is being safely stored and distributed across the IPFS
                network
              </p>
              <p className="text-xs text-emerald-500 mt-1">
                Connected to {status.peers} peers
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 bg-red-900/20 p-3 rounded-md border border-red-800/30">
          <div className="flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-400 mt-0.5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm text-red-400">
                Unable to connect to IPFS network
              </p>
              <p className="text-xs text-red-500 mt-1">
                Your data will be stored locally until connection is restored
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
