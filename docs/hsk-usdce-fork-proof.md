# HSK Mainnet USDC.e Fork Proof

Status: **Passed against pinned mainnet state**
Verification date: **2026-08-27**

This proof exercises the real bridged USDC proxy at a historical HSK mainnet block. It changes
only an ephemeral local fork. It does not send a mainnet transaction and is not an audit of
USDC.e, its proxy administrator, issuer controls, or bridge.

## Fixed inputs

| Field                   | Value                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| HSK chain ID            | `177`                                                                |
| RPC                     | `https://mainnet.hsk.xyz`                                            |
| Block                   | `26,722,885`                                                         |
| Block hash              | `0x1f295b685280c636768d06a518e0425fdc30d18eee8d7184a275017bfe3dec81` |
| USDC.e proxy            | `0x054ed45810DbBAb8B27668922D110669c9D88D0a`                         |
| Funded holder           | `0x62cB71582F277ef581e5F282F78e482fa347Bde7`                         |
| Holder balance at block | `1,202,794,705` base units                                           |

The holder was selected from the public Blockscout token-holder view and its balance was read
again from the pinned RPC state. The test impersonates that address only inside the local fork;
it does not possess or use the holder's key.

## Behaviors proved

- `decimals()` returns `6`.
- `approve` records the exact allowance `1,000,001` base units.
- `transferFrom` consumes that allowance and moves exactly `1.000001 USDC.e`.
- A direct `transfer` moves exactly `1,000,000` base units (`1 USDC.e`).
- `transferFrom` above the approved amount fails.
- A transfer from an account with zero balance fails.
- Sender, recipient, and remaining allowance are checked after successful operations.

## Reproduce

Requires Foundry `1.7.1`. No private key or environment secret is required.

```bash
FOUNDRY_PROFILE=fork forge test --root contracts \
  --fork-url https://mainnet.hsk.xyz \
  --fork-block-number 26722885 -vv
```

The default `forge test --root contracts` command does not run this RPC-dependent suite. The
`fork` Foundry profile changes the test directory from `test` to `fork`, keeping normal pull
request checks deterministic. If the public RPC stops serving this historical block, the fork
proof is unavailable until a reviewed archival endpoint or a newly pinned block is recorded;
a mock token must not be substituted as evidence.

## Integration limits

This proof supports standard ERC-20 balance, approval, allowance, transfer, and `transferFrom`
integration at the pinned state. ReserveRail must still account for the external token's pause,
blacklist, proxy-upgrade, issuer, bridge, and liquidity risks described in the
[mainnet preflight](./hsk-mainnet-preflight.md).
