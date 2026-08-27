// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IssuerStablecoin} from "../src/IssuerStablecoin.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {StablecoinFactory} from "../src/StablecoinFactory.sol";
import {VersionRegistry} from "../src/VersionRegistry.sol";
import {IStablecoinFactory} from "../src/interfaces/IStablecoinFactory.sol";
import {IVersionRegistry} from "../src/interfaces/IVersionRegistry.sol";

interface FactoryVm {
    struct Log {
        bytes32[] topics;
        bytes data;
        address emitter;
    }

    function recordLogs() external;
    function getRecordedLogs() external returns (Log[] memory);
}

contract StablecoinFactoryTest {
    FactoryVm private constant VM = FactoryVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant ADMINISTRATOR = address(0xA11CE);
    address private constant OPERATOR = address(0xB0B);
    address private constant PAUSER = address(0xCAFE);

    MockFactoryReserve private reserve;
    IssuerStablecoin private tokenImplementation;
    ReserveVault private vaultImplementation;
    VersionRegistry private registry;
    StablecoinFactory private factory;

    function setUp() public {
        reserve = new MockFactoryReserve(6);
        tokenImplementation = new IssuerStablecoin();
        vaultImplementation = new ReserveVault();
        registry = new VersionRegistry(address(this));
        registry.registerVersion(1, address(tokenImplementation), address(vaultImplementation));
        registry.setVersionActive(1, true);
        factory = new StablecoinFactory(address(registry), address(reserve));
    }

    function test_CreatesIndependentPairsAndCompleteDiscoveryRecords() public {
        FactoryIssuer firstIssuer = new FactoryIssuer();
        FactoryIssuer secondIssuer = new FactoryIssuer();

        (address firstToken, address firstVault) =
            firstIssuer.create(factory, "First Dollar", "ONE", ADMINISTRATOR, OPERATOR, PAUSER);
        (address secondToken, address secondVault) =
            secondIssuer.create(factory, "Second Dollar", "TWO", address(0xD1), address(0xD2), address(0xD3));

        require(firstToken != secondToken && firstVault != secondVault, "pairs share instances");
        require(factory.issuerCount() == 2, "wrong issuer count");
        _assertInstance(factory.issuerAt(0), address(firstIssuer), firstToken, firstVault, 1);
        _assertInstance(factory.issuerForToken(secondToken), address(secondIssuer), secondToken, secondVault, 1);
        _assertInstance(factory.issuerForVault(firstVault), address(firstIssuer), firstToken, firstVault, 1);
        require(factory.isRegisteredIssuerToken(firstToken), "token not registered");
        require(!factory.isRegisteredIssuerToken(address(0xDEAD)), "unknown token registered");

        IssuerStablecoin first = IssuerStablecoin(firstToken);
        IssuerStablecoin second = IssuerStablecoin(secondToken);
        require(first.vault() == firstVault && second.vault() == secondVault, "wrong vault pairing");
        require(first.administrator() == ADMINISTRATOR, "first authority changed");
        require(second.administrator() == address(0xD1), "second authority changed");
        require(ReserveVault(firstVault).reserveAsset() == address(reserve), "wrong first reserve");
        require(ReserveVault(secondVault).reserveAsset() == address(reserve), "wrong second reserve");
    }

    function test_EmitsCompleteCreationEvent() public {
        FactoryIssuer issuer = new FactoryIssuer();
        VM.recordLogs();
        (address token, address vault) = issuer.create(factory, "Rail Dollar", "RAIL", ADMINISTRATOR, OPERATOR, PAUSER);
        FactoryVm.Log memory creationLog = _findLog(
            VM.getRecordedLogs(),
            address(factory),
            keccak256("IssuerCreated(address,address,address,address,uint64,address,address,address,string,string)")
        );

        require(creationLog.topics[1] == bytes32(uint256(uint160(address(issuer)))), "event issuer missing");
        require(creationLog.topics[2] == bytes32(uint256(uint160(token))), "event token missing");
        require(creationLog.topics[3] == bytes32(uint256(uint160(vault))), "event vault missing");
        (
            address eventReserve,
            uint64 eventVersion,
            address eventAdministrator,
            address eventOperator,
            address eventPauser,
            string memory eventName,
            string memory eventSymbol
        ) = abi.decode(creationLog.data, (address, uint64, address, address, address, string, string));
        require(eventReserve == address(reserve) && eventVersion == 1, "event configuration missing");
        require(
            eventAdministrator == ADMINISTRATOR && eventOperator == OPERATOR && eventPauser == PAUSER,
            "event roles missing"
        );
        require(keccak256(bytes(eventName)) == keccak256("Rail Dollar"), "event name missing");
        require(keccak256(bytes(eventSymbol)) == keccak256("RAIL"), "event symbol missing");
    }

    function test_ExistingInstancesRetainVersionWhenLatestVersionChanges() public {
        (address firstToken,) = factory.createIssuer("Version One", "V1", ADMINISTRATOR, OPERATOR, PAUSER);
        IssuerStablecoin tokenImplementationTwo = new IssuerStablecoin();
        ReserveVault vaultImplementationTwo = new ReserveVault();
        registry.registerVersion(2, address(tokenImplementationTwo), address(vaultImplementationTwo));

        (bool inactiveCreation,) = address(factory)
            .call(abi.encodeCall(factory.createIssuer, ("Inactive", "NO", ADMINISTRATOR, OPERATOR, PAUSER)));
        require(!inactiveCreation, "inactive latest version accepted");

        registry.setVersionActive(2, true);
        (address secondToken,) = factory.createIssuer("Version Two", "V2", ADMINISTRATOR, OPERATOR, PAUSER);
        require(factory.currentVersion() == 2, "latest version not resolved");
        require(factory.issuerForToken(firstToken).version == 1, "existing version mutated");
        require(factory.issuerForToken(secondToken).version == 2, "new version not recorded");
    }

    function test_ClonesAndImplementationsCannotBeTakenOver() public {
        (address token, address vault) = factory.createIssuer("Safe Dollar", "SAFE", ADMINISTRATOR, OPERATOR, PAUSER);
        require(tokenImplementation.initialized() && vaultImplementation.initialized(), "implementation unlocked");

        (bool tokenTakeover,) =
            token.call(abi.encodeCall(IssuerStablecoin.initialize, ("Seized", "BAD", address(this), address(this))));
        (bool vaultTakeover,) = vault.call(
            abi.encodeCall(
                ReserveVault.initialize, (address(reserve), token, address(this), address(this), address(this))
            )
        );
        require(!tokenTakeover && !vaultTakeover, "initialized pair can be seized");
    }

    function test_InvalidMetadataRolesAndReserveConfigurationRevert() public {
        (bool emptyName,) =
            address(factory).call(abi.encodeCall(factory.createIssuer, ("", "OK", ADMINISTRATOR, OPERATOR, PAUSER)));
        (bool emptySymbol,) =
            address(factory).call(abi.encodeCall(factory.createIssuer, ("Name", "", ADMINISTRATOR, OPERATOR, PAUSER)));
        (bool zeroAdministrator,) =
            address(factory).call(abi.encodeCall(factory.createIssuer, ("Name", "N", address(0), OPERATOR, PAUSER)));
        (bool zeroOperator,) = address(factory)
            .call(abi.encodeCall(factory.createIssuer, ("Name", "N", ADMINISTRATOR, address(0), PAUSER)));
        (bool zeroPauser,) = address(factory)
            .call(abi.encodeCall(factory.createIssuer, ("Name", "N", ADMINISTRATOR, OPERATOR, address(0))));
        require(!emptyName && !emptySymbol, "invalid metadata accepted");
        require(!zeroAdministrator && !zeroOperator && !zeroPauser, "invalid role accepted");
        require(factory.issuerCount() == 0, "failed creation registered");

        try new StablecoinFactory(address(registry), address(0xBEEF)) {
            revert("code-less reserve accepted");
        } catch {}
        MockFactoryReserve wrongDecimals = new MockFactoryReserve(18);
        try new StablecoinFactory(address(registry), address(wrongDecimals)) {
            revert("unsupported reserve accepted");
        } catch {}
    }

    function testFuzz_CreatedPairKeepsSuppliedNonzeroRoles(address administrator, address operator, address pauser)
        public
    {
        if (administrator == address(0) || operator == address(0) || pauser == address(0)) return;
        (address token, address vault) = factory.createIssuer("Fuzz Dollar", "FZ", administrator, operator, pauser);
        require(IssuerStablecoin(token).administrator() == administrator, "token administrator mismatch");
        require(ReserveVault(vault).administrator() == administrator, "vault administrator mismatch");
        require(ReserveVault(vault).reserveOperator() == operator, "operator mismatch");
        require(ReserveVault(vault).pauser() == pauser, "pauser mismatch");
    }

    function _assertInstance(
        IStablecoinFactory.IssuerInstance memory instance,
        address issuer,
        address token,
        address vault,
        uint64 version
    ) private view {
        require(instance.issuer == issuer, "wrong issuer");
        require(instance.token == token, "wrong token");
        require(instance.vault == vault, "wrong vault");
        require(instance.reserveAsset == address(reserve), "wrong reserve");
        require(instance.version == version, "wrong version");
    }

    function _findLog(FactoryVm.Log[] memory logs, address emitter, bytes32 signature)
        private
        pure
        returns (FactoryVm.Log memory)
    {
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter == emitter && logs[i].topics.length != 0 && logs[i].topics[0] == signature) {
                return logs[i];
            }
        }
        revert("event not found");
    }
}

contract VersionRegistryTest {
    function test_OnlyAdministratorCanRegisterToggleAndRotate() public {
        VersionRegistry registry = new VersionRegistry(address(this));
        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVault vaultImplementation = new ReserveVault();
        RegistryCaller outsider = new RegistryCaller();

        require(
            !outsider.register(registry, 1, address(tokenImplementation), address(vaultImplementation)),
            "outsider registered version"
        );
        registry.registerVersion(1, address(tokenImplementation), address(vaultImplementation));
        IVersionRegistry.Version memory version = registry.getVersion(1);
        require(version.tokenImplementation == address(tokenImplementation), "token implementation missing");
        require(version.vaultImplementation == address(vaultImplementation), "vault implementation missing");
        require(!version.active, "version unexpectedly active");
        require(!outsider.toggle(registry, 1, true), "outsider activated version");

        registry.setVersionActive(1, true);
        require(registry.isVersionActive(1), "version not activated");
        registry.rotateAdministrator(address(outsider));
        require(registry.administrator() == address(outsider), "administrator not rotated");
        (bool priorAdministrator,) = address(registry).call(abi.encodeCall(registry.setVersionActive, (1, false)));
        require(!priorAdministrator, "prior administrator retained authority");
        require(outsider.toggle(registry, 1, false), "new administrator lacks authority");
    }

    function test_InvalidAndDuplicateImplementationsRevert() public {
        VersionRegistry registry = new VersionRegistry(address(this));
        IssuerStablecoin tokenImplementation = new IssuerStablecoin();
        ReserveVault vaultImplementation = new ReserveVault();
        UnlockedImplementation unlocked = new UnlockedImplementation();

        require(
            !_register(registry, 0, address(tokenImplementation), address(vaultImplementation)), "zero version accepted"
        );
        require(!_register(registry, 1, address(0xBEEF), address(vaultImplementation)), "code-less token accepted");
        require(!_register(registry, 1, address(tokenImplementation), address(0xBEEF)), "code-less vault accepted");
        require(
            !_register(registry, 1, address(unlocked), address(vaultImplementation)), "unlocked implementation accepted"
        );
        require(
            !_register(registry, 1, address(tokenImplementation), address(tokenImplementation)), "same pair accepted"
        );

        registry.registerVersion(1, address(tokenImplementation), address(vaultImplementation));
        require(
            !_register(registry, 1, address(tokenImplementation), address(vaultImplementation)), "duplicate accepted"
        );
        (bool unknownStatus,) = address(registry).call(abi.encodeCall(registry.setVersionActive, (2, true)));
        require(!unknownStatus, "unknown version activated");
    }

    function _register(VersionRegistry registry, uint64 version, address token, address vault) private returns (bool) {
        (bool success,) = address(registry).call(abi.encodeCall(registry.registerVersion, (version, token, vault)));
        return success;
    }
}

contract FactoryIssuer {
    function create(
        StablecoinFactory factory,
        string calldata name,
        string calldata symbol,
        address administrator,
        address operator,
        address pauser
    ) external returns (address token, address vault) {
        return factory.createIssuer(name, symbol, administrator, operator, pauser);
    }
}

contract RegistryCaller {
    function register(VersionRegistry registry, uint64 version, address token, address vault) external returns (bool) {
        (bool success,) = address(registry).call(abi.encodeCall(registry.registerVersion, (version, token, vault)));
        return success;
    }

    function toggle(VersionRegistry registry, uint64 version, bool active) external returns (bool) {
        (bool success,) = address(registry).call(abi.encodeCall(registry.setVersionActive, (version, active)));
        return success;
    }
}

contract UnlockedImplementation {
    bool public initialized;
}

contract MockFactoryReserve {
    uint8 public immutable decimals;
    mapping(address account => uint256 balance) public balanceOf;

    constructor(uint8 decimals_) {
        decimals = decimals_;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) return false;
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (balanceOf[from] < amount) return false;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
