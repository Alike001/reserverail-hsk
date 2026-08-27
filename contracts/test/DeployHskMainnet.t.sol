// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {StablecoinFactory} from "../src/StablecoinFactory.sol";
import {VersionRegistry} from "../src/VersionRegistry.sol";
import {DeployHskMainnet} from "../script/DeployHskMainnet.s.sol";

interface VmMainnetDeploymentTest {
    function chainId(uint256 newChainId) external;
    function etch(address target, bytes calldata newRuntimeBytecode) external;
}

contract SixDecimalReserveStub {
    function symbol() external pure returns (string memory) {
        return "USDC.e";
    }

    function decimals() external pure returns (uint8) {
        return 6;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }
}

contract WrongReserveMetadataStub {
    function symbol() external pure returns (string memory) {
        return "NOT-USDC";
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }
}

contract DeployHskMainnetTest {
    VmMainnetDeploymentTest private constant VM =
        VmMainnetDeploymentTest(address(uint160(uint256(keccak256("hevm cheat code")))));

    function testFuzz_RejectsEveryNonMainnetChain(uint32 candidateChainId) public {
        uint256 rejectedChainId = uint256(candidateChainId) + 1;
        if (rejectedChainId == 177) rejectedChainId = 133;
        VM.chainId(rejectedChainId);
        DeployHskMainnet script = new DeployHskMainnet();

        (bool succeeded, bytes memory result) = address(script).call(abi.encodeCall(script.run, ()));

        require(!succeeded, "non-mainnet deployment guard failed");
        require(_selector(result) == DeployHskMainnet.WrongChain.selector, "wrong chain error");
    }

    function test_RejectsMissingReserveContractOnChain177() public {
        VM.chainId(177);
        DeployHskMainnet script = new DeployHskMainnet();

        (bool succeeded, bytes memory result) = address(script).call(abi.encodeCall(script.run, ()));

        require(!succeeded, "missing reserve contract accepted");
        require(_selector(result) == DeployHskMainnet.InvalidReserveAsset.selector, "wrong reserve error");
    }

    function test_RejectsWrongReserveMetadataOnChain177() public {
        VM.chainId(177);
        DeployHskMainnet script = new DeployHskMainnet();
        WrongReserveMetadataStub wrongReserve = new WrongReserveMetadataStub();
        VM.etch(script.EXPECTED_RESERVE_ASSET(), address(wrongReserve).code);

        (bool succeeded, bytes memory result) = address(script).call(abi.encodeCall(script.run, ()));

        require(!succeeded, "wrong reserve metadata accepted");
        require(_selector(result) == DeployHskMainnet.InvalidReserveAsset.selector, "wrong reserve error");
    }

    function test_DeploysUnfundedPilotPairOnChain177() public {
        VM.chainId(177);
        DeployHskMainnet script = new DeployHskMainnet();
        SixDecimalReserveStub reserve = new SixDecimalReserveStub();
        VM.etch(script.EXPECTED_RESERVE_ASSET(), address(reserve).code);

        DeployHskMainnet.Deployment memory deployment = script.run();

        IssuerStablecoin token = IssuerStablecoin(deployment.pilotToken);
        ReserveVault vault = ReserveVault(deployment.pilotVault);
        StablecoinFactory factory = StablecoinFactory(deployment.factory);
        VersionRegistry registry = VersionRegistry(deployment.versionRegistry);

        require(factory.configuredReserveAsset() == script.EXPECTED_RESERVE_ASSET(), "wrong mainnet reserve");
        require(registry.latestVersion() == 1 && registry.isVersionActive(1), "version not active");
        require(factory.issuerCount() == 1, "pilot issuer not recorded");
        require(token.vault() == deployment.pilotVault, "wrong pilot vault");
        require(vault.issuerToken() == deployment.pilotToken, "wrong pilot token");
        require(token.totalSupply() == 0, "deployment unexpectedly minted tokens");
        require(vault.reserveBalance() == 0, "deployment unexpectedly deposited reserve");
    }

    function _selector(bytes memory result) private pure returns (bytes4 selector) {
        if (result.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            selector := mload(add(result, 0x20))
        }
    }
}
