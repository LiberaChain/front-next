"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  getGroupPosts, 
  joinGroup, 
  leaveGroup, 
  createGroupPost 
} from '../../_core/groupsService';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId;
  
  const [loading, setLoading] = useState(true);
  const [groupLoading, setGroupLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  
  // For new post creation
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);
  const [postError, setPostError] = useState(null);
  const [postSuccess, setPostSuccess] = useState(null);

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        // Check if user is authenticated
        const authData = localStorage.getItem('liberaChainAuth');
        const profileData = localStorage.getItem('liberaChainIdentity');
        
        if (!authData) {
          // User is not authenticated, redirect to login
          router.push('/login');
          return;
        }
        
        const auth = JSON.parse(authData);
        
        // Check if auth has expired
        if (auth.expiry && auth.expiry < Date.now()) {
          // Auth expired, redirect to login
          localStorage.removeItem('liberaChainAuth');
          router.push('/login');
          return;
        }
        
        // Load user profile data
        if (profileData) {
          const parsedProfile = JSON.parse(profileData);
          setProfileData(parsedProfile);
          
          // Load group data and posts
          loadGroupData(groupId, parsedProfile.did);
        }
      } catch (err) {
        console.error("Error checking authentication:", err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, groupId]);

  // Load group data and posts
  const loadGroupData = async (groupId, userDid) => {
    try {
      setGroupLoading(true);
      
      // Get group details from blockchain
      const contract = await getGroupRegistryContract(false);
      
      // Get basic group data
      const groupData = await contract.getGroup(groupId);
      
      if (!groupData || !groupData.did) {
        setError('Group not found');
        return;
      }
      
      const formattedGroup = {
        did: groupData.did,
        name: groupData.name,
        description: groupData.description,
        adminDid: groupData.adminDid,
        memberCount: groupData.memberCount.toNumber(),
        postCount: groupData.postCount.toNumber(),
        creationTime: new Date(groupData.creationTime.toNumber() * 1000),
        ipfsCid: groupData.ipfsCid,
        isPublic: groupData.isPublic
      };
      
      setGroupData(formattedGroup);
      
      // Check if user is a member or admin
      const memberCheck = await contract.isMember(groupId, userDid);
      setIsMember(memberCheck);
      setIsAdmin(formattedGroup.adminDid === userDid);
      
      // Get group posts if user is a member or group is public
      if (memberCheck || formattedGroup.isPublic) {
        await loadGroupPosts(groupId, userDid);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      setError(error.message || 'Failed to load group data');
    } finally {
      setGroupLoading(false);
    }
  };

  // Load group posts
  const loadGroupPosts = async (groupId, userDid) => {
    try {
      setPostsLoading(true);
      
      const groupPosts = await getGroupPosts(groupId, userDid);
      setPosts(groupPosts);
    } catch (error) {
      console.error('Error loading group posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // Join this group
  const handleJoinGroup = async () => {
    if (!profileData || !profileData.did || !groupData) return;
    
    try {
      setJoiningGroup(true);
      setError(null);
      setSuccess(null);
      
      const joinResult = await joinGroup(groupData.did, profileData.did);
      
      if (joinResult.success) {
        if (joinResult.alreadyMember) {
          setSuccess('You are already a member of this group');
        } else {
          setSuccess('You have successfully joined this group!');
          
          // Update local state
          setIsMember(true);
          setGroupData({
            ...groupData,
            memberCount: groupData.memberCount + 1
          });
          
          // Load posts now that the user is a member
          await loadGroupPosts(groupData.did, profileData.did);
        }
      } else {
        setError(joinResult.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setJoiningGroup(false);
    }
  };

  // Leave this group
  const handleLeaveGroup = async () => {
    if (!profileData || !profileData.did || !groupData) return;
    
    try {
      setLeavingGroup(true);
      setError(null);
      setSuccess(null);
      
      // Prevent admin from leaving their own group
      if (isAdmin) {
        setError('As the group admin, you cannot leave your own group');
        return;
      }
      
      const leaveResult = await leaveGroup(groupData.did, profileData.did);
      
      if (leaveResult.success) {
        setSuccess('You have left the group');
        
        // Update local state
        setIsMember(false);
        setGroupData({
          ...groupData,
          memberCount: Math.max(0, groupData.memberCount - 1)
        });
        
        // Clear posts since user is no longer a member
        if (!groupData.isPublic) {
          setPosts([]);
        }
      } else {
        setError(leaveResult.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLeavingGroup(false);
    }
  };

  // Create a new post in this group
  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!profileData || !profileData.did || !groupData) return;
    if (!postTitle.trim() || !postContent.trim()) {
      setPostError('Title and content are required');
      return;
    }
    
    try {
      setCreatingPost(true);
      setPostError(null);
      setPostSuccess(null);
      
      const postData = {
        title: postTitle,
        content: postContent,
        authorDid: profileData.did,
        authorName: profileData.displayName || `User-${profileData.did.substring(8, 16)}`,
        visibility: 'group',
        contentType: 'text',
        timestamp: Date.now(),
        group: groupData.did
      };
      
      const postResult = await createGroupPost(postData, groupData.did);
      
      if (postResult.success) {
        setPostSuccess('Your post has been published to the group!');
        
        // Reset form
        setPostTitle('');
        setPostContent('');
        setShowPostForm(false);
        
        // Update local state
        setGroupData({
          ...groupData,
          postCount: groupData.postCount + 1
        });
        
        // Reload posts
        await loadGroupPosts(groupData.did, profileData.did);
      } else {
        setPostError(postResult.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setPostError(error.message || 'An unexpected error occurred');
    } finally {
      setCreatingPost(false);
    }
  };

  // Show loading state
  if (loading || groupLoading) {
    return (
      <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-base text-gray-300">Loading group...</p>
        </div>
      </div>
    );
  }

  // Show error if group not found
  if (error && !groupData) {
    return (
      <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-6 max-w-md mx-auto">
            <h2 className="text-xl font-medium text-red-400">Error</h2>
            <p className="mt-2 text-gray-300">{error}</p>
            <div className="mt-4">
              <Link
                href="/groups"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
              >
                Back to Groups
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <Image 
                    src="/logo.svg" 
                    alt="LiberaChain" 
                    width={32} 
                    height={32} 
                    className="h-8 w-auto" 
                  />
                </Link>
                <div className="ml-2">
                  <Link href="/groups" className="text-gray-400 hover:text-white text-sm">
                    Groups
                  </Link>
                  <span className="text-gray-600 mx-2">/</span>
                  <span className="text-white font-semibold text-lg">{groupData?.name || 'Group'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Group Header */}
          <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-white mr-3">{groupData?.name}</h1>
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                    {groupData?.isPublic ? 'Public' : 'Private'} Group
                  </span>
                </div>
                <p className="mt-2 text-gray-300">{groupData?.description}</p>
                
                <div className="mt-4 flex flex-wrap items-center text-sm text-gray-400">
                  <div className="mr-6 mb-2">
                    <span className="font-semibold text-emerald-400">{groupData?.memberCount}</span> members
                  </div>
                  <div className="mr-6 mb-2">
                    <span className="font-semibold text-emerald-400">{groupData?.postCount}</span> posts
                  </div>
                  <div className="mb-2">
                    Created <span className="font-medium">{groupData?.creationTime.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 flex space-x-3">
                {!isMember ? (
                  <button
                    onClick={handleJoinGroup}
                    disabled={joiningGroup}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500 disabled:opacity-50"
                  >
                    {joiningGroup ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Joining...
                      </>
                    ) : (
                      <>Join Group</>
                    )}
                  </button>
                ) : (
                  <>
                    {isMember && !isAdmin && (
                      <button
                        onClick={handleLeaveGroup}
                        disabled={leavingGroup}
                        className="inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 disabled:opacity-50"
                      >
                        {leavingGroup ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Leaving...
                          </>
                        ) : (
                          <>Leave Group</>
                        )}
                      </button>
                    )}
                    
                    {isMember && (
                      <button
                        onClick={() => setShowPostForm(!showPostForm)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500"
                      >
                        {showPostForm ? 'Cancel' : 'Create Post'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Status messages */}
            {error && (
              <div className="mt-4 p-3 rounded-md bg-red-900/30 border border-red-800/50">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mt-4 p-3 rounded-md bg-emerald-900/30 border border-emerald-800/50">
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}
          </div>
          
          {/* Post Form */}
          {showPostForm && (
            <div className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700 mb-6">
              <div className="p-6">
                <h2 className="text-xl font-bold text-white mb-4">Create Post</h2>
                
                <form onSubmit={handleCreatePost}>
                  <div className="mb-4">
                    <label htmlFor="postTitle" className="block text-sm font-medium text-gray-300">
                      Title
                    </label>
                    <input
                      type="text"
                      name="postTitle"
                      id="postTitle"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="mt-1 focus:ring-emerald-500 focus:border-emerald-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                      placeholder="Post title"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="postContent" className="block text-sm font-medium text-gray-300">
                      Content
                    </label>
                    <textarea
                      id="postContent"
                      name="postContent"
                      rows={6}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="mt-1 focus:ring-emerald-500 focus:border-emerald-500 block w-full shadow-sm sm:text-sm border-gray-600 rounded-md bg-gray-700 text-white"
                      placeholder="Write your post here..."
                    />
                  </div>
                  
                  {postError && (
                    <div className="mb-4 p-3 rounded-md bg-red-900/30 border border-red-800/50">
                      <p className="text-sm text-red-400">{postError}</p>
                    </div>
                  )}
                  
                  {postSuccess && (
                    <div className="mb-4 p-3 rounded-md bg-emerald-900/30 border border-emerald-800/50">
                      <p className="text-sm text-emerald-400">{postSuccess}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPostForm(false)}
                      className="mr-3 inline-flex items-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingPost}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      {creatingPost ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Publishing...
                        </>
                      ) : (
                        <>Publish Post</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Posts */}
          <div className="mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Group Posts</h2>
            
            {!isMember && !groupData?.isPublic ? (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-300">You need to join this group to see its posts.</p>
              </div>
            ) : postsLoading ? (
              <div className="text-center py-10">
                <svg className="animate-spin h-8 w-8 mx-auto text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-3 text-base text-gray-300">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-300">No posts yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.cid || post.postId} className="bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-700">
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-white">{post.title}</h3>
                        <span className="text-xs text-gray-400">
                          {new Date(post.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-300 whitespace-pre-wrap">{post.content}</p>
                      <div className="mt-4 flex items-center">
                        <span className="text-sm text-gray-400">
                          Posted by <span className="text-emerald-400">{post.authorName}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}