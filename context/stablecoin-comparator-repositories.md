# Stablecoin Comparator Repositories

Research snapshot: **2026-08-26**

The repositories below were shallow-cloned into the disposable directory
`/tmp/hsk-stablecoin-research.mf9Exk` and inspected at the listed commits. They were not copied
into the project workspace and are not dependencies of the proposed product.

## Comparison

| Repository | Inspected commit | Model and useful lesson | License / reuse boundary |
|---|---|---|---|
| [hashgraph/stablecoin-studio](https://github.com/hashgraph/stablecoin-studio) | `56e7ec0` (2026-06-29) | Closest product analogue: factory, reserve feed, modular roles, KYC/freeze/wipe/hold, multisig backend, SDK, CLI, and web app. Shows the full issuer control plane. | README states Apache-2.0 and subprojects contain license files, but no root `LICENSE` was present in the inspected clone and Solidity files use MIT SPDX identifiers. Treat source-level licensing carefully; use architecture ideas, not copied code. |
| [circlefin/stablecoin-evm](https://github.com/circlefin/stablecoin-evm) | `fc85788` (2026-08-12) | Production-style fiat token: master minter, bounded minters, pauser, blacklister, rescuer, proxy upgrades, EIP-2612 and EIP-3009. Best role-separation reference. | Apache-2.0. Reuse would require notices and security review; patterns are more valuable than forking the full legacy upgrade stack. |
| [paxosglobal/pyusd-contract](https://github.com/paxosglobal/pyusd-contract) | `c9ea767` (2026-02-09) | Trusted issuer model, supply controllers with rate limits, asset-protection freeze/wipe, pause, signed transfers, proxy upgrades, and published audits. | MIT. The repository represents one centrally issued token, not a multi-issuer factory. |
| [m0-platform/protocol](https://github.com/m0-platform/protocol) | `b42fe5b` (2025-06-05) | Governance-approved minters/validators, signed collateral updates, mint proposals, ratios, expiry, and penalties. Useful for collateral and separation-of-duty reasoning. | GPL-3.0. Do not copy into a permissively licensed product without accepting copyleft obligations. Too complex for the MVP. |
| [stellar/anchor-platform](https://github.com/stellar/anchor-platform) | `f8deadf` (2026-08-26) | Deposit, withdrawal, authentication, KYC exchange, quotes, events, and cross-border workflows. Best reference for off-chain operational rails around issued assets. | Apache-2.0. Non-EVM and backend-heavy; adapt the lifecycle concepts, not the implementation. |
| [TokenySolutions/T-REX](https://github.com/TokenySolutions/T-REX) | `f139012` (2025-10-28) | ERC-3643 identity registries, trusted claims, modular compliance, country/balance/supply/transfer limits, freeze, forced transfer, and recovery. | GPL-3.0 and explicitly deprecated in favor of [ERC-3643/ERC-3643](https://github.com/ERC-3643/ERC-3643). Concepts only for this project. |
| [mento-protocol/mento-core](https://github.com/mento-protocol/mento-core) | `07ecf3d` (2026-06-16) | Hybrid overcollateralized stable assets with reserve, broker, pricing modules, oracles, circuit breakers, and trading limits. Demonstrates the scope of an actual peg mechanism. | Business Source License 1.1; production use is restricted until its change date. Not an MVP base and not currently open source under the OSI definition. |
| [LogeswaranA/xsynprotocol](https://github.com/LogeswaranA/xsynprotocol) | `8cf1220` (2022-12-19) | Hackathon-winning crypto-collateralized synthetic USD with price oracle, debt pool, collateral ratio, and exchange. Lesson: a clear mechanism and complete story can win. | Apache-2.0. Prototype code; the submission itself defers burning, liquidation, ratio maintenance, governance, and periodic checks. Do not treat as production-ready. |
| [yc5915/make-crypto-mobile-hackathon](https://github.com/yc5915/make-crypto-mobile-hackathon/tree/Proof-of-Deposit/proof_of_deposit) | `5aba889` on `Proof-of-Deposit` (2021-11-28) | Second-place Celo project integrating stablecoins into block rewards and governance with contracts, analysis, and a web app. Lesson: make the chain-specific innovation demonstrable. | No license file was found in the inspected branch. Do not copy code. The submission also mentions patent applications around modifications. |

## Clone Commands

Use a fresh temporary directory when refreshing the research:

```bash
git clone --depth 1 https://github.com/hashgraph/stablecoin-studio.git
git clone --depth 1 https://github.com/circlefin/stablecoin-evm.git
git clone --depth 1 https://github.com/paxosglobal/pyusd-contract.git
git clone --depth 1 https://github.com/m0-platform/protocol.git
git clone --depth 1 https://github.com/stellar/anchor-platform.git
git clone --depth 1 https://github.com/TokenySolutions/T-REX.git
git clone --depth 1 https://github.com/mento-protocol/mento-core.git
git clone --depth 1 https://github.com/LogeswaranA/xsynprotocol.git
git clone --depth 1 --branch Proof-of-Deposit \
  https://github.com/yc5915/make-crypto-mobile-hackathon.git
```

## Reverse-Engineering Rule

For this project, “reverse engineering” means extracting product boundaries, actor models,
invariants, workflows, and test ideas. It does **not** mean deleting branding from an existing
repository or copying contracts without license and security analysis.

The cleanest implementation path is a small original contract system built on maintained
OpenZeppelin primitives, with every borrowed idea traceable to a requirement and every copied
line, if any, reviewed for license compatibility.
