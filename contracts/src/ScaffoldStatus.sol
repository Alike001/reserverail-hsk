// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Compile sentinel for the ReserveRail Foundry scaffold.
/// @dev This contract is test-only and must never be presented as a deployed product contract.
contract ScaffoldStatus {
    function isFinancialProduct() external pure returns (bool) {
        return false;
    }
}
