# Contract verification evidence

This file records the deterministic local evidence for issue #27. It is testing evidence, not an
audit or mainnet deployment claim. The default suite remains independent of public RPCs.

## Toolchain and deterministic configuration

- Foundry: `v1.7.1`
- Solidity: `0.8.30`
- Fuzz seed: `0x2700000000000000000000000000000000000000000000000000000000000027`
- Unit fuzz runs: `256`
- Stateful invariant runs: `256`
- Stateful invariant depth: `128` calls per run
- Stateful invariant revert policy: `fail_on_revert = true`

The invariant campaign targets ten handler actions across two independently factory-created
token/vault pairs. It exercises deposits, redemptions, holder transfers, excess-reserve donations,
coordinated pause transitions, and unauthorized supply, deposit, pause, unpause, and role actions.
After every call it checks pair and aggregate reserve coverage, holder/supply conservation,
token-vault isolation, immutable discovery records, and coordinated pause state.

## Reproduction commands

Run from the repository root:

```bash
forge fmt --root contracts --check
forge build --root contracts
forge test --root contracts \
  --no-match-contract ReserveCoverageInvariantTest \
  --fuzz-seed 0x2700000000000000000000000000000000000000000000000000000000000027
forge test --root contracts \
  --match-contract ReserveCoverageInvariantTest \
  --fuzz-seed 0x2700000000000000000000000000000000000000000000000000000000000027 \
  -vv
forge coverage --root contracts \
  --no-match-contract ReserveCoverageInvariantTest \
  --fuzz-seed 0x2700000000000000000000000000000000000000000000000000000000000027 \
  --report summary
forge snapshot --root contracts \
  --match-contract CriticalPathGasTest \
  --fuzz-seed 0x2700000000000000000000000000000000000000000000000000000000000027 \
  --check
```

## Recorded results

The invariant campaign passed `256` runs and `32,768` calls with `0` handler reverts or discards.
Every targeted selector executed more than 3,200 times in the recorded run.

### Coverage summary

| Production source       |           Lines |       Statements |       Branches |       Functions |
| ----------------------- | --------------: | ---------------: | -------------: | --------------: |
| `IssuerStablecoin.sol`  |  98.61% (71/72) |   95.18% (79/83) | 82.61% (19/23) | 100.00% (11/11) |
| `ReserveVault.sol`      | 90.48% (95/105) | 90.14% (128/142) | 69.57% (32/46) | 100.00% (11/11) |
| `ScaffoldStatus.sol`    |   100.00% (2/2) |    100.00% (1/1) |  100.00% (0/0) |   100.00% (1/1) |
| `StablecoinFactory.sol` |  94.74% (54/57) |   87.84% (65/74) |  40.00% (6/15) | 100.00% (12/12) |
| `VersionRegistry.sol`   | 100.00% (39/39) |   92.45% (49/53) |  63.64% (7/11) |   100.00% (8/8) |

The full instrumented report, including test harnesses, recorded 68.99% line, 65.16% statement,
37.20% branch, and 79.84% function coverage. Production contracts have 100% function coverage;
the lower full-report totals are expected because the invariant handler is deliberately excluded
from the coverage command and is verified separately by the stateful campaign.

### Critical-path gas snapshot

| Test path                     |     Gas |
| ----------------------------- | ------: |
| Create issuer pair            | 649,886 |
| Deposit reserve and mint      |  77,835 |
| Redeem stablecoin for reserve |  56,793 |

The checked-in `/.gas-snapshot` is the machine-readable source for these values. These are local
test-environment measurements, not HSK mainnet fee estimates.
