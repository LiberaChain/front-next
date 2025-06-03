import { BlockchainPosts } from "../blockchain/BlockchainPosts";
import { FilebaseIPFSProvider } from "../storage/ipfs/FilebaseIPFSService";


export class Posts {
    /**
     * Get public posts from all users
     * @param {number} limit - Maximum number of posts to return
     * @returns {Promise<Array>} Array of post objects
     */
    static async getPublicPosts(limit = 50) {
        try {
            // Get existing post registry from localStorage (for metadata)
            const postRegistry = JSON.parse(localStorage.getItem('liberaChainPostRegistry') || '{}');

            let ipfsPosts = [];
            const ipfs = FilebaseIPFSProvider.getInstance();
            const publicDirectoryFiles = await ipfs.listDirectory('posts/public');

            console.log(`Found ${publicDirectoryFiles.length} public posts in IPFS storage`);

            // For each file in the public directory, fetch its contents and add to our local registry
            await Promise.all(publicDirectoryFiles.map(async (fileInfo) => {
                // console.debug(`Processing post file:`, fileInfo);
                const filename = fileInfo.Key;
                try {
                    // // Skip if we already have this post in our registry
                    // if (postRegistry[filename]) {
                    //     return;
                    // }

                    // Fetch the post data from IPFS
                    const cid = await ipfs.getLatestCID(filename);
                    const postContent = await ipfs.fetchFileByCID(cid);
                    if (postContent) {
                        const postData = JSON.parse(await postContent.text());
                        // Only process public posts here

                        // Add to posts collection
                        ipfsPosts.push({
                            ...postData,
                            cid: cid,
                            source: 'ipfs'
                        });

                        // Update our local registry with this post's metadata
                        postRegistry[filename] = {
                            authorDid: postData.authorDid,
                            authorName: postData.authorName,
                            visibility: postData.visibility,
                            type: postData.type || 'regular',
                            url: postData.url,
                            source: postData.source,
                            timestamp: postData.timestamp,
                            contentPreview: postData.content.substring(0, 100) + (postData.content.length > 100 ? '...' : '')
                        };

                        // Cache the post data for faster loading next time
                        const postsMap = JSON.parse(localStorage.getItem('liberaChainIpfsPosts') || '{}');
                        postsMap[filename] = postData;
                        localStorage.setItem('liberaChainIpfsPosts', JSON.stringify(postsMap));

                        // Update the user's posts list
                        if (postData.authorDid) {
                            const userPosts = JSON.parse(localStorage.getItem('liberaChainUserPosts') || '{}');
                            if (!userPosts[postData.authorDid]) {
                                userPosts[postData.authorDid] = [];
                            }
                            // Only add if not already in list
                            if (!userPosts[postData.authorDid].includes(filename)) {
                                userPosts[postData.authorDid].push(filename);
                                localStorage.setItem('liberaChainUserPosts', JSON.stringify(userPosts));
                            }
                        }
                    }
                } catch (fileError) {
                    console.error(`Error processing post file ${filename}:`, fileError);
                }
            }));
            // Update the registry in localStorage with any new posts found
            localStorage.setItem('liberaChainPostRegistry', JSON.stringify(postRegistry));
            console.log('IPFS posts:', ipfsPosts);

            // Now get public post CIDs from our registry (which may include newly discovered posts)
            const publicPostCids = Object.entries(postRegistry)
                .filter(([_, metadata]) => metadata.visibility === 'public')
                .map(([cid, _]) => cid);

            // // Fetch content for each public post in our registry
            // const registryPosts = await Promise.all(
            //     publicPostCids.map(async (cid) => {
            //         // Skip if we already have this post in s3Posts
            //         if (ipfsPosts.some(post => post.cid === cid)) {
            //             return null;
            //         }

            //         console.debug(`Registry post not yet loaded, fetching from IPFS:`, cid);

            //         const postData = await retrievePostFromIPFS(cid);
            //         const metadata = postRegistry[cid];
            //         if (postData && metadata) {
            //             return {
            //                 ...postData,
            //                 ...metadata,
            //                 cid,
            //                 source: 'ipfs'
            //             };
            //         }
            //         return null;
            //     })
            // );

            // Also get blockchain posts
            let blockchainPosts = [];
            try {
                const blockchainResult = await BlockchainPosts.getPublicBlockchainPosts(0, 20);
                if (blockchainResult.success) {
                    blockchainPosts = blockchainResult.posts.map(post => ({
                        ...post,
                        source: 'blockchain'
                    }));
                }
            } catch (blockchainError) {
                console.error('Error fetching blockchain posts:', blockchainError);
            }

            // Combine posts from all sources
            const allPosts = [
                ...ipfsPosts,
                // ...registryPosts.filter(post => post !== null),
                ...blockchainPosts
            ];

            // Filter out nulls, sort by timestamp (newest first), and limit results
            const posts = allPosts
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);

            console.log(`Returning ${posts.length} public posts`, posts);

            return posts;

        } catch (error) {
            console.error('Error getting public posts:', error);
            return [];
        }
    };

    /**
     * Extract basic metadata from external URLs (social media links)
     * @param {string} url - URL to extract metadata from
     * @returns {Promise<Object>} Object containing extracted metadata
     */
    static async extractMetadataFromUrl(url) {
        try {
            // Validate URL
            if (!url || !url.startsWith('http')) {
                throw new Error('Invalid URL format');
            }

            // Determine the source type
            let source = 'unknown';
            if (url.includes('facebook.com') || url.includes('fb.com')) {
                source = 'facebook';
            } else if (url.includes('twitter.com') || url.includes('x.com')) {
                source = 'x';
            } else if (url.includes('reddit.com')) {
                source = 'reddit';
            } else if (url.includes('instagram.com')) {
                source = 'instagram';
            } else if (url.includes('linkedin.com')) {
                source = 'linkedin';
            } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
                source = 'youtube';
            }

            // In a production environment, we would:
            // 1. Use proper API calls to fetch metadata (requires API keys)
            // 2. Use Open Graph protocol to extract metadata
            // 3. Handle rate limiting and errors properly

            // For this prototype, we'll return basic metadata
            return {
                url,
                source,
                extracted: true,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error extracting metadata from URL:', error);
            return {
                url,
                source: 'unknown',
                extracted: false,
                error: error.message
            };
        }
    };

    static async createIPFSPost(data) {
        try {
            // Upload to IPFS
            const ipfs = FilebaseIPFSProvider.getInstance();
            const cid = await ipfs.uploadFile(`posts/public/post-${Date.now()}.json`, JSON.stringify(data));

            if (!cid) throw new Error('Failed to upload imported post to IPFS');

            // // Store post metadata
            // const metadataResult = Posts.storePostMetadata(cid, {
            //     type: 'imported',
            //     authorDid: authorInfo.did,
            //     authorName: authorInfo.displayName || `User-${authorInfo.wallet?.substring(2, 8)}`,
            //     visibility: data.visibility || 'public',
            //     source: metadata.source,
            //     url: data.url,
            //     contentPreview: data.comment ?
            //         data.comment.substring(0, 100) + (data.comment.length > 100 ? '...' : '') :
            //         `Imported from ${metadata.source}`
            // });

            // if (!metadataResult) throw new Error('Failed to store imported post metadata');

            return {
                success: true,
                cid,
                data
            };
        } catch (error) {
            console.error('Error creating imported post:', error);
            throw error;
        }
    }

    /**
     * Create a post from an imported URL
     * @param {Object} data - Post data including URL and user's comment
     * @param {Object} authorInfo - Author information
     * @returns {Promise<Object>} Result containing CID and status
     */
    static async createImportedPost(data, authorInfo) {
        try {
            if (!data.url) throw new Error('URL is required');
            if (!authorInfo.did) throw new Error('Author information is required');

            // Extract metadata from the URL
            const metadata = await Posts.extractMetadataFromUrl(data.url);

            // Create post data structure
            const postData = {
                type: 'imported',
                title: data.title || `Imported from ${metadata.source}`,
                content: data.comment || '',
                url: data.url,
                source: metadata.source,
                authorDid: authorInfo.did,
                authorName: authorInfo.displayName || `User-${authorInfo.wallet?.substring(2, 8)}`,
                timestamp: Date.now(),
                metadata
            };

            // Upload to IPFS
            const ipfs = FilebaseIPFSProvider.getInstance();
            const cid = await ipfs.uploadFile(`posts/public/post-${Date.now()}.json`, JSON.stringify(postData));

            if (!cid) throw new Error('Failed to upload imported post to IPFS');

            // // Store post metadata
            // const metadataResult = Posts.storePostMetadata(cid, {
            //     type: 'imported',
            //     authorDid: authorInfo.did,
            //     authorName: authorInfo.displayName || `User-${authorInfo.wallet?.substring(2, 8)}`,
            //     visibility: data.visibility || 'public',
            //     source: metadata.source,
            //     url: data.url,
            //     contentPreview: data.comment ?
            //         data.comment.substring(0, 100) + (data.comment.length > 100 ? '...' : '') :
            //         `Imported from ${metadata.source}`
            // });

            // if (!metadataResult) throw new Error('Failed to store imported post metadata');

            return {
                success: true,
                cid,
                source: metadata.source,
                postData
            };
        } catch (error) {
            console.error('Error creating imported post:', error);
            throw error;
        }
    };

    /**
     * Add a comment to a post
     * @param {string} postIdentifier - CID or postId of the post being commented on
     * @param {Object} commentData - Comment data including author info and content
     * @returns {Promise<Object>} Result object with success status and new comment info
     */
    static async addCommentToPost(postIdentifier, commentData) {
        try {
            if (!postIdentifier) throw new Error('Post identifier is required');
            if (!commentData.authorDid) throw new Error('Comment author DID is required');
            if (!commentData.content) throw new Error('Comment content is required');

            // Generate a unique ID for the comment
            const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

            // Create the comment object
            const comment = {
                id: commentId,
                authorDid: commentData.authorDid,
                authorName: commentData.authorName,
                content: commentData.content,
                timestamp: Date.now(),
                parentCommentId: commentData.parentCommentId || null, // For threaded comments
                edited: false,
                postSource: commentData.postSource || 'ipfs' // Track if this is for a blockchain or IPFS post
            };

            // Get the existing comments for this post
            const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');

            // Initialize if this is the first comment for the post
            if (!postComments[postIdentifier]) {
                postComments[postIdentifier] = [];
            }

            // Add the new comment
            postComments[postIdentifier].push(comment);

            // Save back to storage
            localStorage.setItem('liberaChainPostComments', JSON.stringify(postComments));

            // In a production system, we would also update an on-chain record or IPFS
            // to ensure comments are decentralized as well

            return {
                success: true,
                comment,
                postIdentifier
            };
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    };

    /**
     * Get comments for a specific post
     * @param {string} postIdentifier - CID or postId of the post
     * @returns {Array} Array of comments for the post
     */
    static async getPostComments(postIdentifier) {
        try {
            if (!postIdentifier) return [];

            // Get all comments from storage
            const postComments = JSON.parse(localStorage.getItem('liberaChainPostComments') || '{}');

            // Get comments for this specific post
            const comments = postComments[postIdentifier] || [];

            // Sort by timestamp (oldest first, for chronological display)
            return comments.sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('Error getting post comments:', error);
            return [];
        }
    };

    /**
     * Check if user can post to blockchain (has enough balance)
     * @returns {Promise<Object>} Balance check result
     */
    static async checkBlockchainPostingAbility() {
        return await BlockchainPosts.checkBalanceForPosting();
    };
}
