# Contracts static-analysis review

Reviewed on 2026-08-27 for the production contracts under `contracts/src`. This review is a
repeatable engineering check, not a substitute for an independent security audit.

## Reproduce the analysis

The hosted check pins Slither `0.11.6`, Solidity `0.8.30`, and the Slither action at its immutable
`v0.4.2` commit. From `contracts/`, the equivalent local command is:

```bash
slither . \
  --config-file slither.config.json \
  --compile-force-framework foundry \
  --foundry-out-directory out \
  --foundry-deny never \
  --json reports/slither-final.json
```

The configuration fails on any unsuppressed medium-or-higher finding, excludes imported
dependencies, and filters test and fork fixtures. The initial run reported 23 findings: five high,
three medium, ten low, and five informational. After review and remediation, the final report has
three informational findings and no high, medium, or low findings. See the
[machine-readable final report](./slither-final.json).

## Finding disposition

| Finding                        | Initial severity | Disposition and reachability review                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reentrancy-balance` (5)       | High             | Accepted false positives with narrow, reasoned suppressions. Both reserve balance-delta paths use the contract's custom `nonReentrant` lock. The before/after reads intentionally enforce exact reserve accounting and reject callback, fee-on-transfer, and rebasing behavior. Reentrancy and stateful reserve-invariant tests exercise this boundary. |
| `incorrect-equality` (1)       | Medium           | Accepted intentional equality with a one-line suppression. `received == reserveAmount` is the one-reserve-base-unit-to-one-token-base-unit backing invariant, not an unsafe numeric comparison.                                                                                                                                                         |
| Factory reentrancy (3)         | Medium/Low       | Accepted false positives with a scoped suppression. `creationLock` is set before both calls, their targets are fresh clones, and registration/event writes occur only after both initializers succeed. Any initializer failure reverts the entire transaction.                                                                                          |
| `uninitialized-local` (1)      | Medium           | Fixed by initializing `previousAccount` before role dispatch.                                                                                                                                                                                                                                                                                           |
| `shadowing-local` (7)          | Low              | Fixed by giving interface initializer parameters unambiguous names.                                                                                                                                                                                                                                                                                     |
| Vault pause event ordering (2) | Low              | Accepted false positives with a scoped suppression. Pause state changes before the paired, initialization-validated token call, so a callback cannot duplicate the transition or reorder its event.                                                                                                                                                     |
| Mixed pragma (1)               | Informational    | Fixed by pinning every production interface to Solidity `0.8.30`.                                                                                                                                                                                                                                                                                       |
| Inline assembly (1)            | Informational    | Accepted. The memory-safe block constructs and deploys the standard EIP-1167 minimal-proxy bytecode; clone creation verifies a nonzero result.                                                                                                                                                                                                          |
| Low-level calls (2)            | Informational    | Accepted. These are read-only capability probes. Both validate call success and returned-data length before decoding, and neither transfers value nor mutates the caller.                                                                                                                                                                               |

The high/medium accepted dispositions are proposed for team approval through the pull-request
review. They must not be treated as approved until the required reviewers accept the change.

## Dependency and compiler review

- Production Solidity sources have no third-party imports (`libs = []`) and carry MIT SPDX
  identifiers.
- Foundry is pinned to `v1.7.1` in CI (MIT OR Apache-2.0); Solidity is pinned to `0.8.30`; and
  Slither is pinned to `0.11.6` (AGPL-3.0).
- `pnpm audit --audit-level high` reported no known vulnerabilities with the frozen lockfile.
- The complete JavaScript dependency license inventory contains 110 MIT, 5 Apache-2.0,
  3 ISC, 2 BSD-2-Clause, 2 BSD-3-Clause, 2 MIT-0, 2 MPL-2.0, 1 BlueOak-1.0.0, and 1 CC0-1.0
  package group. Production-only groups are 16 MIT and 1 Apache-2.0.
- `forge build --root contracts --deny warnings` succeeds with Solidity `0.8.30` and no compiler
  warnings.

Dependency versions and integrity hashes remain authoritative in `pnpm-lock.yaml`; CI installs
them with `pnpm install --frozen-lockfile`.
