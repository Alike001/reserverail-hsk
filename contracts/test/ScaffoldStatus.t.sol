// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ScaffoldStatus} from "../src/ScaffoldStatus.sol";

contract ScaffoldStatusTest {
    function test_ScaffoldCannotBePresentedAsFinancialProduct() public {
        ScaffoldStatus status = new ScaffoldStatus();
        require(!status.isFinancialProduct(), "scaffold must remain explicitly non-financial");
    }
}
