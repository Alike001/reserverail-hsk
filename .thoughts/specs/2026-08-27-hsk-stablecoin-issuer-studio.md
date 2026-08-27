# Spec: ReserveRail

Status: **Phase 1 proposal for three-person team approval**
Date: **2026-08-27**

## Objective

Build a self-service product on HSK Chain that lets an issuer create a branded,
USDC.e-reserve-backed stablecoin, control its operators and transfer policy, distribute funded
tokens, and let holders verify and redeem the backing.

The product must be understandable within five seconds, inspectable without a wallet, usable
from a hosted URL within 30 seconds, reproducible from GitHub, and truthful about every live
integration.

Working product statement:

> Launch a branded, USDC-backed stablecoin on HSK Chain, distribute it to users, and let
> anyone verify or redeem its backing.

Lead use case: an RWA or fintech operator issues a branded settlement token, distributes
funded units to participants, and gives holders and reviewers a public backing/redemption path.

The official event page sets submission for **2026-08-27 at 14:00 WAT**, with a three-minute
showcase and two-minute Q&A. The submission MVP is therefore limited to the real
deposit/mint/transfer/redeem lifecycle, public proof, and essential access controls. See the
[Phase 1 decision record](../../docs/phase-1-decisions.md).

## Background And Current Reality

- A mintable ERC-20 is not a stablecoin unless it has a credible backing and redemption
  mechanism.
- HSK mainnet is EVM-compatible, uses chain ID 177 and HSK for gas, and currently documents
  bridged USDC at `0x054ed45810DbBAb8B27668922D110669c9D88D0a`.
- A direct RPC check on 2026-08-27 confirmed chain ID 177, bytecode at that address, six
  decimals, and symbol `USDC.e`.
- Existing systems prove that role separation, reserve controls, public evidence, operational
  deposit/redemption flows, and emergency controls are necessary.
- The closest comparator, Hashgraph Stablecoin Studio, means “one-click token deployment” is
  not sufficient differentiation.
- No application repository, prototype, contracts, CI pipeline, or deployed product exists in
  this workspace yet.

## Users

### Primary: issuer operator

A fintech, RWA operator, payroll operator, or community treasury that wants a branded,
programmable dollar on HSK Chain without creating its own issuance stack.

### Secondary: holder

A person or organization that receives the issued stablecoin and needs to verify, transfer,
claim, or redeem it.

### Operational users

- Issuer administrator: assigns and rotates privileged roles.
- Reserve operator: deposits reserve assets and initiates reserve-backed minting.
- Compliance operator (post-submission): manages eligibility when restricted-transfer mode is enabled.
- Pauser: stops risky operations during an incident.
- Distributor: sends backed supply; later versions add batch payouts and funded claim campaigns.

### Reviewer

A judge, auditor, integrator, or potential issuer that needs to understand and verify the live
product without first connecting a wallet.

## Goals

- G-001: Make the product's purpose understandable in five seconds.
- G-002: Give reviewers a zero-registration, read-only live product path in under 30 seconds.
- G-003: Ensure every issued unit in the MVP is backed by at least one unit of HSK mainnet
  USDC.e held in its dedicated vault.
- G-004: Make creation, funding, minting, distribution, transfer controls, and redemption
  reusable across multiple issuers.
- G-005: Expose supply, reserve, policy, roles, status, and explorer evidence publicly.
- G-006: Separate privileged duties and make all administrative changes auditable.
- G-007: Deploy and verify the judged product on HSK mainnet from a reproducible Git commit.
- G-008: Never substitute mocked or simulated success for a failed or unavailable production
  integration.

## Non-goals

- NG-001: Creating an algorithmic stablecoin, AMM, liquidation engine, or debt pool.
- NG-002: Supporting multiple pegs or reserve assets in the hackathon MVP.
- NG-003: Issuing a DAO or governance token.
- NG-004: Generating yield from deposited reserves.
- NG-005: Claiming regulatory approval, licensing, automated KYC/AML, or legal compliance.
- NG-006: Providing fiat bank deposits, withdrawals, custody, or off-chain reserve attestations.
- NG-007: Adding HSP unless organizers confirm it is required and a real supported integration
  can be completed without simulation.
- NG-008: Inviting meaningful public funds before independent security and legal review.
- NG-009: Building a generic multi-chain product during the hackathon.
- NG-010: Shipping Merkle campaigns, holder allowlists, or gas sponsorship in the submission
  build before the core reserve lifecycle is verified end to end.

## Requirements

### Product clarity and zero friction

- FR-001: The initial screen must state the product promise in one sentence and show
  `Deposit USDC.e → Mint → Distribute → Redeem` without requiring a wallet.
- FR-002: A reviewer must be able to open a pre-created live pilot stablecoin from the landing
  page and see real on-chain data without registering or connecting a wallet.
- FR-003: The hosted product must reach the public pilot reserve view within 30 seconds on a
  normal connection.
- FR-004: The repository must provide one documented command to start a read-only local
  product using public configuration and no secrets. Network download time is not represented
  as part of the 30-second hosted-product claim.

### Issuance and registry

- FR-010: An issuer with a compatible HSK wallet must be able to configure a unique name,
  symbol, display metadata, administrator addresses, and one of the supported transfer modes.
- FR-011: Creation must deploy or initialize an isolated stablecoin and reserve vault from a
  versioned factory and register their addresses on HSK Chain.
- FR-012: The product must support more than one issuer and must not hardcode the pilot token
  into the factory or issuer workflow.
- FR-013: Initialization must be atomic or otherwise protected from takeover between
  deployment and initialization.

### Reserve and minting

- FR-020: The reserve vault must use the configured HSK mainnet USDC.e contract as its only
  MVP reserve asset.
- FR-021: New stablecoin supply may be created only as part of a successful reserve deposit.
- FR-022: Minting must use exact six-decimal units and must reject unsupported or ambiguous
  decimal conversions.
- FR-023: A free-standing issuer, administrator, or distributor role must not be able to mint
  supply without depositing reserve assets.
- FR-024: Every deposit and mint must emit indexable events that identify the issuer token,
  reserve amount, minted amount, recipient, and transaction.

### Redemption

- FR-030: An eligible holder must be able to redeem stablecoins for the same quantity of
  USDC.e from that stablecoin's vault.
- FR-031: Successful redemption must burn the stablecoin before or atomically with releasing
  the reserve.
- FR-032 (post-submission): Restricted-transfer policies must define an explicit holder redemption route; an
  allowlist change must not silently destroy a legitimate holder's redemption capability.
- FR-033: The interface must show why redemption is unavailable or reverted and must never
  show success without a confirmed HSK receipt.

### Roles, policy, and incidents

- FR-040: The system must separate administrator, compliance operator, pauser, and distributor
  capabilities.
- FR-041: The submission uses open-transfer mode. A post-submission release may add an
  issuer-managed allowlist mode without changing the reserve/redemption invariant.
- FR-042 (post-submission): In allowlist mode, eligibility changes must be explicit transactions with actor and
  target events.
- FR-043: The pauser must be able to stop value-changing operations during an incident.
- FR-044: Role grants, revocations, and rotations must be visible on the public product page.
- FR-045: The product must call these features technical policy controls, not proof of legal
  compliance.

### Distribution

- FR-050: The submission MVP must support a real standard ERC-20 transfer as its minimum
  distribution path. A bounded batch payout is the first enhancement after the core lifecycle.
- FR-051 (post-submission): A distributor must be able to create a funded claim campaign with a Merkle root,
  token amount, expiry, and cancellation/refund rules.
- FR-052 (post-submission): Each valid claim may be used once and must be bound to one campaign, one token, one
  chain, and the intended recipient/amount.
- FR-053: Distribution must transfer existing backed supply; it must never bypass reserve-gated
  minting.
- FR-054: Issuers must be able to see distributed, claimed, remaining, expired, and refunded
  campaign amounts.

### Public proof and truthful state

- FR-060: Every registered stablecoin must have a public page showing issuer, token and vault
  addresses, implementation version, reserve asset, reserve balance, total supply, coverage,
  transfer mode, pause state, and relevant role addresses.
- FR-061: Financial values on the public page must come from confirmed HSK contract reads.
- FR-062: Every address and transaction presented as evidence must link to HSK Blockscout.
- FR-063: RPC failure, stale data, unsupported chain, or reverted transactions must produce an
  explicit failure or unavailable state; cached or fabricated success is forbidden.
- FR-064: The app must distinguish the unaudited low-value pilot from an audited production
  stablecoin.

### HSK Chain and mainnet evidence

- FR-070: The judged deployment must use HSK mainnet chain ID 177 and HSK for transaction gas.
- FR-071: Production configuration must reject a mismatched chain ID before signing a
  value-changing transaction.
- FR-072: Factory, implementation, policy, distribution, pilot token, and pilot vault source
  must be verified on the HSK explorer when verification support permits.
- FR-073: A tagged Git commit and address manifest must reproduce the mainnet deployment
  parameters.
- FR-074: The judged evidence must include real reserve deposit, mint, distribution or claim,
  and redemption transactions on HSK mainnet.

### GitHub and reproducibility

- FR-080: The repository must contain setup instructions, architecture, contract addresses,
  limitations, test commands, security disclosure, and the mainnet evidence map.
- FR-081: `main` must reject direct pushes and require a pull request, at least one approval
  from someone other than the author/last pusher, resolved review conversations, and passing
  required checks.
- FR-082: All product work must be linked to an issue with scope, non-goals, acceptance checks,
  and verification evidence.
- FR-083: The product must not require private keys or service secrets for public read-only
  startup.

## Acceptance Criteria

- AC-001: A first-time reviewer can accurately answer what the product does after viewing the
  landing page for five seconds.
- AC-002: From the live URL, the reviewer opens the pilot proof page and sees real reserve and
  supply values plus explorer links within 30 seconds and without a wallet.
- AC-003: Two separate issuer stablecoins can be created from the same deployed factory without
  shared vault balances or privileges.
- AC-004: For every successful operation sequence exercised by invariant tests,
  `reserve balance >= redeemable total supply`.
- AC-005: Direct unauthorized minting, redemption, role changes, policy changes, pause changes,
  batch payouts, and campaign actions revert.
- AC-006: A real holder completes deposit/mint, receipt or claim, and redemption on HSK
  mainnet, and every transaction is linked from the product.
- AC-007: A paused token and an ineligible recipient display truthful failures and never show a
  successful receipt.
- AC-008 (post-submission): A duplicate or malformed claim cannot move funds; expired/cancelled campaigns follow
  the documented refund behavior.
- AC-009: A clean reviewer can access the deployed app without secrets and can start the local
  read-only build through the single documented command.
- AC-010: A direct push to `main`, an unapproved PR, a PR with unresolved conversations, and a
  PR with failing required checks cannot merge.
- AC-011: The public README maps every participant-supplied hackathon requirement to a live URL,
  commit, mainnet address, transaction, test result, or Demo Day action.
- AC-012: No production route, production contract, screenshot, or demo script silently uses a
  mock or simulation while presenting it as real.

## Constraints

- Three-person team with issue-based self-assignment and cross-review.
- Mainnet deployment is mandatory, but value must remain deliberately small before an audit.
- The initial reserve inherits USDC.e issuer, bridge, proxy, censorship, and liquidity risks.
- The official submission deadline is 2026-08-27 at 14:00 WAT. Scope must shrink rather than
  add unsafe shortcuts within the remaining event time.
- The web experience must remain useful in read-only mode without a wallet or backend secret.
- Smart-contract changes require stronger review and tests than copy, styling, or documentation
  changes.

## Stories Needed

- Reviewer understands and inspects the live pilot.
- Issuer creates a stablecoin and isolated vault.
- Reserve operator deposits backing and mints.
- Holder receives or claims a distribution.
- Holder transfers under the configured policy.
- Holder redeems for USDC.e.
- Administrator manages roles.
- Compliance operator manages eligibility.
- Pauser handles and resolves an incident.
- Reviewer verifies HSK mainnet evidence.
- Contributor runs and changes the project safely.

These stories are expanded in
[the Phase 1 story set](../stories/2026-08-27-hsk-stablecoin-issuer-studio.md).

## Open Questions

- OQ-001 resolved: the event is the Ethereum Builders Tour in Lagos; submission is
  2026-08-27 at 14:00 WAT.
- OQ-002 resolved: lead with RWA/fintech settlement distribution.
- OQ-003 resolved for submission: use open transfers; issuer-managed allowlists are deferred.
- OQ-004 resolved: the factory is permissionless while deployment is explicitly not legal
  issuer authorization.
- OQ-005: What amount of HSK and USDC.e can the team allocate to mainnet evidence?
- OQ-006: Does the organizer require HSP or another sponsor integration for this track?
- OQ-007 partially resolved: product `ReserveRail`, repository `Alike001/reserverail-hsk`, and
  three GitHub handles are known. A public software license still needs a team decision.

## Source References

- [Stablecoin issuer-platform research](../../context/stablecoin-issuer-platform-research.md)
- [Comparator repositories](../../context/stablecoin-comparator-repositories.md)
- [HSK organization research](../../context/hashkeyhsk-organization-research.md)
- [Research-backed build plan](../plans/2026-08-26-hsk-stablecoin-issuer-studio.md)
- [HSK Chain network information](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/network-info)
- [HSK Chain token contracts](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Token-Contracts)
