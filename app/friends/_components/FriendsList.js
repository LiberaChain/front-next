export default function FriendsList({
    loading,
    friends
}) {
    if (loading) {
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
                <span>Friends List</span>
            </h2>

            <div className="space-y-4">

                <div className="space-y-4">
                    {friends.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">
                            No friends added.
                        </p>
                    ) : (
                        friends.map((friend) => (
                            <div
                                key={friend}
                                className="flex items-center justify-between bg-gray-700/50 p-4 rounded-lg flex-col"
                            >
                                <div>
                                    <p className="text-white font-medium">{friend.substring(0, 18)}...{friend.substring(friend.length - 8)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
