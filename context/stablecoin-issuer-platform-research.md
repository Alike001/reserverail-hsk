# Reality Research: HSK Stablecoin Issuer Platform

Research snapshot: **2026-08-26**, with HSK mainnet RPC rechecked on **2026-08-27**

## Scope

This brief evaluates the idea of a product that lets issuers create, operate, and distribute
stablecoins on HSK Chain. It answers four questions:

1. What must the product do to be more than an ERC-20 token generator?
2. Which patterns are proven in existing stablecoin and regulated-token systems?
3. Which product slice is feasible for the HSK Chain hackathon requirements supplied by the
   participant?
4. What should be adapted, avoided, or deferred?

The work included source inspection of nine repositories, current official HSK Chain
documentation, and two open-source hackathon winners. It is product and architecture research,
not a legal opinion or a smart-contract audit.

## The Idea, Restated in Plain Language

The strongest version of the idea is **ReserveRail**, a stablecoin issuer platform built on HSK Chain:

> An issuer locks verifiable reserve assets, creates a branded stablecoin on HSK Chain,
> assigns operational roles, and distributes the stablecoin to approved users. Holders can
> see the backing and redeem the stablecoin for its reserve asset.

The product has two types of users:

- **Issuers**: businesses, fintechs, communities, or RWA operators that configure and fund a
  stablecoin.
- **Holders**: people or organizations that receive, transfer, and redeem it.

“Shareable” or “distributable” means batch payouts and funded claim campaigns, not merely
copying a token address.

## The Critical Product Boundary

A mintable ERC-20 is not automatically a stablecoin. A stablecoin needs a believable answer
to all of these questions:

- What is one token supposed to be worth?
- What asset backs it?
- Who may create or destroy supply?
- How can a holder redeem it?
- How can the public verify that issued supply is covered?
- What happens during fraud, sanctions, key compromise, or an incident?

If the app only accepts a name, symbol, and supply, it is a **token factory**. Calling those
tokens stablecoins would weaken the product and the hackathon pitch.

## Verified Facts

### HSK Chain integration surface

- HSK Chain is EVM-compatible, so normal Solidity and Ethereum tooling can be used against its
  RPC endpoints. The current official network page lists mainnet chain ID **177**, RPC
  `https://mainnet.hsk.xyz`, native gas token HSK, and the Blockscout explorer at
  `https://hashkey.blockscout.com`.
- The same official source lists testnet chain ID **133** and RPC
  `https://testnet.hsk.xyz`.
- Current official token documentation lists bridged USDC on HSK Chain mainnet at
  `0x054ed45810DbBAb8B27668922D110669c9D88D0a` and USDT at
  `0xf1b50ed67a9e2cc94ad3c477779e2d4cbfff9029`.
- A direct mainnet JSON-RPC check on 2026-08-27 returned chain ID `0xb1` (177), contract
  bytecode at the documented USDC address, `decimals() == 6`, and symbol `USDC.e`.
- The participant supplied the judging gates: build on HSK Chain, deploy on mainnet, integrate
  HSK Chain technology, publish GitHub source, provide a working demo, and attend review/Demo
  Day. The criteria emphasize feasibility, a meaningful market problem, and technical/product
  innovation.
- Some older HSK documentation pages contain legacy network values. Deployment configuration
  must use the current network-info page and be confirmed with an RPC `eth_chainId` call before
  funds or contracts are deployed.

Primary references:

- [HSK Chain network information](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/network-info)
- [HSK Chain developer quickstart](https://docs.hskchain.net/docs/Developer-QuickStart)
- [HSK Chain token contracts](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Token-Contracts)
- [HSK Chain explorer documentation](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Tools/Explorer)

### Mature issuer-controlled stablecoins separate duties

- Circle's EVM contracts separate owner, master minter, minters with allowances, pauser,
  blacklister, and rescuer responsibilities. They support minting, burning, pausing,
  blacklisting, upgradeability, and signed transfer/permit flows.
- PYUSD separates supply controllers from asset-protection powers, supports mint rate limits,
  pause/freeze/wipe controls, signed transfers, and an upgradeable proxy. Its documentation
  explicitly identifies Paxos as the trusted issuer backing the token with USD.
- These controls do not create the dollar backing. They operate the on-chain representation of
  an issuer's off-chain reserve and redemption promise.

### Issuance platforms add a control plane around the token

- Hashgraph Stablecoin Studio is the closest product analogue. Its monorepo contains a factory,
  modular token operations, reserve integration, role management, KYC/freeze/wipe functions,
  multisignature workflows, an SDK, CLI, backend, web app, and documentation.
- Its factory and shared resolver make token creation and upgrades convenient, but also create
  a large and privileged system. Reproducing its complete diamond architecture during a
  hackathon would increase audit and operational risk.
- Stellar Anchor Platform addresses a different half of the problem: authenticated deposits,
  withdrawals, KYC exchange, quotes, and cross-border payment workflows. It shows that token
  issuance without an operational deposit/redemption rail is incomplete.

### Compliance controls are technical capabilities, not legal compliance

- ERC-3643/T-REX demonstrates identity registries, trusted claim issuers, transfer-compliance
  modules, country rules, balance/supply/transfer limits, freezing, forced transfers, recovery,
  and agent roles.
- Its inspected repository is deprecated in favor of the current ERC-3643 organization and is
  GPL-3.0 licensed. Its concepts are useful; copying its implementation would bring both
  maintenance and license concerns.
- An allowlist, freeze button, or role system should be described as **configurable compliance
  controls**. The product must not claim legal or regulatory compliance without an actual
  jurisdiction, regulated issuer, policies, and verification provider.

### Algorithmic stablecoins are a different product

- Mento uses a diversified overcollateralized crypto reserve, exchange infrastructure,
  pricing/oracles, circuit breakers, and trading limits to maintain multiple stable assets.
- M0 uses governance-approved minters and validators, signed collateral updates, mint
  proposals, ratios, and penalties.
- Both solve economic stability and risk-management problems far beyond a token factory. They
  are useful architecture references but are not a feasible base for this hackathon scope.

### Hackathon evidence

- [XSyn Protocol](https://devpost.com/software/xsyn-protocol) won first place in the XDC DeFi
  hackathon's stablecoin category. It had a specific mechanism—crypto collateral, oracle
  prices, a collateral ratio, a debt pool, and synthetic-asset exchange—rather than a generic
  token creator. Its [source](https://github.com/LogeswaranA/xsynprotocol) is Apache-2.0 but is
  a 2022 prototype with only 13 commits and a list of unfinished safety mechanisms. It is a
  concept reference, not production code.
- [Proof-of-Deposit](https://devpost.com/software/proof-of-deposit) won second place in the
  Celo Make Crypto Mobile DeFi track. It modified a real chain-specific system—Celo governance
  and block rewards—and shipped contracts, a web app, analysis, and a testnet deployment. Its
  [source branch](https://github.com/yc5915/make-crypto-mobile-hackathon/tree/Proof-of-Deposit/proof_of_deposit)
  also shows that a winning prototype can still identify extensive analysis and mainnet work
  as future requirements.
- The transferable lesson is not to copy either mechanism. Winners make one chain-specific
  idea tangible, demonstrate a complete user flow, and state limitations honestly.

## Inferences

### Best hackathon product position

The most credible first product is **a USDC-reserve-backed issuer platform**, not a new
algorithmic currency:

1. The issuer chooses a name, symbol, policy mode, and operational wallets.
2. A factory creates a stablecoin and its dedicated reserve vault.
3. The issuer deposits HSK Chain's documented bridged USDC into the vault.
4. The vault mints the same number of six-decimal issuer stablecoins to the issuer or a
   distribution campaign.
5. Holders can burn and redeem 1:1 for the vault's USDC, subject to the configured policy.
6. Anyone can compare vault USDC with stablecoin supply on the public reserve page.

This is economically simple: the peg comes from direct convertibility to USDC, and the backing
is visible on-chain. It avoids pretending that the hackathon team already has bank reserves,
money-transmitter permissions, an auditor, or a regulated redemption desk.

### Meaningful initial use cases

- A fintech creates a permissioned settlement dollar for approved counterparties.
- An RWA issuer distributes dollar-denominated coupons to a controlled holder list.
- A company creates a funded payroll or contributor payout campaign.
- A community creates a transparent, fully reserved internal payment unit redeemable for USDC.

The product should target **issuers**, not promise that every anonymous wallet can issue a
legally compliant fiat currency.

### Differentiation is necessary

“One-click stablecoin creation” already exists, most clearly in Hashgraph Stablecoin Studio.
The HSK version needs a focused differentiator:

- a reserve invariant that can be checked entirely on HSK Chain;
- configurable open-transfer or allowlisted-transfer modes;
- batch and claim-based distribution as a first-class product workflow;
- a public proof page showing issuer, policy, supply, vault backing, redemption status, and
  Blockscout evidence;
- a deliberately small, auditable contract system rather than a large upgrade framework.

### Recommended contract boundary

- `StablecoinFactory`: deploys versioned, immutable minimal-proxy instances and records them.
- `IssuerStablecoin`: ERC-20, role-based administration, pause, optional transfer policy, and
  mint/burn callable only through its vault.
- `ReserveVault`: accepts the configured reserve asset, mints 1:1, burns on redemption, and
  exposes backing/supply status.
- `DistributionManager`: funded batch payouts and Merkle claim campaigns with replay
  protection and deadlines.
- `TransferPolicy`: a small interface with open and issuer-managed allowlist implementations.

Recommended roles are admin, compliance operator, pauser, and distributor. A free-standing
minter role should not be able to violate the reserve invariant.

## What to Reuse and What to Avoid

### Reuse as patterns

- Circle/PYUSD: separated duties, mint limits, pause, freeze, signed payment UX.
- Hashgraph Studio: issuer dashboard, factory, SDK boundaries, public reserve data, multisig
  awareness.
- Stellar Anchor: explicit deposit/redemption state and operational transaction history.
- ERC-3643: policy-module boundary and issuer-managed identity/eligibility data.
- M0/Mento: collateral freshness, limits, circuit breakers, and invariant-driven testing.

### Do not copy into the first version

- Algorithmic peg mechanisms, liquidations, debt pools, AMMs, or yield strategies.
- Diamond proxies or a global upgrade authority across all issuer tokens.
- A DAO/governance token. Governance does not make an asset stable and dilutes the product.
- Arbitrary assets and multiple currencies before the USD/USDC path works end to end.
- “Automated KYC/AML” without a live verification provider.
- Code whose license is incompatible or ambiguous. The comparator table records the relevant
  repository licenses.

## Product Versus Demo Standard

For this to be presented as a product, the judged path should include:

- a persistent web app, not only a deployment script;
- a factory and at least one reserve-backed token deployed and verified on HSK mainnet;
- real mainnet reserve deposit, mint, distribution, transfer, and redemption transactions;
- role management and emergency pause that work from the UI;
- a public token/reserve page with live chain reads and explorer links;
- documented contracts, addresses, deployment commit, limitations, and operating guide;
- automated contract tests, an invariant test, static analysis, and a reproducible deployment;
- no mock reserve or simulated transaction in the judged flow.

Local tests may use a mock USDC. Any demo-only fallback must be visibly labelled and excluded
from the mainnet product claim.

## Risks and Unknowns

- The actual hackathon deadline, team capacity, official submission page, and any sponsor SDK
  requirements were not supplied. They can change the feasible scope.
- The current HSK mainnet USDC contract, decimals, bridge behavior, liquidity, and redemption
  path must be verified on-chain immediately before implementation and deployment.
- A USDC-backed wrapper inherits USDC and bridge risks; “fully reserved” does not mean
  risk-free.
- Permissioned transfer rules can strand users if redemption is not designed as an explicit
  exception or supported route.
- Mainnet contracts handling value require an audit beyond hackathon testing before meaningful
  third-party deposits are encouraged.
- The product supplies issuance technology; it does not make the platform or its customers
  licensed stablecoin issuers.
- It is unknown whether judges expect a special HSK service beyond EVM deployment. HSP appears
  relevant to payments, but its onboarding and supported-token rules are not established by
  the stablecoin-track requirements supplied here. Treat HSP support as an optional later
  integration, not a claimed MVP feature.

## Decision

Proceed with the idea only in the narrowed form:

> **An issuer-facing HSK Chain product for creating USDC-reserve-backed, optionally
> permissioned stablecoins and distributing them through auditable payout campaigns.**

Do not proceed as a generic “any token is a stablecoin” factory or as an algorithmic stablecoin
protocol. The narrowed product is feasible, solves a clear issuer problem, visibly uses HSK
mainnet, and leaves room for institutional integrations after the hackathon.
