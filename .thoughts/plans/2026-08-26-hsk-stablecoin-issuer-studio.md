# Plan: ReserveRail

> **2026-08-27 deadline override:** The official submission deadline is 14:00 WAT today. For
> the judged build, execute only the P0 slice in
> [the Phase 1 decision record](../../docs/phase-1-decisions.md): factory, isolated token/vault,
> reserve-backed mint, standard transfer, redemption, essential roles/pause, public proof, and
> real HSK mainnet evidence. Allowlist, batch, and Merkle-campaign steps below remain the
> post-submission product roadmap unless the complete P0 lifecycle is already verified.

## Inputs

- Participant's idea: create, mint, control, and distribute stablecoins on HSK Chain as a real
  product rather than a one-off demo.
- Participant-supplied hackathon gates: HSK build, HSK mainnet deployment, HSK technology
  integration, public GitHub repository, working demo, and Demo Day/review participation.
- Judging criteria: feasibility, meaningful real-world problem, and technical/product
  innovation.
- [Stablecoin issuer-platform research](../../context/stablecoin-issuer-platform-research.md).
- [Comparator repository inspection](../../context/stablecoin-comparator-repositories.md).
- [HSK organization research](../../context/hashkeyhsk-organization-research.md).

No existing application, accepted UI prototype, quality profile, detailed product spec, or
user stories exist yet. This is therefore a research-backed **build plan with explicit product
assumptions**, not permission to begin implementation.

## Assumptions

- Working product: an issuer-facing platform for creating **USDC-reserve-backed** stablecoins,
  not an algorithmic stablecoin or generic ERC-20 creator.
- Initial peg and reserve unit: USD represented by the current documented six-decimal bridged
  USDC on HSK mainnet.
- Minting is reserve-gated: one stablecoin unit can be minted only when one reserve unit enters
  the stablecoin's vault.
- Redemption is part of the core product, not a roadmap slide.
- The first release supports open transfers or an issuer-managed allowlist. It does not claim
  automated KYC/AML or legal compliance.
- Contracts are small and versioned. Individual issuer instances are not globally upgradeable
  in the MVP.
- Local and CI tests may use mock tokens. The judged mainnet path may not.
- A deployer-controlled test issuance on mainnet will use a deliberately small reserve amount
  until an independent audit and issuer partnership exist.

## Open Questions

Resolve these before freezing the spec:

- What is the official hackathon name, deadline, team size, and complete rule URL?
- Who is the first intended issuer: fintech, RWA issuer, payroll operator, or community?
- Should stablecoin transfers be open by default or allowlisted by default?
- Is issuer creation permissionless, curated by the platform, or controlled by an onboarding
  admin?
- Does “share” mean batch payout, claim link, QR payment, or all three?
- Must the hackathon use HSP or another sponsor service beyond HSK Chain itself?
- What mainnet budget is available for HSK gas and USDC reserve funding?
- What name, visual identity, fee model, and repository license will the product use?

Until answered, use the assumptions above and do not expand scope.

## Prototype Reintegration Gate

No prototype exists, so there is no reintegration blocker. Before broad frontend
implementation, create and accept a small interaction prototype covering:

1. create issuer stablecoin;
2. fund reserve and mint;
3. assign roles and manage allowlist;
4. create a distribution campaign;
5. view backing and redeem.

Prototype data may be static only during design. No simulated transaction, fake reserve,
hard-coded success state, or mock HSK integration may remain in the judged application path.

## Phase 1: Freeze the Product Contract

### Goal

Convert the research decision into a testable spec and a deliberately narrow user journey.

### Work

- Write the one-sentence target user/problem statement.
- Define issuer, holder, admin, compliance operator, pauser, and distributor actors.
- Write user stories and acceptance criteria for creation, reserve funding, minting,
  distribution, transfer, pause, allowlist changes, redemption, and public verification.
- Decide curated versus permissionless issuer creation and open versus allowlisted transfers.
- Define language that distinguishes technical controls from regulated compliance.
- Produce the project quality profile and threat model.

Likely artifacts: `docs/product-spec.md`, `docs/user-stories.md`, `docs/threat-model.md`, and the
project quality configuration.

### Real Integration Path

The spec names HSK mainnet chain ID 177 and the currently documented reserve asset, subject to
an on-chain preflight in Phase 2.

### Mock/Simulation Policy

No implementation or mock product behavior in this phase.

### Checks

- Every claimed feature has an acceptance criterion.
- Every privileged action has an owner, recovery path, and audit event.
- “Stable” is tied to reserve deposit and redemption, not branding.

### Acceptance Criteria Covered

Defines the complete acceptance baseline for all hackathon gates.

### Stop Condition

Stop until the product boundary and target issuer are accepted. Do not design a generic asset
platform, DAO token, lending protocol, or multi-currency system.

## Phase 2: Prove HSK Mainnet Preconditions

### Goal

Verify that the intended production dependencies exist and behave as assumed before contract
design is locked.

### Work

- Query `eth_chainId` from the official mainnet RPC and confirm `177`.
- Inspect the documented bridged USDC contract on Blockscout: bytecode, decimals, symbol,
  proxy/implementation, holder/transfer activity, and verification status.
- Run a read-only mainnet-fork transfer/approval test using an impersonated funded account.
- Confirm contract-verification procedure and obtain a small, capped HSK/USDC deployment
  budget.
- Ask organizers whether another HSK service is mandatory for the stablecoin track.

Likely areas: `contracts/foundry.toml`, `contracts/script/`, `.env.example`, and
`docs/hsk-mainnet-preflight.md` after the repository is scaffolded.

### Real Integration Path

Official HSK mainnet RPC, Blockscout, HSK gas, and the documented mainnet USDC contract.

### Mock/Simulation Policy

A mainnet fork is allowed for preflight. It is not evidence of mainnet deployment.

### Checks

- RPC chain ID assertion.
- USDC `decimals() == 6` assertion.
- SafeERC20 deposit/withdraw behavior on a mainnet fork.
- Recorded source URLs, block number, and time of verification.

### Acceptance Criteria Covered

Proves the HSK integration is technically real before build work depends on it.

### Stop Condition

If the reserve token address, behavior, or funding path cannot be verified, stop and choose a
documented reserve asset with the organizers. Do not substitute a mock in the judged path.

## Phase 3: Build the Reserve-Safe Contract Core

### Goal

Implement the minimum contract system whose supply cannot exceed its on-chain reserve.

### Work

- Scaffold a Foundry Solidity project using maintained OpenZeppelin contracts.
- Implement `IssuerStablecoin`, `ReserveVault`, `TransferPolicy`, and
  `StablecoinFactory` interfaces first.
- Use ERC-1167 clones or an equivalently small versioned factory pattern.
- Make the vault the only minter/burn controller.
- Implement exact decimal handling, deposit-to-mint, burn-to-redeem, pause, role rotation,
  open policy, allowlist policy, and explicit events.
- Ensure holders retain a documented redemption route when transfer restrictions apply.
- Record factory version and implementation addresses in an on-chain registry.

Likely areas: `contracts/src/`, `contracts/test/`, `contracts/script/`, and generated ABIs.

### Real Integration Path

Contracts are chain-agnostic Solidity but configured and tested for HSK mainnet's reserve
token and chain behavior.

### Mock/Simulation Policy

`MockUSDC` is permitted only in unit/fuzz tests and local development. Mainnet-fork tests use
the real contract.

### Checks

- Unit tests for every role and state transition.
- Stateful invariant: reserve balance is always greater than or equal to redeemable supply.
- Fuzz tests for deposit/mint/redeem rounding and decimal boundaries.
- Unauthorized mint, role, pause, and policy operations revert.
- Allowlist tests include mint, transfer, redemption, and removal edge cases.
- Reentrancy, fee-on-transfer, false-return token, zero-address, replay, and denial-of-service
  cases are addressed or explicitly unsupported.
- Slither, formatting, build, gas snapshot, and coverage gates pass.

### Acceptance Criteria Covered

Creates a feasible stablecoin mechanism, real access controls, HSK-compatible contracts, and
the core evidence for technical innovation.

### Stop Condition

Do not start distribution or UI work until the reserve invariant and privilege tests pass.

## Phase 4: Add Auditable Distribution

### Goal

Make created stablecoins usable by letting issuers distribute funded supply safely.

### Work

- Implement capped batch distribution with array-length and maximum-recipient checks.
- Implement funded Merkle claim campaigns with root, amount, expiry, cancellation/refund,
  and replay protection.
- Bind campaigns to one registered issuer stablecoin.
- Emit indexable events for campaign creation, claims, cancellation, and completion.
- Decide whether claimants must already be allowlisted or can be atomically enrolled by an
  authorized issuer flow.

Likely areas: `contracts/src/DistributionManager.sol`, contract tests, and deployment scripts.

### Real Integration Path

Campaigns transfer real reserve-backed issuer tokens on HSK Chain; they never mint unbacked
supply.

### Mock/Simulation Policy

Test fixtures may create sample CSV/Merkle data. Production campaign roots must be generated
from issuer-provided recipient data and verified client-side.

### Checks

- Unit/fuzz tests for duplicate claims, malformed proofs, expiry, cancellation, and recovery.
- Batch gas limits tested against a conservative HSK block constraint.
- Conservation check: distributed plus remaining campaign balance equals funded amount.

### Acceptance Criteria Covered

Delivers the participant's “distributable/shareable” requirement as a product workflow.

### Stop Condition

No public campaign goes live until cancellation, expiry, and stranded-fund tests pass.

## Phase 5: Build the Issuer and Public Product Surfaces

### Goal

Expose the complete lifecycle through a persistent, understandable web product.

### Work

- Build wallet/network connection with explicit HSK mainnet switching.
- Create an issuer setup wizard with a pre-deployment review and risk disclosure.
- Add issuer pages for reserve funding/minting, redemption status, roles, policy, pause, batch
  payout, claim campaigns, and transaction history.
- Add a public token page showing issuer wallet, reserve asset, vault balance, total supply,
  coverage ratio, policy mode, pause state, contract version, and Blockscout links.
- Add a holder page for balance, transfer eligibility, claim, and redemption.
- Read financial truth directly from contracts. Use an indexer/database only for search,
  labels, and cached event projections.
- Provide clear transaction states, error recovery, and mobile layouts.

Likely areas: `apps/web/`, shared ABI/config package, optional event indexer, and product docs.

### Real Integration Path

All judged actions sign wallet transactions against HSK Chain and refresh from confirmed
receipts. Explorer links point to the correct chain.

### Mock/Simulation Policy

Storybook/design fixtures are allowed outside the production route. Production screens must
not fall back to fake balances, addresses, receipts, or transaction success.

### Checks

- Component tests for numeric formatting, policy states, and error messages.
- End-to-end test of create → deposit/mint → distribute/claim → redeem on HSK testnet.
- Wrong-network, rejected-signature, reverted-transaction, stale-RPC, and refresh tests.
- Accessibility and responsive checks for the five core journeys.

### Acceptance Criteria Covered

Provides the working demo, meaningful product experience, and public reserve transparency.

### Stop Condition

Do not deploy the production frontend while any core action can show success before an HSK
receipt confirms it.

## Phase 6: Mainnet Hardening and Deployment

### Goal

Ship a reproducible, intentionally low-value mainnet product path with verifiable evidence.

### Work

- Complete internal threat-model review and dependency/license inventory.
- Run full tests, invariant fuzzing, static analysis, and deployment rehearsal on testnet.
- Put privileged roles behind separate wallets or a supported multisig; document thresholds
  and recovery.
- Deploy factory, implementation contracts, policies, and distribution manager to HSK
  mainnet from the tagged commit.
- Verify source on Blockscout.
- Create one explicitly identified pilot issuer token, deposit a small real USDC reserve, mint,
  distribute, transfer/claim, and redeem.
- Publish address manifests, transaction evidence, deployment parameters, and incident/runbook
  documentation.

Likely areas: deployment manifests, `deployments/hsk-mainnet.json`, `SECURITY.md`, runbooks,
and release documentation.

### Real Integration Path

HSK mainnet chain ID 177, real HSK gas, real documented bridged USDC, verified contracts, and
real wallet receipts.

### Mock/Simulation Policy

No mock or simulated behavior in the mainnet evidence path. The pilot's low reserve value and
unaudited status must be prominently disclosed.

### Checks

- Bytecode and constructor/initializer parameters match the tagged source.
- Role holders, implementation versions, reserve token, and explorer links are independently
  rechecked.
- Full mainnet smoke path completes without admin shortcuts.
- The public reserve page reconciles exactly with on-chain values.

### Acceptance Criteria Covered

Satisfies mainnet deployment, HSK integration, GitHub reproducibility, and a genuine working
product flow.

### Stop Condition

Do not invite third-party value or describe the contracts as audited/production-safe without
an independent audit and appropriate issuer/legal review.

## Phase 7: Demo Day and Submission Evidence

### Goal

Make every judging claim quickly verifiable.

### Work

- Script a five-minute narrative: issuer problem → create → back/mint → distribute → holder
  redeem → public reserve proof.
- Put live app, source, mainnet addresses, verified contracts, architecture, setup, tests,
  limitations, and video at the top of the README.
- Map each judging criterion and track requirement to direct evidence.
- Prepare a fallback that uses recorded mainnet transaction receipts if a wallet or RPC UI
  fails; do not present a simulation as live execution.
- Rehearse role separation and the explanation of why this is a stablecoin platform rather
  than a token generator.

### Real Integration Path

The default demo uses the deployed HSK mainnet pilot and links each action to Blockscout.

### Mock/Simulation Policy

A recording is acceptable evidence of an earlier real mainnet run. Fake receipts or mock
contracts are not.

### Checks

- Clean-machine setup and repository reproducibility check.
- Broken-link and address-manifest check.
- Timed demo rehearsal and failure-path rehearsal.
- Requirement-to-evidence checklist signed off before submission.

### Acceptance Criteria Covered

Covers GitHub, working demo, review/Demo Day readiness, and all three judging dimensions.

### Stop Condition

Submission is not ready until every requirement points to a working URL, repository artifact,
mainnet address, transaction, or scheduled participation action.

## Verification Checkpoint

Before declaring the project complete, run a separate verification audit against the accepted
spec, stories, this plan, and the deployed mainnet evidence. At minimum verify:

- reserve invariant and redemption behavior;
- privilege and policy enforcement;
- distribution conservation and replay protection;
- frontend truthfulness under success and failure;
- HSK mainnet address/source/bytecode correspondence;
- license notices and dependency inventory;
- every hackathon requirement and judging claim.

Any failed item remains open; a polished demo does not override failed financial invariants.

## Handoff Notes

- Start with Phase 1, not contract coding.
- The closest analogue is Hashgraph Stablecoin Studio, so differentiation must remain visible
  in the spec and demo.
- Keep HSP, automated KYC, fiat bank rails, multiple reserve assets, other fiat pegs, yield,
  governance, and upgradeable policy modules out of the MVP unless the organizer explicitly
  requires one and the scope is re-approved.
- The planned mainnet deployment is an unaudited low-value pilot. “Product” means the complete
  real workflow is operational; it does not mean the system is ready to custody public funds
  at scale.
