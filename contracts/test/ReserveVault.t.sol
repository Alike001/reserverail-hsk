// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";

interface Vm {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory);
}

contract ReserveVaultTest {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant ADMINISTRATOR = address(0xA11CE);
    address private constant PAUSER = address(0xC0DE);
    address private constant RECIPIENT = address(0xD00D);

    function test_ImplementationCannotBeInitialized() public {
        MockReserve reserve = new MockReserve();
        ReserveVault implementation = new ReserveVault();

        (bool succeeded,) = address(implementation)
            .call(
                abi.encodeCall(
                    implementation.initialize, (address(reserve), address(this), ADMINISTRATOR, address(this), PAUSER)
                )
            );

        require(!succeeded, "implementation initialization succeeded");
    }

    function test_DepositMintsMeasuredReserveAndRedeemBurnsAndPays() public {
        MockReserve reserve = new MockReserve();
        (IssuerStablecoin token, ReserveVault vault) = _newPair(reserve, address(this));
        VaultActor holder = new VaultActor();

        reserve.mint(address(this), 2_000_000);
        require(reserve.approve(address(vault), 2_000_000), "approval failed");
        vault.depositAndMint(2_000_000, address(holder));

        require(token.totalSupply() == 2_000_000, "supply not backed");
        require(token.balanceOf(address(holder)) == 2_000_000, "holder not minted");
        require(vault.reserveBalance() == 2_000_000, "reserve not received");
        require(vault.redeemableSupply() == 2_000_000, "redeemable supply mismatch");

        holder.redeem(vault, 500_000, RECIPIENT);
        require(token.totalSupply() == 1_500_000, "supply not burned");
        require(token.balanceOf(address(holder)) == 1_500_000, "holder burn mismatch");
        require(vault.reserveBalance() == 1_500_000, "vault payout mismatch");
        require(reserve.balanceOf(RECIPIENT) == 500_000, "recipient not paid exactly");
    }

    function test_LifecycleEventsExposeActorsTokenRecipientsAndExactAmounts() public {
        MockReserve reserve = new MockReserve();
        (IssuerStablecoin token, ReserveVault vault) = _newPair(reserve, address(this));
        VaultActor holder = new VaultActor();
        reserve.mint(address(this), 1_000_000);
        reserve.approve(address(vault), 1_000_000);

        VM.recordLogs();
        vault.depositAndMint(1_000_000, address(holder));
        Vm.Log memory depositLog = _findLog(
            VM.getRecordedLogs(),
            address(vault),
            keccak256("ReserveDepositedAndMinted(address,address,address,uint256,uint256)")
        );
        require(_topicAddress(depositLog.topics[1]) == address(this), "wrong deposit actor");
        require(_topicAddress(depositLog.topics[2]) == address(token), "wrong deposit token");
        require(_topicAddress(depositLog.topics[3]) == address(holder), "wrong mint recipient");
        (uint256 reserveReceived, uint256 mintedAmount) = abi.decode(depositLog.data, (uint256, uint256));
        require(reserveReceived == 1_000_000 && mintedAmount == 1_000_000, "wrong deposit amounts");

        VM.recordLogs();
        holder.redeem(vault, 250_000, RECIPIENT);
        Vm.Log memory redemptionLog = _findLog(
            VM.getRecordedLogs(), address(vault), keccak256("Redeemed(address,address,address,uint256,uint256)")
        );
        require(_topicAddress(redemptionLog.topics[1]) == address(holder), "wrong redemption holder");
        require(_topicAddress(redemptionLog.topics[2]) == address(token), "wrong redemption token");
        require(_topicAddress(redemptionLog.topics[3]) == RECIPIENT, "wrong redemption recipient");
        (uint256 burnedAmount, uint256 reservePaid) = abi.decode(redemptionLog.data, (uint256, uint256));
        require(burnedAmount == 250_000 && reservePaid == 250_000, "wrong redemption amounts");
    }

    function test_RejectsUnauthorizedDepositAndInvalidAmounts() public {
        MockReserve reserve = new MockReserve();
        (, ReserveVault vault) = _newPair(reserve, address(this));
        VaultActor unauthorized = new VaultActor();

        require(!unauthorized.tryDeposit(vault, 1, RECIPIENT), "unauthorized deposit succeeded");

        (bool zeroAmount,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (0, RECIPIENT)));
        require(!zeroAmount, "zero deposit succeeded");

        (bool zeroRecipient,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (1, address(0))));
        require(!zeroRecipient, "zero recipient accepted");

        (bool zeroRedemption,) = address(vault).call(abi.encodeCall(vault.redeem, (0, RECIPIENT)));
        require(!zeroRedemption, "zero redemption succeeded");
    }

    function test_RejectsFalseReturnAndFeeOnTransferDeposits() public {
        MockReserve reserve = new MockReserve();
        (, ReserveVault vault) = _newPair(reserve, address(this));
        reserve.mint(address(this), 2_000_000);
        reserve.approve(address(vault), 2_000_000);

        reserve.setReturnFalseFrom(true);
        (bool falseReturn,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (1_000_000, RECIPIENT)));
        require(!falseReturn, "false-return deposit succeeded");
        require(vault.reserveBalance() == 0, "false-return deposit changed reserve");

        reserve.setReturnFalseFrom(false);
        reserve.setFeeBps(100);
        (bool feeTransfer,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (1_000_000, RECIPIENT)));
        require(!feeTransfer, "fee-on-transfer deposit succeeded");
        require(vault.reserveBalance() == 0, "rejected fee deposit changed reserve");
    }

    function test_RejectsInexactOutboundPaymentAndRollsBackBurn() public {
        MockReserve reserve = new MockReserve();
        (IssuerStablecoin token, ReserveVault vault) = _newPair(reserve, address(this));
        VaultActor holder = new VaultActor();
        reserve.mint(address(this), 1_000_000);
        reserve.approve(address(vault), 1_000_000);
        vault.depositAndMint(1_000_000, address(holder));

        reserve.setReturnFalseTransfer(true);
        require(!holder.tryRedeem(vault, 500_000, RECIPIENT), "false-return redemption succeeded");
        require(token.totalSupply() == 1_000_000, "false-return redemption burned supply");
        require(vault.reserveBalance() == 1_000_000, "false-return redemption moved reserve");

        reserve.setReturnFalseTransfer(false);
        reserve.setFeeBps(100);
        require(!holder.tryRedeem(vault, 500_000, RECIPIENT), "inexact redemption succeeded");
        require(token.totalSupply() == 1_000_000, "failed redemption burned supply");
        require(token.balanceOf(address(holder)) == 1_000_000, "failed redemption burned holder");
        require(vault.reserveBalance() == 1_000_000, "failed redemption moved reserve");
        require(reserve.balanceOf(RECIPIENT) == 0, "failed redemption paid recipient");
    }

    function test_RejectsInsufficientHolderBalanceAndReserve() public {
        MockReserve reserve = new MockReserve();
        (IssuerStablecoin token, ReserveVault vault) = _newPair(reserve, address(this));
        VaultActor holder = new VaultActor();

        require(!holder.tryRedeem(vault, 1, RECIPIENT), "unfunded redemption succeeded");

        reserve.mint(address(this), 1_000_000);
        reserve.approve(address(vault), 1_000_000);
        vault.depositAndMint(1_000_000, address(holder));
        reserve.confiscate(address(vault), 1);

        require(!holder.tryRedeem(vault, 1_000_000, RECIPIENT), "insufficient-reserve redemption succeeded");
        require(token.totalSupply() == 1_000_000, "failed redemption changed supply");
        require(token.balanceOf(address(holder)) == 1_000_000, "failed redemption changed holder");
    }

    function test_DepositAndRedeemRejectReentrancy() public {
        MockReserve reserve = new MockReserve();
        VaultActor operator = new VaultActor();
        VaultActor holder = new VaultActor();
        (IssuerStablecoin token, ReserveVault vault) = _newPair(reserve, address(operator));
        reserve.mint(address(operator), 1_000_000);
        operator.approveReserve(reserve, address(vault), 1_000_000);

        reserve.configureReentry(address(operator), abi.encodeCall(operator.deposit, (vault, 1, address(holder))), true);
        operator.deposit(vault, 1_000_000, address(holder));
        require(!reserve.lastReentrySucceeded(), "deposit reentry succeeded");
        require(reserve.lastReentrySelector() == ReserveVault.Reentrancy.selector, "wrong deposit reentry error");
        require(token.totalSupply() == 1_000_000, "deposit reentry changed supply");

        reserve.configureReentry(address(holder), abi.encodeCall(holder.redeem, (vault, 1, RECIPIENT)), true);
        holder.redeem(vault, 500_000, RECIPIENT);
        require(!reserve.lastReentrySucceeded(), "redemption reentry succeeded");
        require(reserve.lastReentrySelector() == ReserveVault.Reentrancy.selector, "wrong redemption reentry error");
        require(token.totalSupply() == 500_000, "redemption supply mismatch");
        require(vault.reserveBalance() == 500_000, "redemption reserve mismatch");
    }

    function test_RedemptionRemainsAvailableWhenOperationalStateIsPaused() public {
        MockReserve reserve = new MockReserve();
        ReserveVaultTestPairFactory pairFactory = new ReserveVaultTestPairFactory();
        (IssuerStablecoin token, ReserveVaultPauseHarness vault) =
            pairFactory.createPairWithPauseHarness(reserve, ADMINISTRATOR, address(this), PAUSER);
        VaultActor holder = new VaultActor();
        reserve.mint(address(this), 1_000_000);
        reserve.approve(address(vault), 1_000_000);
        vault.depositAndMint(1_000_000, address(holder));

        vault.setOperationalPauseForTest(true);
        (bool depositSucceeded,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (1, address(holder))));
        require(!depositSucceeded, "paused deposit succeeded");

        holder.redeem(vault, 1_000_000, RECIPIENT);
        require(token.totalSupply() == 0, "paused redemption did not burn");
        require(vault.reserveBalance() == 0, "paused redemption did not pay");
        require(reserve.balanceOf(RECIPIENT) == 1_000_000, "paused redemption recipient mismatch");
    }

    function test_RejectsUnsupportedReserveMismatchedPairAndReinitialization() public {
        MockReserve unsupportedReserve = new MockReserve();
        unsupportedReserve.setDecimals(18);
        ReserveVaultTestPairFactory pairFactory = new ReserveVaultTestPairFactory();

        (bool unsupported,) = address(pairFactory)
            .call(abi.encodeCall(pairFactory.createPair, (unsupportedReserve, ADMINISTRATOR, address(this), PAUSER)));
        require(!unsupported, "unsupported reserve accepted");

        MockReserve reserve = new MockReserve();
        require(!pairFactory.tryInitializeMismatchedPair(reserve), "mismatched token/vault pair accepted");
        require(!pairFactory.tryInitializeMismatchedAdministrator(reserve), "mismatched administrators accepted");

        (, ReserveVault vault) = pairFactory.createPair(reserve, ADMINISTRATOR, address(this), PAUSER);
        (bool repeated,) = address(vault)
            .call(
                abi.encodeCall(
                    vault.initialize, (address(reserve), vault.issuerToken(), ADMINISTRATOR, address(this), PAUSER)
                )
            );
        require(!repeated, "reinitialization succeeded");
    }

    function testFuzz_SixDecimalDepositAndRedemptionReconcile(uint96 amountSeed, uint96 redeemSeed) public {
        MockReserve reserve = new MockReserve();
        (IssuerStablecoin token, ReserveVault vault) = _newPair(reserve, address(this));
        VaultActor holder = new VaultActor();
        uint256 amount = uint256(amountSeed) + 1;
        uint256 redeemed = (uint256(redeemSeed) % amount) + 1;

        reserve.mint(address(this), amount);
        reserve.approve(address(vault), amount);
        vault.depositAndMint(amount, address(holder));
        holder.redeem(vault, redeemed, RECIPIENT);

        uint256 expected = amount - redeemed;
        require(token.totalSupply() == expected, "fuzz supply mismatch");
        require(vault.reserveBalance() == expected, "fuzz reserve mismatch");
        require(reserve.balanceOf(RECIPIENT) == redeemed, "fuzz payout mismatch");
    }

    function _newPair(MockReserve reserve, address operator)
        private
        returns (IssuerStablecoin token, ReserveVault vault)
    {
        ReserveVaultTestPairFactory pairFactory = new ReserveVaultTestPairFactory();
        return pairFactory.createPair(reserve, ADMINISTRATOR, operator, PAUSER);
    }

    function _findLog(Vm.Log[] memory logs, address emitter, bytes32 signature) private pure returns (Vm.Log memory) {
        for (uint256 index = 0; index < logs.length; index++) {
            if (logs[index].emitter == emitter && logs[index].topics[0] == signature) return logs[index];
        }
        revert("expected lifecycle event missing");
    }

    function _topicAddress(bytes32 topic) private pure returns (address) {
        return address(uint160(uint256(topic)));
    }
}

contract ReserveVaultTestPairFactory {
    function createPair(MockReserve reserve, address administrator, address operator, address pauser)
        external
        returns (IssuerStablecoin token, ReserveVault vault)
    {
        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVault vaultImplementation = new ReserveVault();
        ReserveVaultTestProxy tokenProxy = new ReserveVaultTestProxy(address(tokenImplementation));
        ReserveVaultTestProxy vaultProxy = new ReserveVaultTestProxy(address(vaultImplementation));
        token = IssuerStablecoin(address(tokenProxy));
        vault = ReserveVault(address(vaultProxy));

        token.initialize("Rail USD", "rUSD", administrator, address(vault));
        vault.initialize(address(reserve), address(token), administrator, operator, pauser);
    }

    function createPairWithPauseHarness(MockReserve reserve, address administrator, address operator, address pauser)
        external
        returns (IssuerStablecoin token, ReserveVaultPauseHarness vault)
    {
        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVaultPauseHarness vaultImplementation = new ReserveVaultPauseHarness();
        ReserveVaultTestProxy tokenProxy = new ReserveVaultTestProxy(address(tokenImplementation));
        ReserveVaultTestProxy vaultProxy = new ReserveVaultTestProxy(address(vaultImplementation));
        token = IssuerStablecoin(address(tokenProxy));
        vault = ReserveVaultPauseHarness(address(vaultProxy));

        token.initialize("Rail USD", "rUSD", administrator, address(vault));
        vault.initialize(address(reserve), address(token), administrator, operator, pauser);
    }

    function tryInitializeMismatchedPair(MockReserve reserve) external returns (bool) {
        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVault vaultImplementation = new ReserveVault();
        IssuerStablecoin token = IssuerStablecoin(address(new ReserveVaultTestProxy(address(tokenImplementation))));
        ReserveVault pairedVault = ReserveVault(address(new ReserveVaultTestProxy(address(vaultImplementation))));
        ReserveVault otherVault = ReserveVault(address(new ReserveVaultTestProxy(address(vaultImplementation))));

        token.initialize("Rail USD", "rUSD", address(this), address(pairedVault));
        (bool succeeded,) = address(otherVault)
            .call(
                abi.encodeCall(
                    otherVault.initialize,
                    (address(reserve), address(token), address(this), address(this), address(this))
                )
            );
        return succeeded;
    }

    function tryInitializeMismatchedAdministrator(MockReserve reserve) external returns (bool) {
        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVault vaultImplementation = new ReserveVault();
        IssuerStablecoin token = IssuerStablecoin(address(new ReserveVaultTestProxy(address(tokenImplementation))));
        ReserveVault vault = ReserveVault(address(new ReserveVaultTestProxy(address(vaultImplementation))));

        token.initialize("Rail USD", "rUSD", address(this), address(vault));
        (bool succeeded,) = address(vault)
            .call(
                abi.encodeCall(
                    vault.initialize, (address(reserve), address(token), address(0xBADD), address(this), address(this))
                )
            );
        return succeeded;
    }
}

/// @dev Test-only pause setter used to prove that redemption has no ordinary-pause guard.
contract ReserveVaultPauseHarness is ReserveVault {
    function setOperationalPauseForTest(bool paused_) external {
        operationallyPaused = paused_;
    }
}

/// @dev Test-only delegate proxy. The production minimal-proxy factory belongs to issue #26.
contract ReserveVaultTestProxy {
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

contract VaultActor {
    function approveReserve(MockReserve reserve, address spender, uint256 amount) external {
        require(reserve.approve(spender, amount), "actor approval failed");
    }

    function deposit(ReserveVault vault, uint256 amount, address recipient) external {
        vault.depositAndMint(amount, recipient);
    }

    function tryDeposit(ReserveVault vault, uint256 amount, address recipient) external returns (bool) {
        (bool succeeded,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (amount, recipient)));
        return succeeded;
    }

    function redeem(ReserveVault vault, uint256 amount, address recipient) external {
        vault.redeem(amount, recipient);
    }

    function tryRedeem(ReserveVault vault, uint256 amount, address recipient) external returns (bool) {
        (bool succeeded,) = address(vault).call(abi.encodeCall(vault.redeem, (amount, recipient)));
        return succeeded;
    }
}


contract MockReserve {
    uint8 private reserveDecimals = 6;
    uint16 private feeBps;
    bool private returnFalseFrom;
    bool private returnFalseTransfer;
    address private reentryTarget;
    bytes private reentryCalldata;
    bool private reentryEnabled;
    bool public lastReentrySucceeded;
    bytes4 public lastReentrySelector;

    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    function setDecimals(uint8 decimals_) external {
        reserveDecimals = decimals_;
    }

    function setFeeBps(uint16 feeBps_) external {
        require(feeBps_ <= 10_000, "invalid fee");
        feeBps = feeBps_;
    }

    function setReturnFalseFrom(bool enabled) external {
        returnFalseFrom = enabled;
    }

    function setReturnFalseTransfer(bool enabled) external {
        returnFalseTransfer = enabled;
    }

    function configureReentry(address target, bytes calldata data, bool enabled) external {
        reentryTarget = target;
        reentryCalldata = data;
        reentryEnabled = enabled;
        lastReentrySucceeded = true;
        lastReentrySelector = bytes4(0);
    }

    function decimals() external view returns (uint8) {
        return reserveDecimals;
    }

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function confiscate(address account, uint256 amount) external {
        require(balanceOf[account] >= amount, "insufficient confiscation balance");
        balanceOf[account] -= amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (returnFalseTransfer) return false;
        if (balanceOf[msg.sender] < amount) return false;
        _attemptReentry();
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (returnFalseFrom) return false;
        if (balanceOf[from] < amount || allowance[from][msg.sender] < amount) return false;
        _attemptReentry();
        allowance[from][msg.sender] -= amount;
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) private {
        uint256 fee = (amount * feeBps) / 10_000;
        balanceOf[from] -= amount;
        balanceOf[to] += amount - fee;
    }

    function _attemptReentry() private {
        if (!reentryEnabled) return;
        reentryEnabled = false;
        bytes memory result;
        (lastReentrySucceeded, result) = reentryTarget.call(reentryCalldata);
        if (result.length >= 4) {
            bytes4 selector;
            assembly ("memory-safe") {
                selector := mload(add(result, 0x20))
            }
            lastReentrySelector = selector;
        }
    }
}
