"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  uploadPostToIPFS, 
  storePostMetadata, 
  getPublicPosts, 
  getUserPosts 
} from '../utils/postsService';

export default function PostsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postVisibility, setPostVisibility] = useState('public');
  
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [displayMode, setDisplayMode] = useState('all'); // 'all', 'mine'

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
        }
        
        // Load posts
        loadPosts();
      } catch (err) {
        console.error("Error checking authentication:", err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  // Load posts based on current display mode
  const loadPosts = async () => {
    try {
      setLoading(true);
      
      let loadedPosts = [];
      
      if (displayMode === 'mine' && profileData?.did) {
        // Load only user's posts
        loadedPosts = await getUserPosts(profileData.did);
      } else {
        // Load all public posts
        loadedPosts = await getPublicPosts();
      }
      
      setPosts(loadedPosts);
      
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle post submission
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    
    if (!profileData?.did) {
      setError('You must be logged in to post');
      return;
    }
    
    if (!postContent.trim()) {
      setError('Post content cannot be empty');
      return;
    }
    
    try {
      setPosting(true);
      setError('');
      setSuccess('');
      
      // Prepare post data
      const postData = {
        title: postTitle.trim() || 'Untitled Post',
        content: postContent,
        authorDid: profileData.did,
        authorName: profileData.displayName || `User-${profileData.wallet?.substring(2, 8)}`,
        timestamp: Date.now()
      };
      
      // Upload post to IPFS
      const cid = await uploadPostToIPFS(postData);
      
      if (!cid) {
        throw new Error('Failed to upload post to IPFS');
      }
      
      // Store post metadata
      const metadataResult = storePostMetadata(cid, {
        authorDid: profileData.did,
        authorName: profileData.displayName || `User-${profileData.wallet?.substring(2, 8)}`,
        visibility: postVisibility,
        contentPreview: postContent.substring(0, 100) + (postContent.length > 100 ? '...' : '')
      });
      
      if (!metadataResult) {
        throw new Error('Failed to store post metadata');
      }
      
      // Success! Clear form and show message
      setPostTitle('');
      setPostContent('');
      setPostVisibility('public');
      setSuccess('Post published successfully!');
      
      // Reload posts to show the new one
      await loadPosts();
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating post:', error);
      setError(`Failed to create post: ${error.message || 'Please try again'}`);
    } finally {
      setPosting(false);
    }
  };
  
  // Handle display mode change
  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    // Reload posts whenever display mode changes
    loadPosts();
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="animate-gradient min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 pb-10">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 mb-6 px-4 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard">
              <div className="flex items-center">
                <Image src="/logo.svg" alt="LiberaChain" width={40} height={40} />
                <span className="ml-2 text-xl font-semibold text-white">LiberaChain</span>
              </div>
            </Link>
            <span className="ml-4 px-2 py-1 bg-emerald-700 text-white text-xs rounded-md">Posts</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-300 hover:text-white">
              Dashboard
            </Link>
            <Link href="/chat" className="text-gray-300 hover:text-white">
              Chats
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column - New Post Form */}
          <div className="md:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h2 className="text-lg font-medium text-white">Create Post</h2>
              <p className="mt-1 text-sm text-gray-400">
                Share your thoughts with the world in a decentralized way
              </p>
              
              {error && (
                <div className="mt-4 rounded-md bg-red-900/40 p-4">
                  <div className="flex">
                    <div className="text-sm text-red-400">{error}</div>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mt-4 rounded-md bg-green-900/40 p-4">
                  <div className="flex">
                    <div className="text-sm text-green-400">{success}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handlePostSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="post-title" className="block text-sm font-medium text-gray-300">
                    Title (optional)
                  </label>
                  <div className="mt-1">
                    <input
                      id="post-title"
                      name="title"
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Post title"
                      className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="post-content" className="block text-sm font-medium text-gray-300">
                    Content
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="post-content"
                      name="content"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="What's on your mind?"
                      rows={4}
                      className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="post-visibility" className="block text-sm font-medium text-gray-300">
                    Visibility
                  </label>
                  <div className="mt-1">
                    <select
                      id="post-visibility"
                      name="visibility"
                      value={postVisibility}
                      onChange={(e) => setPostVisibility(e.target.value)}
                      className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                    >
                      <option value="public">Public (visible to everyone)</option>
                      <option value="friends-only">Friends Only</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={posting}
                    className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {posting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Publishing...
                      </>
                    ) : (
                      'Publish Post'
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Post storage explainer */}
            <div className="mt-6 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h3 className="text-sm font-medium text-white">How Posts Work</h3>
              <p className="mt-2 text-xs text-gray-400">
                Your posts are stored on IPFS, a decentralized storage network. 
                Each post gets a unique content identifier (CID) that links to your DID.
                Public posts can be viewed by anyone, while friends-only posts are only visible to your connections.
              </p>
            </div>
          </div>

          {/* Right Column - Posts Feed */}
          <div className="md:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-white">Posts</h2>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDisplayModeChange('all')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      displayMode === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    All Posts
                  </button>
                  <button
                    onClick={() => handleDisplayModeChange('mine')}
                    className={`px-3 py-1 text-xs rounded-md ${
                      displayMode === 'mine'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    My Posts
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="mt-6 flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <div key={post.cid} className="bg-gray-700 rounded-md p-4 border border-gray-600">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="text-md font-medium text-white">{post.title}</h3>
                            <p className="text-xs text-gray-400">
                              By {post.authorName} • {formatDate(post.timestamp)}
                            </p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              post.visibility === 'public' 
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-blue-900/30 text-blue-400'
                            }`}>
                              {post.visibility === 'public' ? 'Public' : 'Friends Only'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 text-gray-200 whitespace-pre-line">
                          {post.content}
                        </div>
                        
                        <div className="mt-4 pt-2 border-t border-gray-600 flex justify-between items-center">
                          <div className="text-xs text-gray-400">
                            {post.cid && (
                              <span title={`IPFS CID: ${post.cid}`}>
                                IPFS: {post.cid.substring(0, 8)}...{post.cid.substring(post.cid.length - 4)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">
                        {displayMode === 'mine'
                          ? "You haven't created any posts yet."
                          : "No posts available. Be the first to create one!"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}