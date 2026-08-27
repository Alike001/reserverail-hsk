# ReserveRail Contract Architecture

Status: **P3-01 interface and authority specification**  
Scope: issue #22  
Accounting unit: **exact six-decimal base units**

The Solidity interfaces in `contracts/src/interfaces/` define the contract boundary for the
reserve-backed MVP. They are declarations only. They do not implement a stablecoin, reserve
movement, role checks, cloning, or deployment, and must not be described as deployed product
contracts.

## Contract Boundary

| Contract | Responsibility | Exclusive authority |
| --- | --- | --- |
| `IssuerStablecoin` | ERC-20 balances, ordinary-transfer policy, coordinated transfer pause, and supply hooks | Its paired `ReserveVault` is the only caller allowed to mint, burn, or change operational pause state |
| `ReserveVault` | Holds configured USDC.e, couples measured deposits to minting, couples burn to redemption, and coordinates pause | `reserveOperator` initiates deposit/mint; a holder initiates their own redemption |
| `StablecoinFactory` | Atomically creates isolated token/vault pairs from the active registered version and records complete public discovery data | The caller is recorded as issuer; the factory is the only production initializer |
| `VersionRegistry` | Records immutable implementation pairs and whether each may create new instances | The current registry administrator is the only writer; the factory is read-only |

The MVP uses HSK Chain mainnet chain ID `177` and one factory-configured USDC.e reserve asset
with six decimals. Callers cannot choose another reserve asset. Implementations reject unsupported
decimals or token behavior. No global upgrade authority exists: a new implementation requires a
new registry version, and changing registry status never mutates an existing issuer.

## Authority And Negative-Authorization Matrix

| Operation | Authorized caller | Required rejection |
| --- | --- | --- |
| Call `createIssuer` | Any issuer wallet; `msg.sender` is permanently recorded as `issuer` | Zero role addresses, malformed metadata, inactive/unknown version, or unavailable configured reserve reverts |
| Initialize a production token/vault clone | Factory only, during the same transaction that creates the pair | A repeated call, direct implementation initialization, or an externally reachable uninitialized production clone reverts |
| Register a version | Current registry administrator only | Factory, issuer, prior administrator, and arbitrary callers revert; zero/code-less implementations and duplicate versions revert |
| Activate/deactivate a version | Current registry administrator only | Factory, issuer, prior administrator, and arbitrary callers revert; unknown version reverts |
| Rotate registry administrator | Current registry administrator only | Prior administrator and arbitrary callers revert; zero replacement reverts |
| Deposit reserve and mint | Paired vault's `reserveOperator` only | Administrator, pauser, holder, issuer, and arbitrary callers revert |
| Mint or burn token supply | Paired vault only | Administrator, operator, pauser, holder, issuer, factory, and arbitrary callers revert |
| Redeem holder tokens | Holder, for their own balance; vault executes burn and payout | Burning another holder without authorization, zero recipient, insufficient balance/reserve, and arbitrary reserve withdrawal revert |
| Coordinate operational pause | Paired vault only at the token; pauser or administrator may call `vault.pause()` | Direct token calls and arbitrary vault callers revert |
| Coordinate unpause | Administrator may call `vault.unpause()`; paired vault updates token | Pauser, operator, holder, issuer, prior administrator, and direct token callers revert |
| Rotate token/vault roles | The relevant contract's current administrator only | The role being replaced, prior administrator, factory, and arbitrary callers revert; zero replacement reverts |
| Change ordinary-transfer policy | Token administrator only | Vault, operator, pauser, holder, issuer, prior administrator, and arbitrary callers revert |

The factory is an executor for clone creation, not a registry writer or supply controller. The
registry administrator cannot mint, burn, move reserves, or control existing issuer instances.
An issuer label records provenance and does not silently grant any role beyond the addresses
supplied during creation.

## Complete Public Discovery

Every registered pair is discoverable without connecting a wallet. `IssuerInstance` records:

- the issuer/creator (`createIssuer` caller);
- token and vault addresses;
- the single configured reserve-asset address; and
- the immutable implementation version used for that pair.

The factory supports enumeration plus lookup by token and by vault. `IssuerCreated` emits the
same identity fields along with the initial administrator, reserve operator, pauser, name, and
symbol. A token lookup returning no registered instance must never be presented as a real
ReserveRail issuer.

## Events

The required observable events are:

- `IssuerCreated` for issuer, token, vault, reserve asset, version, and initial roles;
- `ReserveDepositedAndMinted` for actor, token, recipient, measured reserve received, and minted amount;
- ERC-20 `Transfer` and `Approval` for token operations;
- `Redeemed` for holder, token, recipient, burned supply, and reserve paid;
- coordinated `Paused` and `Unpaused` events from both vault and token;
- `RoleRotated` for every token/vault authority replacement;
- `TransferPolicyUpdated` for ordinary-transfer policy history; and
- `VersionRegistered`, `VersionStatusUpdated`, and `RegistryAdministratorRotated` for the single registry writer.

## Factory-Only Atomic Initialization

1. The factory resolves an active implementation pair and creates both clones.
2. In that same transaction, before either address or control returns to external code, it
   initializes the token with its vault and initializes the vault with the token and configured
   USDC.e. Each clone records `msg.sender` as its factory.
3. Both initializers validate nonzero addresses, exact pairing, role rules, token metadata, the
   configured reserve address, and six-decimal support. Each initializer can succeed once only.
4. Implementation-contract constructors disable their own initializers. A clone is registered and
   `IssuerCreated` is emitted only after both initializers succeed; otherwise the entire transaction
   reverts, leaving no partially initialized registered pair.
5. The factory makes no external call to user-controlled code between clone creation and completed
   initialization. Because creation and initialization are one transaction, no other transaction
   can front-run the initializer.
6. Existing instances retain their implementation version. Registry activity controls only future
   creations.

## One Coordinated Operational Pause

The vault owns the operational state and is the only contract allowed to call
`token.setOperationalPause(bool)`. `vault.pause()` and `vault.unpause()` update the vault and token
in one transaction; if either update fails, the whole transaction reverts. Implementations and tests
must not permit a state where minting is paused but ordinary transfers are not, or vice versa.

| Operation while operationally paused | Result |
| --- | --- |
| New reserve deposit/mint | Blocked |
| Normal token transfer | Blocked |
| Holder redemption | Available |
| Role rotation | Available to the relevant administrator |
| Repeat pause | Reverts as already paused |
| Unpause | Available only to administrator |

The token's vault-only `burn` path deliberately bypasses ordinary transfer eligibility and the
ordinary transfer pause so a holder can redeem. A separate redemption emergency stop, if ever
needed for a vault defect, is outside this issue and requires a reasoned event, explicit authority,
tests, and security review.

## Exact Reserve And Supply Rules

- All public amounts are raw six-decimal base units; the MVP performs no scaling or rounding.
- `depositAndMint` measures the vault's reserve balance before and after transfer. It mints exactly
  the measured increase only when that increase equals the requested amount; a false return,
  fee-on-transfer delta, rebase-like delta, unsupported decimals, or zero receipt reverts.
- `redeem` burns and pays the same raw amount atomically. No issuer or administrator withdrawal
  function exists for reserve backing owed to redeemable supply.
- Deposit/mint and redeem are non-reentrant and follow checks-effects-interactions around external
  token calls. Tests must include a reentrant reserve/receiver adversary.
- After every successful money operation, usable reserve remains greater than or equal to
  redeemable supply.

## Threat-Model Mapping

| Threat | Architecture response required in implementation |
| --- | --- |
| T-01 | Paired vault is the sole minter; mint equals measured reserve received |
| T-02 | Redemption is the only reserve outflow and burns the same amount atomically |
| T-03 | Factory-only atomic clone initialization, locked implementations, and one-time guards |
| T-04 | Least-privilege roles, explicit rotation, public events, and no inherited registry/supply power |
| T-05 | Non-reentrant deposit/redeem, checks-effects-interactions, and adversarial callback tests |
| T-06 | Exact six-decimal base-unit accounting with no implicit conversion or rounding |
| T-07 | One verified configured USDC.e; before/after receipt measurement and rejection of incompatible behavior |
| T-08 | Transfer policy and ordinary pause never block the vault-only burn used for holder redemption |
| T-09 | Narrow coordinated pause; pauser cannot unpause; administrator recovery remains available |
| T-19 | Immutable version per issuer, registry controls future creation only, and no global upgrade path |

Implementation issues must add positive and negative authorization tests, reserve invariants,
reentrancy and incompatible-token tests, and fork evidence before any mainnet deployment.
