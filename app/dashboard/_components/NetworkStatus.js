import { useState } from "react";
import BlockchainStatus from "./network/BlockchainStatus";
import IPFSStatus from "./network/IPFSStatus";

export default function NetworkStatus({
  blockchainStatus,
  ipfsStatus,
  checkingBlockchain,
  onRefreshBlockchain,
  onRefreshIpfs,
}) {
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  const [showIpfsDetails, setShowIpfsDetails] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white mb-4">Network Status</h2>

      {/* Blockchain Status */}
      <div className="mb-6 pb-6 border-b border-gray-700">
        <h3 className="text-md font-medium text-white mb-4 flex items-center justify-between">
          <span>Blockchain Status</span>
          <button
            onClick={onRefreshBlockchain}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          </button>
        </h3>
        <BlockchainStatus
          status={blockchainStatus}
          checkingBlockchain={checkingBlockchain}
          onRefresh={onRefreshBlockchain}
        />
      </div>

      {/* IPFS Status */}
      <div>
        <h3 className="text-md font-medium text-white mb-4 flex items-center justify-between">
          <span>IPFS Status</span>
          <button
            onClick={onRefreshIpfs}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          </button>
        </h3>
        <IPFSStatus status={ipfsStatus} onRefresh={onRefreshIpfs} />
      </div>
    </div>
  );
}
