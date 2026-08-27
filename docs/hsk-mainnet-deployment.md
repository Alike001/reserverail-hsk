# HSK Mainnet Platform Deployment

Status: **simulation only; no transactions broadcast**

This runbook prepares the unfunded ReserveRail platform and one empty pilot token/vault pair for
HSK Chain mainnet. It fixes the public deployer to
`0xdE67A35B322e5A31e8215B5245CA4e48d7977F71` and the reserve asset to HSK's bridged USDC.e at
`0x054ed45810DbBAb8B27668922D110669c9D88D0a`. No private key, seed phrase, password, or secret is
stored in the repository.

## Truthfulness And Funding Boundary

The script deploys the implementations, registry, factory, and an empty pilot pair. It performs
**no USDC.e approval, deposit, mint, transfer, or redemption**. An empty pair is platform evidence,
not a working reserve-backed pilot. The pilot may be funded only through a separately reviewed,
low-value lifecycle after the deployer actually holds mainnet USDC.e.

At the latest read-only preflight, the deployer held `0.2 HSK`, `0 USDC.e`, and nonce `0` on chain
177. The live gas estimate at signing time is authoritative; `0.2 HSK` must not be assumed
sufficient merely because it is non-zero.

## Fixed Reviewed Parameters

| Parameter | Value |
| --- | --- |
| Network | HSK Chain mainnet |
| Chain ID | `177` |
| RPC | `https://mainnet.hsk.xyz` |
| Explorer | `https://hsk.blockscout.com` |
| Deployer and pilot roles | `0xdE67A35B322e5A31e8215B5245CA4e48d7977F71` |
| Reserve asset | `USDC.e` at `0x054ed45810DbBAb8B27668922D110669c9D88D0a` |
| Reserve decimals | `6` |
| Implementation version | `1` |
| Empty pilot | `ReserveRail Pilot USD (rrUSD)` |

The script submits seven ordered transactions: deploy token implementation, deploy vault
implementation, deploy registry, register version, activate version, deploy factory, and create
the empty pilot token/vault clones.

## 1. Read-Only Preflight

From the repository root:

```bash
cast chain-id --rpc-url https://mainnet.hsk.xyz
cast balance 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  --rpc-url https://mainnet.hsk.xyz --ether
cast nonce 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  --rpc-url https://mainnet.hsk.xyz
cast call 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  'symbol()(string)' --rpc-url https://mainnet.hsk.xyz
cast call 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  'decimals()(uint8)' --rpc-url https://mainnet.hsk.xyz
cast call 0x054ed45810DbBAb8B27668922D110669c9D88D0a \
  'balanceOf(address)(uint256)' 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  --rpc-url https://mainnet.hsk.xyz
```

Stop unless the chain ID is exactly `177`, symbol is `USDC.e`, decimals are `6`, the selected
wallet is the reviewed deployer, and the complete live fee estimate fits within the HSK balance
with a safety margin.

## 2. Build, Test, And Simulate

```bash
forge fmt --root contracts --check
forge build --root contracts
forge test --root contracts --match-contract DeployHskMainnetTest -vvv

cd contracts
forge script script/DeployHskMainnet.s.sol:DeployHskMainnet \
  --rpc-url https://mainnet.hsk.xyz \
  --sender 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  -vvvv
```

Do not add `--broadcast` during review. Simulation addresses are predictions, not deployed
evidence. Confirm that the simulation shows exactly seven transactions and that both pilot supply
and vault reserve remain zero.

## 3. Mainnet Go/No-Go Gate

No broadcast is authorized until all of these are true:

1. The exact source commit and parameters have two non-author teammate approvals.
2. The testnet deployment has real, verified receipts and a reviewed manifest.
3. The pre-mainnet security checklist records a go decision and an explicit exposure cap.
4. The owner confirms MetaMask chain `177`, the expected account, and every transaction preview.
5. The owner has enough HSK for the complete current estimate plus a safety margin.

Only the repository owner signs. Never use `--private-key`, paste wallet material into chat, or
store a key in an environment file. If a signed transaction fails, stop and independently inspect
the nonce and all successful receipts before considering a resume.

## 4. Evidence Required After A Future Authorized Broadcast

1. Copy only confirmed addresses and hashes from
   `contracts/broadcast/DeployHskMainnet.s.sol/177/run-latest.json`.
2. Confirm code at all six addresses and compare the two clone bytecodes with their
   implementations.
3. Read registry administrator/version status, factory reserve/registry, pilot roles, supply, and
   reserve directly from the RPC.
4. Verify the four non-proxy source contracts on Blockscout with Solidity `0.8.30`, optimizer runs
   `200`, and `https://hsk.blockscout.com/api`.
5. Update [`config/deployments/hsk-mainnet.json`](../config/deployments/hsk-mainnet.json) only in a
   dedicated evidence PR containing the full source commit, confirmed receipts, real addresses,
   and UTC timestamp.

The mainnet manifest must remain `undeployed` until those checks pass. An empty pilot pair must
remain labeled unfunded until a separate, real USDC.e lifecycle succeeds.

## Stop Conditions

- Chain ID is not exactly `177`.
- Selected account is not the reviewed deployer.
- USDC.e address, code, symbol, or decimals differ from the fixed values.
- Source commit or script parameters differ from the reviewed commit.
- Testnet evidence or required teammate approvals are missing.
- HSK balance does not cover the complete live estimate plus a safety margin.
- Any transaction preview includes an unexpected value transfer, reserve approval, deposit, or
  mint.
