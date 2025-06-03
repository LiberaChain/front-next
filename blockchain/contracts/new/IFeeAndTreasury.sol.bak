// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IFeeAndTreasury
 * @dev Interface for the FeeAndTreasury contract.
 * Allows other contracts to query fees and the treasury address.
 */
interface IFeeAndTreasury {
    /**
     * @dev Returns the required fee for a given function selector.
     * @param selector The function selector (msg.sig).
     * @return The fee amount in wei.
     */
    function getFee(bytes4 selector) external view returns (uint256);

    /**
     * @dev Returns the address of the platform's treasury.
     * @return The payable address of the treasury.
     */
    function treasury() external view returns (address payable);
}