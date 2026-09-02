# HSK Mainnet Platform Deployment

Status: **deployed and source-verified on HSK Chain mainnet**

ReserveRail's reusable platform contracts and one empty pilot token/vault pair were deployed on
2026-09-02 from reviewed source commit
`ab6928abd991848ec4886e264b8d9708def694b0`. The repository owner signed with MetaMask; no private
key, seed phrase, password, or wallet secret was stored or passed to the deployment tooling.

## Truthfulness And Funding Boundary

This deployment proves that the registry, versioned factory, token implementation, vault
implementation, and pilot pair exist on HSK mainnet. It performs **no USDC.e approval, deposit,
mint, transfer, or redemption**.

The pilot is deliberately unfunded:

- pilot token supply: `0`
- pilot vault USDC.e reserve: `0`
- redeemable supply: `0`
- funded lifecycle receipts: none

The empty pair is platform deployment evidence, not evidence of a reserve-backed mainnet
stablecoin. A funded pilot remains a separate, reviewed, low-value operation.

## Fixed Deployment Parameters

| Parameter | Value |
| --- | --- |
| Network | HSK Chain mainnet |
| Chain ID | `177` |
| RPC | `https://mainnet.hsk.xyz` |
| Explorer | `https://hsk.blockscout.com` |
| Source commit | `ab6928abd991848ec4886e264b8d9708def694b0` |
| Deployer and pilot roles | `0xdE67A35B322e5A31e8215B5245CA4e48d7977F71` |
| Reserve asset | `USDC.e` at `0x054ed45810DbBAb8B27668922D110669c9D88D0a` |
| Reserve decimals | `6` |
| Implementation version | `1` |
| Empty pilot | `ReserveRail Pilot USD (rrUSD)` |

## Confirmed Contracts

| Contract | Address | Verification |
| --- | --- | --- |
| IssuerStablecoin implementation | [`0x90d3E5AEe13d444ec0679BdD3663deE823a3959f`](https://hsk.blockscout.com/address/0x90d3E5AEe13d444ec0679BdD3663deE823a3959f) | Source verified |
| ReserveVault implementation | [`0x85b6DcB049E033261005D7f5b7E2F059C2166a2e`](https://hsk.blockscout.com/address/0x85b6DcB049E033261005D7f5b7E2F059C2166a2e) | Source verified |
| VersionRegistry | [`0x9f10b266F90638fC058e0891901082Fe9eccD8EA`](https://hsk.blockscout.com/address/0x9f10b266F90638fC058e0891901082Fe9eccD8EA) | Source verified |
| StablecoinFactory | [`0xe6F9207A41766edB96B762e29Bd6B299e1009Df6`](https://hsk.blockscout.com/address/0xe6F9207A41766edB96B762e29Bd6B299e1009Df6) | Source verified |
| Pilot rrUSD token | [`0x98D13E05EaaC2E66e86A87603781c6ff9b9cd8B0`](https://hsk.blockscout.com/address/0x98D13E05EaaC2E66e86A87603781c6ff9b9cd8B0) | Minimal clone of verified token implementation |
| Pilot reserve vault | [`0x05edbecb97ee9128a83465D6227b680627C5130b`](https://hsk.blockscout.com/address/0x05edbecb97ee9128a83465D6227b680627C5130b) | Minimal clone of verified vault implementation |

The four non-proxy contracts were verified with Solidity `0.8.30`, optimizer enabled, and `200`
optimizer runs through `https://hsk.blockscout.com/api`.

## Confirmed Transactions

All seven receipts returned status `1`.

| Step | Transaction | Block |
| --- | --- | ---: |
| Deploy token implementation | [`0x2875…4c7`](https://hsk.blockscout.com/tx/0x2875cb1c580f643c749e15d13a4d4316811cdfbd3245fe03a49d2f97fe6674c7) | 27,002,151 |
| Deploy vault implementation | [`0x4cd0…33b`](https://hsk.blockscout.com/tx/0x4cd0c99a17793f4b921f6901e70419a5c8ed7943abc607d6f92d8e077789033b) | 27,002,212 |
| Deploy version registry | [`0x43f0…15a`](https://hsk.blockscout.com/tx/0x43f0ac71620f58bc35e4200d793b7f60405cf9fef71af5f3f4b02630cb56815a) | 27,002,232 |
| Register version 1 | [`0x465c…2fe`](https://hsk.blockscout.com/tx/0x465c409b4f5108fc50c923b4207a7728f0eff1cb61f492e78ac6ba385ff6e2fe) | 27,002,246 |
| Activate version 1 | [`0x65a6…8d7`](https://hsk.blockscout.com/tx/0x65a6f9fe0dda02f96d506bef85f488fde9308848380a016d6d3f6a27a8b08d7b) | 27,002,274 |
| Deploy factory | [`0x9c88…4c0`](https://hsk.blockscout.com/tx/0x9c88788ef2c26619e2193bc6b842096f9e42c4e99eda6bb351cc1105727724c0) | 27,002,288 |
| Create empty pilot pair | [`0x3944…82c`](https://hsk.blockscout.com/tx/0x3944417ecbae94e00cf8138d9e631b07dbde6486d922d5d0fff870cce425d82c) | 27,002,303 |

The browser signer was safely resumed after the first receipt and a local cancellation. The
confirmed wallet nonce was `1`, matching the next saved transaction; the remaining transactions
were submitted with nonces `1` through `6`. No contract was duplicated.

## Independent On-Chain Reads

Fresh RPC reads after deployment confirmed:

- registry administrator: the reviewed deployer
- registry latest version: `1`, active: `true`
- factory registry and reserve asset: the addresses above
- factory issuer count: `1`
- pilot name and symbol: `ReserveRail Pilot USD` and `rrUSD`
- token/vault factory and pair links: mutually consistent
- administrator, reserve operator, and pauser: the reviewed deployer
- token decimals and USDC.e decimals: `6`
- token total supply, vault reserve, and USDC.e vault balance: `0`
- token and vault operational pause state: `false`

The machine-readable evidence is in
[`config/deployments/hsk-mainnet.json`](../config/deployments/hsk-mainnet.json).

## Reproduce The Read-Only Checks

```bash
cast chain-id --rpc-url https://mainnet.hsk.xyz
cast code 0xe6F9207A41766edB96B762e29Bd6B299e1009Df6 \
  --rpc-url https://mainnet.hsk.xyz
cast call 0xe6F9207A41766edB96B762e29Bd6B299e1009Df6 \
  'issuerCount()(uint256)' --rpc-url https://mainnet.hsk.xyz
cast call 0x98D13E05EaaC2E66e86A87603781c6ff9b9cd8B0 \
  'totalSupply()(uint256)' --rpc-url https://mainnet.hsk.xyz
cast call 0x05edbecb97ee9128a83465D6227b680627C5130b \
  'reserveBalance()(uint256)' --rpc-url https://mainnet.hsk.xyz
```

## Remaining Mainnet Work

Do not describe the pilot as funded or demonstrate a live money lifecycle until a separately
reviewed operation has:

1. obtained a deliberately capped amount of real mainnet USDC.e;
2. approved the pilot vault;
3. deposited reserve and minted the identical base-unit amount;
4. transferred a low-value token amount;
5. redeemed it for the identical USDC.e amount; and
6. reconciled and published every receipt and final reserve/supply read.

ReserveRail remains unaudited. Any funded pilot must use a small explicit exposure cap and should
not be presented as production-ready.
