// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {StablecoinFactory} from "../src/StablecoinFactory.sol";
import {VersionRegistry} from "../src/VersionRegistry.sol";

interface VmMainnetBroadcast {
    function startBroadcast(address signer) external;
    function stopBroadcast() external;
}

interface IERC20MainnetMetadata {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/// @notice Deploys the unfunded ReserveRail platform and pilot pair on HSK Chain mainnet.
/// @dev This script deliberately performs no USDC.e approval, deposit, mint, transfer, or redemption.
contract DeployHskMainnet {
    VmMainnetBroadcast private constant VM =
        VmMainnetBroadcast(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 public constant EXPECTED_CHAIN_ID = 177;
    address public constant EXPECTED_DEPLOYER = 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71;
    address public constant EXPECTED_RESERVE_ASSET = 0x054ed45810DbBAb8B27668922D110669c9D88D0a;
    uint8 public constant EXPECTED_RESERVE_DECIMALS = 6;
    uint64 public constant IMPLEMENTATION_VERSION = 1;
    string public constant PILOT_TOKEN_NAME = "ReserveRail Pilot USD";
    string public constant PILOT_TOKEN_SYMBOL = "rrUSD";

    struct Deployment {
        address tokenImplementation;
        address vaultImplementation;
        address versionRegistry;
        address factory;
        address pilotToken;
        address pilotVault;
    }

    error WrongChain(uint256 actualChainId);
    error InvalidDeployer();
    error InvalidReserveAsset();
    error DeploymentVerificationFailed();

    event MainnetPlatformDeploymentCompleted(
        address indexed deployer,
        address indexed factory,
        address indexed pilotToken,
        address pilotVault,
        address reserveAsset,
        address versionRegistry,
        address tokenImplementation,
        address vaultImplementation
    );

    function run() external returns (Deployment memory deployment) {
        if (block.chainid != EXPECTED_CHAIN_ID) revert WrongChain(block.chainid);
        if (EXPECTED_DEPLOYER == address(0)) revert InvalidDeployer();
        _verifyReserveAsset();

        VM.startBroadcast(EXPECTED_DEPLOYER);

        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVault vaultImplementation = new ReserveVault();
        VersionRegistry registry = new VersionRegistry(EXPECTED_DEPLOYER);

        registry.registerVersion(IMPLEMENTATION_VERSION, address(tokenImplementation), address(vaultImplementation));
        registry.setVersionActive(IMPLEMENTATION_VERSION, true);

        StablecoinFactory factory = new StablecoinFactory(address(registry), EXPECTED_RESERVE_ASSET);
        (address pilotToken, address pilotVault) = factory.createIssuer(
            PILOT_TOKEN_NAME, PILOT_TOKEN_SYMBOL, EXPECTED_DEPLOYER, EXPECTED_DEPLOYER, EXPECTED_DEPLOYER
        );

        VM.stopBroadcast();

        deployment = Deployment({
            tokenImplementation: address(tokenImplementation),
            vaultImplementation: address(vaultImplementation),
            versionRegistry: address(registry),
            factory: address(factory),
            pilotToken: pilotToken,
            pilotVault: pilotVault
        });

        _verifyDeployment(deployment);

        emit MainnetPlatformDeploymentCompleted(
            EXPECTED_DEPLOYER,
            deployment.factory,
            deployment.pilotToken,
            deployment.pilotVault,
            EXPECTED_RESERVE_ASSET,
            deployment.versionRegistry,
            deployment.tokenImplementation,
            deployment.vaultImplementation
        );
    }

    function _verifyReserveAsset() private view {
        if (EXPECTED_RESERVE_ASSET.code.length == 0) revert InvalidReserveAsset();

        try IERC20MainnetMetadata(EXPECTED_RESERVE_ASSET).decimals() returns (uint8 reserveDecimals) {
            if (reserveDecimals != EXPECTED_RESERVE_DECIMALS) revert InvalidReserveAsset();
        } catch {
            revert InvalidReserveAsset();
        }

        try IERC20MainnetMetadata(EXPECTED_RESERVE_ASSET).symbol() returns (string memory reserveSymbol) {
            if (keccak256(bytes(reserveSymbol)) != keccak256(bytes("USDC.e"))) revert InvalidReserveAsset();
        } catch {
            revert InvalidReserveAsset();
        }
    }

    function _verifyDeployment(Deployment memory deployment) private view {
        VersionRegistry registry = VersionRegistry(deployment.versionRegistry);
        StablecoinFactory factory = StablecoinFactory(deployment.factory);
        IssuerStablecoin token = IssuerStablecoin(deployment.pilotToken);
        ReserveVault vault = ReserveVault(deployment.pilotVault);

        if (
            deployment.tokenImplementation.code.length == 0 || deployment.vaultImplementation.code.length == 0
                || deployment.versionRegistry.code.length == 0 || deployment.factory.code.length == 0
                || deployment.pilotToken.code.length == 0 || deployment.pilotVault.code.length == 0
                || registry.administrator() != EXPECTED_DEPLOYER || registry.latestVersion() != IMPLEMENTATION_VERSION
                || !registry.isVersionActive(IMPLEMENTATION_VERSION)
                || factory.versionRegistry() != deployment.versionRegistry
                || factory.configuredReserveAsset() != EXPECTED_RESERVE_ASSET || factory.issuerCount() != 1
                || token.administrator() != EXPECTED_DEPLOYER || token.vault() != deployment.pilotVault
                || token.totalSupply() != 0 || token.balanceOf(EXPECTED_DEPLOYER) != 0
                || vault.administrator() != EXPECTED_DEPLOYER || vault.reserveOperator() != EXPECTED_DEPLOYER
                || vault.pauser() != EXPECTED_DEPLOYER || vault.reserveAsset() != EXPECTED_RESERVE_ASSET
                || vault.issuerToken() != deployment.pilotToken || vault.reserveBalance() != 0
        ) revert DeploymentVerificationFailed();
    }
}
