# ReserveRail Demo Day Showcase

**Event:** Ethereum Builders Tour — Lagos

**Track:** HSK Chain — Stablecoins

**Format:** 3-minute showcase + 2-minute Q&A

**Target:** HSK Chain mainnet (`177`); rehearsal network HSK Chain testnet (`133`)
**Mainnet reserve asset:** bridged USDC (`USDC.e`) at
[`0x054ed45810DbBAb8B27668922D110669c9D88D0a`](https://hashkey.blockscout.com/address/0x054ed45810DbBAb8B27668922D110669c9D88D0a)

## Truthfulness checkpoint

This script describes the repository at commit `4ad3a70612203b4ff6cf3a9a0afd9b5aa2435b98`.

### Working now

- The stablecoin, reserve vault, factory, version registry, pause, role-rotation, transfer, and
  redemption logic are implemented and covered by automated tests.
- The web product includes wallet/network handling, issuer, holder, control, and truthful pilot
  surfaces.
- HSK testnet deployment tooling has passed local and live-RPC simulation with a clearly labeled
  valueless `tUSDC` test reserve.
- Required CI passes formatting, build, tests, static analysis, documentation, and secret checks.

### Not complete yet

- The checked HSK testnet and mainnet manifests both remain `undeployed`.
- No testnet or mainnet deployment address or transaction receipt has been committed.
- The public proof route does not yet read live reserve and supply data from HSK RPC (issue #40).
- No hosted product URL exists in the repository metadata.
- A real low-value mainnet mint, transfer, and redemption have not yet been recorded.

Do not say that ReserveRail is deployed, audited, production-ready, licensed, endorsed by HashKey,
or already serving institutions. Do not show a simulation address as a deployed address. Replace a
pending statement below only after the corresponding manifest, explorer receipt, and direct RPC
read have been reviewed and merged.

## Team speaking roles

| Contributor                     | Demo responsibility                              |
| ------------------------------- | ------------------------------------------------ |
| Hammed Ali Oyeleye (`Alike001`) | Opening, architecture, and close                 |
| web3Ghost (`Webghost01-NG`)     | Web product and transaction workflow             |
| DemolaCodes (`EcstaceeLOR`)     | Test evidence, security boundaries, and fallback |

## Exact three-minute script for the current repository

### 0:00–0:30 — Problem and promise

**Visual:** ReserveRail landing page and four-step flow.

> “Good afternoon. We built ReserveRail for the HSK Chain Stablecoins track. Creating an ERC-20 is
> easy, but building reserve custody, controlled minting, holder distribution, redemption, and
> transparent evidence around it is much harder. ReserveRail is an issuer rail for that complete
> lifecycle: deposit USDC.e, mint the same amount of a branded stablecoin, distribute it, and let a
> holder redeem one-for-one.”

### 0:30–1:00 — Layman model and HSK relevance

**Visual:** Keep the four-step flow visible, then show the HSK `177` network badge.

> “Think of each issuer as receiving a transparent digital cash drawer. USDC.e goes into the
> drawer before matching branded tokens come out. HSK Chain records the drawer, token supply, and
> every action. We target HSK because this product is designed for on-chain finance and
> institution-oriented asset workflows. Our checked configuration uses HSK mainnet chain ID 177
> and its bridged six-decimal USDC.e reserve contract.”

### 1:00–1:35 — What the contracts actually enforce

**Visual:** Repository architecture diagram, then `ReserveVault.sol` and test summary.

> “The reusable factory creates an isolated token and vault pair for each issuer. Only the reserve
> operator can deposit and mint. The vault measures how much reserve it really received and mints
> exactly that many base units. A holder can burn tokens to receive the matching reserve. During an
> incident, minting and transfers can be paused, but ordinary holder redemption stays available.
> Our deterministic Foundry suite includes a 32,768-call stateful reserve invariant campaign.”

### 1:35–2:10 — Working product surfaces

**Visual:** Open Issue Token, Holder Desk, and Emergency & Roles in sequence.

> “The web application implements the transaction workflow rather than displaying fake success.
> The issuer path reviews roles and exact six-decimal amounts, then separates factory creation,
> reserve approval, and deposit-and-mint signatures. The holder path prepares standard transfers
> and direct redemption, and reconciles confirmed receipts with fresh reads. The controls surface
> shows who can pause, unpause, and rotate roles. Rejected signatures, reverts, and unavailable RPC
> reads remain visible as failures.”

### 2:10–2:35 — Honest HSK status

**Visual:** Pilot Route showing `UNDEPLOYED`, then the merged testnet runbook.

> “This is our current deployment boundary. The checked manifests are still undeployed, so the UI
> intentionally hides balances, addresses, and transaction hashes. Our HSK testnet deployment
> script has passed simulation and rejects every chain except 133, but no broadcast receipt is
> committed yet. The public live reserve reader and the capped mainnet pilot remain the final
> integration steps. We are showing that boundary instead of substituting a mock.”

### 2:35–3:00 — Innovation and close

**Visual:** Architecture diagram and green CI checks.

> “ReserveRail goes beyond a token generator: it combines reusable versioned issuance, isolated
> reserves, measured one-for-one minting, holder-controlled redemption, emergency controls, and an
> evidence-first interface. The contracts and product flows are real and tested; deployment claims
> will appear only when their HSK evidence exists. Our next milestone is the reviewed low-value
> mainnet lifecycle. Thank you.”

## Deployment-evidence upgrade

After a reviewed deployment, replace only the `2:10–2:35` section with this evidence-led version:

> “Here are the committed HSK addresses and receipts. The manifest ties them to the reviewed source
> commit. Direct reads at this displayed block show **[reserve]** USDC.e in the vault and **[supply]**
> tokens outstanding. These explorer links prove creation, deposit and mint, transfer, and
> redemption. This is previously confirmed evidence, not a transaction being fabricated live.”

Fill the bracketed values only from a current direct RPC read. Pre-open the exact Blockscout links.
The configured testnet explorer is `https://testnet-explorer.hsk.xyz`; mainnet evidence belongs on
`https://hashkey.blockscout.com`.

## Two-minute Q&A

### What stops an issuer from minting unbacked tokens?

Only the paired vault can mint. The vault measures the reserve balance change and mints exactly the
USDC.e base units actually received. Incorrect, fee-on-transfer, or zero receipt reverts.

### What does one-to-one mean here?

It means one stablecoin base unit is backed by one USDC.e base unit in its paired vault. It does not
guarantee that USDC.e will always trade at one US dollar.

### Can an administrator trap holders by pausing?

The operational pause blocks new minting and token transfers, while the implemented redemption
path remains callable. However, redemption still inherits USDC.e, bridge, smart-contract, and
chain risks.

### Why not use a normal ERC-20 generator?

A generator creates a token. ReserveRail creates the surrounding issuance system: isolated reserve
vault, measured backing, versioned factory, defined roles, redemption, emergency controls, and
truthful evidence surfaces.

### Why HSK Chain?

ReserveRail targets HSK’s institution-oriented on-chain finance ecosystem, uses HSK for gas, and
configures HSK mainnet’s bridged USDC.e as the reserve. The actual value is the complete lifecycle
running on HSK, not simply adding the network name to an ERC-20.

### Is this live on mainnet now?

Current answer: no. The contracts and transaction clients are implemented and tested, and the HSK
testnet deployment process is simulated. The checked manifests remain undeployed. Change this
answer only after reviewed mainnet addresses and receipts are committed.

### Is ReserveRail audited or compliant?

No. It is an unaudited hackathon pilot. Role controls and transparent reserve mechanics are useful
technical foundations, but they are not a security audit, licence, KYC system, or legal compliance
determination.

### What are the largest risks?

Unaudited code, privileged role keys, HSK/RPC availability, and the inherited issuer, bridge,
freeze, custody, and depeg risks of bridged USDC.e. The pilot should remain deliberately low-value.

### How do your tests support the backing claim?

The deterministic stateful suite ran 256 invariant runs at 128 calls each: 32,768 lifecycle calls.
It checks reserve coverage, supply conservation, pair isolation, authority boundaries, and pause
coordination. This is engineering evidence, not an external audit.

## Fallback protocol

If the wallet, RPC, or local web server fails, do not simulate a success screen.

1. Say: “The live dependency is unavailable, so we are switching to clearly labeled repository
   evidence.”
2. Show the checked manifest first so the audience sees the real deployment status.
3. Show passing CI, the reserve invariant report, and the architecture.
4. Use explorer links only when they point to committed successful receipts.
5. Describe screenshots or recordings as earlier evidence, never as a live action.

## Rehearsal record

No timed rehearsal is recorded in this document yet. After the team completes two consecutive
run-throughs, append the actual UTC time, participants, mode, duration, and any missed or overstated
claim. Do not pre-fill or estimate rehearsal results.
