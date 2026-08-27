// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

interface IStablecoinFactory {
    struct IssuerInstance {
        address issuer;
        address token;
        address vault;
        address reserveAsset;
        uint64 version;
    }

    event IssuerCreated(
        address indexed issuer,
        address indexed token,
        address indexed vault,
        address reserveAsset,
        uint64 version,
        address administrator,
        address reserveOperator,
        address pauser,
        string name,
        string symbol
    );

    function createIssuer(
        string calldata name,
        string calldata symbol,
        address administrator,
        address reserveOperator,
        address pauser
    ) external returns (address token, address vault);

    function versionRegistry() external view returns (address);
    function configuredReserveAsset() external view returns (address);
    function currentVersion() external view returns (uint64);
    function issuerCount() external view returns (uint256);
    function issuerAt(uint256 index) external view returns (IssuerInstance memory);
    function issuerForToken(address token) external view returns (IssuerInstance memory);
    function issuerForVault(address vault) external view returns (IssuerInstance memory);
    function isRegisteredIssuerToken(address token) external view returns (bool);
}
