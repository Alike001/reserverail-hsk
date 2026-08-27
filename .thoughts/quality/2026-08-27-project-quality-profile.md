# Project Quality Profile: ReserveRail

Status: **Provisional before scaffold**  
Date: **2026-08-27**

## Detected Stack

The current workspace contains research, specification and planning Markdown only. There is no
application manifest, contract project, test suite or CI configuration to inspect yet.

Proposed stack to validate during scaffold:

- Solidity contracts with Foundry.
- Maintained OpenZeppelin contract dependencies.
- TypeScript web application built as a static client where practical.
- HSK JSON-RPC and Blockscout integration.
- A package manager with a committed lockfile; select one and use it consistently.
- GitHub Actions for required checks.

This profile must be regenerated after manifests and scripts exist. Proposed commands below
must not be described as existing until the scaffold implements them.

## Existing Commands

None.

The scaffold should expose one repository-level command for each of these behaviors:

- `format`
- `lint`
- `typecheck`
- `test`
- `test:invariant`
- `security`
- `build`
- `dev`
- `verify`

The exact command runner will be chosen with the monorepo structure.

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

Target required check names for the `main` ruleset:

- `contracts-format-build-test`
- `contracts-invariants`
- `contracts-static-analysis`
- `web-lint-typecheck-test-build`
- `docs-links-and-secrets`

After an end-to-end environment exists, add:

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

- Foundry-only contracts or Hardhat plus Foundry?
  Recommendation: Foundry-only unless a verified deployment/verification need requires
  another tool.
- Which web framework and package manager will the team already be fastest with?
- Will the static web app require an indexer, or can RPC/event reads satisfy the MVP?
  Recommendation: no mandatory backend for the read-only and core transaction path.
- Which Slither and dependency-scanning versions will CI pin?
- Which HSK testnet funding mechanism is reliable enough for deterministic E2E tests?
