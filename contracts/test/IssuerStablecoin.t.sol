// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";

contract IssuerStablecoinTest {
    address private constant ADMINISTRATOR = address(0xA11CE);
    address private constant VAULT = address(0xBEEF);
    address private constant HOLDER = address(0xCAFE);
    address private constant RECIPIENT = address(0xD00D);

    function test_InitializesMetadataAndVaultOnce() public {
        IssuerStablecoin token = new IssuerStablecoin();
        token.initialize("Rail USD", "rUSD", ADMINISTRATOR, VAULT);

        require(token.initialized(), "token not initialized");
        require(keccak256(bytes(token.name())) == keccak256(bytes("Rail USD")), "wrong name");
        require(keccak256(bytes(token.symbol())) == keccak256(bytes("rUSD")), "wrong symbol");
        require(token.decimals() == 6, "wrong decimals");
        require(token.administrator() == ADMINISTRATOR, "wrong administrator");
        require(token.vault() == VAULT, "wrong vault");

        (bool succeeded,) = address(token).call(
            abi.encodeCall(token.initialize, ("Other", "OTHER", ADMINISTRATOR, VAULT))
        );
        require(!succeeded, "reinitialization succeeded");
    }

    function test_RejectsInvalidInitialization() public {
        IssuerStablecoin token = new IssuerStablecoin();
        (bool zeroAdministrator,) =
            address(token).call(abi.encodeCall(token.initialize, ("Rail USD", "rUSD", address(0), VAULT)));
        require(!zeroAdministrator, "zero administrator accepted");

        (bool zeroVault,) =
            address(token).call(abi.encodeCall(token.initialize, ("Rail USD", "rUSD", ADMINISTRATOR, address(0))));
        require(!zeroVault, "zero vault accepted");

        (bool emptyMetadata,) =
            address(token).call(abi.encodeCall(token.initialize, ("", "rUSD", ADMINISTRATOR, VAULT)));
        require(!emptyMetadata, "empty metadata accepted");
    }

    function test_OnlyVaultCanMintOrBurn() public {
        IssuerStablecoin token = new IssuerStablecoin();
        token.initialize("Rail USD", "rUSD", ADMINISTRATOR, address(this));

        token.mint(HOLDER, 1_000_000);
        require(token.balanceOf(HOLDER) == 1_000_000, "mint failed");
        token.burn(HOLDER, 250_000);
        require(token.balanceOf(HOLDER) == 750_000, "burn failed");

        IssuerStablecoinUnauthorizedCaller caller = new IssuerStablecoinUnauthorizedCaller();
        require(!caller.tryMint(token, HOLDER, 1), "unauthorized mint succeeded");
        require(!caller.tryBurn(token, HOLDER, 1), "unauthorized burn succeeded");
    }

    function test_TransfersAndAllowancesUseStandardBehavior() public {
        IssuerStablecoin token = new IssuerStablecoin();
        token.initialize("Rail USD", "rUSD", ADMINISTRATOR, address(this));
        token.mint(address(this), 1_000_000);

        token.transfer(HOLDER, 400_000);
        require(token.balanceOf(HOLDER) == 400_000, "transfer failed");
        token.approve(address(this), 100_000);
        token.transferFrom(address(this), RECIPIENT, 100_000);
        require(token.balanceOf(RECIPIENT) == 100_000, "transferFrom failed");
        require(token.allowance(address(this), address(this)) == 0, "allowance not consumed");
    }

    function test_InstancesRemainIsolated() public {
        IssuerStablecoin first = new IssuerStablecoin();
        IssuerStablecoin second = new IssuerStablecoin();
        first.initialize("First", "FST", ADMINISTRATOR, address(this));
        second.initialize("Second", "SND", ADMINISTRATOR, address(this));

        first.mint(HOLDER, 10);
        require(first.totalSupply() == 10, "first supply wrong");
        require(second.totalSupply() == 0, "second supply changed");
        require(second.balanceOf(HOLDER) == 0, "second balance changed");
    }
}


contract IssuerStablecoinUnauthorizedCaller {
    function tryMint(IssuerStablecoin token, address recipient, uint256 amount) external returns (bool) {
        (bool succeeded,) = address(token).call(abi.encodeCall(token.mint, (recipient, amount)));
        return succeeded;
    }

    function tryBurn(IssuerStablecoin token, address holder, uint256 amount) external returns (bool) {
        (bool succeeded,) = address(token).call(abi.encodeCall(token.burn, (holder, amount)));
        return succeeded;
    }
}