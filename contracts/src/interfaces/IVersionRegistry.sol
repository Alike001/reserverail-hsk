// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

interface IVersionRegistry {
    struct Version {
        address tokenImplementation;
        address vaultImplementation;
        bool active;
    }

    event VersionRegistered(
        uint64 indexed version, address indexed tokenImplementation, address indexed vaultImplementation
    );
    event VersionStatusUpdated(uint64 indexed version, bool active);

    function registerVersion(uint64 version, address tokenImplementation, address vaultImplementation) external;

    function setVersionActive(uint64 version, bool active) external;
    function getVersion(uint64 version) external view returns (Version memory);
    function latestVersion() external view returns (uint64);
    function isVersionActive(uint64 version) external view returns (bool);
}