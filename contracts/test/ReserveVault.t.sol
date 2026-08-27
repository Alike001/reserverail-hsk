// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";

contract ReserveVaultTest {
    address private constant ADMINISTRATOR = address(0xA11CE);
    address private constant OPERATOR = address(0xB0B);
    address private constant PAUSER = address(0xC0DE);
    address private constant HOLDER = address(0xCAFE);

    function test_DepositMintsMeasuredReserveAndRedeemBurnsAndPays() public {
        MockReserve reserve = new MockReserve();
        IssuerStablecoin token = new IssuerStablecoin();
        ReserveVault vault = new ReserveVault();
        token.initialize("Rail USD", "rUSD", ADMINISTRATOR, address(vault));
        vault.initialize(address(reserve), address(token), ADMINISTRATOR, address(this), PAUSER);

        reserve.mint(address(this), 2_000_000);
        reserve.approve(address(vault), 2_000_000);
        vault.depositAndMint(2_000_000, HOLDER);
        require(token.totalSupply() == 2_000_000, "supply not backed");
        require(vault.reserveBalance() == 2_000_000, "reserve not received");

        address beforeRecipient = address(0xD00D);
        vault.redeem(500_000, beforeRecipient);
        require(token.totalSupply() == 1_500_000, "supply not burned");
        require(reserve.balanceOf(beforeRecipient) == 500_000, "reserve not paid");
    }

    function test_PauseBlocksDepositButPreservesRedemption() public {
        MockReserve reserve = new MockReserve();
        IssuerStablecoin token = new IssuerStablecoin();
        ReserveVault vault = new ReserveVault();
        token.initialize("Rail USD", "rUSD", ADMINISTRATOR, address(vault));
        vault.initialize(address(reserve), address(token), ADMINISTRATOR, address(this), PAUSER);
        reserve.mint(address(this), 1_000_000);
        reserve.approve(address(vault), 1_000_000);
        vault.depositAndMint(1_000_000, address(this));
        vault.pause();

        (bool depositSucceeded,) = address(vault).call(abi.encodeCall(vault.depositAndMint, (1, address(this))));
        require(!depositSucceeded, "paused deposit succeeded");
        vault.redeem(1_000_000, address(this));
        require(token.totalSupply() == 0, "paused redemption failed");
    }

    function test_RejectsUnsupportedReserveAndReinitialization() public {
        MockReserve reserve = new MockReserve();
        reserve.setDecimals(18);
        ReserveVault vault = new ReserveVault();
        (bool invalidReserve,) = address(vault)
            .call(abi.encodeCall(vault.initialize, (address(reserve), address(this), ADMINISTRATOR, OPERATOR, PAUSER)));
        require(!invalidReserve, "unsupported decimals accepted");

        MockReserve supportedReserve = new MockReserve();
        vault.initialize(address(supportedReserve), address(this), ADMINISTRATOR, OPERATOR, PAUSER);
        (bool repeated,) = address(vault)
            .call(
                abi.encodeCall(
                    vault.initialize, (address(supportedReserve), address(this), ADMINISTRATOR, OPERATOR, PAUSER)
                )
            );
        require(!repeated, "reinitialization succeeded");
    }
}
contract MockReserve {
    uint8 private reserveDecimals = 6;
    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    function setDecimals(uint8 decimals_) external {
        reserveDecimals = decimals_;
    }

    function decimals() external view returns (uint8) {
        return reserveDecimals;
    }

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (balanceOf[from] < amount || allowance[from][msg.sender] < amount) return false;
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}