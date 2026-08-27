# HSK Chain And USDC.e Preflight

Status: **Read-only verification complete**
Verification time: **2026-08-27 02:08 WAT** (`2026-08-27T01:08:25Z`)

This document records the exact HSK Chain and reserve-token assumptions ReserveRail may use.
It is deployment preflight evidence, not an audit or an authorization to send mainnet funds.

## Authoritative Network Configuration

| Network | Chain ID | RPC | Native gas | Explorer |
|---|---:|---|---|---|
| HSK Chain mainnet | `177` | `https://mainnet.hsk.xyz` | `HSK` | `https://hashkey.blockscout.com` |
| HSK Chain testnet | `133` | `https://testnet.hsk.xyz` | `HSK` | `https://testnet-explorer.hsk.xyz` |

Sources:

- [Current HSK Chain network information](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/network-info)
- Direct read-only `eth_chainId` calls made at the verification time above.

Direct results:

```text
mainnet chain ID: 177
testnet chain ID: 133
```

The older [explorer/wallet documentation](https://docs.hsk.xyz/docs/About-HashKey-Chain/Learn/Ethereum-More/Explorer-Wallet)
says mainnet chain ID `1719`, RPC `https://hsk-mainnet.hashkey.com`, and explorer
`https://explorer.hsk.xyz`. Those values conflict with the current network-information page
and the live mainnet RPC. ReserveRail must use `177` and must call `eth_chainId` before every
value-changing action.

## Pinned Mainnet Evidence

All token reads below were repeated at this block:

| Field | Value |
|---|---|
| Block number | `26,722,885` (`0x197c245`) |
| Block hash | `0x1f295b685280c636768d06a518e0425fdc30d18eee8d7184a275017bfe3dec81` |
| Block timestamp | `2026-08-27T01:08:25Z` |

Using a pinned block makes later fork tests reproducible even if the token proxy is upgraded.

## Official Reserve Token

The current [HSK Chain token-contract page](https://docs.hskchain.net/docs/Build-on-HashKey-Chain/Token-Contracts)
lists bridged USDC at:

```text
0x054ed45810DbBAb8B27668922D110669c9D88D0a
```

Fresh mainnet reads at the pinned block returned:

| Check | Result |
|---|---|
| Contract bytecode | Present |
| Code hash | `0xaad43333d28e146557f1c682e8a4226743fb231fdd00a577512233bd9e920008` |
| `name()` | `Bridged USDC` |
| `symbol()` | `USDC.e` |
| `decimals()` | `6` |
| `totalSupply()` snapshot | `2,441,770,402` base units (`2,441.770402 USDC.e`) |

ReserveRail UI and contracts must use exact six-decimal base units. The official documentation
labels the asset `USDC (Bridged USDC)` while the contract symbol is `USDC.e`; product copy must
use `USDC.e` so users do not mistake it for native Circle-issued USDC on another chain.

## Proxy And Upgrade Evidence

The HSK Blockscout API reports:

| Field | Value |
|---|---|
| Proxy contract | `FiatTokenProxy` |
| Proxy verified | Yes |
| Implementation | `0x82f67Bdea6CbCC6BD34526073300e619225b22DE` |
| Implementation name | `FiatTokenV2_2` |
| Implementation verified | Yes |
| Proxy administrator | `0x57D5e36804e46a6eD938aECB300DFf222B92f324` |
| Compiler | Solidity `0.6.12` |

Explorer links:

- [USDC.e proxy](https://hsk.blockscout.com/address/0x054ed45810DbBAb8B27668922D110669c9D88D0a)
- [USDC.e implementation](https://hsk.blockscout.com/address/0x82f67Bdea6CbCC6BD34526073300e619225b22DE)
- [Proxy administrator](https://hsk.blockscout.com/address/0x57D5e36804e46a6eD938aECB300DFf222B92f324)

This is an externally administered, upgradeable reserve token. ReserveRail cannot prevent its
issuer, administrator, or bridge from upgrading, pausing, freezing, or otherwise affecting
USDC.e. The public proof page must disclose this inherited dependency.

## Reproducible Read-Only Commands

Requires Foundry's `cast`. These commands do not need a wallet or private key.

```bash
cast chain-id --rpc-url https://mainnet.hsk.xyz
cast chain-id --rpc-url https://testnet.hsk.xyz
cast block 26722885 --rpc-url https://mainnet.hsk.xyz --json

cast codehash 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  --rpc-url https://mainnet.hsk.xyz --block 26722885
cast call 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  'name()(string)' --rpc-url https://mainnet.hsk.xyz --block 26722885
cast call 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  'symbol()(string)' --rpc-url https://mainnet.hsk.xyz --block 26722885
cast call 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  'decimals()(uint8)' --rpc-url https://mainnet.hsk.xyz --block 26722885
cast call 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  'totalSupply()(uint256)' --rpc-url https://mainnet.hsk.xyz --block 26722885
```

The Blockscout API evidence is reproducible with:

```bash
curl --fail --silent --show-error \
  https://hsk.blockscout.com/api/v2/smart-contracts/0x054ed45810DbBAb8B27668922D110669c9D88D0a
curl --fail --silent --show-error \
  https://hsk.blockscout.com/api/v2/smart-contracts/0x82f67Bdea6CbCC6BD34526073300e619225b22DE
```

## Integration Decision

- Mainnet configuration uses chain ID `177` and rejects all mismatches before signing.
- Testnet configuration uses chain ID `133`.
- The submission reserve asset is fixed to the exact USDC.e proxy address above.
- Contracts use six decimals without lossy conversion.
- Mainnet-fork tests pin block `26,722,885` or explicitly record a newer reviewed block.
- The pilot remains low-value and unaudited.
- No production UI displays reserve coverage when RPC reads are unavailable or stale.

## Inherited Risks

- USDC.e proxy administration and implementation upgrades.
- Issuer pause, blacklist, or balance-control behavior.
- Bridge compromise, withdrawal interruption, or canonical-asset mismatch.
- Low liquidity or lack of a reliable external redemption path on HSK Chain.
- RPC and explorer availability.
- Documentation drift, including the observed legacy chain-ID conflict.

These risks do not invalidate the MVP, but they prevent claims such as `risk-free`, `native
USDC`, or `cash redeemable`.
