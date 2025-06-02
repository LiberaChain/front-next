// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts-upgradeable/contracts/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol"; // Za preverjanje podpisov
import "@openzeppelin/contracts/utils/Strings.sol"; // Za delo s stringi, če potrebno

struct Post {
    string content;
    string title;
    string authorDid; // DID uporabnika iz UserRegistry
    string authorName;
    string contentType;
    uint256 timestamp;
    string visibility;
    string ipfsCid;
    string metadata;
    uint256 appTokenDonation; // Donacija v AppTokenih
    bytes signature; // Podpis sporočila s strani avtorja
    bool verified; // Ali je podpis uspešno preverjen proti javnemu ključu/naslovu avtorja
}

contract BlockchainPosts is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using ECDSA for bytes32; // Uporaba OpenZeppelin knjižnice za podpise
    // using StringsUpgradeable for string; // Uporaba OpenZeppelin knjižnice za stringe
    using Strings for string; // Uporaba OpenZeppelin knjižnice za stringe

    // IERC20Upgradeable public appToken; // Naslov pogodbe za AppToken
    IERC20 public appToken; // Naslov pogodbe za AppToken
    uint256 public tokenPostFee; // Provizija za objavo v AppTokenih
    // feeCollector bo zdaj lastnik pogodbe (owner()), ki lahko dvigne zbrane žetone
    // contractCreator je prav tako lastnik pogodbe (owner())

    mapping(bytes32 => Post) public posts;
    mapping(string => bytes32[]) public userPosts; // Ključ je authorDid
    bytes32[] public allPostIds;

    event PostCreated(
        bytes32 indexed postId,
        string authorDid,
        uint256 timestamp,
        string visibility,
        uint256 appTokenDonation,
        bool verified
    );
    event PostVerified(bytes32 indexed postId, address verifier); // Naslov, ki je preveril podpis
    event TokenPostFeeChanged(uint256 newFee);
    event AppTokenAddressChanged(address newAppTokenAddress);

    // DonationReceived bo del PostCreated dogodka

    // Referenca na UserRegistry za pridobivanje javnih ključev/naslovov uporabnikov za preverjanje podpisov
    // address public userRegistryAddress; // To bi se nastavilo v initialize

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address _appTokenAddress,
        uint256 _initialTokenPostFee
    )
        public
        // address _userRegistryAddress
        initializer
    {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();

        require(
            _appTokenAddress != address(0),
            "BlockchainPosts: Invalid token address"
        );
        appToken = IERC20(_appTokenAddress);
        // appToken = IERC20Upgradeable(_appTokenAddress);
        tokenPostFee = _initialTokenPostFee;
        // require(_userRegistryAddress != address(0), "BlockchainPosts: Invalid UserRegistry address");
        // userRegistryAddress = _userRegistryAddress;
    }

    // --- Funkcije za upravljanje s strani lastnika ---
    function setTokenPostFee(uint256 _newFee) public onlyOwner {
        tokenPostFee = _newFee;
        emit TokenPostFeeChanged(_newFee);
    }

    function setAppTokenAddress(address _newAppTokenAddress) public onlyOwner {
        require(
            _newAppTokenAddress != address(0),
            "BlockchainPosts: Invalid token address"
        );
        appToken = IERC20(_newAppTokenAddress);
        // appToken = IERC20Upgradeable(_newAppTokenAddress);
        emit AppTokenAddressChanged(_newAppTokenAddress);
    }

    // function setUserRegistryAddress(address _newUserRegistryAddress) public onlyOwner {
    //     require(_newUserRegistryAddress != address(0), "BlockchainPosts: Invalid UserRegistry address");
    //     userRegistryAddress = _newUserRegistryAddress;
    // }

    // Funkcija za lastnika, da dvigne zbrane provizije/donacije v AppTokenih
    function withdrawAppTokens(
        address recipient,
        uint256 amount
    ) public onlyOwner nonReentrant {
        require(
            recipient != address(0),
            "BlockchainPosts: Invalid recipient address"
        );
        uint256 balance = appToken.balanceOf(address(this));
        require(
            amount <= balance,
            "BlockchainPosts: Insufficient token balance in contract"
        );
        require(
            appToken.transfer(recipient, amount),
            "BlockchainPosts: Token transfer failed"
        );
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // --- Logika za objave ---

    /**
     * @dev Pripravi hash sporočila za podpis. Pomembno je, da je ta hash enak tistemu,
     * ki ga je uporabnik podpisal na strani odjemalca.
     * Vključiti je treba vse ključne podatke objave.
     * Nonce ali postId bi bil dober dodatek za preprečevanje replay napadov, če ID ni odvisen od timestampa.
     */
    function createMessageHash(
        string memory _content,
        string memory _title,
        string memory _authorDid,
        uint256 _timestamp // Uporabiti timestamp, ki bo dejansko uporabljen v objavi
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32", // Standardni prefix za Ethereum podpise
                    keccak256(
                        abi.encodePacked(
                            "LiberaChain Post:", // Domenksi separator
                            _title,
                            _content,
                            _authorDid,
                            _timestamp
                        )
                    )
                )
            );
    }

    /**
     * @dev Glavna funkcija za ustvarjanje objave.
     * @param userAddressForTokenTransfer Naslov uporabnika, s katerega se bodo prenesli AppTokeni.
     * Ta naslov mora odobriti tej pogodbi porabo žetonov.
     * V primeru meta-transakcij je to naslov dejanskega podpisnika.
     */
    function createPost(
        address userAddressForTokenTransfer, // Naslov uporabnika, ki plačuje z žetoni
        string memory _content,
        string memory _title,
        string memory _authorDid, // DID uporabnika (mora se ujemati s podpisnikom)
        string memory _authorName,
        string memory _contentType,
        string memory _visibility,
        string memory _ipfsCid,
        string memory _metadata,
        uint256 _appTokenDonationAmount, // Dodatna donacija v AppTokenih
        bytes memory _signature // Podpis hash-a sporočila s strani avtorja
    ) public whenNotPaused nonReentrant returns (bytes32 postId) {
        require(
            userAddressForTokenTransfer != address(0),
            "BlockchainPosts: Invalid user address for token transfer"
        );

        uint256 totalTokensToTransfer = tokenPostFee + _appTokenDonationAmount;

        if (totalTokensToTransfer > 0) {
            // Preveri, ali ima uporabnik dovolj žetonov IN ali je odobril tej pogodbi porabo
            // To bo izvedlo prenos žetonov od userAddressForTokenTransfer k tej pogodbi (ali direktno feeCollectorju)
            // Za enostavnost najprej prenesemo na to pogodbo, lastnik pa jih potem dvigne.
            require(
                appToken.transferFrom(
                    userAddressForTokenTransfer,
                    address(this),
                    totalTokensToTransfer
                ),
                "BlockchainPosts: AppToken transfer failed"
            );
        }

        uint256 currentTimestamp = block.timestamp;
        postId = keccak256(
            abi.encodePacked(_authorDid, _content, currentTimestamp)
        ); // ID objave

        // Preverjanje podpisa
        bool isVerified = false;
        address signerAddress = address(0);
        if (_signature.length > 0) {
            bytes32 messageHash = createMessageHash(
                _content,
                _title,
                _authorDid,
                currentTimestamp
            );
            signerAddress = messageHash.recover(_signature); // Uporaba ECDSAUpgradeable

            // Tukaj je ključni del: kako preveriti, ali `signerAddress` ustreza `_authorDid`.
            // To zahteva mehanizem za povezavo DID-jev z Ethereum naslovi.
            // Možnost 1: UserRegistry hrani Ethereum naslov, povezan z DID-om.
            // Možnost 2: DID je v formatu `did:ethr:0x...` in naslov se izlušči iz DID-a.
            // Možnost 3: Odjemalec pošlje pričakovani naslov avtorja, ki se primerja s signerAddress.
            // Za zdaj predpostavimo, da mora `userAddressForTokenTransfer` biti enak `signerAddress`.
            // To pomeni, da tisti, ki plačuje z žetoni, mora biti tudi podpisnik objave.
            if (
                signerAddress != address(0) &&
                signerAddress == userAddressForTokenTransfer
            ) {
                // Dodatno preverjanje: Ali ta signerAddress dejansko pripada _authorDid?
                // To bi zahtevalo klic na UserRegistry ali pa da je userAddressForTokenTransfer že preverjeno povezan z _authorDid.
                // string memory expectedEthAddressFromDid = extractEthAddressFromDid(_authorDid); // Potrebuje varno implementacijo
                // if (expectedEthAddressFromDid.equals(StringsUpgradeable.toHexString(signerAddress))) {
                //    isVerified = true;
                // }
                // Zaenkrat poenostavljeno: če je podpis veljaven in se podpisnik ujema s plačnikom, je "delno" preverjeno.
                // Popolna preverba proti DID-u zahteva dodatno logiko.
                isVerified = true; // To je treba izboljšati z dejansko logiko preverjanja DID-naslov ujemanja!
            }
        }

        Post memory newPost = Post({
            content: _content,
            title: _title,
            authorDid: _authorDid,
            authorName: _authorName,
            contentType: _contentType,
            timestamp: currentTimestamp,
            visibility: _visibility,
            ipfsCid: _ipfsCid,
            metadata: _metadata,
            appTokenDonation: _appTokenDonationAmount,
            signature: _signature,
            verified: isVerified
        });

        posts[postId] = newPost;
        userPosts[_authorDid].push(postId);
        allPostIds.push(postId);

        emit PostCreated(
            postId,
            _authorDid,
            currentTimestamp,
            _visibility,
            _appTokenDonationAmount,
            isVerified
        );
        if (isVerified) {
            emit PostVerified(postId, signerAddress);
        }
        return postId;
    }

    // --- Pomožne funkcije za branje (ostanejo podobne, vrnejo nova polja) ---
    function getPost(
        bytes32 _postId
    )
        public
        view
        returns (
            Post memory // Vrne celoten struct za lažje upravljanje na odjemalcu
        )
    {
        Post storage post = posts[_postId]; // Uporaba 'storage'
        // Preverjanje, ali objava obstaja, je implicitno, saj bi vrnilo prazne vrednosti.
        // Lahko dodate require(bytes(post.authorDid).length > 0, "Post does not exist");
        // ali pa pustite odjemalcu, da preveri.
        return post;
    }

    function getUserPostIds(
        string memory _authorDid
    ) public view returns (bytes32[] memory) {
        return userPosts[_authorDid];
    }

    function getTotalPostsCount() public view returns (uint256) {
        return allPostIds.length;
    }

    function getPaginatedPostIds(
        uint256 _offset,
        uint256 _limit
    ) public view returns (bytes32[] memory) {
        uint256 total = allPostIds.length;
        if (_offset >= total) {
            return new bytes32[](0);
        }
        uint256 endIndex = _offset + _limit;
        if (endIndex > total) {
            endIndex = total;
        }
        uint256 count = endIndex - _offset;
        bytes32[] memory result = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allPostIds[_offset + i];
        }
        return result;
    }

    // --- Funkcije za provizije (zdaj za AppTokene) ---
    function getTokenPostFee() public view returns (uint256) {
        return tokenPostFee;
    }

    function getAppTokenAddress() public view returns (address) {
        return address(appToken);
    }
}
