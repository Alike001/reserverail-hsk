# ReserveRail

> Launch a branded stablecoin backed 1:1 by USDC.e, distribute it on HSK Chain, and let holders verify the reserve or redeem their tokens.

**HSK Stablecoins track:** ReserveRail turns HSK Chain into an issuer rail for the complete stablecoin lifecycle—not only token creation.

```text
Deposit USDC.e → Mint the same amount → Distribute → Redeem 1:1
```

ReserveRail is an unaudited, low-value hackathon pilot. The product and contract lifecycle are implemented, but the checked mainnet manifest is still marked **undeployed**. The interface never substitutes fabricated balances, addresses, or transaction receipts while deployment evidence is unavailable.

## Run It in 30 Seconds

**Hosted product:** [https://alike001.github.io/reserverail-hsk/](https://alike001.github.io/reserverail-hsk/)

The GitHub Pages workflow publishes this URL only from reviewed changes merged to `main`. Until
the first successful Pages deployment is visible, use the local startup path below and do not
present the URL as live evidence.

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
- [HSK USDC.e fork proof](./docs/hsk-usdce-fork-proof.md)
- [Contract architecture](./docs/contract-architecture.md)
- [Threat model](./docs/threat-model.md)
- [Interaction wireframe](./docs/interaction-wireframe.md)
- [Product specification](./.thoughts/specs/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [Demo Day showcase and rehearsal script](./docs/demo-day-showcase.md)
- [Research context](./context/README.md)

Verified deployment addresses, transaction receipts, hosted product URL, and demo video will be added only after those artifacts exist and have been reviewed.

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
