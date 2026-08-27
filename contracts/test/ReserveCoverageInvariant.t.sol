// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {StablecoinFactory} from "../src/StablecoinFactory.sol";
import {VersionRegistry} from "../src/VersionRegistry.sol";
import {IStablecoinFactory} from "../src/interfaces/IStablecoinFactory.sol";

interface InvariantVm {
    function prank(address caller) external;
}

abstract contract InvariantTargets {
    struct FuzzSelector {
        address addr;
        bytes4[] selectors;
    }

    address[] private invariantTargetContracts;
    FuzzSelector[] private invariantTargetSelectors;

    function _targetContract(address target) internal {
        invariantTargetContracts.push(target);
    }

    function _targetSelector(FuzzSelector memory selector) internal {
        invariantTargetSelectors.push(selector);
    }

    function targetContracts() public view returns (address[] memory) {
        return invariantTargetContracts;
    }

    function targetSelectors() public view returns (FuzzSelector[] memory) {
        return invariantTargetSelectors;
    }
}

contract ReserveCoverageInvariantTest is InvariantTargets {
    address private constant ADMINISTRATOR = address(0xA11CE);
    address private constant PAUSER = address(0xBEEF);
    address private constant ACTOR_ONE = address(0x1001);
    address private constant ACTOR_TWO = address(0x1002);
    address private constant ACTOR_THREE = address(0x1003);

    StatefulReserve private reserve;
    VersionRegistry private registry;
    StablecoinFactory private factory;
    ReserveInvariantHandler private handler;
    InvariantIssuer private firstIssuer;
    InvariantIssuer private secondIssuer;
    IssuerStablecoin private firstToken;
    IssuerStablecoin private secondToken;
    ReserveVault private firstVault;
    ReserveVault private secondVault;

    function setUp() public {
        reserve = new StatefulReserve(6);
        registry = new VersionRegistry(address(this));
        registry.registerVersion(1, address(new IssuerStablecoin()), address(new ReserveVault()));
        registry.setVersionActive(1, true);
        factory = new StablecoinFactory(address(registry), address(reserve));
        handler = new ReserveInvariantHandler(reserve);
        firstIssuer = new InvariantIssuer();
        secondIssuer = new InvariantIssuer();

        (address firstTokenAddress, address firstVaultAddress) =
            firstIssuer.create(factory, "Invariant Dollar One", "IV1", ADMINISTRATOR, address(handler), PAUSER);
        (address secondTokenAddress, address secondVaultAddress) =
            secondIssuer.create(factory, "Invariant Dollar Two", "IV2", ADMINISTRATOR, address(handler), PAUSER);
        firstToken = IssuerStablecoin(firstTokenAddress);
        secondToken = IssuerStablecoin(secondTokenAddress);
        firstVault = ReserveVault(firstVaultAddress);
        secondVault = ReserveVault(secondVaultAddress);
        handler.configure(firstToken, firstVault, secondToken, secondVault);

        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = handler.deposit.selector;
        selectors[1] = handler.redeem.selector;
        selectors[2] = handler.transfer.selector;
        selectors[3] = handler.donateReserve.selector;
        selectors[4] = handler.pause.selector;
        selectors[5] = handler.unpause.selector;
        selectors[6] = handler.attemptUnauthorizedMintAndBurn.selector;
        selectors[7] = handler.attemptUnauthorizedDeposit.selector;
        selectors[8] = handler.attemptUnauthorizedPause.selector;
        selectors[9] = handler.attemptUnauthorizedRoleRotation.selector;

        _targetContract(address(handler));
        _targetSelector(FuzzSelector(address(handler), selectors));
    }

    function invariant_ReserveCoverageAuthorityAndIsolationHold() public view {
        _assertPair(firstToken, firstVault);
        _assertPair(secondToken, secondVault);

        require(address(firstToken) != address(secondToken), "issuer tokens are shared");
        require(address(firstVault) != address(secondVault), "issuer vaults are shared");
        require(factory.issuerCount() == 2, "factory registry count changed");
        _assertRegisteredInstance(factory.issuerAt(0), address(firstIssuer), address(firstToken), address(firstVault));
        _assertRegisteredInstance(
            factory.issuerAt(1), address(secondIssuer), address(secondToken), address(secondVault)
        );

        uint256 totalReserve = reserve.balanceOf(address(firstVault)) + reserve.balanceOf(address(secondVault));
        uint256 totalSupply = firstToken.totalSupply() + secondToken.totalSupply();
        require(totalReserve >= totalSupply, "aggregate reserve below aggregate supply");
    }

    function afterInvariant() public view {
        require(handler.totalCalls() != 0, "empty invariant campaign");
    }

    function _assertPair(IssuerStablecoin token, ReserveVault vault) private view {
        uint256 supply = token.totalSupply();
        require(reserve.balanceOf(address(vault)) >= supply, "pair reserve below redeemable supply");
        require(token.factory() == address(factory), "token factory changed");
        require(vault.factory() == address(factory), "vault factory changed");
        require(token.vault() == address(vault), "token vault pairing changed");
        require(vault.issuerToken() == address(token), "vault token pairing changed");
        require(vault.reserveAsset() == address(reserve), "vault reserve changed");
        require(token.paused() == vault.operationallyPaused(), "coordinated pause diverged");

        uint256 actorBalances = token.balanceOf(ACTOR_ONE) + token.balanceOf(ACTOR_TWO) + token.balanceOf(ACTOR_THREE);
        require(actorBalances == supply, "holder balances do not conserve supply");
    }

    function _assertRegisteredInstance(
        IStablecoinFactory.IssuerInstance memory instance,
        address issuer,
        address token,
        address vault
    ) private view {
        require(instance.issuer == issuer, "registered issuer changed");
        require(instance.token == token, "registered token changed");
        require(instance.vault == vault, "registered vault changed");
        require(instance.reserveAsset == address(reserve), "registered reserve changed");
        require(instance.version == 1, "registered version changed");
        require(factory.isRegisteredIssuerToken(token), "registered token became undiscoverable");
    }
}

contract ReserveInvariantHandler {
    InvariantVm private constant VM = InvariantVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant ADMINISTRATOR = address(0xA11CE);
    address private constant PAUSER = address(0xBEEF);
    address private constant OUTSIDER = address(0xBAD);
    address private constant ACTOR_ONE = address(0x1001);
    address private constant ACTOR_TWO = address(0x1002);
    address private constant ACTOR_THREE = address(0x1003);
    uint256 private constant MAX_ACTION_AMOUNT = 1_000_000_000 * 1e6;

    StatefulReserve private immutable reserve;
    address private immutable controller;
    IssuerStablecoin private firstToken;
    IssuerStablecoin private secondToken;
    ReserveVault private firstVault;
    ReserveVault private secondVault;
    bool private configured;

    uint256 public totalCalls;
    uint256 public successfulDeposits;
    uint256 public successfulRedemptions;
    uint256 public successfulTransfers;
    uint256 public reserveDonations;

    constructor(StatefulReserve reserve_) {
        reserve = reserve_;
        controller = msg.sender;
    }

    function configure(
        IssuerStablecoin firstToken_,
        ReserveVault firstVault_,
        IssuerStablecoin secondToken_,
        ReserveVault secondVault_
    ) external {
        require(msg.sender == controller && !configured, "invalid handler configuration");
        firstToken = firstToken_;
        firstVault = firstVault_;
        secondToken = secondToken_;
        secondVault = secondVault_;
        configured = true;
        require(reserve.approve(address(firstVault_), type(uint256).max), "first reserve approval failed");
        require(reserve.approve(address(secondVault_), type(uint256).max), "second reserve approval failed");
    }

    function deposit(uint256 pairSeed, uint256 amountSeed, uint256 actorSeed) external {
        totalCalls++;
        (IssuerStablecoin token, ReserveVault vault) = _pair(pairSeed);
        uint256 amount = _boundPositive(amountSeed, MAX_ACTION_AMOUNT);
        address recipient = _actor(actorSeed);
        reserve.mint(address(this), amount);

        uint256 supplyBefore = token.totalSupply();
        uint256 reserveBefore = reserve.balanceOf(address(vault));
        (bool success,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (amount, recipient)));
        if (vault.operationallyPaused()) {
            require(!success, "deposit succeeded while paused");
            require(token.totalSupply() == supplyBefore, "failed deposit changed supply");
            require(reserve.balanceOf(address(vault)) == reserveBefore, "failed deposit changed reserve");
            return;
        }

        require(success, "valid deposit failed");
        require(token.totalSupply() == supplyBefore + amount, "deposit supply delta mismatch");
        require(reserve.balanceOf(address(vault)) == reserveBefore + amount, "deposit reserve delta mismatch");
        successfulDeposits++;
    }

    function redeem(uint256 pairSeed, uint256 amountSeed, uint256 holderSeed, uint256 recipientSeed) external {
        totalCalls++;
        (IssuerStablecoin token, ReserveVault vault) = _pair(pairSeed);
        address holder = _actor(holderSeed);
        uint256 holderBalance = token.balanceOf(holder);
        if (holderBalance == 0) return;
        uint256 amount = _boundPositive(amountSeed, holderBalance);
        address recipient = _actor(recipientSeed);

        uint256 supplyBefore = token.totalSupply();
        uint256 vaultReserveBefore = reserve.balanceOf(address(vault));
        uint256 recipientReserveBefore = reserve.balanceOf(recipient);
        VM.prank(holder);
        (bool success,) = address(vault).call(abi.encodeCall(vault.redeem, (amount, recipient)));

        require(success, "backed redemption failed");
        require(token.totalSupply() == supplyBefore - amount, "redemption supply delta mismatch");
        require(reserve.balanceOf(address(vault)) == vaultReserveBefore - amount, "redemption reserve delta mismatch");
        require(reserve.balanceOf(recipient) == recipientReserveBefore + amount, "redemption payout mismatch");
        successfulRedemptions++;
    }

    function transfer(uint256 pairSeed, uint256 amountSeed, uint256 fromSeed, uint256 toSeed) external {
        totalCalls++;
        (IssuerStablecoin token,) = _pair(pairSeed);
        address from = _actor(fromSeed);
        address to = _actor(toSeed);
        uint256 fromBalance = token.balanceOf(from);
        if (fromBalance == 0) return;
        uint256 amount = amountSeed % (fromBalance + 1);
        uint256 toBalance = token.balanceOf(to);

        VM.prank(from);
        (bool success,) = address(token).call(abi.encodeCall(token.transfer, (to, amount)));
        if (token.paused()) {
            require(!success, "transfer succeeded while paused");
            require(
                token.balanceOf(from) == fromBalance && token.balanceOf(to) == toBalance, "failed transfer moved value"
            );
            return;
        }

        require(success, "valid transfer failed");
        if (from == to) {
            require(token.balanceOf(from) == fromBalance, "self-transfer changed balance");
        } else {
            require(token.balanceOf(from) == fromBalance - amount, "transfer debit mismatch");
            require(token.balanceOf(to) == toBalance + amount, "transfer credit mismatch");
        }
        successfulTransfers++;
    }

    function donateReserve(uint256 pairSeed, uint256 amountSeed) external {
        totalCalls++;
        (, ReserveVault vault) = _pair(pairSeed);
        uint256 amount = _boundPositive(amountSeed, MAX_ACTION_AMOUNT);
        reserve.mint(address(this), amount);
        uint256 reserveBefore = reserve.balanceOf(address(vault));
        require(reserve.transfer(address(vault), amount), "reserve donation failed");
        require(reserve.balanceOf(address(vault)) == reserveBefore + amount, "reserve donation delta mismatch");
        reserveDonations++;
    }

    function pause(uint256 pairSeed) external {
        totalCalls++;
        (IssuerStablecoin token, ReserveVault vault) = _pair(pairSeed);
        bool pausedBefore = vault.operationallyPaused();
        VM.prank(PAUSER);
        (bool success,) = address(vault).call(abi.encodeCall(vault.pause, ()));
        if (pausedBefore) {
            require(!success, "repeated pause succeeded");
        } else {
            require(success && vault.operationallyPaused() && token.paused(), "coordinated pause failed");
        }
    }

    function unpause(uint256 pairSeed) external {
        totalCalls++;
        (IssuerStablecoin token, ReserveVault vault) = _pair(pairSeed);
        bool pausedBefore = vault.operationallyPaused();
        VM.prank(ADMINISTRATOR);
        (bool success,) = address(vault).call(abi.encodeCall(vault.unpause, ()));
        if (pausedBefore) {
            require(success && !vault.operationallyPaused() && !token.paused(), "coordinated unpause failed");
        } else {
            require(!success, "unpause succeeded while active");
        }
    }

    function attemptUnauthorizedMintAndBurn(uint256 pairSeed, uint256 amountSeed, uint256 actorSeed) external {
        totalCalls++;
        (IssuerStablecoin token,) = _pair(pairSeed);
        address actor = _actor(actorSeed);
        uint256 amount = _boundPositive(amountSeed, MAX_ACTION_AMOUNT);
        uint256 supplyBefore = token.totalSupply();
        VM.prank(OUTSIDER);
        (bool mintSuccess,) = address(token).call(abi.encodeCall(token.mint, (actor, amount)));
        VM.prank(OUTSIDER);
        (bool burnSuccess,) = address(token).call(abi.encodeCall(token.burn, (actor, amount)));
        require(!mintSuccess && !burnSuccess, "outsider changed token supply");
        require(token.totalSupply() == supplyBefore, "unauthorized supply attempt changed supply");
    }

    function attemptUnauthorizedDeposit(uint256 pairSeed, uint256 amountSeed) external {
        totalCalls++;
        (IssuerStablecoin token, ReserveVault vault) = _pair(pairSeed);
        uint256 amount = _boundPositive(amountSeed, MAX_ACTION_AMOUNT);
        uint256 supplyBefore = token.totalSupply();
        uint256 reserveBefore = reserve.balanceOf(address(vault));
        VM.prank(OUTSIDER);
        (bool success,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (amount, OUTSIDER)));
        require(!success, "outsider deposited and minted");
        require(token.totalSupply() == supplyBefore, "unauthorized deposit changed supply");
        require(reserve.balanceOf(address(vault)) == reserveBefore, "unauthorized deposit changed reserve");
    }

    function attemptUnauthorizedPause(uint256 pairSeed) external {
        totalCalls++;
        (IssuerStablecoin token, ReserveVault vault) = _pair(pairSeed);
        bool vaultPauseBefore = vault.operationallyPaused();
        bool tokenPauseBefore = token.paused();
        VM.prank(OUTSIDER);
        (bool pauseSuccess,) = address(vault).call(abi.encodeCall(vault.pause, ()));
        VM.prank(PAUSER);
        (bool unpauseSuccess,) = address(vault).call(abi.encodeCall(vault.unpause, ()));
        require(!pauseSuccess && !unpauseSuccess, "unauthorized pause transition succeeded");
        require(vault.operationallyPaused() == vaultPauseBefore, "unauthorized call changed vault pause");
        require(token.paused() == tokenPauseBefore, "unauthorized call changed token pause");
    }

    function attemptUnauthorizedRoleRotation(uint256 pairSeed) external {
        totalCalls++;
        (IssuerStablecoin token, ReserveVault vault) = _pair(pairSeed);
        address tokenAdministratorBefore = token.administrator();
        address vaultAdministratorBefore = vault.administrator();
        VM.prank(OUTSIDER);
        (bool tokenSuccess,) =
            address(token).call(abi.encodeCall(token.rotateRole, (token.ADMINISTRATOR_ROLE(), OUTSIDER)));
        VM.prank(OUTSIDER);
        (bool vaultSuccess,) =
            address(vault).call(abi.encodeCall(vault.rotateRole, (vault.ADMINISTRATOR_ROLE(), OUTSIDER)));
        require(!tokenSuccess && !vaultSuccess, "outsider rotated administrator");
        require(token.administrator() == tokenAdministratorBefore, "token administrator changed");
        require(vault.administrator() == vaultAdministratorBefore, "vault administrator changed");
    }

    function _pair(uint256 seed) private view returns (IssuerStablecoin token, ReserveVault vault) {
        if (seed % 2 == 0) return (firstToken, firstVault);
        return (secondToken, secondVault);
    }

    function _actor(uint256 seed) private pure returns (address) {
        uint256 actorIndex = seed % 3;
        if (actorIndex == 0) return ACTOR_ONE;
        if (actorIndex == 1) return ACTOR_TWO;
        return ACTOR_THREE;
    }

    function _boundPositive(uint256 seed, uint256 maximum) private pure returns (uint256) {
        return (seed % maximum) + 1;
    }
}

contract ReserveDecimalBoundaryFuzzTest {
    function testFuzz_FactoryAcceptsOnlySixDecimalReserve(uint8 decimals) public {
        StatefulReserve reserve = new StatefulReserve(decimals);
        VersionRegistry registry = new VersionRegistry(address(this));
        registry.registerVersion(1, address(new IssuerStablecoin()), address(new ReserveVault()));
        registry.setVersionActive(1, true);

        try new StablecoinFactory(address(registry), address(reserve)) returns (StablecoinFactory factory) {
            require(decimals == 6, "factory accepted unsupported reserve decimals");
            require(factory.configuredReserveAsset() == address(reserve), "factory reserve mismatch");
        } catch {
            require(decimals != 6, "factory rejected six-decimal reserve");
        }
    }
}

contract CriticalPathGasTest {
    uint256 private constant AMOUNT = 1_000_000;

    StatefulReserve private reserve;
    StablecoinFactory private factory;
    ReserveVault private vault;

    function setUp() public {
        reserve = new StatefulReserve(6);
        VersionRegistry registry = new VersionRegistry(address(this));
        registry.registerVersion(1, address(new IssuerStablecoin()), address(new ReserveVault()));
        registry.setVersionActive(1, true);
        factory = new StablecoinFactory(address(registry), address(reserve));
        (, address vaultAddress) =
            factory.createIssuer("Gas Dollar", "GAS", address(this), address(this), address(this));
        vault = ReserveVault(vaultAddress);
        reserve.mint(address(this), AMOUNT * 3);
        reserve.approve(address(vault), type(uint256).max);
        vault.depositAndMint(AMOUNT, address(this));
    }

    function testGas_CreateIssuer() public {
        factory.createIssuer("Second Gas Dollar", "GAS2", address(this), address(this), address(this));
    }

    function testGas_DepositAndMint() public {
        vault.depositAndMint(AMOUNT, address(0xCAFE));
    }

    function testGas_Redeem() public {
        vault.redeem(AMOUNT / 2, address(this));
    }
}

contract InvariantIssuer {
    function create(
        StablecoinFactory factory,
        string calldata name,
        string calldata symbol,
        address administrator,
        address operator,
        address pauser
    ) external returns (address token, address vault) {
        return factory.createIssuer(name, symbol, administrator, operator, pauser);
    }
}

contract StatefulReserve {
    uint8 public immutable decimals;

    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    constructor(uint8 decimals_) {
        decimals = decimals_;
    }

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 permitted = allowance[from][msg.sender];
        if (balanceOf[from] < amount || permitted < amount) return false;
        if (permitted != type(uint256).max) allowance[from][msg.sender] = permitted - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
