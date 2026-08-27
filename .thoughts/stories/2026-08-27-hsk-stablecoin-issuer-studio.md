# Stories: ReserveRail

Status: **Phase 1 proposal for team approval**
Date: **2026-08-27**

## Traceability

These stories derive from the requirement IDs in
[the product spec](../specs/2026-08-27-hsk-stablecoin-issuer-studio.md).

| Story | Primary requirements |
|---|---|
| S-01 Understand the product | FR-001–FR-004 |
| S-02 Inspect a live pilot | FR-060–FR-064, FR-070–FR-074 |
| S-03 Create an issuer stablecoin | FR-010–FR-013 |
| S-04 Back and mint supply | FR-020–FR-024 |
| S-05 Manage operational authority | FR-040, FR-043–FR-045 |
| S-06 Manage holder eligibility | FR-041–FR-042 |
| S-07 Send a batch payout | FR-050, FR-053–FR-054 |
| S-08 Create and use a claim campaign | FR-051–FR-054 |
| S-09 Transfer as a holder | FR-041–FR-042, FR-061–FR-063 |
| S-10 Redeem stablecoins | FR-030–FR-033 |
| S-11 Respond to an incident | FR-043–FR-044, FR-063 |
| S-12 Run and review the repository | FR-080–FR-083 |

## Submission Priority

- **P0 judged path:** S-01–S-05, standard-transfer slice of S-09, S-10–S-12.
- **P1 only after P0 works:** bounded batch slice of S-07.
- **Post-submission:** S-06 allowlist mode and S-08 Merkle claim campaigns.

Deferred stories must not appear as enabled product actions or be described as live.

## Story 1: Understand the product immediately

As a reviewer,  
I want to understand the promise and money flow without connecting a wallet,  
so that I can decide quickly whether the project is relevant.

### Acceptance Criteria

- The first screen contains the one-sentence promise.
- The first screen shows `Deposit USDC.e → Mint → Distribute → Redeem`.
- A visible action opens the live pilot without registration.
- No undefined technical abbreviation is required to understand the first screen.

### Scenarios

- Given a first-time reviewer, when the landing page loads, then the product purpose and next
  action are visible without scrolling on a normal laptop viewport.
- Given no wallet extension, when the page loads, then read-only exploration remains available.

### Notes

This is the five-second clarity gate, not a marketing preference.

## Story 2: Inspect a real HSK mainnet pilot

As a reviewer,  
I want to inspect a live stablecoin's backing and transactions,  
so that I can verify that the product is not simulated.

### Acceptance Criteria

- The page shows real token supply, vault USDC.e balance, coverage, policy and pause state.
- Token, vault, issuer and transaction links open the correct HSK Blockscout pages.
- Data-loading time and last confirmed block are visible.
- RPC failures show unavailable/stale state rather than fallback numbers.

### Scenarios

- Given a healthy HSK RPC, when the pilot page opens, then confirmed chain values appear within
  the 30-second product-access target.
- Given an unavailable HSK RPC, when the page opens, then it explains that live data is
  unavailable and displays no fabricated reserve coverage.

### Notes

The pilot proves the reusable platform; it is not a hardcoded substitute for it.

## Story 3: Create an issuer stablecoin

As an issuer administrator,  
I want to create an isolated branded stablecoin and reserve vault,  
so that my organization can operate a backed digital dollar.

### Acceptance Criteria

- The issuer reviews name, symbol, policy mode, roles, reserve asset and network before signing.
- The resulting token and vault appear in the on-chain registry.
- The creator cannot initialize another issuer's instance or acquire its roles.
- Creating a second issuer does not share reserve balances, campaign balances or privileges.

### Scenarios

- Given valid unique settings and an HSK mainnet wallet, when creation confirms, then the new
  registry entry and explorer links appear.
- Given invalid, duplicate or incomplete settings, when creation is attempted, then it stops
  before or reverts without a partially controllable instance.

### Notes

Legal authorization to issue is outside product scope and must not be implied by deployment.

## Story 4: Deposit reserve and mint

As a reserve operator,  
I want to deposit USDC.e and mint the same amount of issuer stablecoin,  
so that every new unit is visibly backed.

### Acceptance Criteria

- The interface shows approval, deposit and confirmation states separately.
- Minted units equal successfully received six-decimal reserve units.
- The selected recipient receives the minted supply.
- The public reserve page updates after confirmation.
- No administrator can mint without the reserve deposit path.

### Scenarios

- Given 100 USDC.e and sufficient allowance, when the operator deposits 100, then 100
  stablecoin units are minted and coverage remains at least 100%.
- Given insufficient balance or allowance, when the operator attempts to deposit, then no
  supply is created and the corrective action is shown.

### Notes

Fee-on-transfer and rebasing reserve assets are out of scope and must be rejected.

## Story 5: Manage operational authority

As an issuer administrator,  
I want to grant, revoke and rotate narrowly scoped roles,  
so that one compromised operator cannot control the entire stablecoin.

### Acceptance Criteria

- Admin, compliance, pauser and distributor permissions are independently visible.
- A role holder can perform only its documented operations.
- Grants and revocations appear in public history.
- The UI warns when an action would remove the last administrator or create an unsafe setup.

### Scenarios

- Given a distributor wallet, when it attempts an administrator action, then the transaction
  is blocked or reverts.
- Given a role rotation, when the new role confirms, then the old wallet loses that authority.

### Notes

Mainnet administrators should use separate wallets or a supported multisig before broader use.

## Story 6: Manage holder eligibility

As a compliance operator,  
I want to add or remove eligible wallets in restricted mode,  
so that the issuer can enforce its chosen transfer policy.

### Acceptance Criteria

- Open mode does not require issuer-managed eligibility for normal transfers.
- Restricted mode blocks receipt or transfer for an ineligible wallet according to the
  documented policy.
- Every eligibility change identifies the operator, target and result on-chain.
- A restricted holder has an explicit documented redemption path.

### Scenarios

- Given restricted mode and an eligible recipient, when a transfer confirms, then the recipient
  receives the token.
- Given an ineligible recipient, when a transfer is attempted, then it fails truthfully and no
  balance changes.

### Notes

Eligibility is a technical control. It is not described as completed KYC.

## Story 7: Send a batch payout

As a distributor,  
I want to send backed stablecoins to a bounded recipient list,  
so that payroll, coupons or grants do not require many manual transfers.

### Acceptance Criteria

- The distributor previews recipients, amounts, total, eligibility problems and available
  balance before signing.
- Invalid row counts, addresses, amounts or totals stop the operation.
- A confirmed batch reconciles recipient amounts with the funded total.
- The batch size stays within a tested HSK gas bound.

### Scenarios

- Given a valid funded list, when the batch confirms, then each eligible recipient receives the
  specified amount and an auditable event is available.
- Given one invalid recipient in an atomic batch, when it is submitted, then the documented
  all-or-nothing behavior is preserved.

### Notes

CSV import is a client convenience; the on-chain batch is the source of truth.

## Story 8: Create and use a claim campaign

As a distributor,  
I want to fund a time-limited claim campaign,  
so that recipients can collect allocated tokens themselves.

### Acceptance Criteria

- Campaign creation shows token, root, funded amount, expiry and refund behavior.
- A valid recipient can claim exactly its allocation once.
- Invalid, changed, duplicate, expired or cancelled claims cannot move funds.
- Remaining funds follow the documented expiry or cancellation refund path.

### Scenarios

- Given a valid unclaimed allocation, when its proof confirms, then the recipient receives the
  assigned amount and the claim becomes spent.
- Given the same proof again, when a second claim is attempted, then it reverts.

### Notes

The claim experience may require a wallet and gas unless a real sponsored transaction path is
later accepted. It must not pretend to be gasless.

## Story 9: Transfer under the configured policy

As a holder,  
I want to know whether I can send or receive the stablecoin before signing,  
so that I do not waste gas or misunderstand restrictions.

### Acceptance Criteria

- The holder sees the current transfer policy and its eligibility state.
- A preflight can warn of a likely policy failure but is not presented as final confirmation.
- Confirmed transfers refresh balances from HSK Chain.
- Reverts preserve old balances and show the chain error in plain language.

### Scenarios

- Given open mode and valid balances, when the transfer confirms, then balances update.
- Given restricted mode and an ineligible party, when transfer is attempted, then it fails and
  no success state appears.

### Notes

The MVP does not promise gas sponsorship.

## Story 10: Redeem for reserve

As an eligible holder,  
I want to burn stablecoins for the corresponding USDC.e,  
so that the stablecoin has a meaningful 1:1 redemption mechanism.

### Acceptance Criteria

- The holder previews burn amount, expected USDC.e, available reserve and restrictions.
- Successful redemption reduces stablecoin supply and vault reserve by the same amount.
- Redemption cannot release more reserve than the amount burned.
- Pause, eligibility and insufficient-reserve failures are explicit.

### Scenarios

- Given 25 stablecoin units and sufficient reserve, when the holder redeems 25, then 25 units
  burn and 25 USDC.e arrive at the recipient.
- Given insufficient balance, when redemption is attempted, then neither supply nor reserve
  changes.

### Notes

This is the core stablecoin property and cannot be deferred from the judged path.

## Story 11: Respond to an incident

As a pauser,  
I want to stop and safely resume value-changing operations,  
so that the issuer can contain a suspected exploit or key compromise.

### Acceptance Criteria

- Only the pauser or explicitly documented emergency authority can pause/unpause.
- The public page immediately exposes confirmed pause state.
- The product documents which operations stop and what happens to redemption.
- Resumption is a separate confirmed transaction with an audit event.

### Scenarios

- Given an active token, when pause confirms, then prohibited operations revert.
- Given a non-pauser wallet, when it attempts to unpause, then it reverts.

### Notes

Whether redemption remains available during a pause is an explicit threat-model decision, not
an accidental side effect.

## Story 12: Run and review the repository

As a contributor or judge,  
I want a reproducible setup and protected review process,  
so that I can inspect changes and trust the submitted build.

### Acceptance Criteria

- A public read-only local instance starts through one documented command without secrets.
- Contract and frontend verification commands are documented and run in CI.
- Every pull request links an issue and includes test evidence.
- `main` rejects unreviewed, unresolved or failing pull requests and direct pushes.
- Mainnet addresses trace to a tagged commit.

### Scenarios

- Given a clean clone with prerequisites, when the documented command runs, then the public
  pilot page becomes available without editing configuration.
- Given a failing required check, when a contributor attempts to merge, then GitHub blocks it.

### Notes

Cold dependency-download time is not falsely included in the hosted 30-second access claim.

## Open Questions

- The live pilot is anchored on an RWA/fintech settlement distribution.
- Operational pause blocks mint and transfer/distribution but preserves redemption.
- When allowlists are added after submission, a delisted holder retains self-service
  redemption so policy changes cannot strand backed value.
- Will the team add a real sponsored-transaction service, or clearly require holder HSK gas?
- What maximum batch and campaign sizes meet measured HSK limits?
