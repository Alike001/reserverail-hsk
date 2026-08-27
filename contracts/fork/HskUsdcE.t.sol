// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IUsdcE {
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface Vm {
    function prank(address sender) external;
}

/// @notice Integration proof against the real USDC.e proxy at one pinned HSK mainnet block.
/// @dev Run only with the exact fork command documented in contracts/README.md.
contract HskUsdcEForkTest {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    IUsdcE private constant USDC_E = IUsdcE(0x054ed45810DbBAb8B27668922D110669c9D88D0a);
    address private constant FUNDED_HOLDER = 0x62cB71582F277ef581e5F282F78e482fa347Bde7;
    address private constant SPENDER = address(0x5150);
    address private constant RECIPIENT = address(0xBEEF);
    address private constant EMPTY_ACCOUNT = address(0xDEAD);

    uint256 private constant HSK_CHAIN_ID = 177;
    uint256 private constant PINNED_BLOCK = 26_722_885;
    uint256 private constant ONE_USDC = 1_000_000;
    uint256 private constant EXACT_AMOUNT = ONE_USDC + 1;

    function setUp() public view {
        require(block.chainid == HSK_CHAIN_ID, "fork must use HSK mainnet");
        require(block.number == PINNED_BLOCK, "fork must use pinned block");
        require(USDC_E.decimals() == 6, "USDC.e decimals changed");
        require(USDC_E.balanceOf(FUNDED_HOLDER) >= EXACT_AMOUNT, "pinned holder lacks funds");
        require(USDC_E.balanceOf(EMPTY_ACCOUNT) == 0, "empty-account fixture changed");
    }

    function test_ApproveAndTransferFromUseExactSixDecimalUnits() public {
        uint256 holderBefore = USDC_E.balanceOf(FUNDED_HOLDER);
        uint256 recipientBefore = USDC_E.balanceOf(RECIPIENT);

        VM.prank(FUNDED_HOLDER);
        require(USDC_E.approve(SPENDER, EXACT_AMOUNT), "approve returned false");
        require(USDC_E.allowance(FUNDED_HOLDER, SPENDER) == EXACT_AMOUNT, "wrong allowance");

        VM.prank(SPENDER);
        require(USDC_E.transferFrom(FUNDED_HOLDER, RECIPIENT, EXACT_AMOUNT), "transferFrom returned false");

        require(USDC_E.balanceOf(FUNDED_HOLDER) == holderBefore - EXACT_AMOUNT, "wrong holder balance");
        require(USDC_E.balanceOf(RECIPIENT) == recipientBefore + EXACT_AMOUNT, "wrong recipient balance");
        require(USDC_E.allowance(FUNDED_HOLDER, SPENDER) == 0, "allowance not consumed");
    }

    function test_DirectTransferUsesExactSixDecimalUnits() public {
        uint256 holderBefore = USDC_E.balanceOf(FUNDED_HOLDER);
        uint256 recipientBefore = USDC_E.balanceOf(RECIPIENT);

        VM.prank(FUNDED_HOLDER);
        require(USDC_E.transfer(RECIPIENT, ONE_USDC), "transfer returned false");

        require(USDC_E.balanceOf(FUNDED_HOLDER) == holderBefore - ONE_USDC, "wrong holder balance");
        require(USDC_E.balanceOf(RECIPIENT) == recipientBefore + ONE_USDC, "wrong recipient balance");
    }

    function test_TransferFromRejectsInsufficientAllowance() public {
        VM.prank(FUNDED_HOLDER);
        require(USDC_E.approve(SPENDER, ONE_USDC), "approve returned false");

        VM.prank(SPENDER);
        (bool succeeded,) = address(USDC_E).call(
            abi.encodeCall(IUsdcE.transferFrom, (FUNDED_HOLDER, RECIPIENT, ONE_USDC + 1))
        );

        require(!succeeded, "transferFrom exceeded allowance");
    }

    function test_TransferRejectsInsufficientBalance() public {
        VM.prank(EMPTY_ACCOUNT);
        (bool succeeded,) = address(USDC_E).call(abi.encodeCall(IUsdcE.transfer, (RECIPIENT, 1)));

        require(!succeeded, "empty account transferred funds");
    }
}
