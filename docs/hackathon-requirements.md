# Stablecoins Track Requirement Matrix

Status: **Verified where an organizer source is available**
Checked: **2026-08-27**

ReserveRail is entering the **HSK Chain Stablecoins track** at the Ethereum Builders Tour in
Lagos. This matrix separates organizer-published facts from requirements supplied directly by
the participant so the repository does not overstate its sources.

## Official Event Facts

Source: [Ethereum Builders Tour: Lagos, Nigeria](https://luma.com/t6gj441t)

| Fact | Evidence strength |
|---|---|
| Event is sponsored by HSK Chain | Official event page |
| HSK Chain includes a Stablecoins track | Official event page |
| Submission ends August 27 at 14:00 local Lagos time (WAT) | Official event agenda |
| Demo is five minutes: three-minute showcase plus two-minute Q&A | Official event agenda |
| HSK prizes are 500 USDT, 300 USDT, and 200 as displayed | Official event page; the third-place unit is written `UDT`, likely a page typo |

The event page also lists AI Agents, AI × Web3, DeFi, Payments, RWA, and Blockchain
Infrastructure, but ReserveRail is submitted only under Stablecoins.

## Participant-Supplied HSK Requirements

The following requirements were supplied by the participant. They are treated as binding for
the project, but the currently available event page does not independently repeat them:

- Built on HSK Chain.
- Deployed on HSK Chain mainnet.
- Integrates HSK Chain technology.
- Includes a GitHub repository.
- Provides a working demo.
- Participates in project review or Demo Day.

Participant-supplied judging criteria:

- Feasibility and real-world implementation potential.
- Ability to address a meaningful user or market problem.
- Technical and product innovation.

Participant-supplied product gates:

- Judges understand the product immediately.
- A judge can access and run/inspect it within 30 seconds with zero registration friction.
- No mock, false, or placeholder implementation is presented as real.
- The result is a reusable product, not a one-off scripted demo.

## Technology Decision

No HSP requirement or other mandatory sponsor SDK appears on the official event page reviewed
above. Therefore:

- HSK mainnet contracts, HSK RPC reads, HSK gas, and Blockscout evidence are the required chain
  integration for the submission.
- HSP remains optional and must not be claimed unless a real supported integration is built.
- If an organizer gives the team a newer rule or workshop requirement, attach its source and
  update this matrix immediately.

## Submission Evidence Checklist

| Requirement | Required ReserveRail evidence |
|---|---|
| Stablecoins track | Submission explicitly labels ReserveRail as a reserve-backed stablecoin issuer platform |
| Built on HSK Chain | Contracts and web configuration use current HSK network data |
| Mainnet deployment | Verified factory, token, and vault addresses on chain ID 177 |
| HSK technology | Live RPC reads, HSK gas transactions, and Blockscout links |
| GitHub | Public repository, issues, protected main, reproducible tagged commit |
| Working product | Hosted landing, public proof, mint, transfer, and redemption paths |
| Real implementation | Confirmed mainnet receipts; no fixture presented as production state |
| Feasibility | Small USDC.e-backed model, limited P0 scope, documented risks |
| Meaningful problem | Issuers avoid rebuilding reserve-safe issuance and public proof infrastructure |
| Innovation | Multi-issuer reserve isolation, visible coverage, distribution, and redemption in one product |
| Five-second clarity | One-sentence promise and four-step money flow above the fold |
| 30-second inspection | Wallet-free live pilot proof page and explorer evidence |
| Demo Day | Three-minute rehearsed lifecycle plus two-minute evidence-focused Q&A |

## Demo Timing

```text
0:00–0:20  Problem, Stablecoins track, and ReserveRail promise
0:20–0:45  Public live reserve proof without a wallet
0:45–1:30  Reserve deposit and 1:1 mint
1:30–2:00  Real token distribution
2:00–2:35  Holder redemption and updated coverage
2:35–3:00  HSK explorer evidence, reusable factory, limits, and close
```

Never replace a failed live transaction with a prerecorded result while describing it as live.
If network access fails during presentation, clearly label explorer receipts as previously
confirmed evidence.
