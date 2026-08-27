// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

interface IIssuerStablecoin {
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Initialized(string name, string symbol, address indexed administrator, address indexed vault, address indexed pauser);
    event TransferPolicyUpdated(address indexed previousPolicy, address indexed newPolicy);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event RoleRotated(bytes32 indexed role, address indexed previousAccount, address indexed newAccount);

    function initialize(
        string calldata name_,
        string calldata symbol_,
        address administrator,
        address vault,
        address pauser
    ) external;

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function pause() external;
    function unpause() external;
    function setTransferPolicy(address policy) external;
    function rotateRole(bytes32 role, address newAccount) external;

    function administrator() external view returns (address);
    function vault() external view returns (address);
    function pauser() external view returns (address);
    function transferPolicy() external view returns (address);
    function paused() external view returns (bool);
}