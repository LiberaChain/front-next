export const blockchainPostsABI = [
    // Post creation and retrieval
    "function createPost(string memory _content, string memory _title, string memory _authorDid, string memory _authorName, string memory _contentType, string memory _visibility, string memory _ipfsCid, string memory _metadata) public payable returns (bytes32)",
    "function getPost(bytes32 _postId) public view returns (string memory content, string memory title, string memory authorDid, string memory authorName, string memory contentType, uint256 timestamp, string memory visibility, string memory ipfsCid, string memory metadata, uint256 donation)",
    "function getUserPostIds(string memory _authorDid) public view returns (bytes32[] memory)",
    "function getTotalPostsCount() public view returns (uint256)",
    "function getPaginatedPostIds(uint256 _offset, uint256 _limit) public view returns (bytes32[] memory)",
    // Fee related functions
    "function getPostFee() public view returns (uint256)",
    "function setPostFee(uint256 _newFee) public",
    "function setFeeCollector(address _newCollector) public",
    "function getContractCreator() public view returns (address)",
    // Events
    "event PostCreated(bytes32 indexed postId, string authorDid, uint256 timestamp, string visibility, uint256 donation)",
    "event DonationReceived(bytes32 indexed postId, uint256 donationAmount)"
];

export const userPublicKeysABI = [
    // Public key management functions
    "function setPublicKey(string memory userId, string memory publicKey) public",
    "function getPublicKey(string memory userId) public view returns (string memory)",
    "function publicKeyExists(string memory userId) public view returns (bool)",
    // Events
    "event PublicKeySet(string indexed userId, string publicKey)",
];

export const userRegistryABI = [
    // User registration functions
    "function registerUser(string memory did, string memory publicKey) public",
    "function userExists(string memory did) public view returns (bool)",
    "function getUser(string memory did) public view returns (bool exists, string memory publicKey, uint256 registrationTime)",
    "function updatePublicKey(string memory did, string memory newPublicKey) public",
    // Events
    "event UserRegistered(string indexed did, string publicKey)",
];
