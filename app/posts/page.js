"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  uploadPostToIPFS, 
  storePostMetadata, 
  getPublicPosts, 
  getUserPosts,
  createImportedPost
} from '../utils/postsService';

export default function PostsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postVisibility, setPostVisibility] = useState('public');
  
  // Import fields
  const [importUrl, setImportUrl] = useState('');
  const [importComment, setImportComment] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importVisibility, setImportVisibility] = useState('public');
  
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [displayMode, setDisplayMode] = useState('all'); // 'all', 'mine'
  const [postMode, setPostMode] = useState('create'); // 'create', 'import'

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
  
  // Handle import submission
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    
    if (!profileData?.did) {
      setError('You must be logged in to import content');
      return;
    }
    
    if (!importUrl.trim()) {
      setError('URL cannot be empty');
      return;
    }
    
    try {
      setImporting(true);
      setError('');
      setSuccess('');
      
      // Create imported post
      const result = await createImportedPost(
        {
          url: importUrl,
          comment: importComment,
          title: importTitle,
          visibility: importVisibility
        },
        profileData
      );
      
      if (!result || !result.success) {
        throw new Error('Failed to import content');
      }
      
      // Success! Clear form and show message
      setImportUrl('');
      setImportComment('');
      setImportTitle('');
      setImportVisibility('public');
      setSuccess('Content imported successfully!');
      
      // Reload posts to show the new one
      await loadPosts();
      
      // Clear success message after a delay
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error importing content:', error);
      setError(`Failed to import content: ${error.message || 'Please try again'}`);
    } finally {
      setImporting(false);
    }
  };
  
  // Handle display mode change
  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    // Reload posts whenever display mode changes
    loadPosts();
  };

  // Handle post mode switch (create or import)
  const handlePostModeChange = (mode) => {
    setPostMode(mode);
    setError('');
    setSuccess('');
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get icon for post source
  const getSourceIcon = (source) => {
    switch (source) {
      case 'facebook':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        );
      case 'x':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
          </svg>
        );
      case 'reddit':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
          </svg>
        );
      case 'youtube':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.8 3A2.8 2.8 0 0 1 17.6 5.8V18.2A2.8 2.8 0 0 1 14.8 21H9.2A2.8 2.8 0 0 1 6.4 18.2V5.8A2.8 2.8 0 0 1 9.2 3h5.6m0-1.5H9.2C7 1.5 5 3.3 5 5.8V18.2C5 20.6 7 22.5 9.2 22.5h5.6c2.3 0 4.2-1.9 4.2-4.3V5.8c0-2.5-2-4.3-4.2-4.3z" />
            <path d="M12 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 1.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 1.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 pb-10">
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
              Messages
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

              {/* Post/Import Tab Navigation */}
              <div className="mt-4 border-b border-gray-700">
                <div className="flex -mb-px">
                  <button
                    className={`mr-4 py-2 px-1 ${
                      postMode === 'create'
                        ? 'border-b-2 border-emerald-500 text-emerald-500'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    onClick={() => handlePostModeChange('create')}
                  >
                    Create Post
                  </button>
                  <button
                    className={`py-2 px-1 ${
                      postMode === 'import'
                        ? 'border-b-2 border-blue-500 text-blue-500'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    onClick={() => handlePostModeChange('import')}
                  >
                    Import Link
                  </button>
                </div>
              </div>
              
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

              {/* Create Post Form */}
              {postMode === 'create' && (
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
              )}
              
              {/* Import Post Form */}
              {postMode === 'import' && (
                <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="import-url" className="block text-sm font-medium text-gray-300">
                      External Link URL
                    </label>
                    <div className="mt-1">
                      <input
                        id="import-url"
                        name="url"
                        type="url"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Paste a link from Facebook, X (Twitter), Reddit, etc.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="import-title" className="block text-sm font-medium text-gray-300">
                      Title (optional)
                    </label>
                    <div className="mt-1">
                      <input
                        id="import-title"
                        name="title"
                        type="text"
                        value={importTitle}
                        onChange={(e) => setImportTitle(e.target.value)}
                        placeholder="Title for imported content"
                        className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="import-comment" className="block text-sm font-medium text-gray-300">
                      Your Comment (optional)
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="import-comment"
                        name="comment"
                        value={importComment}
                        onChange={(e) => setImportComment(e.target.value)}
                        placeholder="Add your thoughts about this content"
                        rows={3}
                        className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="import-visibility" className="block text-sm font-medium text-gray-300">
                      Visibility
                    </label>
                    <div className="mt-1">
                      <select
                        id="import-visibility"
                        name="visibility"
                        value={importVisibility}
                        onChange={(e) => setImportVisibility(e.target.value)}
                        className="bg-gray-700 text-white block w-full appearance-none rounded-md border border-gray-600 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="public">Public (visible to everyone)</option>
                        <option value="friends-only">Friends Only</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      disabled={importing}
                      className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {importing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Importing...
                        </>
                      ) : (
                        'Import Content'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            {/* Post storage explainer */}
            <div className="mt-6 bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
              <h3 className="text-sm font-medium text-white">How Posts Work</h3>
              <p className="mt-2 text-xs text-gray-400">
                Your posts are stored on IPFS, a decentralized storage network. 
                Each post gets a unique content identifier (CID) that links to your DID.
                Public posts can be viewed by anyone, while friends-only posts are only visible to your connections.
              </p>
              
              {postMode === 'import' && (
                <div className="mt-4 rounded-md bg-blue-900/20 p-4">
                  <p className="text-xs text-blue-300">
                    <strong>About importing content:</strong> When you import external content, a reference to the 
                    original source is stored in IPFS along with your comments. This creates a decentralized 
                    pointer to the content without copying it entirely.
                  </p>
                </div>
              )}
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
                          <div className="flex items-center space-x-2">
                            {post.type === 'imported' && post.source && (
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300`}>
                                <span className="mr-1 text-gray-400">From</span>
                                <span className="flex items-center">
                                  <span className="mr-1">{post.source}</span>
                                  <span className="text-gray-400">{getSourceIcon(post.source)}</span>
                                </span>
                              </span>
                            )}
                            
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
                        
                        {post.type === 'imported' && post.url && (
                          <div className="mt-4 bg-gray-800/50 rounded-md p-3 border border-gray-600">
                            <div className="flex items-center">
                              <span className="text-xs text-gray-400 mr-2">Imported link:</span>
                              <a 
                                href={post.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:underline truncate break-all"
                              >
                                {post.url}
                              </a>
                            </div>
                          </div>
                        )}
                        
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