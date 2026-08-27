// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IIssuerStablecoin} from "../src/interfaces/IIssuerStablecoin.sol";
import {IReserveVault} from "../src/interfaces/IReserveVault.sol";
import {IStablecoinFactory} from "../src/interfaces/IStablecoinFactory.sol";
import {IVersionRegistry} from "../src/interfaces/IVersionRegistry.sol";

contract InterfaceSurfaceTest {
    function test_FactoryExposesCompleteDiscoverySurface() public pure {
        require(IStablecoinFactory.issuerAt.selector != bytes4(0), "issuerAt selector missing");
        require(IStablecoinFactory.issuerForToken.selector != bytes4(0), "token lookup selector missing");
        require(IStablecoinFactory.issuerForVault.selector != bytes4(0), "vault lookup selector missing");
        require(IStablecoinFactory.configuredReserveAsset.selector != bytes4(0), "reserve asset selector missing");
    }

    function test_PauseHasOneCoordinationSurface() public pure {
        require(IReserveVault.pause.selector != bytes4(0), "vault pause selector missing");
        require(IReserveVault.unpause.selector != bytes4(0), "vault unpause selector missing");
        require(IIssuerStablecoin.setOperationalPause.selector != bytes4(0), "token coordination selector missing");
    }

    function test_RegistryExposesSingleAdministratorSurface() public pure {
        require(IVersionRegistry.administrator.selector != bytes4(0), "registry administrator missing");
        require(IVersionRegistry.rotateAdministrator.selector != bytes4(0), "registry rotation selector missing");
    }
}
