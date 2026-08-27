# HashkeyHSK Repository Index

Snapshot date: **2026-08-26**  
Organization: [`HashkeyHSK`](https://github.com/HashkeyHSK)  
Public repositories inspected: **12**

“Observed role” below describes what is present in the default branch; it is not an official
support or production-status designation.

| Repository | Observed role and evidence | Latest inspected commit | License detected | Current-reality notes |
|---|---|---:|---|---|
| [`official-web-data`](https://github.com/HashkeyHSK/official-web-data) | Website localization JSON, ecosystem directory, news Markdown, partner/media assets, and MiCA PDF | `bd224222` — 2026-08-21 | None | Most recently active repo. Contains the July 2026 HSK Chain rebrand and August gas-fee announcement. It is content/data, not the website runtime. |
| [`documentation`](https://github.com/HashkeyHSK/documentation) | Next.js 15 + React 19 + MDX documentation site; network, tools, KYC, bridge, oracle, Safe, fees, nodes, HSP, and learning content | `64ac1088` — 2026-06-22 | MIT | Substantial docs app. Public tree is behind/divergent from parts of the live site. README still contains a `[LICENSE_TYPE]` placeholder even though `LICENSE` is MIT. |
| [`hsk-data-report`](https://github.com/HashkeyHSK/hsk-data-report) | Python Blockscout/RPC gas-fee attribution pipeline, unit tests, contract labels, generated CSVs, cached metadata, and static HTML report | `c66a23df` — 2026-05-14 | None | 6,400+ generated output files; report tooling is documented. Many report rows remain unlabeled or marked for review. |
| [`hashkey-hodlium`](https://github.com/HashkeyHSK/hashkey-hodlium) | Next.js staking dApp with wagmi/viem/ethers, Apollo, contract event history, staking/portfolio pages, and veHSK minting | `7d4badca` — 2026-02-11 | None | Config includes testnet 133 and mainnet 177 addresses. README address table differs from current config and points to a contract repo outside the organization. No CI workflow is tracked. |
| [`whale-staking`](https://github.com/HashkeyHSK/whale-staking) | Hardhat 3 / Solidity upgradeable HSK staking system with fixed lock, early-exit penalty, reward pool, whitelist, pause/emergency controls, scripts, and extensive tests/docs | `35728f21` — 2025-12-16 | None | Most complete public contract project in this org. Address constants are left blank/TODO and can be supplied by environment variables. README claims an audit, but no report is tracked. |
| [`agentkit`](https://github.com/HashkeyHSK/agentkit) | HashKey-adapted Python/TypeScript Coinbase AgentKit codebase with WHSK, HSK network mappings, ERC-20/WOW actions, LangChain, Vercel AI SDK, MCP, and example apps | `f06f0669` — 2025-04-17 | Apache-2.0 detected as “Other” | 979 tracked files and extensive inherited CI. No commits after the short HashKey adaptation series in April 2025; no GitHub Releases. Some package metadata points to a personal repository rather than this org. |
| [`Wow-contract`](https://github.com/HashkeyHSK/Wow-contract) | Foundry Solidity token factory/market contracts using Uniswap-style pools and protocol reward distribution | `b611b168` — 2025-04-08 | None | Tracked broadcast shows deployment activity on testnet chain 133. README calls it “Fishcake Contracts,” links to another organization, and advertises Apache-2.0 without a tracked license file. |
| [`2025-Hackathon-Taiyi-Seoul`](https://github.com/HashkeyHSK/2025-Hackathon-Taiyi-Seoul) | Hackathon submission instructions and project README template | `916d1c2a` — 2025-03-28 | None | Default branch contains one file and no submitted `projects/` content. |
| [`2024-Hackerhouse-Taichu-HongKong`](https://github.com/HashkeyHSK/2024-Hackerhouse-Taichu-HongKong) | Hackerhouse submission instructions and project README template | `507bf075` — 2024-12-20 | None | Default branch contains one file and no submitted `projects/` content. |
| [`Brand-Kit`](https://github.com/HashkeyHSK/Brand-Kit) | HSK, HashKey Chain, and HashKey Group raster/SVG brand assets | `7b1ac4e` — 2024-12-17 | None | 12 tracked assets, including `.DS_Store`; no README or usage/license terms. Predates the 2026 HSK Chain rebrand. |
| [`developers`](https://github.com/HashkeyHSK/developers) | Host repository for GitHub Discussion grant-application forms | `457bfe13` — 2024-10-28 | None | README contains only a heading. Three forms collect grant, project, wallet, KYC, audit, budget, and milestone information. |
| [`static`](https://github.com/HashkeyHSK/static) | Empty repository | No commits | None | GitHub reports the repository but its default branch has no commits or tracked files. |

## Repository Groups

### Use first for current ecosystem research

- `official-web-data` — announcements, named initiatives, website directory, rebrand history.
- `documentation` — developer concepts and integration guides, with live-site cross-checking.
- `hsk-data-report` — a point-in-time view of transaction fee attribution and activity labels.

### Use for staking-product research

- `whale-staking` — contract and operator logic.
- `hashkey-hodlium` — user-facing staking application and configured integration addresses.

Read them together, but do not assume their documentation and addresses describe the same
deployed contract generation.

### Use for agent/token-launch experiments

- `agentkit` — natural-language/on-chain agent tooling adapted for HSK Chain.
- `Wow-contract` — token factory and market contracts used by the AgentKit WOW provider.

Both have been inactive since April 2025 and require dependency, deployment, address, and
support-status verification before reuse.

### Historical/community-only context

- `2024-Hackerhouse-Taichu-HongKong`
- `2025-Hackathon-Taiyi-Seoul`
- `developers`
- `Brand-Kit`
- `static`

## Cross-Repository Facts

- Mainnet chain ID appearing in code/docs: **177**.
- Testnet chain ID appearing in code/docs: **133**.
- Native gas token: **HSK**.
- Current network name: **HSK Chain**; older source uses **HashKey Chain**.
- Current public node tooling is outside this organization:
  [`HSKChain/fullnode-sync`](https://github.com/HSKChain/fullnode-sync).
- No GitHub Release objects were found for these 12 repositories.
- Only `documentation` and `agentkit` had detected repository licenses.

