// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol"; // Za možnost zaustavitve
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol"; // Za dodatno varnost

// Predpostavljamo, da imamo v prihodnosti lahko tudi AppToken za registracijo
// import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

struct User {
    bool exists;
    string publicKey; // Lahko je tudi bytes32, če je fiksne dolžine, ali pa Ethereum naslov
    uint256 registrationTime;
    // Dodatna polja, npr. povezan Ethereum naslov za lažje upravljanje žetonov
    // address linkedEthAddress;
}

contract UserRegistry is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // Mapping of user DIDs (string) to their registration data
    mapping(string => User) private users;

    // Primer: Če bi registracija zahtevala plačilo v AppTokenih
    // IERC20Upgradeable public appToken;
    // uint256 public registrationFee;

    event UserRegistered(
        string indexed did,
        string publicKey,
        uint256 registrationTime
    );
    event UserPublicKeyUpdated(string indexed did, string newPublicKey);

    // event RegistrationFeeChanged(uint256 newFee);
    // event AppTokenAddressChanged(address newAppTokenAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner
    )
        public
        // address _appTokenAddress, // Če bi uporabljali AppToken za registracijo
        // uint256 _initialRegistrationFee // Začetna provizija v AppTokenih
        initializer
    {
        __Ownable_init(initialOwner);
        __Pausable_init();
        __ReentrancyGuard_init();

        // if (_appTokenAddress != address(0)) {
        //     appToken = IERC20Upgradeable(_appTokenAddress);
        // }
        // registrationFee = _initialRegistrationFee;
    }

    // Funkcije za upravljanje s provizijo za registracijo, če bi jo uvedli
    // function setRegistrationFee(uint256 _newFee) public onlyOwner {
    //     registrationFee = _newFee;
    //     emit RegistrationFeeChanged(_newFee);
    // }

    // function setAppTokenAddress(address _newAppTokenAddress) public onlyOwner {
    //     require(_newAppTokenAddress != address(0), "UserRegistry: Invalid token address");
    //     appToken = IERC20Upgradeable(_newAppTokenAddress);
    //     emit AppTokenAddressChanged(_newAppTokenAddress);
    // }

    function registerUser(
        string memory did,
        string
            memory publicKey /*, address userEthAddressForTokens - če se uporablja */
    ) public whenNotPaused nonReentrant {
        require(!users[did].exists, "UserRegistry: User already registered");
        // Tukaj bi lahko dodali logiko za plačilo provizije v AppTokenih:
        // if (address(appToken) != address(0) && registrationFee > 0) {
        //     // Predpostavka: uporabnik (userEthAddressForTokens) je odobril tej pogodbi porabo žetonov
        //     // ali pa klic pride preko meta-transakcije, kjer je podpisnik userEthAddressForTokens
        //     require(appToken.transferFrom(userEthAddressForTokens, owner(), registrationFee), "UserRegistry: Token transfer failed");
        // }

        users[did] = User({
            exists: true,
            publicKey: publicKey,
            registrationTime: block.timestamp
            // linkedEthAddress: userEthAddressForTokens
        });

        emit UserRegistered(did, publicKey, block.timestamp);
    }

    function userExists(string memory did) public view returns (bool) {
        return users[did].exists;
    }

    function getUser(
        string memory did
    )
        public
        view
        returns (
            bool exists,
            string memory publicKey,
            uint256 registrationTime /*, address linkedEthAddress */
        )
    {
        User storage user = users[did]; // Uporaba 'storage' za branje je bolj učinkovita, če ne spreminjamo
        return (
            user.exists,
            user.publicKey,
            user.registrationTime /*, user.linkedEthAddress */
        );
    }

    // Premislite, kdo lahko posodobi javni ključ.
    // Če je to lahko samo uporabnik sam (preko meta-transakcije, kjer DID v sporočilu ustreza DID-ju, ki se posodablja,
    // in podpisnik meta-transakcije je lastnik tega DID-ja) ali samo lastnik pogodbe.
    // Zaenkrat dodajam `onlyOwner` za demonstracijo, lahko pa se to spremeni.
    function updatePublicKey(
        string memory did,
        string memory newPublicKey
    ) public nonReentrant /* onlyOwner ali drugačna logika preverjanja */ {
        require(users[did].exists, "UserRegistry: User not registered");
        // Dodatno preverjanje, kdo sme klicati to funkcijo, je ključno.
        // Npr. if (users[did].linkedEthAddress != _msgSender()) { require(owner() == _msgSender(), "Not authorized"); }
        // kjer _msgSender() pride iz konteksta (npr. OpenZeppelin ContextUpgradeable) ali pa ga posreduje relayer.
        // Zaenkrat predpostavljam, da to upravlja višji nivo ali pa je zaščiteno drugače.
        users[did].publicKey = newPublicKey;
        emit UserPublicKeyUpdated(did, newPublicKey);
    }

    // Funkcije za zaustavitev in ponovni zagon pogodbe s strani lastnika
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
