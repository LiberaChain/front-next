import BlockchainStatus from "./network/BlockchainStatus";
import IPFSStatus from "./network/IPFSStatus";

export default function NetworkStatus() {
  return (
    <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
      <h2 className="text-lg font-medium text-white">Network Status</h2>
      <p className="text-xs text-gray-400 mt-2 mb-6">
        See the status to see whether application and decentralized services are
        running smoothly.
      </p>

      {/* Blockchain Status */}
      <div className="mb-4 pb-4 border-b border-gray-700">
        <BlockchainStatus />
      </div>

      {/* IPFS Status */}
      <div>
        <IPFSStatus />
      </div>
    </div>
  );
}
