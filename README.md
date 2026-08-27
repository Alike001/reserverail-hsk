# ReserveRail

> Launch a branded stablecoin backed 1:1 by USDC.e, distribute it on HSK Chain, and let holders verify the reserve or redeem their tokens.

**HSK Stablecoins track:** ReserveRail turns HSK Chain into an issuer rail for the complete stablecoin lifecycle—not only token creation.

```text
Deposit USDC.e → Mint the same amount → Distribute → Redeem 1:1
```

ReserveRail is an unaudited, low-value hackathon pilot. The product and contract lifecycle are implemented, and a complete ten-transaction rehearsal is deployed on HSKChain Testnet. The checked mainnet manifest remains **undeployed**, so the hosted product does not present testnet state as mainnet evidence or substitute fabricated balances, addresses, or receipts.

## Run It in 30 Seconds

**Hosted product:** [https://alike001.github.io/reserverail-hsk/](https://alike001.github.io/reserverail-hsk/)

The reviewed GitHub Pages workflow publishes this URL only from changes merged to `main`. The
site is live over HTTPS; contract-writing actions remain disabled while the checked HSK mainnet
manifest is undeployed.

Prerequisites: Node.js 22.12+, pnpm 10.33.1, Foundry 1.7+, and MetaMask.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite, connect MetaMask, and use the built-in network switcher. No private key or application secret is required to inspect the product. Contract-writing actions remain disabled until reviewed deployment addresses are committed.

## What Judges Can Inspect

- **Issuer path:** create a branded issuer pair, deposit reserve, and mint only against deposited backing.
- **Holder path:** transfer tokens, request redemption, and inspect the resulting wallet transaction.
- **Control path:** display operational roles and emergency controls without hiding privileged behavior.
- **Proof path:** expose deployment status, reserve coverage, policy, contract addresses, and explorer evidence from one public route.
- **Truthful failure states:** rejected wallet requests, wrong networks, missing roles, and undeployed contracts are shown as errors—not converted into fake success.

## Why HSK Chain

The application targets HSK Chain mainnet (chain ID `177`) and uses HSK as its gas token. Its configured reserve asset is the six-decimal bridged USDC (`USDC.e`) at [`0x054ed45810DbBAb8B27668922D110669c9D88D0a`](https://hashkey.blockscout.com/address/0x054ed45810DbBAb8B27668922D110669c9D88D0a). Testnet rehearsal uses HSK Chain testnet (chain ID `133`) before any low-value mainnet pilot.

| Network           | Chain ID | RPC                       | Explorer                                             |
| ----------------- | -------: | ------------------------- | ---------------------------------------------------- |
| HSK Chain         |    `177` | `https://mainnet.hsk.xyz` | [Blockscout](https://hashkey.blockscout.com)         |
| HSK Chain Testnet |    `133` | `https://testnet.hsk.xyz` | [Testnet explorer](https://testnet-explorer.hsk.xyz) |

The checked network values and live-RPC preflight are documented in [HSK Chain and USDC.e preflight](./docs/hsk-mainnet-preflight.md). The mainnet application reads addresses only from the reviewed [deployment manifest](./config/deployments/hsk-mainnet.json).

### Verified HSKChain Testnet rehearsal

The reviewed deployment at source commit `ec3dfcd058e389a3f8168b3931396a116ef17263`
completed ten successful HSKChain Testnet transactions. It deployed the reusable platform and one
pilot pair, then deposited `100 tUSDC` and minted exactly `100 rrtUSD`.

- Factory: [`0x6a613aDfF0aec888E2991c51Bc7E2F13582Dac45`](https://testnet-explorer.hsk.xyz/address/0x6a613aDfF0aec888E2991c51Bc7E2F13582Dac45)
- Pilot token: [`0x6B4a40eEA31B5d6d343c2283ddDF0793523fA44C`](https://testnet-explorer.hsk.xyz/address/0x6B4a40eEA31B5d6d343c2283ddDF0793523fA44C)
- Pilot vault: [`0xDFc5332F675584603e0f845Ad59C91620b814365`](https://testnet-explorer.hsk.xyz/address/0xDFc5332F675584603e0f845Ad59C91620b814365)
- Final deposit/mint: [`0x792ce5dde99e23098e6ea1a5beccd6e888ec293db76588a5bd6797f025461b5f`](https://testnet-explorer.hsk.xyz/tx/0x792ce5dde99e23098e6ea1a5beccd6e888ec293db76588a5bd6797f025461b5f)

The test reserve is an explicitly labeled, valueless `tUSDC` contract. It is not bridged USDC.e,
cannot be redeemed for money, and is not evidence of a funded HSK mainnet pilot. See the complete
[testnet deployment record](./docs/hsk-testnet-deployment.md) and
[machine-readable manifest](./config/deployments/hsk-testnet.json).

## Architecture

```text
Issuer / operator
       │
       ▼
StablecoinFactory ──reads active version──▶ VersionRegistry
       │
       ├──creates──▶ IssuerStablecoin
       └──creates──▶ ReserveVault ──holds──▶ USDC.e
                              │
                    deposit / mint / redeem
                              │
                              ▼
                            Holder
```

Each issuer receives an isolated stablecoin and reserve vault. The factory discovers approved implementation versions through the registry. The vault enforces the central reserve rule: issued supply must not exceed backing, and redemption burns issuer tokens as reserve is returned. See [contract architecture](./docs/contract-architecture.md) and the [threat model](./docs/threat-model.md).

## Verification

Run the complete local quality gate:

```bash
pnpm verify
```

Or run individual checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Pull requests must pass web lint/typecheck/test/build, Foundry formatting/build/tests, documentation links, and full-history secret scanning before the repository owner merges them into protected `main`.

## Evidence and Project Documents

- [Stablecoins-track requirements and judging evidence](./docs/hackathon-requirements.md)
- [HSK mainnet preflight](./docs/hsk-mainnet-preflight.md)
- [Verified HSK testnet deployment](./docs/hsk-testnet-deployment.md)
- [HSK USDC.e fork proof](./docs/hsk-usdce-fork-proof.md)
- [Contract architecture](./docs/contract-architecture.md)
- [Threat model](./docs/threat-model.md)
- [Interaction wireframe](./docs/interaction-wireframe.md)
- [Product specification](./.thoughts/specs/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [Demo Day showcase and rehearsal script](./docs/demo-day-showcase.md)
- [Research context](./context/README.md)

Mainnet deployment addresses, funded lifecycle receipts, and a demo video will be added only after those artifacts exist and have been reviewed. The hosted product and testnet rehearsal evidence above are already public.

## Security and Limitations

- ReserveRail is **unaudited** and is not presented as production-ready or endorsed by HashKey.
- USDC.e is a bridged asset and carries bridge, issuer, custody, smart-contract, and depeg risk.
- Administrative, reserve-operator, and pauser roles are privileged and must be protected.
- Mainnet operation is intentionally limited to a small pilot after testnet rehearsal and review.
- Optional allowlists and Merkle claims are not part of the required pilot path unless their implementations and evidence are shipped.

## Team

- [Alike001](https://github.com/Alike001) — repository owner and sole merger
- [EcstaceeLOR](https://github.com/EcstaceeLOR) — contracts and deployment
- [Webghost01-NG](https://github.com/Webghost01-NG) — product, testing, and demo

All changes use an issue, a focused branch, a reviewed pull request, and passing CI before merge.
