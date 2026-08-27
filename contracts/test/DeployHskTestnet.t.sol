// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {StablecoinFactory} from "../src/StablecoinFactory.sol";
import {VersionRegistry} from "../src/VersionRegistry.sol";
import {DeployHskTestnet, TestnetReserveAsset} from "../script/DeployHskTestnet.s.sol";

interface VmTestnetDeployment {
    function chainId(uint256 newChainId) external;
    function prank(address caller) external;
}

contract DeployHskTestnetTest {
    VmTestnetDeployment private constant VM =
        VmTestnetDeployment(address(uint160(uint256(keccak256("hevm cheat code")))));

    function testFuzz_RejectsEveryNonTestnetChain(uint32 candidateChainId) public {
        uint256 rejectedChainId = uint256(candidateChainId) + 1;
        if (rejectedChainId == 133) rejectedChainId = 177;
        VM.chainId(rejectedChainId);
        DeployHskTestnet script = new DeployHskTestnet();

        (bool succeeded, bytes memory result) = address(script).call(abi.encodeCall(script.run, ()));

        require(!succeeded, "non-testnet deployment guard failed");
        require(_selector(result) == DeployHskTestnet.WrongChain.selector, "wrong chain error");
    }

    function test_DeploysConfiguredBackedPilotOnChain133() public {
        VM.chainId(133);
        DeployHskTestnet script = new DeployHskTestnet();

        DeployHskTestnet.Deployment memory deployment = script.run();

        TestnetReserveAsset reserve = TestnetReserveAsset(deployment.testReserveAsset);
        IssuerStablecoin token = IssuerStablecoin(deployment.pilotToken);
        ReserveVault vault = ReserveVault(deployment.pilotVault);
        StablecoinFactory factory = StablecoinFactory(deployment.factory);
        VersionRegistry registry = VersionRegistry(deployment.versionRegistry);

        require(reserve.isTestAsset(), "reserve is not explicitly test-only");
        require(keccak256(bytes(reserve.symbol())) == keccak256("tUSDC"), "wrong reserve symbol");
        require(registry.latestVersion() == 1 && registry.isVersionActive(1), "version not active");
        require(factory.issuerCount() == 1, "pilot issuer not recorded");
        require(token.totalSupply() == script.PILOT_RESERVE_AMOUNT(), "wrong pilot supply");
        require(vault.reserveBalance() == token.totalSupply(), "pilot is not fully backed");
        require(token.balanceOf(script.EXPECTED_DEPLOYER()) == token.totalSupply(), "deployer not funded");
    }

    function test_TestReserveMintIsRestrictedToConfiguredOwner() public {
        VM.chainId(133);
        address owner = address(0xA11CE);
        TestnetReserveAsset reserve = new TestnetReserveAsset(owner, 1_000_000);

        (bool unauthorized,) = address(reserve).call(abi.encodeCall(reserve.mint, (address(this), 1)));
        require(!unauthorized, "unauthorized test reserve mint succeeded");

        VM.prank(owner);
        reserve.mint(address(this), 2_000_000);
        require(reserve.balanceOf(address(this)) == 2_000_000, "owner mint failed");
    }

    function _selector(bytes memory result) private pure returns (bytes4 selector) {
        if (result.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            selector := mload(add(result, 0x20))
        }
    }
}
