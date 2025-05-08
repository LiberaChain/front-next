// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title BlockchainPosts
 * @dev Smart contract for storing posts directly on the blockchain with signature verification
 */
contract BlockchainPosts {
    // Fee settings
    uint256 public postFee = 0.001 ether; // Small fee to discourage spam
    address public feeCollector;
    address public contractCreator; // Store the contract creator's address

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
        uint256 donation;      // Donation amount in wei (beyond required fee)
        bytes signature;       // Added signature field
        bool verified;        // Added verification status
    }

    // Store posts by their unique IDs
    mapping(bytes32 => Post) public posts;
    
    // Store post IDs by author
    mapping(string => bytes32[]) public userPosts;
    
    // Keep track of all posts for public feeds
    bytes32[] public allPostIds;

    // Events
    event PostCreated(bytes32 indexed postId, string authorDid, uint256 timestamp, string visibility, uint256 donation, bool verified);
    event PostVerified(bytes32 indexed postId, address verifier);
    event PostFeeChanged(uint256 newFee);
    event FeeCollectorChanged(address newCollector);
    event DonationReceived(bytes32 indexed postId, uint256 donationAmount);

    /**
     * @dev Constructor sets the fee collector address and contract creator
     */
    constructor() {
        feeCollector = msg.sender;
        contractCreator = msg.sender;
    }

    /**
     * @dev Recover signer address from a message hash and signature
     */
    function recoverSigner(bytes32 messageHash, bytes memory signature) public pure returns (address) {
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    /**
     * @dev Split signature into r, s, v components
     */
    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        return (r, s, v);
    }

    /**
     * @dev Create message hash from post data
     */
    function createMessageHash(
        string memory _content,
        string memory _title,
        string memory _authorDid,
        uint256 _timestamp
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "Post on LiberaChain:\n\nTitle: ", _title,
            "\nContent: ", _content,
            "\nTimestamp: ", _timestamp,
            "\nAuthor DID: ", _authorDid
        ));
    }

    /**
     * @dev Create a new post with signature verification
     */
    function createPost(
        string memory _content,
        string memory _title,
        string memory _authorDid,
        string memory _authorName,
        string memory _contentType,
        string memory _visibility,
        string memory _ipfsCid,
        string memory _metadata,
        bytes memory _signature
    ) public payable returns (bytes32 postId) {
        // Require the fee to be paid (except for the owner)
        if (msg.sender != feeCollector) {
            require(msg.value >= postFee, "Insufficient fee for blockchain post");
        }
        
        uint256 timestamp = block.timestamp;
        // Generate a unique post ID based on content and author
        postId = keccak256(abi.encodePacked(_authorDid, _content, timestamp));
        
        // Calculate donation amount (anything above required fee)
        uint256 donationAmount = 0;
        if (msg.value > postFee) {
            donationAmount = msg.value - postFee;
        }

        // Verify signature if provided
        bool isVerified = false;
        string memory ethAddress = '';
        if (_signature.length > 0) {
            bytes32 messageHash = createMessageHash(_content, _title, _authorDid, timestamp);
            address signer = recoverSigner(messageHash, _signature);
            // Extract Ethereum address from DID (assuming did:ethr:0x... format)
            ethAddress = substring(_authorDid, 9); // Skip "did:ethr:" prefix
            isVerified = addressesEqual(signer, parseAddress(ethAddress));
        }
        
        // Create the post
        Post memory newPost = Post({
            content: _content,
            title: _title,
            authorDid: _authorDid,
            authorName: _authorName,
            contentType: _contentType,
            timestamp: timestamp,
            visibility: _visibility,
            ipfsCid: _ipfsCid,
            metadata: _metadata,
            donation: donationAmount,
            signature: _signature,
            verified: isVerified
        });
        
        // Store the post
        posts[postId] = newPost;
        
        // Add to user's posts collection
        userPosts[_authorDid].push(postId);
        
        // Add to the global posts collection
        allPostIds.push(postId);
        
        // Forward fee to collector and donation to contract creator
        if (msg.value > 0) {
            if (donationAmount > 0) {
                // Split payment: fee to collector, donation to contract creator
                payable(feeCollector).transfer(postFee);
                payable(contractCreator).transfer(donationAmount);
                emit DonationReceived(postId, donationAmount);
            } else {
                // Just the fee, send to collector
                payable(feeCollector).transfer(msg.value);
            }
        }
        
        // Emit event
        emit PostCreated(postId, _authorDid, timestamp, _visibility, donationAmount, isVerified);
        if (isVerified) {
            emit PostVerified(postId, parseAddress(ethAddress));
        }
        
        return postId;
    }

    /**
     * @dev Helper to compare addresses
     */
    function addressesEqual(address a, address b) internal pure returns (bool) {
        return a == b;
    }

    /**
     * @dev Helper to parse address from string
     */
    function parseAddress(string memory _address) internal pure returns (address) {
        bytes memory tmp = bytes(_address);
        uint160 iaddr = 0;
        uint160 b1;
        uint160 b2;
        for (uint i = 2; i < 2 + 2 * 20; i += 2) {
            iaddr *= 256;
            b1 = uint160(uint8(tmp[i]));
            b2 = uint160(uint8(tmp[i + 1]));
            if ((b1 >= 97) && (b1 <= 102)) b1 -= 87;
            else if ((b1 >= 65) && (b1 <= 70)) b1 -= 55;
            else if ((b1 >= 48) && (b1 <= 57)) b1 -= 48;
            if ((b2 >= 97) && (b2 <= 102)) b2 -= 87;
            else if ((b2 >= 65) && (b2 <= 70)) b2 -= 55;
            else if ((b2 >= 48) && (b2 <= 57)) b2 -= 48;
            iaddr += (b1 * 16 + b2);
        }
        return address(iaddr);
    }

    /**
     * @dev Helper to extract substring
     */
    function substring(string memory str, uint startIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        require(startIndex < strBytes.length, "Start index out of bounds");
        
        bytes memory result = new bytes(strBytes.length - startIndex);
        for(uint i = 0; i < strBytes.length - startIndex; i++) {
            result[i] = strBytes[i + startIndex];
        }
        return string(result);
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
     * @return donation Amount donated with this post
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
        string memory metadata,
        uint256 donation,
        bytes memory signature,
        bool verified
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
            post.metadata,
            post.donation,
            post.signature,
            post.verified
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
    
    /**
     * @dev Get the contract creator address
     * @return The address of the contract creator
     */
    function getContractCreator() public view returns (address) {
        return contractCreator;
    }
}