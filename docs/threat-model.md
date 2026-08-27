# ReserveRail: Draft Threat Model

Date: **2026-08-27**  
Status: **Phase 1 draft; refresh after contract architecture and before each deployment**

## Safety Objective

The MVP must preserve three truths:

1. Issued redeemable supply never exceeds the vault's usable USDC.e reserve.
2. Only explicitly authorized actors can change money, policy, or authority.
3. The product never presents a simulated, stale, reverted, or wrong-chain result as real.

## Assets To Protect

- USDC.e held in every issuer reserve vault.
- Stablecoin balances and holder redemption rights.
- Factory, token, vault, policy and distribution authority.
- Campaign funds and Merkle allocations.
- Deployment keys, administrator keys and frontend configuration.
- Mainnet address manifests, ABIs and transaction evidence.
- Recipient lists and any off-chain issuer metadata.

## Trust Boundaries

- Issuer and operator wallets are trusted only for their assigned roles.
- The vault/token contracts enforce backing; an issuer promise alone is not trusted.
- HSK consensus, RPC availability and Blockscout are external dependencies.
- USDC.e, its proxy/issuer and its bridge are external dependencies.
- Wallet extensions and user devices are outside platform control.
- The frontend is untrusted for financial correctness; contracts are authoritative.
- Eligibility entered by an issuer is not independently verified KYC.

## Threats And Required Responses

| ID | Threat | Required response before mainnet |
|---|---|---|
| T-01 | Unauthorized or unbacked mint | Vault is the only minter; mint is coupled to measured reserve receipt; invariant and privilege tests. |
| T-02 | Reserve withdrawal without burn | No arbitrary issuer withdrawal; redemption burns atomically; recovery cannot seize backing owed to supply. |
| T-03 | Clone initialization takeover | Atomic creation/initialization or an initialization guard that makes front-running impossible. |
| T-04 | Role compromise | Least-privilege roles, separate wallets/multisig, rotation, public events, no hidden admin path. |
| T-05 | Reentrancy during deposit/redemption/claim | Checks-effects-interactions, reentrancy protection where needed, adversarial token/receiver tests. |
| T-06 | Decimal or rounding error | Six-decimal MVP, exact accounting, boundary fuzz tests, reject unsupported reserve behavior. |
| T-07 | Fee-on-transfer/rebasing reserve breaks coverage | Use only the verified configured USDC.e; calculate actual received amount or reject incompatible behavior. |
| T-08 | Eligibility blocks rightful redemption | Specify and test a deliberate redemption exception or authorized redemption route before implementation. |
| T-09 | Malicious/compromised pauser | Narrow pause authority, explicit operation matrix, separate unpause policy, visible events. |
| T-10 | Duplicate or forged claim | Domain-separated Merkle leaves, spent bitmap/state, chain/campaign/token binding, proof and replay tests. |
| T-11 | Distribution drains wrong token or issuer | Bind campaigns to registered token, require funding first, safe transfers, conservation tests. |
| T-12 | Oversized batch causes denial of service | Enforce measured recipient cap; allow multiple batches; test HSK gas bounds. |
| T-13 | Wrong-chain transaction | Assert chain ID 177 before value-changing actions; display network and addresses throughout. |
| T-14 | UI reports false success | Success only after confirmed receipt and post-transaction reads; explicit revert/RPC/stale states. |
| T-15 | Frontend address substitution | Versioned checked-in address manifest, deployment signature/review, explorer links, CSP and release checks. |
| T-16 | RPC or explorer outage | No fabricated fallback; show unavailable/stale state; optional second verified RPC for resilience. |
| T-17 | USDC.e issuer/bridge freeze or failure | Disclose inherited risk, cap pilot value, monitor token status; no “risk-free” claim. |
| T-18 | Issuer impersonation or misleading branding | Show issuer address and disclaimer; do not imply HashKey endorsement or legal authorization. |
| T-19 | Upgrade authority compromises all issuers | MVP issuer instances are versioned and non-globally-upgradeable; new implementations require new factory version. |
| T-20 | Secret/key leakage | No committed keys; protected environment variables; separate low-value deployer; secret scanning in CI. |
| T-21 | Recipient-list privacy leak | Do not upload raw CSVs to the server; generate proofs locally where feasible; document that on-chain claims/transfers are public. |
| T-22 | Unsafe dependency or copied contract | Pin dependencies, review licenses, scan advisories, minimize code and record provenance. |

## Approved Emergency Operation Proposal

The following matrix is proposed for team approval before contracts are written:

| Operation | Submission behavior while operationally paused |
|---|---|
| New reserve deposit/mint | Blocked |
| Normal transfer | Blocked |
| New campaign/batch | Blocked |
| Claim | Not in submission scope; later implementation defaults to blocked |
| Redemption | Available so an operational pause cannot strand backed holders |
| Role rotation | Administrator-only and available for recovery |
| Pause | Pauser or administrator |
| Unpause | Administrator-only, separate confirmed transaction |

When holder allowlists are added after submission, removal from the allowlist blocks normal
receipt/transfer but does not block self-service redemption. A separate redemption emergency
stop may exist only for a defect in the vault/redemption path itself; it must emit a reasoned
event, be visible publicly, and must not be activated by the ordinary transfer pause.

This deliberately keeps the normal incident switch narrow. The team must not accidentally
block redemption because a general token pause modifier is convenient.

## Mainnet Release Gates

- Reserve invariant passes stateful fuzz testing.
- Every privileged function has positive and negative authorization tests.
- Deposit, mint, claim/distribute and redeem pass on an HSK mainnet fork.
- Slither findings are fixed or documented with a reviewed reason.
- Deployment bytecode and initializer parameters match the tagged commit.
- Roles and address manifest receive a second-person review.
- Pilot reserve and exposure caps are recorded.
- The interface discloses unaudited status and inherited USDC.e/bridge risks.
- No production route contains a mock or success fallback.

## Out Of Scope For This Threat Model

- Legal authorization and jurisdiction-specific stablecoin regulation.
- Security of HSK Chain, USDC.e, its issuer, bridge, wallets, RPC operators or Blockscout.
- A full independent contract audit or formal verification.
- Fiat banking, off-chain custody and reserve attestations.
