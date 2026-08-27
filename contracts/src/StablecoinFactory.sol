// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "./IssuerStablecoin.sol";
import {ReserveVault, IERC20Reserve} from "./ReserveVault.sol";
import {IStablecoinFactory} from "./interfaces/IStablecoinFactory.sol";
import {IVersionRegistry} from "./interfaces/IVersionRegistry.sol";

contract StablecoinFactory is IStablecoinFactory {
    uint8 private constant RESERVE_DECIMALS = 6;

    address public immutable versionRegistry;
    address public immutable configuredReserveAsset;

    IssuerInstance[] private issuers;
    mapping(address token => IssuerInstance instance) private issuersByToken;
    mapping(address vault => IssuerInstance instance) private issuersByVault;
    uint256 private creationLock;

    error ZeroAddress();
    error InvalidRegistry();
    error InvalidReserveAsset();
    error InvalidMetadata();
    error InvalidRole();
    error NoVersionRegistered();
    error InactiveVersion();
    error InvalidImplementation();
    error CloneCreationFailed();
    error ReentrantCreation();

    constructor(address versionRegistry_, address reserveAsset_) {
        if (versionRegistry_ == address(0) || reserveAsset_ == address(0)) revert ZeroAddress();
        if (versionRegistry_.code.length == 0) revert InvalidRegistry();
        if (!_supportsRegistry(versionRegistry_)) revert InvalidRegistry();
        if (!_isSupportedReserve(reserveAsset_)) revert InvalidReserveAsset();

        versionRegistry = versionRegistry_;
        configuredReserveAsset = reserveAsset_;
    }

    // Both initializer calls target fresh clones selected by the registry. creationLock is set
    // before either call, so callbacks cannot enter another creation or observe a registered
    // partial pair; all writes and the discovery event revert atomically on initializer failure.
    // slither-disable-start reentrancy-no-eth,reentrancy-benign,reentrancy-events
    function createIssuer(
        string calldata name,
        string calldata symbol,
        address administrator,
        address reserveOperator,
        address pauser
    ) external returns (address token, address vault) {
        if (creationLock != 0) revert ReentrantCreation();
        creationLock = 1;

        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert InvalidMetadata();
        if (administrator == address(0) || reserveOperator == address(0) || pauser == address(0)) {
            revert InvalidRole();
        }
        if (!_isSupportedReserve(configuredReserveAsset)) revert InvalidReserveAsset();

        uint64 version = currentVersion();
        if (version == 0) revert NoVersionRegistered();
        {
            IVersionRegistry.Version memory configuration = IVersionRegistry(versionRegistry).getVersion(version);
            if (!configuration.active) revert InactiveVersion();
            if (
                configuration.tokenImplementation.code.length == 0 || configuration.vaultImplementation.code.length == 0
            ) revert InvalidImplementation();

            token = _clone(configuration.tokenImplementation);
            vault = _clone(configuration.vaultImplementation);
        }

        IssuerStablecoin(token).initialize(name, symbol, administrator, vault);
        ReserveVault(vault).initialize(configuredReserveAsset, token, administrator, reserveOperator, pauser);

        IssuerInstance memory instance = IssuerInstance(msg.sender, token, vault, configuredReserveAsset, version);
        issuers.push(instance);
        issuersByToken[token] = instance;
        issuersByVault[vault] = instance;

        _emitIssuerCreated(instance, administrator, reserveOperator, pauser, name, symbol);

        creationLock = 0;
    }
    // slither-disable-end reentrancy-no-eth,reentrancy-benign,reentrancy-events

    function currentVersion() public view returns (uint64) {
        return IVersionRegistry(versionRegistry).latestVersion();
    }

    function issuerCount() external view returns (uint256) {
        return issuers.length;
    }

    function issuerAt(uint256 index) external view returns (IssuerInstance memory) {
        return issuers[index];
    }

    function issuerForToken(address token) external view returns (IssuerInstance memory) {
        return issuersByToken[token];
    }

    function issuerForVault(address vault) external view returns (IssuerInstance memory) {
        return issuersByVault[vault];
    }

    function isRegisteredIssuerToken(address token) external view returns (bool) {
        return issuersByToken[token].token != address(0);
    }

    function _clone(address implementation) private returns (address instance) {
        bytes memory creationCode = abi.encodePacked(
            hex"3d602d80600a3d3981f3", hex"363d3d373d3d3d363d73", implementation, hex"5af43d82803e903d91602b57fd5bf3"
        );
        assembly ("memory-safe") {
            instance := create(0, add(creationCode, 0x20), mload(creationCode))
        }
        if (instance == address(0)) revert CloneCreationFailed();
    }

    function _emitIssuerCreated(
        IssuerInstance memory instance,
        address administrator,
        address reserveOperator,
        address pauser,
        string calldata name,
        string calldata symbol
    ) private {
        emit IssuerCreated(
            instance.issuer,
            instance.token,
            instance.vault,
            instance.reserveAsset,
            instance.version,
            administrator,
            reserveOperator,
            pauser,
            name,
            symbol
        );
    }

    function _supportsRegistry(address registry) private view returns (bool) {
        (bool success, bytes memory result) = registry.staticcall(abi.encodeCall(IVersionRegistry.latestVersion, ()));
        return success && result.length == 32;
    }

    function _isSupportedReserve(address reserveAsset) private view returns (bool) {
        if (reserveAsset.code.length == 0) return false;
        try IERC20Reserve(reserveAsset).decimals() returns (uint8 reserveDecimals) {
            return reserveDecimals == RESERVE_DECIMALS;
        } catch {
            return false;
        }
    }
}
