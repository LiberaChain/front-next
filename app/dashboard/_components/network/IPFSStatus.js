import { IPFSProxyService } from "@core/storage/ipfs/IPFSProxyService";
import {
  ArrowsClockwiseIcon,
  SealCheckIcon,
  SealWarningIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

export default function IPFSStatus() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const IPFS = useRef(IPFSProxyService.getInstance());

  const refresh = async () => {
    if (loading) return;

    await IPFS.current.initialize();

    setLoading(true);
    setStatus(null);

    setTimeout(async () => {
      const status = await IPFS.current.getStatus();
      console.log("IPFS Status:", status);
      setStatus(status);
      setLoading(false);
    }, 200);
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
        <span>IPFS Status</span>
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
        <div className="mt-4 text-gray-500">
          <p>Checking IPFS node status...</p>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">IPFS Node</span>
          {loading ? (
            <ArrowsClockwiseIcon
              className="animate-spin h-5 w-5 text-emerald-500"
              weight="bold"
            />
          ) : status?.connected ? (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              {status.state}
            </span>
          ) : (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
              {status?.state || "Disconnected"}
            </span>
          )}
        </div>

        {!loading && (
          <>
            {status && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Gateway</span>
                  <span className="text-sm text-gray-300">
                    {status.gateway}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Storage Mode</span>
                  <span className="text-sm text-gray-300">{status.mode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Node Type</span>
                  <span className="text-sm text-gray-300">
                    {status.nodeType}
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
                      IPFS node is connected
                    </p>
                    <p className="text-xs text-emerald-500 mt-1">
                      Your data is safely stored and distributed across the IPFS
                      network
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
                      Unable to connect to IPFS network
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      Your data will be stored locally until connection is
                      restored
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
