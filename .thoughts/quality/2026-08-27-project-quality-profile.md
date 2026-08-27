# Project Quality Profile: ReserveRail

Status: **Active after Phase 2 scaffold**
Date: **2026-08-27**

## Detected Stack

- pnpm `10.33.1` workspace with a committed lockfile.
- Node.js `>=22.12.0`; scaffold verified locally with Node.js `24.14.1`.
- Vite `8.2.2`, React `19.2.8`, TypeScript `6.0.3`, and Oxlint `1.80.0` web client.
- Prettier `3.9.6` for web formatting.
- Foundry `1.7.1` with pinned Solidity `0.8.30` for contracts.
- Static/read-only web architecture; no backend, database, indexer, or private startup secret.
- HSK JSON-RPC, Blockscout, USDC.e, and deployment state are read from checked manifests.
- Pull requests run three required GitHub Actions jobs with read-only permissions.

## Existing Commands

- `pnpm dev`: start the static web client.
- `pnpm format` / `pnpm format:check`: Prettier plus `forge fmt`.
- `pnpm lint`: Oxlint web sources.
- `pnpm typecheck`: TypeScript project build without emitting application output.
- `pnpm test`: Vitest configuration tests plus current Foundry tests.
- `pnpm contracts:build`: compile Solidity.
- `pnpm build`: typecheck and build web/contracts.
- `pnpm verify`: run every implemented local gate.

`test:invariant` and static security analysis are intentionally absent until real financial
contracts exist. A passing empty command would be a false quality gate.

## Required Local Checks

For contract changes:

- Solidity formatting.
- Clean compilation with warnings reviewed.
- Unit tests for changed behavior.
- Authorization negative tests.
- Relevant fuzz/invariant tests.
- Gas impact check for batch/distribution changes.

For web changes:

- Formatting and linting.
- Type checking.
- Unit/component tests for changed states.
- Production build.
- Manual wrong-network, wallet rejection and RPC-failure check when affected.

For documentation/configuration:

- Markdown/link check.
- Address and chain-ID review when mainnet evidence changes.
- Secret scan before commit.

## Required CI Gates

Implemented required check names for the `main` ruleset:

- `contracts-format-build-test`
- `web-lint-typecheck-test-build`
- `docs-links-and-secrets`

Add these only after they perform real work and pass on a pull request:

- `contracts-invariants`
- `contracts-static-analysis`
- `hsk-testnet-e2e`

Do not make a flaky public-RPC test a blocking check until retries, timeouts and deterministic
funding are designed. Mainnet-fork and testnet checks must clearly identify their source block
or deployment.

## Suggested Hooks

- Pre-commit: format only changed files, lint staged text/source, and scan staged content for
  obvious secrets.
- Pre-push: affected unit tests and type checking.
- Never rely on hooks as enforcement; CI is authoritative.
- Do not run the full invariant or end-to-end suite on every commit if it slows normal work;
  run it in CI and before security-sensitive PR submission.

## File Size Policy

- Target: 200 source lines.
- Warning: above 200 source lines.
- Hard cap: above 300 source lines unless generated or explicitly justified in the PR.
- Exclusions: generated ABIs/types, build output, vendored code, fixtures, lockfiles and
  framework output.
- Smart contracts should be split by responsibility well before the hard cap when doing so
  reduces privileged surface area or testing complexity.

## Commit Policy

- Conventional commits: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`, `security`.
- Include the GitHub issue number, for example:
  `feat(vault): gate minting by reserve deposit (#23)`.
- Keep commits reviewable and do not mix formatting sweeps with behavior changes.
- Use squash merge for normal PRs so `main` stays readable.
- Tag the exact commit used for HSK testnet and mainnet deployments.

## AGENTS.md Notes

When the implementation repository is scaffolded, repository instructions should require:

- No fake production data, receipts, balances or integrations.
- No mainnet write without an accepted issue, reviewed deployment manifest and explicit team
  confirmation.
- No destructive git operation or secret output.
- Contract invariants and authorization tests for financial changes.
- Current official documentation lookup for libraries and HSK configuration.
- Preservation of generated-file and dependency boundaries.

## Open Questions

- Foundry-only is selected unless a verified deployment/verification limitation requires
  another tool.
- Vite/React/TypeScript and pnpm are selected for the submission.
- Will the static web app require an indexer, or can RPC/event reads satisfy the MVP?
  Recommendation: no mandatory backend for the read-only and core transaction path.
- Which Slither and dependency-scanning versions should be pinned when financial contracts
  exist?
- Which HSK testnet funding mechanism is reliable enough for deterministic E2E tests?
