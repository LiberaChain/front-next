// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol"; // For converting uint to string for URI
import "@openzeppelin/contracts/utils/Strings.sol"; // For converting uint to string for URI

/**
 * @title ObjectToken
 * @dev An ERC1155 contract for managing various types of tokens (fungible points, NFTs)
 * that users can earn through interactions with objects or venues.
 * Includes features like per-user limits, cooldowns, and defined redemption methods.
 * This contract is upgradeable.
 */
contract ObjectToken is
    Initializable,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // using Counters for Counters.Counter;
    // using CountersUpgradeable for CountersUpgradeable.Counter;
    using Strings for uint256; // For converting uint256 to string
    // using StringsUpgradeable for uint256; // For converting uint256 to string

    // Enum for defining how a token type is redeemed
    enum RedemptionMethod {
        Burn, // Tokens are destroyed
        TransferToCreator, // Tokens are transferred back to the token type's creator
        TransferToSpecificAddress // Tokens are transferred to a designated address
    }

    // Structure to store detailed information about each token type
    struct TokenTypeInfo {
        address creator; // Address that created this token type (e.g., venue owner)
        uint256 maxSupply; // Max total supply of this token type (0 for unlimited)
        // Note: Strict enforcement requires tracking total minted for this ID.
        uint256 currentMintedAmount; // Tracks total amount minted for this token ID
        bool isNFTLike; // If true, typically a user can own only 1. Amount minted is 1.
        string tokenURI; // Specific URI for this token type's metadata. Overrides base URI if set.
        uint256 maxTokensPerUser; // Max tokens of this type a user can hold (0 for unlimited)
        uint256 cooldownPeriodSeconds; // Cooldown before user can acquire this token type again
        RedemptionMethod redemptionMethod; // How tokens of this type are redeemed
        address redemptionAddress; // Address for redemption if method is TransferToSpecificAddress
    }

    // Counter to generate unique token IDs for new token types
    uint256 private _tokenIdCounter;

    // Mapping from token ID to its TokenTypeInfo
    mapping(uint256 => TokenTypeInfo) public tokenTypeDetails;

    // Mapping to track the last acquisition timestamp for a user and token type (for cooldown)
    // tokenId => userAddress => timestamp
    mapping(uint256 => mapping(address => uint256))
        public lastAcquiredTimestamp;

    // Base URI that can be set for tokens that don't have a specific tokenURI in TokenTypeInfo
    string private _baseURI;

    // --- Events ---
    event TokenTypeCreated(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 maxSupply,
        string tokenURI,
        bool isNFTLike,
        uint256 maxTokensPerUser,
        uint256 cooldownPeriodSeconds,
        RedemptionMethod redemptionMethod,
        address redemptionAddress
    );

    event TokensRedeemed(
        address indexed redeemer,
        uint256 indexed tokenId,
        uint256 amount,
        RedemptionMethod method,
        address recipient // Address tokens were sent to if not burned (e.g., creator, specific address)
    );

    event TokenTypeUpdated(uint256 indexed tokenId);

    /**
     * @dev Contract constructor for UUPS upgradeability.
     * Initializers are disabled because this is an upgradeable contract.
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract.
     * @param initialOwner The address that will initially own the contract and have administrative rights.
     * @param baseTokenURI The base URI for token metadata. Can be overridden per token type, or used as a prefix.
     */
    function initialize(
        address initialOwner,
        string memory baseTokenURI
    ) public initializer {
        __ERC1155_init(""); // The actual URI is handled by the overridden `uri` function
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();
        _baseURI = baseTokenURI; // Store base URI for fallback or prefixing
    }

    /**
     * @dev Overrides the standard ERC1155 uri function to provide per-token-type URIs
     * or fall back to a base URI potentially combined with the token ID.
     * @param tokenId The ID of the token type.
     * @return The URI string for the token's metadata.
     */
    function uri(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        TokenTypeInfo storage info = tokenTypeDetails[tokenId];
        require(
            info.creator != address(0),
            "ObjectToken: Token type does not exist or has no creator defined"
        );

        if (bytes(info.tokenURI).length > 0) {
            return info.tokenURI; // Return specific URI if set
        }

        // Fallback to baseURI. If baseURI contains "{id}", replace it. Otherwise, append.
        // This is a simplified version. For robust {id} replacement, consider more complex string manipulation.
        if (bytes(_baseURI).length > 0) {
            // A common pattern is for baseURI to end with '/' and then append ID, or have a placeholder like {id}
            // For simplicity, we'll just concatenate if no specific URI is found.
            // A more robust implementation might check if _baseURI is a template.
            return string(abi.encodePacked(_baseURI, tokenId.toString()));
        }
        return ""; // Default empty URI if no specific or base URI is set
    }

    /**
     * @dev Allows the contract owner to create a new type of token.
     * @param _creator The address authorized to mint tokens of this new type (e.g., a venue).
     * @param _maxSupply Maximum total supply for this token type (0 for unlimited).
     * @param _tokenURI Metadata URI for this token type. If empty, `uri` function might use the base URI.
     * @param _isNFTLike True if this token type should behave like an NFT (typically, one per user, amount 1).
     * @param _maxTokensPerUser Max tokens of this type a user can hold (0 for unlimited). If _isNFTLike is true and this is 1, it's a unique instance per user.
     * @param _cooldownPeriodSeconds Cooldown in seconds before a user can acquire this token again.
     * @param _redemptionMethod The method by which tokens of this type are redeemed.
     * @param _redemptionAddress The target address if _redemptionMethod involves a transfer (ignored if Burn).
     * @return The ID of the newly created token type.
     */
    function createTokenType(
        address _creator,
        uint256 _maxSupply,
        string memory _tokenURI,
        bool _isNFTLike,
        uint256 _maxTokensPerUser,
        uint256 _cooldownPeriodSeconds,
        RedemptionMethod _redemptionMethod,
        address _redemptionAddress
    ) public onlyOwner nonReentrant returns (uint256) {
        require(
            _creator != address(0),
            "ObjectToken: Creator cannot be the zero address"
        );
        if (_redemptionMethod == RedemptionMethod.TransferToSpecificAddress) {
            require(
                _redemptionAddress != address(0),
                "ObjectToken: Redemption address must be set for transfer method"
            );
        }
        if (_isNFTLike) {
            // For NFT-like tokens, maxTokensPerUser is usually 1 if it's a unique badge for that user.
            // If 0, it means a user can have multiple distinct NFTs of this "type" (if minting logic allows unique IDs within the type, which ERC1155 doesn't do by default for a single tokenId).
            // So, if _isNFTLike, _maxTokensPerUser being 1 means "one instance of this badge/collectible per user".
            require(
                _maxTokensPerUser == 0 || _maxTokensPerUser == 1,
                "ObjectToken: NFT-like token maxTokensPerUser should be 0 or 1"
            );
        }

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        tokenTypeDetails[newTokenId] = TokenTypeInfo({
            creator: _creator,
            maxSupply: _maxSupply,
            currentMintedAmount: 0,
            isNFTLike: _isNFTLike,
            tokenURI: _tokenURI,
            maxTokensPerUser: _maxTokensPerUser,
            cooldownPeriodSeconds: _cooldownPeriodSeconds,
            redemptionMethod: _redemptionMethod,
            redemptionAddress: _redemptionAddress
        });

        emit TokenTypeCreated(
            newTokenId,
            _creator,
            _maxSupply,
            _tokenURI,
            _isNFTLike,
            _maxTokensPerUser,
            _cooldownPeriodSeconds,
            _redemptionMethod,
            _redemptionAddress
        );
        return newTokenId;
    }

    /**
     * @dev Mints tokens of a specific type to a user.
     * Can only be called by the token type's creator or the contract owner.
     * This function is typically called by a backend system after off-chain verification (e.g., QR scan).
     * @param _to The address of the recipient.
     * @param _tokenId The ID of the token type to mint.
     * @param _amount The amount of tokens to mint. For NFT-like tokens where unique instance per user is desired, this should be 1.
     * @param _data Additional data for ERC1155 minting (optional).
     */
    function mintTokens(
        address _to,
        uint256 _tokenId,
        uint256 _amount,
        bytes memory _data
    ) public whenNotPaused nonReentrant {
        require(_to != address(0), "ObjectToken: Mint to the zero address");
        TokenTypeInfo storage info = tokenTypeDetails[_tokenId];
        require(
            info.creator != address(0),
            "ObjectToken: Token type does not exist"
        );
        require(
            msg.sender == info.creator || msg.sender == owner(),
            "ObjectToken: Caller is not authorized to mint this token type"
        );
        require(_amount > 0, "ObjectToken: Amount must be greater than zero");

        // Max total supply check (if set)
        if (info.maxSupply > 0) {
            require(
                info.currentMintedAmount + _amount <= info.maxSupply,
                "ObjectToken: Minting exceeds max supply for this token type"
            );
        }

        // Per-user limit and NFT-like behavior
        if (info.isNFTLike) {
            require(
                _amount == 1,
                "ObjectToken: NFT-like tokens can only be minted in an amount of 1"
            );
            if (info.maxTokensPerUser == 1) {
                // Enforces unique instance per user
                require(
                    balanceOf(_to, _tokenId) == 0,
                    "ObjectToken: User already owns an instance of this unique NFT-like token"
                );
            }
        } else {
            // Per-user limit check (if set) for fungible tokens
            if (info.maxTokensPerUser > 0) {
                require(
                    balanceOf(_to, _tokenId) + _amount <= info.maxTokensPerUser,
                    "ObjectToken: Minting exceeds max tokens per user for this type"
                );
            }
        }

        // Cooldown check
        if (info.cooldownPeriodSeconds > 0) {
            require(
                block.timestamp >=
                    lastAcquiredTimestamp[_tokenId][_to] +
                        info.cooldownPeriodSeconds,
                "ObjectToken: Cooldown period active for this user and token type"
            );
        }

        info.currentMintedAmount += _amount;
        _mint(_to, _tokenId, _amount, _data);
        lastAcquiredTimestamp[_tokenId][_to] = block.timestamp; // Update last acquired timestamp
    }

    /**
     * @dev Allows a user to redeem (e.g., use or claim a reward for) their tokens.
     * The redemption method is defined by the token type.
     * Only the token holder can call this for their own tokens.
     * @param _tokenId The ID of the token type to redeem.
     * @param _amount The amount of tokens to redeem.
     * @param _data Additional data for ERC1155 transfers (optional, used if transferring).
     */
    function redeemTokens(
        uint256 _tokenId,
        uint256 _amount,
        bytes memory _data
    ) public whenNotPaused nonReentrant {
        TokenTypeInfo storage info = tokenTypeDetails[_tokenId];
        address currentUser = msg.sender; // The user initiating the redemption

        require(
            info.creator != address(0),
            "ObjectToken: Token type does not exist"
        );
        require(
            balanceOf(currentUser, _tokenId) >= _amount,
            "ObjectToken: Insufficient balance to redeem"
        );
        require(_amount > 0, "ObjectToken: Amount must be greater than zero");

        address recipientOnRedeem = address(0);

        if (info.redemptionMethod == RedemptionMethod.Burn) {
            _burn(currentUser, _tokenId, _amount);
            // If burning reduces effective supply that counts against maxSupply, update currentMintedAmount
            // Assuming currentMintedAmount tracks tokens in existence.
            info.currentMintedAmount -= _amount;
        } else if (
            info.redemptionMethod == RedemptionMethod.TransferToCreator
        ) {
            recipientOnRedeem = info.creator;
            _safeTransferFrom(
                currentUser,
                info.creator,
                _tokenId,
                _amount,
                _data
            );
            // currentMintedAmount is not reduced as tokens still exist, just change ownership.
        } else if (
            info.redemptionMethod == RedemptionMethod.TransferToSpecificAddress
        ) {
            require(
                info.redemptionAddress != address(0),
                "ObjectToken: Redemption address not set for this method"
            );
            recipientOnRedeem = info.redemptionAddress;
            _safeTransferFrom(
                currentUser,
                info.redemptionAddress,
                _tokenId,
                _amount,
                _data
            );
            // currentMintedAmount is not reduced. If redemptionAddress is a burn address, then effectively supply is reduced.
        } else {
            revert("ObjectToken: Unknown redemption method");
        }

        emit TokensRedeemed(
            currentUser,
            _tokenId,
            _amount,
            info.redemptionMethod,
            recipientOnRedeem
        );
    }

    // --- Administrative Functions ---
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseURI = newBaseURI;
    }

    function updateTokenTypeDetails(
        uint256 _tokenId,
        address _newCreator,
        uint256 _newMaxSupply,
        string memory _newTokenURI,
        bool _newIsNFTLike,
        uint256 _newMaxTokensPerUser,
        uint256 _newCooldownPeriodSeconds,
        RedemptionMethod _newRedemptionMethod,
        address _newRedemptionAddress
    ) public onlyOwner nonReentrant {
        TokenTypeInfo storage info = tokenTypeDetails[_tokenId];
        require(
            info.creator != address(0),
            "ObjectToken: Token type does not exist"
        );

        // Only update if new values are meaningfully provided (e.g., non-zero address for creator)
        if (_newCreator != address(0)) {
            info.creator = _newCreator;
        }
        // Caution: Modifying maxSupply can be tricky if currentMintedAmount already exceeds a new, lower maxSupply.
        // Add checks if reducing maxSupply: require(_newMaxSupply >= info.currentMintedAmount, "New maxSupply too low");
        info.maxSupply = _newMaxSupply;
        info.tokenURI = _newTokenURI;
        info.isNFTLike = _newIsNFTLike;
        info.maxTokensPerUser = _newMaxTokensPerUser;
        info.cooldownPeriodSeconds = _newCooldownPeriodSeconds;
        info.redemptionMethod = _newRedemptionMethod;

        if (
            _newRedemptionMethod == RedemptionMethod.TransferToSpecificAddress
        ) {
            require(
                _newRedemptionAddress != address(0),
                "ObjectToken: Redemption address must be set for transfer method for update"
            );
            info.redemptionAddress = _newRedemptionAddress;
        } else {
            info.redemptionAddress = address(0); // Clear if not used by the new method
        }

        emit TokenTypeUpdated(_tokenId);
    }

    // --- View Functions ---
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Required for ERC165 interface detection.
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC1155Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
