import { useState } from "react";

export default function FriendRequests({
    pendingRequests,
    sentRequests,
    loadingRequests,
    processingAction,
    onAccept,
    onReject,
    onRefresh,
}) {
    const [showSentRequests, setShowSentRequests] = useState(false);

    if (loadingRequests) {
        return (
            <div className="flex justify-center items-center py-8">
                <svg
                    className="animate-spin h-8 w-8 text-emerald-500"
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
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
            <h2 className="text-lg font-medium text-white mb-6 flex items-center justify-between">
                <span>Friend Requests</span>
                <button
                    onClick={onRefresh}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
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
                    Refresh Requests
                </button>
            </h2>

            <div className="space-y-4">
                <div className="flex justify-between mb-4">
                    <button
                        onClick={() => setShowSentRequests(false)}
                        className={`px-4 py-2 text-sm font-medium rounded-md ${!showSentRequests
                            ? "bg-emerald-600 text-white"
                            : "text-gray-300 hover:bg-gray-700"
                            }`}
                    >
                        Received ({pendingRequests.length})
                    </button>
                    {/* <button
            onClick={() => setShowSentRequests(true)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              showSentRequests
                ? "bg-emerald-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            Sent ({sentRequests.length})
          </button> */}
                </div>

                {showSentRequests ? (
                    <div className="space-y-4">
                        {sentRequests.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">No sent requests</p>
                        ) : (
                            sentRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center justify-between bg-gray-700/50 p-4 rounded-lg"
                                >
                                    <div>
                                        <p className="text-white font-medium">{request.to}</p>
                                        <p className="text-sm text-gray-400">
                                            Sent {new Date(request.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="text-yellow-400">Pending</span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingRequests.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">
                                No pending requests
                            </p>
                        ) : (
                            pendingRequests.map((request) => (
                                <div
                                    key={request}
                                    className="flex items-center justify-between bg-gray-700/50 p-4 rounded-lg flex-col"
                                >
                                    <div>
                                        <p className="text-white font-medium">{request.substring(0, 18)}...{request.substring(request.length - 8)}</p>
                                        <p className="text-sm text-gray-400">
                                            {/* Received {new Date(request.timestamp).toLocaleDateString()} */}
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onAccept(request)}
                                            disabled={processingAction[request]}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingAction[request] === "accepting" ? (
                                                <svg
                                                    className="animate-spin h-5 w-5"
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
                                            ) : (
                                                "Accept"
                                            )}
                                        </button>
                                        <button
                                            onClick={() => onReject(request)}
                                            disabled={true || processingAction[request]}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processingAction[request] === "rejecting" ? (
                                                <svg
                                                    className="animate-spin h-5 w-5"
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
                                            ) : (
                                                "Reject"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
