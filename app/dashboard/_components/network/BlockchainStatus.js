import { BlockchainService } from "@core/blockchain/BlockchainService";
import {
  ArrowsClockwiseIcon,
  SealCheckIcon,
  SealWarningIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

export default function BlockchainStatus() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const blockchain = useRef(BlockchainService.getInstance());

  const refresh = async () => {
    if (loading) return;

    await blockchain.current.initialize();

    setLoading(true);
    setStatus(null);

    setTimeout(async () => {
      const status = await blockchain.current.getStatus();
      console.log("Blockchain Status:", status);
      setStatus(status);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    async function fetchStatus() {
      await refresh();
    }
    fetchStatus();
  }, []);

  return (
    <>
      <h3 className="text-md font-medium text-white mb-4 flex items-center justify-between">
        <span>Blockchain Status</span>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center justify-center px-2 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <ArrowsClockwiseIcon
            className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
            weight="bold"
          />
        </button>
      </h3>

      {!status && loading && (
        <div className="mt-4 text-gray-500 text-sm">
          <p>Checking blockchain node status...</p>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Blockchain Node</span>
          {loading ? (
            <ArrowsClockwiseIcon
              className="animate-spin h-5 w-5 text-emerald-500"
              weight="bold"
            />
          ) : status?.connected ? (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              {status?.status}
            </span>
          ) : (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
              {status?.status || "Disconnected"}
            </span>
          )}
        </div>

        {!loading && (
          <>
            {!!status && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Network</span>
                  <span className="text-sm text-gray-300">
                    {status.networkName || "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Latest Block</span>
                  <span className="text-sm text-gray-300">
                    #{status.latestBlock || "0"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Gas Price</span>
                  <span className="text-sm text-gray-300">
                    {status.gasPrice
                      ? `${(status.gasPrice / 1e9).toFixed(6)} Gwei`
                      : "Unknown"}
                  </span>
                </div>
              </>
            )}

            {status?.connected ? (
              <div className="mt-4 bg-emerald-900/20 p-3 rounded-md border border-emerald-800/30">
                <div className="flex items-start">
                  <SealCheckIcon
                    className="h-5 w-5 text-green-400 mt-0.5 mr-2"
                    weight="bold"
                  />
                  <div>
                    <p className="text-sm text-emerald-400">
                      Connected to blockchain network
                    </p>
                    <p className="text-xs text-emerald-500 mt-1">
                      Latest block: #{status.latestBlock}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-red-900/20 p-3 rounded-md border border-red-800/30">
                <div className="flex items-start">
                  <SealWarningIcon
                    className="h-5 w-5 text-red-400 mt-0.5 mr-2"
                    weight="bold"
                  />
                  <div>
                    <p className="text-sm text-red-400">
                      Unable to connect to blockchain network
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      Please check your network connection
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
