// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

interface IStablecoinFactory {
    struct IssuerInstance {
        address token;
        address vault;
        uint64 version;
    }

    event IssuerCreated(
        uint64 indexed version,
        address indexed token,
        address indexed vault,
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
    function currentVersion() external view returns (uint64);
    function issuerCount() external view returns (uint256);
    function issuerAt(uint256 index) external view returns (IssuerInstance memory);
    function issuerForToken(address token) external view returns (address vault, uint64 version);
}
