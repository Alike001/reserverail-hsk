// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";

contract IssuerStablecoinTest {
    address private constant ADMINISTRATOR = address(0xA11CE);
    address private constant HOLDER = address(0xCAFE);
    address private constant RECIPIENT = address(0xD00D);

    function test_ImplementationCannotBeInitialized() public {
        IssuerStablecoin implementation = new IssuerStablecoin();

        (bool succeeded,) = address(implementation)
            .call(abi.encodeCall(implementation.initialize, ("Rail USD", "rUSD", ADMINISTRATOR, address(this))));

        require(!succeeded, "implementation initialization succeeded");
    }

    function test_InitializesMetadataFactoryAndVaultOnce() public {
        IssuerStablecoin implementation = new IssuerStablecoin();
        IssuerStablecoinTestCloneFactory cloneFactory = new IssuerStablecoinTestCloneFactory();
        IssuerStablecoin token =
            cloneFactory.createAndInitialize(implementation, "Rail USD", "rUSD", ADMINISTRATOR, address(this));

        require(token.initialized(), "token not initialized");
        require(keccak256(bytes(token.name())) == keccak256(bytes("Rail USD")), "wrong name");
        require(keccak256(bytes(token.symbol())) == keccak256(bytes("rUSD")), "wrong symbol");
        require(token.decimals() == 6, "wrong decimals");
        require(token.factory() == address(cloneFactory), "wrong factory");
        require(token.administrator() == ADMINISTRATOR, "wrong administrator");
        require(token.vault() == address(this), "wrong vault");

        (bool succeeded,) =
            address(token).call(abi.encodeCall(token.initialize, ("Other", "OTHER", ADMINISTRATOR, address(this))));
        require(!succeeded, "reinitialization succeeded");
    }

    function test_RejectsInvalidInitialization() public {
        IssuerStablecoin implementation = new IssuerStablecoin();
        IssuerStablecoinTestCloneFactory cloneFactory = new IssuerStablecoinTestCloneFactory();

        IssuerStablecoin zeroAdministrator = cloneFactory.cloneOnly(implementation);
        (bool zeroAdministratorSucceeded,) = address(zeroAdministrator)
            .call(abi.encodeCall(zeroAdministrator.initialize, ("Rail USD", "rUSD", address(0), address(this))));
        require(!zeroAdministratorSucceeded, "zero administrator accepted");

        IssuerStablecoin zeroVault = cloneFactory.cloneOnly(implementation);
        (bool zeroVaultSucceeded,) = address(zeroVault)
            .call(abi.encodeCall(zeroVault.initialize, ("Rail USD", "rUSD", ADMINISTRATOR, address(0))));
        require(!zeroVaultSucceeded, "zero vault accepted");

        IssuerStablecoin emptyMetadata = cloneFactory.cloneOnly(implementation);
        (bool emptyMetadataSucceeded,) = address(emptyMetadata)
            .call(abi.encodeCall(emptyMetadata.initialize, ("", "rUSD", ADMINISTRATOR, address(this))));
        require(!emptyMetadataSucceeded, "empty metadata accepted");
    }

    function test_OnlyVaultCanMintOrBurnIncludingAdministrator() public {
        IssuerStablecoinUnauthorizedCaller administrator = new IssuerStablecoinUnauthorizedCaller();
        IssuerStablecoin token = _newToken(address(administrator), address(this));

        token.mint(HOLDER, 1_000_000);
        require(token.balanceOf(HOLDER) == 1_000_000, "mint failed");
        token.burn(HOLDER, 250_000);
        require(token.balanceOf(HOLDER) == 750_000, "burn failed");

        require(!administrator.tryMint(token, HOLDER, 1), "administrator mint succeeded");
        require(!administrator.tryBurn(token, HOLDER, 1), "administrator burn succeeded");

        IssuerStablecoinUnauthorizedCaller arbitraryCaller = new IssuerStablecoinUnauthorizedCaller();
        require(!arbitraryCaller.tryMint(token, HOLDER, 1), "unauthorized mint succeeded");
        require(!arbitraryCaller.tryBurn(token, HOLDER, 1), "unauthorized burn succeeded");
    }

    function test_VaultOnlyPauseBlocksMintAndTransfersButNotBurnOrApproval() public {
        IssuerStablecoin token = _newToken(ADMINISTRATOR, address(this));
        IssuerStablecoinUnauthorizedCaller arbitraryCaller = new IssuerStablecoinUnauthorizedCaller();
        token.mint(HOLDER, 1_000_000);

        require(!arbitraryCaller.trySetOperationalPause(token, true), "direct pause succeeded");
        token.setOperationalPause(true);
        require(token.paused(), "token did not pause");
        require(!arbitraryCaller.tryTransfer(token, RECIPIENT, 0), "paused zero transfer succeeded");

        (bool pausedMint,) = address(token).call(abi.encodeCall(token.mint, (HOLDER, 1)));
        require(!pausedMint, "paused mint succeeded");
        require(token.approve(RECIPIENT, 123), "pause blocked approval");

        token.burn(HOLDER, 250_000);
        require(token.balanceOf(HOLDER) == 750_000, "pause blocked burn");
        token.setOperationalPause(false);
        require(!token.paused(), "token did not unpause");
        require(!arbitraryCaller.trySetOperationalPause(token, true), "direct pause succeeded after unpause");
    }

    function test_AdministratorRotationRejectsUnauthorizedInvalidZeroAndNoOp() public {
        IssuerStablecoin token = _newToken(address(this), address(this));
        IssuerStablecoinUnauthorizedCaller nextAdministrator = new IssuerStablecoinUnauthorizedCaller();
        bytes32 administratorRole = token.ADMINISTRATOR_ROLE();

        require(
            !nextAdministrator.tryRotateRole(token, administratorRole, address(nextAdministrator)),
            "unauthorized rotation succeeded"
        );
        (bool invalidRole,) = address(token).call(abi.encodeCall(token.rotateRole, (bytes32(uint256(1)), RECIPIENT)));
        require(!invalidRole, "unknown role accepted");
        (bool zeroAccount,) = address(token).call(abi.encodeCall(token.rotateRole, (administratorRole, address(0))));
        require(!zeroAccount, "zero administrator accepted");
        (bool sameAccount,) = address(token).call(abi.encodeCall(token.rotateRole, (administratorRole, address(this))));
        require(!sameAccount, "same administrator accepted");

        token.rotateRole(administratorRole, address(nextAdministrator));
        require(token.administrator() == address(nextAdministrator), "administrator not rotated");
        (bool previousAdministrator,) =
            address(token).call(abi.encodeCall(token.rotateRole, (administratorRole, address(this))));
        require(!previousAdministrator, "previous administrator retained authority");
    }

    function test_TransfersAllowancesAndZeroValueUseStandardBehavior() public {
        IssuerStablecoin token = _newToken(ADMINISTRATOR, address(this));
        token.mint(address(this), 1_000_000);

        require(token.transfer(HOLDER, 400_000), "transfer returned false");
        require(token.balanceOf(HOLDER) == 400_000, "transfer failed");

        require(token.approve(address(this), 100_000), "approval returned false");
        require(token.transferFrom(address(this), RECIPIENT, 100_000), "transferFrom returned false");
        require(token.balanceOf(RECIPIENT) == 100_000, "transferFrom failed");
        require(token.allowance(address(this), address(this)) == 0, "allowance not consumed");

        require(token.transfer(RECIPIENT, 0), "zero transfer returned false");
        require(token.totalSupply() == 1_000_000, "zero transfer changed supply");
    }

    function test_RejectsInvalidTransfersAndPreservesInfiniteAllowance() public {
        IssuerStablecoin token = _newToken(ADMINISTRATOR, address(this));
        IssuerStablecoinUnauthorizedCaller spender = new IssuerStablecoinUnauthorizedCaller();
        token.mint(address(this), 1_000_000);

        require(!spender.tryTransfer(token, RECIPIENT, 1), "insufficient transfer succeeded");
        require(!spender.tryTransferFrom(token, address(this), RECIPIENT, 1), "insufficient allowance succeeded");

        (bool zeroRecipient,) = address(token).call(abi.encodeCall(token.transfer, (address(0), 1)));
        require(!zeroRecipient, "zero recipient accepted");

        token.approve(address(spender), type(uint256).max);
        require(spender.tryTransferFrom(token, address(this), RECIPIENT, 100_000), "infinite transfer failed");
        require(token.allowance(address(this), address(spender)) == type(uint256).max, "infinite allowance changed");
    }

    function test_RejectsInvalidSupplyOperations() public {
        IssuerStablecoin token = _newToken(ADMINISTRATOR, address(this));

        (bool zeroMintRecipient,) = address(token).call(abi.encodeCall(token.mint, (address(0), 1)));
        require(!zeroMintRecipient, "zero mint recipient accepted");

        (bool zeroMintAmount,) = address(token).call(abi.encodeCall(token.mint, (HOLDER, 0)));
        require(!zeroMintAmount, "zero mint accepted");

        (bool zeroBurnHolder,) = address(token).call(abi.encodeCall(token.burn, (address(0), 1)));
        require(!zeroBurnHolder, "zero burn holder accepted");

        (bool insufficientBurn,) = address(token).call(abi.encodeCall(token.burn, (HOLDER, 1)));
        require(!insufficientBurn, "insufficient burn succeeded");
    }

    function test_InstancesRemainIsolated() public {
        IssuerStablecoin first = _newToken(ADMINISTRATOR, address(this));
        IssuerStablecoin second = _newToken(ADMINISTRATOR, address(this));

        first.mint(HOLDER, 10);
        require(first.totalSupply() == 10, "first supply wrong");
        require(second.totalSupply() == 0, "second supply changed");
        require(second.balanceOf(HOLDER) == 0, "second balance changed");
    }

    function testFuzz_TransferConservesSupply(uint96 mintedSeed, uint96 transferSeed) public {
        IssuerStablecoin token = _newToken(ADMINISTRATOR, address(this));
        uint256 minted = uint256(mintedSeed) + 1;
        uint256 transferred = uint256(transferSeed) % (minted + 1);

        token.mint(address(this), minted);
        require(token.transfer(RECIPIENT, transferred), "fuzz transfer returned false");

        require(token.totalSupply() == minted, "transfer changed supply");
        require(token.balanceOf(address(this)) + token.balanceOf(RECIPIENT) == minted, "balances do not conserve");
    }

    function _newToken(address administrator, address vault) private returns (IssuerStablecoin) {
        IssuerStablecoin implementation = new IssuerStablecoin();
        IssuerStablecoinTestCloneFactory cloneFactory = new IssuerStablecoinTestCloneFactory();
        return cloneFactory.createAndInitialize(implementation, "Rail USD", "rUSD", administrator, vault);
    }
}

contract IssuerStablecoinTestCloneFactory {
    function createAndInitialize(
        IssuerStablecoin implementation,
        string calldata name,
        string calldata symbol,
        address administrator,
        address vault
    ) external returns (IssuerStablecoin token) {
        token = cloneOnly(implementation);
        token.initialize(name, symbol, administrator, vault);
    }

    function cloneOnly(IssuerStablecoin implementation) public returns (IssuerStablecoin token) {
        IssuerStablecoinTestProxy proxy = new IssuerStablecoinTestProxy(address(implementation));
        token = IssuerStablecoin(address(proxy));
    }
}

/// @dev Test-only delegate proxy. The production minimal-proxy factory belongs to issue #26.
contract IssuerStablecoinTestProxy {
    address private immutable implementation;

    constructor(address implementation_) {
        require(implementation_.code.length != 0, "implementation has no code");
        implementation = implementation_;
    }

    fallback() external payable {
        address target = implementation;

        assembly ("memory-safe") {
            calldatacopy(0, 0, calldatasize())
            let success := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch success
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
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

    function tryTransfer(IssuerStablecoin token, address recipient, uint256 amount) external returns (bool) {
        (bool succeeded,) = address(token).call(abi.encodeCall(token.transfer, (recipient, amount)));
        return succeeded;
    }

    function tryTransferFrom(IssuerStablecoin token, address holder, address recipient, uint256 amount)
        external
        returns (bool)
    {
        (bool succeeded,) = address(token).call(abi.encodeCall(token.transferFrom, (holder, recipient, amount)));
        return succeeded;
    }

    function trySetOperationalPause(IssuerStablecoin token, bool paused_) external returns (bool) {
        (bool succeeded,) = address(token).call(abi.encodeCall(token.setOperationalPause, (paused_)));
        return succeeded;
    }

    function tryRotateRole(IssuerStablecoin token, bytes32 role, address newAccount) external returns (bool) {
        (bool succeeded,) = address(token).call(abi.encodeCall(token.rotateRole, (role, newAccount)));
        return succeeded;
    }
}
