// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract IssuerStablecoin {
    uint8 public constant decimals = 6;

    string public name;
    string public symbol;
    uint256 public totalSupply;
    address public factory;
    address public administrator;
    address public vault;
    bool public initialized;

    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    error AlreadyInitialized();
    error UnauthorizedVault();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    error InsufficientAllowance();
    error InvalidMetadata();

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Initialized(
        string name, string symbol, address indexed factory, address indexed administrator, address indexed vault
    );

    constructor() {
        // Production instances are minimal proxies. Locking the implementation prevents it from
        // ever being initialized and presented as a registered issuer token.
        initialized = true;
    }

    function initialize(string calldata name_, string calldata symbol_, address administrator_, address vault_)
        external
    {
        if (initialized) revert AlreadyInitialized();
        if (administrator_ == address(0) || vault_ == address(0)) revert ZeroAddress();
        if (bytes(name_).length == 0 || bytes(symbol_).length == 0) revert InvalidMetadata();

        name = name_;
        symbol = symbol_;
        factory = msg.sender;
        administrator = administrator_;
        vault = vault_;
        initialized = true;

        emit Initialized(name_, symbol_, msg.sender, administrator_, vault_);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 permitted = allowance[from][msg.sender];
        if (permitted < amount) revert InsufficientAllowance();
        if (permitted != type(uint256).max) {
            allowance[from][msg.sender] = permitted - amount;
            emit Approval(from, msg.sender, permitted - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        _onlyVault();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external {
        _onlyVault();
        if (from == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (balanceOf[from] < amount) revert InsufficientBalance();

        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function _onlyVault() internal view {
        if (msg.sender != vault) revert UnauthorizedVault();
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
