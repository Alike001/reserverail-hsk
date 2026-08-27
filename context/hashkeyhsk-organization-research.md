# Reality Research: HashkeyHSK GitHub Organization

## Scope

This brief answers: what does the public `HashkeyHSK` organization contain, what role do its
repositories appear to play in the HSK Chain ecosystem, and what important technical or
organizational information is not present there?

The scope is the 12 public repositories visible on 2026-08-26, their default branches,
recent public commit history, repository metadata, and directly related official HSK Chain
sources. It is a current-reality brief, not a security audit or implementation plan.

## Sources Checked

- [`HashkeyHSK` organization](https://github.com/HashkeyHSK) metadata and all public repository
  metadata through the GitHub API.
- Shallow clones of all 12 public repositories, including tracked files, manifests, READMEs,
  contract sources, workflows, configuration, and latest commits.
- Current official website content stored in
  [`official-web-data`](https://github.com/HashkeyHSK/official-web-data).
- The public documentation source in
  [`documentation`](https://github.com/HashkeyHSK/documentation) and the current
  [live documentation](https://docs.hskchain.net/).
- The separate [`HSKChain`](https://github.com/HSKChain) organization and its
  [`fullnode-sync`](https://github.com/HSKChain/fullnode-sync) repository.
- Exact commit snapshots and reproduction commands are recorded in [sources.md](./sources.md).

## Verified Facts

### Organization identity and inventory

- GitHub identifies the organization as **HashKey Chain Eco Lab**, located in Hong Kong.
- It was created on 2024-10-25 and exposed **12 public repositories** on the research date.
- None of those 12 repositories was marked archived.
- No GitHub Releases were published in any of the 12 repositories at the time checked.
- GitHub detected a repository-level license for only two repositories:
  `documentation` (MIT) and `agentkit` (Apache-2.0/other-detected). Most other repositories
  had no detected license file. A README badge or statement is not a substitute for a
  repository license file.
- The organization profile itself has no public description or website URL in its GitHub
  metadata.

### The organization is not the complete chain implementation

- No default branch in `HashkeyHSK` contains the HSK Chain execution client, rollup node,
  sequencer implementation, canonical bridge implementation, or complete protocol deployment
  source.
- The public node setup is maintained separately at
  [`HSKChain/fullnode-sync`](https://github.com/HSKChain/fullnode-sync). Its inspected metadata
  describes Docker Compose scripts for syncing an HSK Chain full node and identifies Shell as
  the primary language.
- The `documentation` repository itself points node operators to that separate full-node
  repository and configures OP Stack components such as `op-geth` and `op-node`.

### Current naming and positioning

- An official website announcement dated 2026-07-13 says **HashKey Chain was rebranded as HSK
  Chain**. The stated strategic emphasis is stablecoins, RWAs, and institutional-grade DeFi.
  Source: [`rebranding.md`](https://github.com/HashkeyHSK/official-web-data/blob/main/news/20260713/rebranding.md).
- The GitHub organization name, several repository names, package identifiers, documentation
  titles, and comments still use the older “HashKey Chain” or “Hashkey” naming.

### What the public repositories actually cover

The contents fall into five observable groups:

1. **Official web and documentation content**
   - `official-web-data` supplies English website copy, announcements, ecosystem entries,
     images, partner assets, and a MiCA PDF.
   - `documentation` is a Next.js/MDX documentation application containing onboarding,
     network, wallet, bridge, oracle, Safe, KYC, fee, node, blockchain-learning, and HSP
     material.

2. **Network usage analytics**
   - `hsk-data-report` contains a Python data pipeline, tests, labels, cached RPC-derived data,
     CSV summaries, and a static HSK gas-growth report.
   - Its tool documentation defines gas revenue from Blockscout’s transaction fee field with
     a `gas_used * gas_price` fallback. The committed report snapshot covers March/April 2026
     analysis and contains thousands of generated data files.

3. **Staking products**
   - `whale-staking` contains upgradeable HSK staking contracts, Hardhat tooling, extensive
     operator scripts, tests, and bilingual documentation.
   - `hashkey-hodlium` is a Next.js staking interface that connects to configured contracts on
     chain IDs 133 and 177 and includes staking, portfolio, event-history, and veHSK surfaces.

4. **Developer experiments and application tooling**
   - `agentkit` is a large Python/TypeScript codebase derived from Coinbase AgentKit history.
     HashKey commits added HSK mainnet/testnet identifiers, WHSK actions, ERC-20 mappings,
     HashKey-specific WOW actions, templates, and `@hashkeychain/*` package names.
   - `Wow-contract` is a Foundry Solidity project for a token factory/market flow using
     Uniswap-style liquidity and protocol reward contracts. Its tracked deployment broadcast
     targets chain ID 133.

5. **Community and media operations**
   - The two hackerhouse/hackathon repositories contain only submission instructions and
     project README templates; no submitted project directories are present on their current
     default branches.
   - `developers` is a minimal repository whose substantive files are GitHub Discussion forms
     for grants applications.
   - `Brand-Kit` contains 12 image/SVG assets.
   - `static` is empty.

### RWA evidence in the organization is primarily published content

`official-web-data` contains issuer-published announcements for several RWA initiatives,
including:

- Asseto’s AoABT fund product, announced as deployed on the chain in May 2025.
- GF Securities (Hong Kong)’s `GF Token`, described as a tokenized security with HashKey Group
  businesses supporting tokenization and professional-investor distribution.
- A Paimon Finance SpaceX SPV token announcement.
- Silver-backed tokens, described in March 2026 as one token per troy ounce of physical silver
  for professional investors.

These files are announcements and disclaimers, not the implementation repositories for those
products. The Asseto announcement explicitly states that the chain is the technical
infrastructure provider and that asset authenticity, custody, pricing, and compliance remain
the responsibility of the issuer and its service providers.

### Public documentation and the live documentation are not identical snapshots

- The inspected `documentation` default branch was last pushed on 2026-06-22.
- Its tracked documentation tree does not contain several pages visible on the current live
  site, including the August 2026 Jovian network-upgrade notice and the current token-contract
  reference page.
- Therefore, the GitHub documentation repository cannot be assumed to be the exact source of
  the presently deployed documentation site.

### Published ecosystem data needs interpretation

- `official-web-data/ecosystem/en.json` contains **35 project entries** across 26 distinct
  category strings.
- Those entries are a website directory. They do not, by themselves, prove a live deployment,
  active integration, security review, formal partnership, or endorsement.
- The same file contains display statistics such as `1.2B` active wallets, `1.2M`
  transactions, and a `99.9%` security score. The repository provides no methodology or source
  for those values, and the wallet/transaction values are internally implausible as a pair.
  They should not be cited as network metrics without independent verification.

## Inferences

- `HashkeyHSK` functions primarily as an **ecosystem/product/community publishing
  organization**, rather than as the canonical home of every HSK Chain protocol component.
- `official-web-data` appears to act as a content/data backend for the public website because
  it contains page-localization JSON, news content, ecosystem listings, and media assets but
  no website application runtime.
- Public engineering maturity is uneven: `whale-staking`, `agentkit`, and `documentation`
  contain substantial code, while several repositories are placeholders, content stores, or
  event templates.
- `agentkit` appears to be a HashKey-adapted downstream copy of Coinbase AgentKit rather than a
  clean-room SDK. The preserved Coinbase structure and commit history support this inference.
- `hashkey-hodlium` and `whale-staking` are related staking surfaces, but the public files do
  not establish a canonical production deployment relationship between every address and
  contract version mentioned across their READMEs/configuration.

## Unknowns And Questions

- Which organization and repositories are canonical for the sequencer, bridge contracts,
  fault-proof contracts, genesis configuration, and production protocol deployments?
- How are the public `documentation` repository and the live documentation deployment synced?
- Which of the 35 ecosystem directory entries are currently deployed on HSK Chain, and what
  criteria are required for listing?
- Are the `@hashkeychain/agentkit` packages still published and supported? The repository has
  no release objects and no public commits after April 2025.
- What is the intended production status of `Wow-contract`? Its README still identifies the
  upstream project as Fishcake Contracts and no repository license file is present.
- Where are the independent audit reports for the staking contracts? The READMEs make testing
  and audit claims, but no audit report is tracked in the inspected repositories.
- Which staking addresses are canonical? `hashkey-hodlium` configuration, its README, and the
  separate contract repository link do not present one consistent address set.
- What are the owners, multisig thresholds, timelocks, upgrade administrators, and emergency
  powers for production contracts?
- Why do most public repositories lack detected open-source licenses?
- Are the committed `hsk-data-report` labels and generated summaries reviewed or signed off by
  the organization, and what process resolves the rows marked `Needs Review` or `Unlabeled`?

## Not Included

- No smart-contract security audit, exploit analysis, or formal verification was performed.
- No deployed contract address was endorsed as safe or canonical.
- No RWA legal structure, license, reserve, custodian, or issuer claim was independently
  validated.
- No third-party ecosystem project was audited.
- No repository was modified, built, deployed, or published during this research.
- No implementation plan or proposed architecture is included.

