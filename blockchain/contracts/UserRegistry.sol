// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserRegistry {
    struct User {
        bool exists;
        string publicKey;
        uint256 registrationTime;
    }
    
    // Mapping of user DIDs to their registration data
    mapping(string => User) private users;
    
    // Event emitted when a user is registered
    event UserRegistered(string indexed did, string publicKey);
    
    // Register a new user with their public key
    function registerUser(string memory did, string memory publicKey) public {
        require(!users[did].exists, "User already registered");
        
        users[did] = User({
            exists: true,
            publicKey: publicKey,
            registrationTime: block.timestamp
        });
        
        emit UserRegistered(did, publicKey);
    }
    
    // Check if a user exists
    function userExists(string memory did) public view returns (bool) {
        return users[did].exists;
    }
    
    // Get user registration data
    function getUser(string memory did) public view returns (bool exists, string memory publicKey, uint256 registrationTime) {
        User memory user = users[did];
        return (user.exists, user.publicKey, user.registrationTime);
    }
    
    // Update a user's public key (only if user exists)
    function updatePublicKey(string memory did, string memory newPublicKey) public {
        require(users[did].exists, "User not registered");
        users[did].publicKey = newPublicKey;
    }
}