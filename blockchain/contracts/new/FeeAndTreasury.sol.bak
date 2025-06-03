// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IFeeAndTreasury.sol";

/**
 * @title FeeAndTreasury
 * @dev Implements logic for fee collection and donation handling.
 * This contract is managed by an owner who can set fees for various platform functions and designate a treasury address to receive the funds.
 */
contract FeeAndTreasury is IFeeAndTreasury, Ownable {
    address payable private _treasury;
    mapping(bytes4 => uint256) private _fees;

    event FeeSet(bytes4 indexed selector, uint256 fee);
    event TreasuryUpdated(address indexed newTreasury);

    /**
     * @dev Sets the initial treasury address upon deployment.
     * @param initialTreasury The initial address for the treasury.
     */
    constructor(address payable initialTreasury) Ownable(msg.sender) {
        require(initialTreasury != address(0), "Treasury address cannot be zero");
        _treasury = initialTreasury;
        emit TreasuryUpdated(initialTreasury);
    }

    /**
     * @dev Sets the fee for a specific function, identified by its 4-byte selector.
     * Only the owner can call this function.
     * @param selector The function selector to set the fee for.
     * @param fee The fee amount in wei.
     */
    function setFee(bytes4 selector, uint256 fee) external onlyOwner {
        _fees[selector] = fee;
        emit FeeSet(selector, fee);
    }

    /**
     * @dev Updates the treasury address where funds are sent.
     * Only the owner can call this function.
     * @param newTreasury The new payable address for the treasury.
     */
    function setTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury address cannot be zero");
        _treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @dev Public getter to retrieve the fee for a function.
     * @param selector The function selector.
     * @return The fee in wei.
     */
    function getFee(bytes4 selector) public view override returns (uint256) {
        return _fees[selector];
    }

    /**
     * @dev Public getter to retrieve the current treasury address.
     * @return The treasury address.
     */
    function treasury() public view override returns (address payable) {
        return _treasury;
    }
}