"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getUserGroups,
  getPublicGroups,
  createGroup,
} from "../utils/groupsService";
import Header from "../_components/Header";
import AuthenticatedContentWrapper from "../_components/AuthenticatedContentWrapper";

// export const metadata = {
//   title: "Groups",
// };

export default function GroupsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // For new group creation
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        const authData = localStorage.getItem("liberaChainAuth");
        const profileData = localStorage.getItem("liberaChainIdentity");

        if (!authData) {
          // User is not authenticated, redirect to login
          router.push("/login");
          return;
        }

        const auth = JSON.parse(authData);

        // Check if auth has expired
        if (auth.expiry && auth.expiry < Date.now()) {
          // Auth expired, redirect to login
          localStorage.removeItem("liberaChainAuth");
          router.push("/login");
          return;
        }

        // Load user profile data
        if (profileData) {
          const parsedProfile = JSON.parse(profileData);
          setProfileData(parsedProfile);

          // Load user's groups and public groups
          await loadGroups(parsedProfile.did);
        }
      } catch (err) {
        console.error("Error checking authentication:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load user's groups and public groups
  const loadGroups = async (userDid) => {
    try {
      setLoading(true);
      setError(null);

      // Get groups the user is a member of
      const userGroups = await getUserGroups(userDid);
      setMyGroups(userGroups);

      // Get public groups the user is not a member of
      const allPublicGroups = await getPublicGroups();

      // Filter out groups the user is already a member of
      const userGroupDids = userGroups.map((group) => group.did);
      const filteredPublicGroups = allPublicGroups.filter(
        (group) => !userGroupDids.includes(group.did)
      );

      setPublicGroups(filteredPublicGroups);
    } catch (error) {
      console.error("Error loading groups:", error);
      setError("Failed to load groups. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Create a new group
  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (!profileData || !profileData.did) return;
    if (!groupName.trim()) {
      setCreateError("Group name is required");
      return;
    }

    try {
      setCreatingGroup(true);
      setCreateError(null);

      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        adminDid: profileData.did,
        isPublic: isPublic,
        metadata: {
          createdBy: profileData.displayName || profileData.did,
          createdAt: Date.now(),
        },
      };

      const result = await createGroup(groupData);

      if (result.success) {
        setSuccess(`Group "${groupName}" created successfully!`);

        // Reset form
        setGroupName("");
        setGroupDescription("");
        setIsPublic(true);
        setShowCreateForm(false);

        // Reload groups
        await loadGroups(profileData.did);
      } else {
        setCreateError(result.error || "Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      setCreateError(error.message || "An unexpected error occurred");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 mx-auto text-emerald-500"
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
          <p className="mt-3 text-base text-gray-300">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedContentWrapper title="Groups">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700 mb-6">
          {/* Create Group button and success message */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Groups</h1>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
            >
              {showCreateForm ? "Cancel" : "Create Group"}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-900/30 border border-red-800/50">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-md bg-emerald-900/30 border border-emerald-800/50">
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}

          {/* Create Group Form */}
          {showCreateForm && (
            <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 mb-6">
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Create New Group
                </h2>

                <form onSubmit={handleCreateGroup}>
                  <div className="mb-4">
                    <label
                      htmlFor="groupName"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Group Name
                    </label>
                    <input
                      type="text"
                      name="groupName"
                      id="groupName"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="mt-1 p-3 focus:ring-emerald-500 focus:border-emerald-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                      placeholder="Enter group name"
                    />
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="groupDescription"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Description
                    </label>
                    <textarea
                      id="groupDescription"
                      name="groupDescription"
                      rows={3}
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      className="mt-1 p-3 focus:ring-emerald-500 focus:border-emerald-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                      placeholder="Describe your group (optional)"
                    />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center">
                      <input
                        id="isPublic"
                        name="isPublic"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-600 rounded"
                      />
                      <label
                        htmlFor="isPublic"
                        className="ml-2 block text-sm text-gray-300"
                      >
                        Public Group (anyone can find and join)
                      </label>
                    </div>
                  </div>

                  {createError && (
                    <div className="mb-4 p-3 rounded-md bg-red-900/30 border border-red-800/50">
                      <p className="text-sm text-red-400">{createError}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="mr-3 inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingGroup}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      {creatingGroup ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Creating...
                        </>
                      ) : (
                        <>Create Group</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* My Groups */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">My Groups</h2>

            {myGroups.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-300">
                  You are not a member of any groups yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {myGroups.map((group) => (
                  <Link
                    href={`/groups/${group.did}`}
                    key={group.did}
                    className="block bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 hover:border-emerald-600 transition-colors"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">
                          {group.name}
                        </h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                          {group.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-300 line-clamp-2">
                        {group.description || "No description"}
                      </p>
                      <div className="mt-4 flex items-center text-sm">
                        <div className="text-gray-400 mr-4">
                          <span className="font-semibold text-emerald-400">
                            {group.memberCount}
                          </span>{" "}
                          members
                        </div>
                        <div className="text-gray-400">
                          <span className="font-semibold text-emerald-400">
                            {group.postCount}
                          </span>{" "}
                          posts
                        </div>
                      </div>
                      {group.adminDid === profileData?.did && (
                        <div className="mt-2">
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-900/30 text-purple-400 border border-purple-800/50">
                            You are admin
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Public Groups */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Public Groups</h2>

            {publicGroups.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-300">
                  No public groups available to join.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {publicGroups.map((group) => (
                  <Link
                    href={`/groups/${group.did}`}
                    key={group.did}
                    className="block bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 hover:border-emerald-600 transition-colors"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">
                          {group.name}
                        </h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                          Public
                        </span>
                      </div>
                      <p className="mt-2 text-gray-300 line-clamp-2">
                        {group.description || "No description"}
                      </p>
                      <div className="mt-4 flex items-center text-sm">
                        <div className="text-gray-400 mr-4">
                          <span className="font-semibold text-emerald-400">
                            {group.memberCount}
                          </span>{" "}
                          members
                        </div>
                        <div className="text-gray-400">
                          <span className="font-semibold text-emerald-400">
                            {group.postCount}
                          </span>{" "}
                          posts
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedContentWrapper>
  );
}
