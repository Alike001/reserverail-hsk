# ReserveRail Phase 1 Decision Record

Status: **Proposed for three-person team approval**
Decision date: **2026-08-27**

This record turns the Phase 1 questions into explicit choices the team can approve in one
review. Approval means the team agrees to protect this scope until the hackathon submission;
new ideas go to the backlog unless they replace an existing item.

## Event And Timebox

- Event: [Ethereum Builders Tour: Lagos, Nigeria](https://luma.com/t6gj441t)
- HSK track: Stablecoins
- Submission deadline: **2026-08-27 at 14:00 WAT**
- Demo format: **3-minute showcase plus 2-minute Q&A**
- Build team: three contributors

The short timebox is the scope ruler. The team will ship one truthful reserve-backed lifecycle
instead of several partially implemented mechanisms.

## Lead Customer And Use Case

Primary customer:

> An RWA or fintech operator that needs to issue a branded, dollar-denominated settlement
> token and distribute funded units to participants on HSK Chain.

Lead pilot story:

> The issuer deposits USDC.e, mints the same amount of RailUSD, sends some RailUSD to a
> participant, and the participant redeems it back to USDC.e. A judge independently verifies
> the reserve, supply, and transactions from a public page.

This RWA-settlement framing fits HSK Chain's institutional on-chain-finance positioning without
claiming that ReserveRail, the team, or a pilot issuer is licensed or regulator-approved.

## Product Promise

Five-second promise:

> Launch a branded, USDC-backed stablecoin on HSK Chain, distribute it to users, and let
> anyone verify or redeem its backing.

Money flow:

```text
Deposit USDC.e → Mint → Distribute → Redeem
```

Thirty-second judge path:

1. Open the hosted product without registering or connecting a wallet.
2. Read the promise and select **Inspect live pilot**.
3. See HSK Chain, token supply, vault reserve, coverage, pause state, and last confirmed block.
4. Open the token, vault, and real transaction evidence in HSK Blockscout.

## Submission MVP

The submission-critical product contains:

1. A factory that can create more than one isolated issuer token and reserve vault.
2. Atomic USDC.e deposit and 1:1 stablecoin minting.
3. Standard ERC-20 transfer as the minimum real distribution path.
4. Holder burn and 1:1 USDC.e redemption.
5. Administrator, reserve-operator, and pauser access controls.
6. An operational pause that blocks new minting and transfers but preserves redemption.
7. A public, wallet-free proof page backed only by confirmed HSK reads.
8. A small, verified HSK mainnet pilot with real deposit, mint, transfer, and redemption
   evidence.

If time remains after this lifecycle works end to end, implement a bounded batch payout as the
first enhancement.

## Explicitly Deferred

These are product-roadmap features, not submission claims:

- Merkle claim campaigns, expiry, cancellation, and refunds.
- Issuer-managed holder allowlists and third-party identity/KYC integrations.
- Gas sponsorship or gasless claims.
- Fiat bank rails, off-chain custody, and reserve attestations.
- Multiple reserve assets, pegs, chains, yield, governance, and upgrade frameworks.
- Production-scale use or an audit claim.

Deferral is not a mock. Deferred controls do not appear as clickable production actions and are
not described as live.

## Success Evidence

The submission is successful only if the team can point to:

- a public repository and reproducible commit;
- a hosted read-only product;
- verified HSK mainnet contract addresses;
- real reserve deposit, mint, transfer, and redemption receipts;
- a public proof page whose values reconcile;
- tests demonstrating reserve coverage and unauthorized-action failures;
- visible disclosure that the low-value pilot is unaudited.

## Team Approval

Each teammate should approve the Phase 1 pull request and comment on issue P1-01 with one of:

- `Approved — scope and promise accepted`
- `Changes requested — <specific replacement decision>`

Silence is not approval. The issue closes only after the three-person decision is recorded.
