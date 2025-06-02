// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DIDRegistry.sol";

/**
 * @title ContentManagement
 * @dev Manages user-generated content, supporting both on-chain and IPFS-anchored storage.
 */
contract ContentManagement {
    // The DIDRegistry contract to verify user registration.
    DIDRegistry public didRegistry;

    // Struct for content whose data is stored on IPFS.
    struct IPFSAnchor {
        string cid;          // IPFS Content Identifier.
        address author;      // Author's DID.
        uint256 timestamp;
    }

    // Struct for small content stored directly on the blockchain.
    struct OnChainPost {
        string content;
        address author;
        uint256 timestamp;
    }
    
    mapping(uint256 => IPFSAnchor) public ipfsAnchors;
    uint256 private _ipfsAnchorCounter;

    mapping(uint256 => OnChainPost) public onChainPosts;
    uint256 private _onChainPostCounter;
    
    event NewIPFSAnchor(uint256 indexed postId, address indexed author, string cid);
    event NewOnChainPost(uint256 indexed postId, address indexed author);

    constructor(address _didRegistryAddress) {
        didRegistry = DIDRegistry(_didRegistryAddress);
    }

    /**
     * @dev Posts a new anchor for content stored on IPFS. The caller must be a registered user.
     * The function verifies a signature to prove authorship over the content CID.
     * @param cid The IPFS Content Identifier of the off-chain data.
     * @param authorSignature A signature from the author over the hash of the CID.
     */
    function postIPFSAnchor(string calldata cid, bytes calldata authorSignature) external {
        (bool isRegistered,, ) = didRegistry.users(msg.sender);
        require(isRegistered, "User is not registered");
        
        bytes32 cidHash = keccak256(abi.encodePacked(cid));
        address signer = _verifySignature(cidHash, authorSignature);
        require(signer == msg.sender, "Invalid signature for content authorship");

        uint256 postId = ++_ipfsAnchorCounter;
        ipfsAnchors[postId] = IPFSAnchor({
            cid: cid,
            author: msg.sender,
            timestamp: block.timestamp
        });
        emit NewIPFSAnchor(postId, msg.sender, cid);
    }

    /**
     * @dev Posts small content directly onto the blockchain for maximum persistence.
     * @param content The string content to be stored.
     */
    function postOnChain(string calldata content) external {
        (bool isRegistered,, ) = didRegistry.users(msg.sender);
        require(isRegistered, "User is not registered");
        require(bytes(content).length <= 280, "On-chain content is size-limited"); // Example limit

        uint256 postId = ++_onChainPostCounter;
        onChainPosts[postId] = OnChainPost({
            content: content,
            author: msg.sender,
            timestamp: block.timestamp
        });
        emit NewOnChainPost(postId, msg.sender);
    }
    
    /**
     * @dev Returns the total number of IPFS anchors.
     */
    function getIPFSAnchorCount() external view returns (uint256) {
        return _ipfsAnchorCounter;
    }

    /**
     * @dev Returns the total number of on-chain posts.
     */
    function getOnChainPostCount() external view returns (uint256) {
        return _onChainPostCounter;
    }

    /**
     * @dev Recovers signer address from a hash and signature.
     */
    function _verifySignature(bytes32 hash, bytes calldata signature) internal pure returns (address) {
        address signer = ecrecover(hash, 27 + uint8(signature[64]), bytes32(signature[0:32]), bytes32(signature[32:64]));
        require(signer != address(0), "Invalid signature");
        return signer;
    }
}