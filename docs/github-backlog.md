# GitHub Milestones And Issue Backlog

Date: **2026-08-27**  
Status: **Issue-ready; actual GitHub issue numbers will be assigned during repository setup**

## How To Use This Backlog

- Create one milestone for each phase.
- Create each row as a separate issue using the repository task template.
- Keep the stable ID (`P3-02`, for example) at the start of the issue title.
- Add real GitHub dependency links after issue numbers exist.
- Teammates claim `status:ready` issues themselves.
- Do not assign an entire milestone to one person.

The detailed build sequence is in
[the research-backed plan](../.thoughts/plans/2026-08-26-hsk-stablecoin-issuer-studio.md).

## Phase 1 — Product Contract

| ID | Issue title | Labels | Depends on | Done when |
|---|---|---|---|---|
| P1-01 | Approve target issuer, lead use case and product promise | `area:product`, `priority:p0`, `status:needs-decision` | — | Team chooses RWA/payroll/settlement lead, approves one-sentence promise, and records deadline. |
| P1-02 | Review and accept the product specification | `area:product`, `type:docs`, `priority:p0` | P1-01 | All open requirements are resolved or explicitly deferred and three teammates approve the spec PR. |
| P1-03 | Review user stories and five-second/30-second journey | `area:product`, `area:web`, `priority:p0` | P1-01 | Stories are accepted and the timed judge journey has observable success/failure states. |
| P1-04 | Decide pause and restricted-holder redemption policy | `type:security`, `risk:funds`, `status:needs-decision` | P1-02 | Threat model contains an approved operation matrix and no accidental loss of redemption path. |
| P1-05 | Approve repository quality gates and team workflow | `area:devops`, `type:docs`, `priority:p0` | P1-02 | Required checks, PR reviews, labels, milestones and main ruleset are agreed. |
| P1-06 | Create interaction wireframe for the five core journeys | `area:web`, `area:product`, `priority:p1` | P1-03 | Team can click/review create, mint, roles, distribute, proof/redeem flows; all prototype-only data is labelled. |

Phase 1 exit: P1-01 through P1-05 are accepted. P1-06 may begin before exit but must finish
before broad frontend implementation.

## Phase 2 — HSK Preflight And Scaffold

| ID | Issue title | Labels | Depends on | Done when |
|---|---|---|---|---|
| P2-01 | Verify HSK mainnet chain and USDC.e dependency | `area:hsk`, `risk:mainnet`, `priority:p0` | Phase 1 | RPC, chain ID, code, decimals, symbol, proxy, explorer and source block are recorded. |
| P2-02 | Confirm organizer technology and submission requirements | `area:hsk`, `area:product`, `priority:p0` | P1-01 | Official rule URL, deadline, mainnet expectation and any HSP/sponsor requirement are documented. |
| P2-03 | Scaffold contracts, web app and shared configuration | `area:devops`, `type:chore`, `priority:p0` | P1-05 | Clean clone exposes documented build/test/dev commands and committed lockfiles. |
| P2-04 | Add CI, secret scanning and protected-main required checks | `area:devops`, `type:chore`, `priority:p0` | P2-03 | Checks run successfully once and are required by the active main ruleset. |
| P2-05 | Add HSK network and checked address-manifest module | `area:hsk`, `area:web`, `priority:p0` | P2-01, P2-03 | Chain 177/133 configs reject mismatch and read-only app uses a reviewed manifest. |
| P2-06 | Prove USDC.e approve/transfer behavior on an HSK mainnet fork | `area:contracts`, `area:hsk`, `risk:funds` | P2-01, P2-03 | Pinned-block fork test passes and unsupported reserve behaviors are recorded. |

## Phase 3 — Reserve-Safe Contract Core

| ID | Issue title | Labels | Depends on | Done when |
|---|---|---|---|---|
| P3-01 | Define contract interfaces, events and authority matrix | `area:contracts`, `type:security`, `priority:p0` | Phase 2 | Interfaces map to accepted requirements and threat-model roles before implementation. |
| P3-02 | Implement isolated IssuerStablecoin instances | `area:contracts`, `risk:funds`, `priority:p0` | P3-01 | Token supports required policy/pause behavior and only the vault controls supply. |
| P3-03 | Implement ReserveVault deposit/mint and burn/redeem | `area:contracts`, `risk:funds`, `priority:p0` | P3-01 | Exact USDC.e accounting works and arbitrary reserve withdrawal/mint is impossible. |
| P3-04 | Implement open and allowlist transfer policies | `area:contracts`, `risk:privileged`, `priority:p0` | P1-04, P3-01 | Both modes and restricted redemption behavior match accepted policy. |
| P3-05 | Implement versioned StablecoinFactory and registry | `area:contracts`, `risk:privileged`, `priority:p0` | P3-02, P3-03, P3-04 | Multiple isolated instances initialize safely and are publicly discoverable. |
| P3-06 | Add unit, fuzz and reserve invariant suite | `area:contracts`, `type:test`, `risk:funds`, `priority:p0` | P3-02–P3-05 | Authorization negatives pass and stateful reserve coverage invariant holds. |
| P3-07 | Run static analysis and resolve contract findings | `area:contracts`, `type:security`, `priority:p0` | P3-06 | Slither and dependency findings are fixed or documented and approved. |

## Phase 4 — Distribution

| ID | Issue title | Labels | Depends on | Done when |
|---|---|---|---|---|
| P4-01 | Implement bounded batch payouts | `area:contracts`, `risk:funds`, `priority:p0` | Phase 3 | Funded payouts conserve value, enforce roles and respect policy/gas limits. |
| P4-02 | Implement funded Merkle claim campaigns | `area:contracts`, `risk:funds`, `priority:p0` | Phase 3 | Root, funding, claim, expiry, cancellation and refund lifecycle works. |
| P4-03 | Add claim replay, malformed-proof and conservation tests | `area:contracts`, `type:test`, `risk:funds`, `priority:p0` | P4-02 | Duplicate/forged claims fail and campaign balances always reconcile. |
| P4-04 | Measure HSK batch and claim gas limits | `area:hsk`, `area:contracts`, `type:test` | P4-01–P4-03 | Safe product caps are measured and enforced/documented. |

## Phase 5 — Product Surfaces

| ID | Issue title | Labels | Depends on | Done when |
|---|---|---|---|---|
| P5-01 | Build five-second landing and live-pilot route | `area:web`, `area:product`, `priority:p0` | P1-06, P2-05 | Product promise is immediate and pilot is visible without registration/wallet. |
| P5-02 | Build HSK wallet/network transaction foundation | `area:web`, `area:hsk`, `priority:p0` | P2-05 | Wrong network, rejection, pending, revert and confirmation states are truthful. |
| P5-03 | Build issuer creation and reserve/mint flow | `area:web`, `risk:funds`, `priority:p0` | P3-05, P5-02 | A real issuer can create, approve, deposit and mint with review screens. |
| P5-04 | Build roles, allowlist and emergency controls | `area:web`, `risk:privileged`, `priority:p0` | P3-04, P5-02 | Authority and policy changes work and show confirmed audit history. |
| P5-05 | Build batch and claim campaign workflows | `area:web`, `risk:funds`, `priority:p0` | Phase 4, P5-02 | Distributor can preview, fund and execute both real distribution paths. |
| P5-06 | Build holder transfer, claim and redemption flows | `area:web`, `risk:funds`, `priority:p0` | P3-03, Phase 4, P5-02 | Holder completes each supported real action with truthful failures. |
| P5-07 | Build public reserve, policy and evidence page | `area:web`, `area:hsk`, `priority:p0` | P3-05, P5-01 | Live confirmed values and Blockscout links satisfy FR-060–FR-064. |
| P5-08 | Add component and HSK testnet end-to-end tests | `area:web`, `type:test`, `area:hsk`, `priority:p0` | P5-03–P5-07 | Five core journeys and failure states pass against real testnet contracts. |

## Phase 6 — Mainnet Hardening And Deployment

| ID | Issue title | Labels | Depends on | Done when |
|---|---|---|---|---|
| P6-01 | Complete pre-mainnet security and license review | `type:security`, `risk:mainnet`, `priority:p0` | Phase 5 | Threat gates, provenance, licenses, findings and exposure cap are approved. |
| P6-02 | Rehearse deterministic deployment and verification on testnet | `area:hsk`, `area:devops`, `risk:mainnet` | P6-01 | Tagged rehearsal deploys/verifies and produces a correct address manifest. |
| P6-03 | Deploy and verify platform contracts on HSK mainnet | `area:hsk`, `risk:mainnet`, `risk:privileged`, `priority:p0` | P6-02 | Two-person-reviewed deployment from tagged commit is verified and recorded. |
| P6-04 | Create and exercise low-value real pilot stablecoin | `area:hsk`, `risk:mainnet`, `risk:funds`, `priority:p0` | P6-03 | Real deposit/mint/distribution/redemption receipts reconcile and are public. |
| P6-05 | Publish mainnet manifest, runbook and limitations | `type:docs`, `area:hsk`, `priority:p0` | P6-04 | README/product link exact addresses, commit, evidence and unaudited status. |

## Phase 7 — Demo Day And Submission

| ID | Issue title | Labels | Depends on | Done when |
|---|---|---|---|---|
| P7-01 | Run independent verification audit | `type:test`, `type:security`, `priority:p0` | Phase 6 | Spec, stories, tests, UI and mainnet evidence are independently reconciled. |
| P7-02 | Produce five-minute demo and 30-second opening | `area:product`, `type:docs`, `priority:p0` | P6-04 | Rehearsed narrative demonstrates real pilot and fallback evidence without simulation. |
| P7-03 | Complete submission README, architecture and video | `type:docs`, `area:product`, `priority:p0` | P7-01, P7-02 | Repository front page gives judges every required link and limitation. |
| P7-04 | Map judging criteria and track requirements to evidence | `area:product`, `type:docs`, `priority:p0` | P7-01 | Every claim maps to URL, commit, address, transaction, test or event action. |
| P7-05 | Final clean-clone and live-product rehearsal | `type:test`, `area:devops`, `priority:p0` | P7-03, P7-04 | Another teammate can run setup and complete the timed review journey. |

## Issue Body Template

Use this content when converting a backlog row into a GitHub issue:

```markdown
## Outcome

What observable result should exist when this issue is complete?

## In scope

- ...

## Out of scope

- ...

## Acceptance criteria

- [ ] ...
- [ ] ...

## Verification

Commands, tests, screenshots, explorer links or review evidence required.

## Dependencies

Blocked by / blocks.

## Security and truthfulness

How this work affects funds, roles, HSK mainnet state, or the no-mock rule.
```

## Suggested First Parallel Work

After Phase 1 is approved and Phase 2's scaffold lands, three people can safely start with:

- P2-01: HSK dependency verification
- P2-03: repository scaffold
- P1-06: interaction wireframe

They touch different areas. P2-04 and P2-05 should wait for the scaffold; contracts should wait
for the preflight and accepted authority decisions.
