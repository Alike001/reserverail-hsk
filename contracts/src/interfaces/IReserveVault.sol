// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

interface IReserveVault {
    event Initialized(
        address indexed factory,
        address indexed reserveAsset,
        address indexed issuerToken,
        address administrator,
        address reserveOperator,
        address pauser
    );
    event ReserveDepositedAndMinted(
        address indexed actor,
        address indexed issuerToken,
        address indexed recipient,
        uint256 reserveReceived,
        uint256 mintedAmount
    );
    event Redeemed(
        address indexed holder,
        address indexed issuerToken,
        address indexed recipient,
        uint256 burnedAmount,
        uint256 reservePaid
    );
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event RoleRotated(bytes32 indexed role, address indexed previousAccount, address indexed newAccount);

    function initialize(
        address reserveAsset,
        address issuerToken,
        address administrator,
        address reserveOperator,
        address pauser
    ) external;

    function depositAndMint(uint256 reserveAmount, address recipient) external;
    function redeem(uint256 tokenAmount, address recipient) external;
    function pause() external;
    function unpause() external;
    function rotateRole(bytes32 role, address newAccount) external;

    function factory() external view returns (address);
    function reserveAsset() external view returns (address);
    function issuerToken() external view returns (address);
    function administrator() external view returns (address);
    function reserveOperator() external view returns (address);
    function pauser() external view returns (address);
    function reserveBalance() external view returns (uint256);
    function redeemableSupply() external view returns (uint256);
    function operationallyPaused() external view returns (bool);
}
