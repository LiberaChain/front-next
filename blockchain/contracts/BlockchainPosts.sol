// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title BlockchainPosts
 * @dev Smart contract for storing posts directly on the blockchain
 * Users can choose to post content directly to the blockchain for 
 * higher persistence at the cost of a transaction fee
 */
contract BlockchainPosts {
    // Fee settings
    uint256 public postFee = 0.001 ether; // Small fee to discourage spam
    address public feeCollector;

    // Post structure
    struct Post {
        string content;        // The actual post content
        string title;          // Optional post title
        string authorDid;      // Author's DID (Decentralized Identifier)
        string authorName;     // Author's display name
        string contentType;    // Can be "text", "reference", etc.
        uint256 timestamp;     // When the post was created
        string visibility;     // "public" or "friends-only"
        string ipfsCid;        // Optional reference to IPFS content (if any)
        string metadata;       // JSON string for additional metadata (can contain references to external URLs, etc.)
    }

    // Store posts by their unique IDs
    mapping(bytes32 => Post) public posts;
    
    // Store post IDs by author
    mapping(string => bytes32[]) public userPosts;
    
    // Keep track of all posts for public feeds
    bytes32[] public allPostIds;

    // Events
    event PostCreated(bytes32 indexed postId, string authorDid, uint256 timestamp, string visibility);
    event PostFeeChanged(uint256 newFee);
    event FeeCollectorChanged(address newCollector);

    /**
     * @dev Constructor sets the fee collector address
     */
    constructor() {
        feeCollector = msg.sender;
    }

    /**
     * @dev Create a new post on the blockchain
     * @param _content The content of the post
     * @param _title The title of the post
     * @param _authorDid Author's DID
     * @param _authorName Author's display name
     * @param _contentType Type of content
     * @param _visibility Visibility setting ("public" or "friends-only")
     * @param _ipfsCid Optional IPFS CID if this post references IPFS content
     * @param _metadata Additional metadata as a JSON string
     * @return postId The unique ID of the created post
     */
    function createPost(
        string memory _content,
        string memory _title,
        string memory _authorDid,
        string memory _authorName,
        string memory _contentType,
        string memory _visibility,
        string memory _ipfsCid,
        string memory _metadata
    ) public payable returns (bytes32 postId) {
        // Require the fee to be paid (except for the owner)
        if (msg.sender != feeCollector) {
            require(msg.value >= postFee, "Insufficient fee for blockchain post");
        }
        
        // Generate a unique post ID based on content and author
        postId = keccak256(abi.encodePacked(_authorDid, _content, block.timestamp));
        
        // Create the post
        Post memory newPost = Post({
            content: _content,
            title: _title,
            authorDid: _authorDid,
            authorName: _authorName,
            contentType: _contentType,
            timestamp: block.timestamp,
            visibility: _visibility,
            ipfsCid: _ipfsCid,
            metadata: _metadata
        });
        
        // Store the post
        posts[postId] = newPost;
        
        // Add to user's posts collection
        userPosts[_authorDid].push(postId);
        
        // Add to the global posts collection
        allPostIds.push(postId);
        
        // Forward fee to collector
        if (msg.value > 0) {
            payable(feeCollector).transfer(msg.value);
        }
        
        // Emit event
        emit PostCreated(postId, _authorDid, block.timestamp, _visibility);
        
        return postId;
    }

    /**
     * @dev Get a post by its ID
     * @param _postId The post ID
     * @return content The post content
     * @return title The post title
     * @return authorDid Author's DID
     * @return authorName Author's name
     * @return contentType Type of content
     * @return timestamp Post creation timestamp
     * @return visibility Post visibility setting
     * @return ipfsCid IPFS CID reference (if any)
     * @return metadata Additional post metadata
     */
    function getPost(bytes32 _postId) public view returns (
        string memory content,
        string memory title,
        string memory authorDid,
        string memory authorName,
        string memory contentType,
        uint256 timestamp,
        string memory visibility,
        string memory ipfsCid,
        string memory metadata
    ) {
        Post memory post = posts[_postId];
        require(bytes(post.authorDid).length > 0, "Post does not exist");
        
        return (
            post.content,
            post.title,
            post.authorDid,
            post.authorName,
            post.contentType,
            post.timestamp,
            post.visibility,
            post.ipfsCid,
            post.metadata
        );
    }

    /**
     * @dev Get all post IDs for a specific user
     * @param _authorDid Author's DID
     * @return array of post IDs
     */
    function getUserPostIds(string memory _authorDid) public view returns (bytes32[] memory) {
        return userPosts[_authorDid];
    }
    
    /**
     * @dev Get total posts count
     * @return Count of all posts
     */
    function getTotalPostsCount() public view returns (uint256) {
        return allPostIds.length;
    }
    
    /**
     * @dev Get post IDs with pagination
     * @param _offset Starting index
     * @param _limit Maximum number of posts to return
     * @return array of post IDs
     */
    function getPaginatedPostIds(uint256 _offset, uint256 _limit) public view returns (bytes32[] memory) {
        // Ensure we don't go out of bounds
        uint256 endIndex = _offset + _limit;
        if (endIndex > allPostIds.length) {
            endIndex = allPostIds.length;
        }
        
        // Calculate the actual count
        uint256 count = endIndex - _offset;
        
        // Create the result array
        bytes32[] memory result = new bytes32[](count);
        
        // Populate the result array
        for (uint256 i = 0; i < count; i++) {
            result[i] = allPostIds[_offset + i];
        }
        
        return result;
    }
    
    /**
     * @dev Change the post fee (only fee collector can call this)
     * @param _newFee New fee amount in wei
     */
    function setPostFee(uint256 _newFee) public {
        require(msg.sender == feeCollector, "Only fee collector can change the fee");
        postFee = _newFee;
        emit PostFeeChanged(_newFee);
    }
    
    /**
     * @dev Change the fee collector address (only current collector can call this)
     * @param _newCollector New fee collector address
     */
    function setFeeCollector(address _newCollector) public {
        require(msg.sender == feeCollector, "Only fee collector can transfer this role");
        require(_newCollector != address(0), "Cannot set to zero address");
        feeCollector = _newCollector;
        emit FeeCollectorChanged(_newCollector);
    }
    
    /**
     * @dev Get the current post fee
     * @return Current fee in wei
     */
    function getPostFee() public view returns (uint256) {
        return postFee;
    }
}