// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IVersionRegistry} from "./interfaces/IVersionRegistry.sol";

contract VersionRegistry is IVersionRegistry {
    address public administrator;
    uint64 public latestVersion;

    mapping(uint64 version => Version configuration) private versions;

    error Unauthorized();
    error ZeroAddress();
    error InvalidVersion();
    error InvalidImplementation();
    error DuplicateVersion();
    error UnknownVersion();
    error StatusUnchanged();
    error AdministratorUnchanged();

    constructor(address administrator_) {
        if (administrator_ == address(0)) revert ZeroAddress();
        administrator = administrator_;
    }

    function registerVersion(uint64 version, address tokenImplementation, address vaultImplementation) external {
        _onlyAdministrator();
        if (version == 0) revert InvalidVersion();
        if (
            tokenImplementation == address(0) || vaultImplementation == address(0)
                || tokenImplementation == vaultImplementation || tokenImplementation.code.length == 0
                || vaultImplementation.code.length == 0
        ) revert InvalidImplementation();
        if (versions[version].tokenImplementation != address(0)) revert DuplicateVersion();
        if (!_isLockedImplementation(tokenImplementation) || !_isLockedImplementation(vaultImplementation)) {
            revert InvalidImplementation();
        }

        versions[version] = Version(tokenImplementation, vaultImplementation, false);
        if (version > latestVersion) latestVersion = version;

        emit VersionRegistered(version, tokenImplementation, vaultImplementation);
    }

    function setVersionActive(uint64 version, bool active) external {
        _onlyAdministrator();
        Version storage configuration = versions[version];
        if (configuration.tokenImplementation == address(0)) revert UnknownVersion();
        if (configuration.active == active) revert StatusUnchanged();

        configuration.active = active;
        emit VersionStatusUpdated(version, active);
    }

    function rotateAdministrator(address newAdministrator) external {
        _onlyAdministrator();
        if (newAdministrator == address(0)) revert ZeroAddress();
        address previousAdministrator = administrator;
        if (newAdministrator == previousAdministrator) revert AdministratorUnchanged();

        administrator = newAdministrator;
        emit RegistryAdministratorRotated(previousAdministrator, newAdministrator);
    }

    function getVersion(uint64 version) external view returns (Version memory) {
        return versions[version];
    }

    function isVersionActive(uint64 version) external view returns (bool) {
        return versions[version].active;
    }

    function _onlyAdministrator() private view {
        if (msg.sender != administrator) revert Unauthorized();
    }

    function _isLockedImplementation(address implementation) private view returns (bool) {
        (bool success, bytes memory result) = implementation.staticcall(abi.encodeWithSignature("initialized()"));
        return success && result.length == 32 && abi.decode(result, (bool));
    }
}
