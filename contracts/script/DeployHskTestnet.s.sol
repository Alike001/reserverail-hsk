// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {StablecoinFactory} from "../src/StablecoinFactory.sol";
import {VersionRegistry} from "../src/VersionRegistry.sol";

interface VmBroadcast {
    function startBroadcast(address signer) external;
    function stopBroadcast() external;
}

/// @notice Explicitly test-only six-decimal reserve asset for HSK Chain testnet rehearsals.
/// @dev The chain guard prevents this contract from being deployed on mainnet. It is not USDC,
///      is not redeemable for money, and must never be presented as mainnet reserve evidence.
contract TestnetReserveAsset {
    string public constant name = "ReserveRail Test USDC";
    string public constant symbol = "tUSDC";
    uint8 public constant decimals = 6;
    uint256 public constant REQUIRED_CHAIN_ID = 133;

    address public immutable owner;
    uint256 public totalSupply;

    mapping(address account => uint256 balance) public balanceOf;
    mapping(address holder => mapping(address spender => uint256 amount)) public allowance;

    error WrongChain(uint256 actualChainId);
    error Unauthorized();
    error ZeroAddress();
    error InsufficientBalance();
    error InsufficientAllowance();

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(address owner_, uint256 initialSupply) {
        if (block.chainid != REQUIRED_CHAIN_ID) revert WrongChain(block.chainid);
        if (owner_ == address(0)) revert ZeroAddress();

        owner = owner_;
        _mint(owner_, initialSupply);
    }

    function isTestAsset() external pure returns (bool) {
        return true;
    }

    function mint(address recipient, uint256 amount) external {
        if (msg.sender != owner) revert Unauthorized();
        _mint(recipient, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address holder, address recipient, uint256 amount) external returns (bool) {
        uint256 permitted = allowance[holder][msg.sender];
        if (permitted < amount) revert InsufficientAllowance();
        if (permitted != type(uint256).max) {
            allowance[holder][msg.sender] = permitted - amount;
            emit Approval(holder, msg.sender, permitted - amount);
        }
        _transfer(holder, recipient, amount);
        return true;
    }

    function _mint(address recipient, uint256 amount) private {
        if (recipient == address(0)) revert ZeroAddress();
        totalSupply += amount;
        balanceOf[recipient] += amount;
        emit Transfer(address(0), recipient, amount);
    }

    function _transfer(address holder, address recipient, uint256 amount) private {
        if (holder == address(0) || recipient == address(0)) revert ZeroAddress();
        if (balanceOf[holder] < amount) revert InsufficientBalance();
        balanceOf[holder] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(holder, recipient, amount);
    }
}

contract DeployHskTestnet {
    VmBroadcast private constant VM = VmBroadcast(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 public constant EXPECTED_CHAIN_ID = 133;
    address public constant EXPECTED_DEPLOYER = 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71;
    uint64 public constant IMPLEMENTATION_VERSION = 1;
    uint256 public constant INITIAL_TEST_RESERVE_SUPPLY = 1_000_000_000;
    uint256 public constant PILOT_RESERVE_AMOUNT = 100_000_000;

    struct Deployment {
        address testReserveAsset;
        address tokenImplementation;
        address vaultImplementation;
        address versionRegistry;
        address factory;
        address pilotToken;
        address pilotVault;
    }

    error WrongChain(uint256 actualChainId);
    error InvalidDeployer();
    error DeploymentVerificationFailed();

    event TestnetDeploymentCompleted(
        address indexed deployer,
        address indexed factory,
        address indexed pilotToken,
        address pilotVault,
        address testReserveAsset,
        address versionRegistry,
        address tokenImplementation,
        address vaultImplementation,
        uint256 pilotReserveAmount
    );

    function run() external returns (Deployment memory deployment) {
        if (block.chainid != EXPECTED_CHAIN_ID) revert WrongChain(block.chainid);
        if (EXPECTED_DEPLOYER == address(0)) revert InvalidDeployer();

        VM.startBroadcast(EXPECTED_DEPLOYER);

        TestnetReserveAsset reserve = new TestnetReserveAsset(EXPECTED_DEPLOYER, INITIAL_TEST_RESERVE_SUPPLY);
        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVault vaultImplementation = new ReserveVault();
        VersionRegistry registry = new VersionRegistry(EXPECTED_DEPLOYER);

        registry.registerVersion(IMPLEMENTATION_VERSION, address(tokenImplementation), address(vaultImplementation));
        registry.setVersionActive(IMPLEMENTATION_VERSION, true);

        StablecoinFactory factory = new StablecoinFactory(address(registry), address(reserve));
        (address pilotToken, address pilotVault) = factory.createIssuer(
            "ReserveRail Test USD", "rrtUSD", EXPECTED_DEPLOYER, EXPECTED_DEPLOYER, EXPECTED_DEPLOYER
        );

        reserve.approve(pilotVault, PILOT_RESERVE_AMOUNT);
        ReserveVault(pilotVault).depositAndMint(PILOT_RESERVE_AMOUNT, EXPECTED_DEPLOYER);

        VM.stopBroadcast();

        deployment = Deployment({
            testReserveAsset: address(reserve),
            tokenImplementation: address(tokenImplementation),
            vaultImplementation: address(vaultImplementation),
            versionRegistry: address(registry),
            factory: address(factory),
            pilotToken: pilotToken,
            pilotVault: pilotVault
        });

        _verify(deployment);

        emit TestnetDeploymentCompleted(
            EXPECTED_DEPLOYER,
            deployment.factory,
            deployment.pilotToken,
            deployment.pilotVault,
            deployment.testReserveAsset,
            deployment.versionRegistry,
            deployment.tokenImplementation,
            deployment.vaultImplementation,
            PILOT_RESERVE_AMOUNT
        );
    }

    function _verify(Deployment memory deployment) private view {
        TestnetReserveAsset reserve = TestnetReserveAsset(deployment.testReserveAsset);
        VersionRegistry registry = VersionRegistry(deployment.versionRegistry);
        StablecoinFactory factory = StablecoinFactory(deployment.factory);
        IssuerStablecoin token = IssuerStablecoin(deployment.pilotToken);
        ReserveVault vault = ReserveVault(deployment.pilotVault);

        if (
            reserve.owner() != EXPECTED_DEPLOYER || reserve.decimals() != 6
                || reserve.balanceOf(EXPECTED_DEPLOYER) != INITIAL_TEST_RESERVE_SUPPLY - PILOT_RESERVE_AMOUNT
                || registry.administrator() != EXPECTED_DEPLOYER || registry.latestVersion() != IMPLEMENTATION_VERSION
                || !registry.isVersionActive(IMPLEMENTATION_VERSION)
                || factory.versionRegistry() != deployment.versionRegistry
                || factory.configuredReserveAsset() != deployment.testReserveAsset || factory.issuerCount() != 1
                || token.administrator() != EXPECTED_DEPLOYER || token.vault() != deployment.pilotVault
                || token.totalSupply() != PILOT_RESERVE_AMOUNT
                || token.balanceOf(EXPECTED_DEPLOYER) != PILOT_RESERVE_AMOUNT
                || vault.administrator() != EXPECTED_DEPLOYER || vault.reserveOperator() != EXPECTED_DEPLOYER
                || vault.pauser() != EXPECTED_DEPLOYER || vault.reserveAsset() != deployment.testReserveAsset
                || vault.issuerToken() != deployment.pilotToken || vault.reserveBalance() != PILOT_RESERVE_AMOUNT
        ) revert DeploymentVerificationFailed();
    }
}
