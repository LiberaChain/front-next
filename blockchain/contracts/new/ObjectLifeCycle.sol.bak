// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DIDRegistry.sol";
import "./IFeeAndTreasury.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title ObjectLifecycle
 * @dev Manages the complete lifecycle of "Objects" on LiberaChain.
 * This contract handles object creation, ownership, and verifiable interactions.
 */
contract ObjectLifecycle is ERC721 {
    DIDRegistry public didRegistry;
    IFeeAndTreasury public feeManager;

    // Struct representing a LiberaChain Object
    struct Object {
        string name;
        string description;
        string ipfsCID;
        address creator;
        address owner;
        uint256 createdAt;
        ObjectStatus status;
    }

    enum ObjectStatus {
        Active,
        Inactive,
        Locked
    }

    mapping(uint256 => Object) public objects;
    uint256 private _tokenIdCounter;

    event ObjectCreated(uint256 indexed tokenId, address indexed creator, string name);
    event ObjectOwnershipTransferred(uint256 indexed objectId, address indexed from, address indexed to);
    event InteractionRecorded(uint256 indexed objectId, address indexed user);

    modifier onlyObjectOwner(uint256 objectId) {
        require(objects[objectId].owner == msg.sender, "Caller is not the object owner");
        _;
    }

    constructor(
        address _didRegistryAddress, 
        address _feeManagerAddress
    ) ERC721("LiberaObject", "LOBJ") {
        didRegistry = DIDRegistry(_didRegistryAddress);
        feeManager = IFeeAndTreasury(_feeManagerAddress);
    }

    /**
     * @dev Creates a new object NFT and mints it to the caller.
     * @param name Name or title of the object.
     * @param description Brief description of the object.
     * @param ipfsCID IPFS Content Identifier for extended object data.
     */
    function createObject(
        string calldata name, 
        string calldata description, 
        string calldata ipfsCID
    ) external payable {
        (bool isRegistered,, ) = didRegistry.users(msg.sender);
        require(isRegistered, "User is not registered");
        
        // Get fee using the createObject function selector
        bytes4 selector = this.createObject.selector;
        uint256 requiredFee = feeManager.getFee(selector);
        require(msg.value >= requiredFee, "Insufficient fee");

        // Forward fee to treasury
        address payable treasuryAddress = feeManager.treasury();
        (bool sent,) = treasuryAddress.call{value: msg.value}("");
        require(sent, "Failed to forward fee");

        uint256 tokenId = ++_tokenIdCounter;
        _safeMint(msg.sender, tokenId);
        
        objects[tokenId] = Object({
            name: name,
            description: description,
            ipfsCID: ipfsCID,
            creator: msg.sender,
            owner: msg.sender,
            createdAt: block.timestamp,
            status: ObjectStatus.Active
        });

        emit ObjectCreated(tokenId, msg.sender, name);
    }

    /**
     * @dev Returns the total number of objects created.
     */
    function getObjectCount() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Records a user's interaction with an object.
     * The user signs a claim containing the objectId, which is verified here.
     * @param objectId The ID of the object being interacted with.
     * @param interactionClaimHash A hash of the interaction details, signed by the user.
     * @param userSignature The user's signature over the claim hash.
     */
    function recordInteraction(uint256 objectId, bytes32 interactionClaimHash, bytes calldata userSignature) external {
        require(objects[objectId].creator != address(0), "Object does not exist");
        address signer = ecrecover(interactionClaimHash, 27 + uint8(userSignature[64]), bytes32(userSignature[0:32]), bytes32(userSignature[32:64]));
        require(signer == msg.sender, "Invalid interaction signature");

        emit InteractionRecorded(objectId, msg.sender);
    }

    /**
     * @dev Transfers ownership of an object to a new address.
     * @param objectId The ID of the object.
     * @param newOwner The address of the new owner.
     */
    function transferObjectOwnership(uint256 objectId, address newOwner) external onlyObjectOwner(objectId) {
        require(newOwner != address(0), "New owner cannot be the zero address");
        address oldOwner = objects[objectId].owner;
        objects[objectId].owner = newOwner;
        emit ObjectOwnershipTransferred(objectId, oldOwner, newOwner);
    }
}