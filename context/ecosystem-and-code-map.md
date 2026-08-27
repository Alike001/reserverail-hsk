# HSK Chain Ecosystem And Code Map

This map separates the blockchain, the public repositories, HashKey’s surrounding financial
services, and third-party ecosystem listings. That separation is necessary because they have
different operators, trust assumptions, and evidence.

## Ecosystem Map

```text
HashKey / HSK financial ecosystem
│
├── HSK Chain public network
│   ├── Ethereum Layer 2 / OP Stack configuration
│   ├── Native gas token: HSK
│   ├── Mainnet chain ID: 177
│   └── Testnet chain ID: 133
│
├── Core/node engineering (separate GitHub organization)
│   └── HSKChain/fullnode-sync
│
├── HashkeyHSK organization researched here
│   ├── Public website content: official-web-data
│   ├── Developer documentation: documentation
│   ├── Usage analytics: hsk-data-report
│   ├── Staking contracts: whale-staking
│   ├── Staking UI: hashkey-hodlium
│   ├── Agent tooling: agentkit
│   ├── Token-launch contracts: Wow-contract
│   └── Grants, events, and brand assets
│
├── HashKey/partner financial services described in announcements
│   ├── Tokenization consultation and technology
│   ├── Licensed/professional-investor distribution
│   ├── Custody and traditional account channels
│   └── Issuers, advisers, trustees, vaults, and coordinators
│
└── Third-party ecosystem directory
    └── 35 listed projects across wallets, DeFi, infra, gaming, AI, etc.
```

## What Each Layer Proves

| Layer | What public evidence can establish | What it does not establish |
|---|---|---|
| HSK Chain network/docs | Network IDs, RPC/tooling instructions, fee model, integration interfaces | That every financial product is compliant, solvent, or safe |
| `HSKChain/fullnode-sync` | Public node synchronization configuration and OP Stack component usage | Complete production governance, sequencer ownership, or all canonical contracts |
| `HashkeyHSK` code | Contents and behavior of the published app, contract, analytics, and documentation snapshots | That code is deployed, audited, supported, or identical to production |
| Official announcements | What HSK Chain/HashKey says was launched or supported | Independent confirmation of reserves, legal rights, performance, licenses, or current availability |
| Ecosystem JSON | Projects selected for display on the official website | Deployment, endorsement, active integration, audit, or partnership depth |

## RWA Flow Reflected In Published Material

The repository announcements describe a recurring institutional RWA pattern:

```text
Asset or financial strategy
        ↓
Issuer defines legal claim and eligibility
        ↓
Tokenization provider creates contracts and issuance workflow
        ↓
HSK Chain records issuance, transfers, and/or settlement
        ↓
Custodian / securities account / professional-investor wallet holds the claim
        ↓
Licensed distributor or participating institution handles access
```

Examples represented in `official-web-data` include a fund strategy (AoABT), tokenized
securities (`GF Token`), an SPV-linked product, and silver-backed tokens. In all cases, chain
records are only one layer. Legal enforceability, asset existence, custody, investor
eligibility, pricing, and redemption depend on issuers and service providers outside the
blockchain.

## Public Code Surfaces

### Documentation surface

`documentation` contains:

- Developer quick start and network information.
- Wallet, explorer, faucet, bridge, oracle, Safe, KYC, subgraph, and fee guides.
- Full-node setup references using `op-geth`/`op-node`.
- General Ethereum/blockchain learning material.
- A pre-1.0 HSP (HashKey Settlement Protocol) guide describing mandates, attestations,
  compliant-payment examples, and verifiable receipts.

The live docs must be checked alongside the repository because the deployed site has newer
pages than the inspected public default branch.

### Staking surface

`whale-staking` publishes the clearest contract architecture in this organization:

- Upgradeable transparent proxy.
- Fixed 365-day lock in the documented product configuration.
- Configurable rewards and maximum stake.
- Early withdrawal request/wait flow and penalty pool.
- Whitelist, pause, emergency, ownership-transfer, and upgrade operations.
- Hardhat scripts for deployment, verification, queries, multisig calldata, and administration.
- Unit, integration, E2E, performance, stress, and gas-oriented tests.

`hashkey-hodlium` supplies the related user-facing interaction patterns, but public address
sets are inconsistent across its config and README. Production use requires explorer-level
verification of the intended contracts and their proxy/admin state.

### Agent and token-launch surface

`agentkit` preserves Coinbase AgentKit’s multi-language architecture and adds HSK-specific
network and action support. Observable additions include:

- `hashkey-mainnet` / `hashkey-testnet` network names mapped to 177 / 133.
- WHSK wrap/unwrap actions.
- HSK-network ERC-20 mappings.
- WOW token actions on HSK networks.
- `@hashkeychain/agentkit`, LangChain, Vercel AI SDK, and MCP package/template names.

`Wow-contract` supplies the paired Solidity token-factory/market implementation and a tracked
testnet deployment broadcast. Both repositories stopped receiving public commits in April
2025, so their present package availability and production status remain unknown.

### Analytics surface

`hsk-data-report` is reproducible analytics tooling rather than chain protocol code. It:

- Fetches or imports Blockscout/RPC transaction data.
- Normalizes transaction fees, values, methods, contracts, and senders.
- Attributes contracts to projects using a manually maintained labels CSV.
- Produces monthly, contract, project, method, sender, and growth summaries.
- Generates a static HTML report and retains resumable chunk metadata.

Its generated outputs should be treated as a dated analysis dataset. Labels marked
`Unlabeled` or `Needs Review` show that attribution is incomplete.

## Important Repository Boundaries

The `HashkeyHSK` organization does **not** currently provide a single, coherent public source
for:

- Complete rollup protocol and sequencer implementation.
- Canonical production bridge and KYC contract source/deployments.
- Production upgrade/admin/timelock ownership across all contracts.
- Custody, exchange, or banking-rail implementation.
- RWA legal agreements, reserve records, or issuer books.
- A verified registry proving the operational status of every ecosystem project.

Those boundaries should remain explicit in any future specification, integration, or risk
assessment.

## Suggested Reading Order For Future Work

1. Start with the current [live HSK Chain documentation](https://docs.hskchain.net/).
2. Use `official-web-data` for dated announcements and naming history.
3. Use `documentation` for inspectable MDX/source, while noting live-site divergence.
4. Inspect `HSKChain/fullnode-sync` for current node configuration.
5. For staking, read `whale-staking` contracts before the `hashkey-hodlium` UI.
6. Treat addresses as untrusted until matched against current official docs and explorers.
7. Treat marketing, README test claims, and ecosystem listings as claims requiring separate
   validation when money, security, or compliance decisions depend on them.

