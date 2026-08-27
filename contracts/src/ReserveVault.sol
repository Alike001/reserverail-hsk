// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "./IssuerStablecoin.sol";

interface IERC20Reserve {
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ReserveVault {
    uint8 public constant DECIMALS = 6;

    address public factory;
    address public reserveAsset;
    address public issuerToken;
    address public administrator;
    address public reserveOperator;
    address public pauser;
    bool public initialized;
    bool public operationallyPaused;
    uint256 private locked;

    error AlreadyInitialized();
    error Unauthorized();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidReserveAsset();
    error InvalidToken();
    error InvalidAmountReceived();
    error InsufficientReserve();
    error TransferFailed();
    error Reentrancy();

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

    constructor() {
        initialized = true;
    }

    function initialize(
        address reserveAsset_,
        address issuerToken_,
        address administrator_,
        address reserveOperator_,
        address pauser_
    ) external {
        if (initialized) revert AlreadyInitialized();
        if (
            reserveAsset_ == address(0) || issuerToken_ == address(0) || administrator_ == address(0)
                || reserveOperator_ == address(0) || pauser_ == address(0)
        ) revert ZeroAddress();
        if (reserveAsset_.code.length == 0) revert InvalidReserveAsset();
        if (issuerToken_.code.length == 0) revert InvalidToken();
        if (IERC20Reserve(reserveAsset_).decimals() != DECIMALS) revert InvalidReserveAsset();

        factory = msg.sender;
        reserveAsset = reserveAsset_;
        issuerToken = issuerToken_;
        administrator = administrator_;
        reserveOperator = reserveOperator_;
        pauser = pauser_;
        initialized = true;

        emit Initialized(msg.sender, reserveAsset_, issuerToken_, administrator_, reserveOperator_, pauser_);
    }

    function depositAndMint(uint256 reserveAmount, address recipient) external nonReentrant {
        if (msg.sender != reserveOperator) revert Unauthorized();
        if (operationallyPaused) revert Unauthorized();
        if (reserveAmount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();

        uint256 beforeBalance = IERC20Reserve(reserveAsset).balanceOf(address(this));
        if (!IERC20Reserve(reserveAsset).transferFrom(msg.sender, address(this), reserveAmount)) {
            revert TransferFailed();
        }
        uint256 received = IERC20Reserve(reserveAsset).balanceOf(address(this)) - beforeBalance;
        if (received == 0 || received != reserveAmount) revert InvalidAmountReceived();

        IssuerStablecoin(issuerToken).mint(recipient, received);
        emit ReserveDepositedAndMinted(msg.sender, issuerToken, recipient, received, received);
    }

    function redeem(uint256 tokenAmount, address recipient) external nonReentrant {
        if (tokenAmount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        if (IERC20Reserve(reserveAsset).balanceOf(address(this)) < tokenAmount) revert InsufficientReserve();

        IssuerStablecoin(issuerToken).burn(msg.sender, tokenAmount);
        if (!IERC20Reserve(reserveAsset).transfer(recipient, tokenAmount)) revert TransferFailed();
        emit Redeemed(msg.sender, issuerToken, recipient, tokenAmount, tokenAmount);
    }

    function pause() external {
        if (msg.sender != pauser && msg.sender != administrator) revert Unauthorized();
        operationallyPaused = true;
        emit Paused(msg.sender);
    }

    function unpause() external {
        if (msg.sender != administrator) revert Unauthorized();
        operationallyPaused = false;
        emit Unpaused(msg.sender);
    }

    function rotateRole(bytes32 role, address newAccount) external {
        if (msg.sender != administrator) revert Unauthorized();
        if (newAccount == address(0)) revert ZeroAddress();

        if (role == keccak256("ADMINISTRATOR")) {
            address previous = administrator;
            administrator = newAccount;
            emit RoleRotated(role, previous, newAccount);
        } else if (role == keccak256("RESERVE_OPERATOR")) {
            address previous = reserveOperator;
            reserveOperator = newAccount;
            emit RoleRotated(role, previous, newAccount);
        } else if (role == keccak256("PAUSER")) {
            address previous = pauser;
            pauser = newAccount;
            emit RoleRotated(role, previous, newAccount);
        } else {
            revert Unauthorized();
        }
    }

    function reserveBalance() external view returns (uint256) {
        return IERC20Reserve(reserveAsset).balanceOf(address(this));
    }

    function redeemableSupply() external view returns (uint256) {
        return IssuerStablecoin(issuerToken).totalSupply();
    }

    modifier nonReentrant() {
        if (locked != 0) revert Reentrancy();
        locked = 1;
        _;
        locked = 0;
    }
}