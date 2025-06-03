// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DIDRegistry
 * @dev Manages user Decentralized Identifiers (DIDs) on LiberaChain.
 * Implements signed-message authentication.
 * Each user's Ethereum address acts as their DID.
 */
contract DIDRegistry {
    // A struct to hold user profile information, linking the DID to off-chain data.
    struct UserProfile {
        bool isRegistered;
        string profileDataCID; // IPFS CID for extended profile data.
        string commPubKeyCID;  // IPFS CID for the user's communication public key.
    }

    mapping(address => UserProfile) public users;

    event DIDRegistered(address indexed user);
    event ProfileUpdated(address indexed user, string newCid);
    event CommKeyUpdated(address indexed user, string newCid);

    /**
     * @dev Registers a new user or authenticates an existing one by verifying a signature.
     * The signed message should be unique to prevent replay attacks.
     * @param challenge The original message that was signed.
     * @param signature The cryptographic signature of the challenge.
     */
    function register(bytes calldata challenge, bytes calldata signature) external {
        address signer = _verifySignature(challenge, signature);
        require(signer == msg.sender, "Signer must be the sender");

        if (!users[signer].isRegistered) {
            users[signer].isRegistered = true;
            emit DIDRegistered(signer);
        }
        // For stateless contract interaction, successful verification implies authentication.
    }

    /**
     * @dev Updates the IPFS CID for the calling user's profile data.
     * @param cid The new IPFS Content Identifier for the profile.
     */
    function setProfileCID(string calldata cid) external {
        require(users[msg.sender].isRegistered, "User is not registered");
        users[msg.sender].profileDataCID = cid;
        emit ProfileUpdated(msg.sender, cid);
    }

    /**
     * @dev Updates the IPFS CID for the user's communication public key.
     * This is a key part of the researched secure communication setup.
     * @param cid The new IPFS CID for the communication key.
     */
    function setCommPubKeyCID(string calldata cid) external {
        require(users[msg.sender].isRegistered, "User is not registered");
        users[msg.sender].commPubKeyCID = cid;
        emit CommKeyUpdated(msg.sender, cid);
    }

    /**
     * @dev Recovers the signer's address from a message and its signature.
     * Implements the ecrecover precompile for signature verification.
     * @param message The original message.
     * @param signature The signature.
     * @return The address of the signer.
     */
    function _verifySignature(bytes calldata message, bytes calldata signature) internal pure returns (address) {
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", _uintToString(message.length), message));
        address signer = ecrecover(messageHash, 27 + uint8(signature[64]), bytes32(signature[0:32]), bytes32(signature[32:64]));
        require(signer != address(0), "Invalid signature");
        return signer;
    }

    /**
     * @dev Helper function to convert a uint to its string representation.
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        // Implementation omitted for brevity; uses standard uint-to-string conversion logic.
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}