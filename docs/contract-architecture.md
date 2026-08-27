# ReserveRail Contract Architecture

Status: **P3-01 interface and authority specification**  
Scope: issue #22  
Accounting unit: **exact six-decimal base units**

The Solidity interfaces in `contracts/src/interfaces/` define the contract boundary for the
reserve-backed MVP. They are declarations only. They do not implement a stablecoin, reserve
movement, role checks, cloning, or deployment, and must not be described as deployed product
contracts.

## Contract Boundary

| Contract            | Responsibility                                                                                    | Exclusive value authority                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `IssuerStablecoin`  | ERC-20 balances, policy checks, operational transfer pause, and supply hooks                      | `ReserveVault` is the only caller allowed to mint or burn                            |
| `ReserveVault`      | Holds the configured USDC.e, couples measured deposits to minting, and couples burn to redemption | `reserveOperator` may initiate deposit/mint; a holder initiates their own redemption |
| `StablecoinFactory` | Creates isolated token/vault pairs for a registered version and records them                      | Factory administrator controls version selection, not token supply                   |
| `VersionRegistry`   | Records immutable implementation pairs and their active creation status                           | Registry administrator/factory only; deactivation cannot mutate existing instances   |

The MVP uses HSK Chain mainnet chain ID `177` and the configured USDC.e asset with six decimals.
Implementations must reject unsupported decimal conversions. No global upgrade authority exists;
a new implementation requires a new registry version.

## Authority Matrix

| Operation                            | Administrator                | Reserve operator | Pauser | Vault                | Holder                      | Factory       |
| ------------------------------------ | ---------------------------- | ---------------- | ------ | -------------------- | --------------------------- | ------------- |
| Create issuer                        | No                           | No               | No     | No                   | No                          | Yes           |
| Register/activate version            | Yes, through registry policy | No               | No     | No                   | No                          | Registry only |
| Deposit and mint                     | No                           | Yes              | No     | Executes mint        | No                          | No            |
| Transfer                             | No                           | No               | No     | No                   | Yes, while operational      | No            |
| Burn and redeem                      | No                           | No               | No     | Executes burn/payout | Yes, including while paused | No            |
| Pause minting/transfers              | Yes                          | No               | Yes    | Enforces             | No                          | No            |
| Unpause                              | Yes                          | No               | No     | Enforces             | No                          | No            |
| Rotate administrator/operator/pauser | Yes                          | No               | No     | Applies its own role | No                          | No            |
| Change transfer policy               | Yes                          | No               | No     | No                   | No                          | No            |

Every privileged function has one authorized actor. Unauthorized calls must revert, including
direct token mint/burn attempts, operator actions from non-operators, pausing by arbitrary
accounts, unpausing by the pauser, and role rotation by non-administrators.

## Events

All value-changing lifecycle events include indexed actor, token, vault, recipient, and amount
fields where applicable. The required observable events are:

- `IssuerCreated` for the token/vault/version and initial role assignments.
- `ReserveDepositedAndMinted` for measured reserve received and supply minted.
- ERC-20 `Transfer` and `Approval` for ordinary token operations.
- `Redeemed` for burned supply and reserve paid.
- `Paused` and `Unpaused` for emergency state changes.
- `RoleRotated` for every authority replacement.
- `TransferPolicyUpdated`, `VersionRegistered`, and `VersionStatusUpdated` for policy and registry history.

## Initialization Rules

1. The factory creates and initializes each token/vault pair in one atomic transaction before
   emitting `IssuerCreated`.
2. Initializers are callable exactly once and reject zero addresses, unsupported versions,
   invalid role duplication where separation is required, and malformed token metadata.
3. A token initializer records its vault before any external call can expose a usable instance;
   a vault initializer records its token and reserve asset before accepting deposits.
4. No public initializer, implementation contract, or clone may be usable as an uninitialized
   production instance. An initializer call after completion must revert.
5. Existing instances are immutable in implementation version. Registry status only controls
   whether the factory may create new instances.

## Pause Matrix

| Operation while operationally paused | Result                               |
| ------------------------------------ | ------------------------------------ |
| New reserve deposit/mint             | Blocked                              |
| Normal token transfer                | Blocked                              |
| Redemption                           | Available to the holder              |
| Role rotation                        | Available to administrator           |
| Pause                                | Available to pauser or administrator |
| Unpause                              | Available only to administrator      |

The ordinary pause must not be implemented as a blanket token pause that blocks redemption.
A separate redemption emergency stop, if ever required for a vault defect, is outside this
issue and needs its own reasoned event, authority, tests, and security review.

## Threat-Model Mapping

- **T-01/T-02:** only the vault controls supply, and redemption is the only reserve outflow.
- **T-03:** factory-atomic initialization and one-time initializer guards prevent takeover.
- **T-04/T-09:** least-privilege role separation, explicit rotation, and the pause matrix are public.
- **T-06:** all accounting is six-decimal base-unit arithmetic with no implicit scaling.
- **T-19:** versions are immutable per instance and there is no global upgrade path.

The implementation issues must add positive and negative authorization tests, reserve invariants,
reentrancy and token-behavior tests, and fork evidence before any mainnet deployment.
