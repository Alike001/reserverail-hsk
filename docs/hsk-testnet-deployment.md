# HSK Testnet Deployment Rehearsal

Status: **deployed and independently reconciled on HSKChain Testnet; explorer source verification pending**

This runbook deploys the complete ReserveRail pilot lifecycle to HSKChain Testnet only. It uses
the public deployer address `0xdE67A35B322e5A31e8215B5245CA4e48d7977F71`; no private key,
seed phrase, password, or funded account is stored in the repository.

## Truthfulness Boundary

HSKChain's official token-contract reference currently publishes USDC only for mainnet, not a
testnet USDC address. The rehearsal therefore deploys `ReserveRail Test USDC (tUSDC)`, an
explicitly test-only six-decimal reserve asset. Its constructor rejects every chain except chain
ID `133`, and `isTestAsset()` returns `true`.

`tUSDC` has no monetary value, is not bridged USDC.e, and is not mainnet deployment evidence. The
mainnet deployment must instead use the reviewed USDC.e address in
[`config/hsk-networks.json`](../config/hsk-networks.json).

## Fixed Reviewed Parameters

| Parameter                   | Value                                        |
| --------------------------- | -------------------------------------------- |
| Network                     | HSKChain Testnet                             |
| Chain ID                    | `133`                                        |
| RPC                         | `https://testnet.hsk.xyz`                    |
| Explorer                    | `https://testnet-explorer.hskchain.net`      |
| Deployer and pilot roles    | `0xdE67A35B322e5A31e8215B5245CA4e48d7977F71` |
| Implementation version      | `1`                                          |
| Test reserve                | `ReserveRail Test USDC (tUSDC)`, 6 decimals  |
| Initial test reserve supply | `1,000 tUSDC`                                |
| Pilot backing and supply    | `100 tUSDC` / `100 rrtUSD`                   |
| Pilot token                 | `ReserveRail Test USD (rrtUSD)`              |

The script submits ten ordered transactions: deploy test reserve, deploy token implementation,
deploy vault implementation, deploy registry, register version, activate version, deploy factory,
create pilot token/vault clones, approve the vault, and deposit/mint the backed pilot supply.

## Verified Deployment Evidence

The owner broadcast the reviewed script from source commit
[`ec3dfcd058e389a3f8168b3931396a116ef17263`](https://github.com/Alike001/reserverail-hsk/commit/ec3dfcd058e389a3f8168b3931396a116ef17263)
on 2026-08-27. All ten receipts independently returned status `1` through the HSK testnet RPC.
The transactions landed between `2026-08-27T13:34:40Z` and `2026-08-27T13:46:44Z`.

| Component              | Address                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Test reserve (`tUSDC`) | [`0x90d3E5AEe13d444ec0679BdD3663deE823a3959f`](https://testnet-explorer.hsk.xyz/address/0x90d3E5AEe13d444ec0679BdD3663deE823a3959f) |
| Token implementation   | [`0x85b6DcB049E033261005D7f5b7E2F059C2166a2e`](https://testnet-explorer.hsk.xyz/address/0x85b6DcB049E033261005D7f5b7E2F059C2166a2e) |
| Vault implementation   | [`0x9f10b266F90638fC058e0891901082Fe9eccD8EA`](https://testnet-explorer.hsk.xyz/address/0x9f10b266F90638fC058e0891901082Fe9eccD8EA) |
| Version registry       | [`0x275707B758B9957803cA09d9FCfA9306F26734a8`](https://testnet-explorer.hsk.xyz/address/0x275707B758B9957803cA09d9FCfA9306F26734a8) |
| Factory                | [`0x6a613aDfF0aec888E2991c51Bc7E2F13582Dac45`](https://testnet-explorer.hsk.xyz/address/0x6a613aDfF0aec888E2991c51Bc7E2F13582Dac45) |
| Pilot token (`rrtUSD`) | [`0x6B4a40eEA31B5d6d343c2283ddDF0793523fA44C`](https://testnet-explorer.hsk.xyz/address/0x6B4a40eEA31B5d6d343c2283ddDF0793523fA44C) |
| Pilot vault            | [`0xDFc5332F675584603e0f845Ad59C91620b814365`](https://testnet-explorer.hsk.xyz/address/0xDFc5332F675584603e0f845Ad59C91620b814365) |

| Step                        |      Block | Confirmed transaction                                                                                                           |
| --------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------- |
| Deploy test reserve         | `32325512` | [`0x2772471f...72a2f4`](https://testnet-explorer.hsk.xyz/tx/0x2772471f4d8dcfbe6f08d21aff65ba5c1ca61a5d2cff91da401667a09772a2f4) |
| Deploy token implementation | `32325699` | [`0x9a18fd42...805383`](https://testnet-explorer.hsk.xyz/tx/0x9a18fd4234d4bcce31d322202363c1bfd19e256272f162fe96b0073f6b805383) |
| Deploy vault implementation | `32325743` | [`0x38a1044f...377d82`](https://testnet-explorer.hsk.xyz/tx/0x38a1044fc9e42c8b07f6ec2c7ed46c88ca80348e6a6380c9c84c8ee460377d82) |
| Deploy registry             | `32325760` | [`0x1a347bb8...0f31f4`](https://testnet-explorer.hsk.xyz/tx/0x1a347bb817fe2bcc1b1d2e35c47ee14c91b83dcd53bfd6dfd75d440e9c0f31f4) |
| Register version 1          | `32325778` | [`0x670f756a...f2b062`](https://testnet-explorer.hsk.xyz/tx/0x670f756a0517b12ca93c45e78e92691223fb1bfd1568a0e497d10bc019f2b062) |
| Activate version 1          | `32325794` | [`0xffb68441...1b0c34`](https://testnet-explorer.hsk.xyz/tx/0xffb68441f00333d3094a6101ac642f412f1671e82e434d6fe1f63166be1b0c34) |
| Deploy factory              | `32325814` | [`0x89025f97...056b5`](https://testnet-explorer.hsk.xyz/tx/0x89025f974b7653af09cdfe0c414f47c626184627b5be50b4f01dd81c25b056b5)  |
| Create pilot pair           | `32325825` | [`0x6ad5b006...dc38a`](https://testnet-explorer.hsk.xyz/tx/0x6ad5b00680468350273752b76ded459f51a78c459e759aae4ba6bd9f49adc38a)  |
| Approve `100 tUSDC`         | `32325860` | [`0xc0c82e43...1c419`](https://testnet-explorer.hsk.xyz/tx/0xc0c82e43cad1e0750d6071aaab30f9c206202660a262ad8b23bcd0ba5d91c419)  |
| Deposit and mint            | `32325874` | [`0x792ce5dd...61b5f`](https://testnet-explorer.hsk.xyz/tx/0x792ce5dde99e23098e6ea1a5beccd6e888ec293db76588a5bd6797f025461b5f)  |

Independent direct reads confirmed:

- the test reserve reports six decimals, `isTestAsset() == true`, and the reviewed deployer as owner;
- registry version `1` is active and maps to the exact locked token and vault implementations;
- the factory points to that registry and reserve and reports one issuer;
- the token and vault point to each other, with all three pilot roles assigned to the reviewed deployer;
- pilot reserve and total supply both equal `100000000` base units (`100` tokens).

Explorer source verification is not claimed complete in this record. RPC bytecode, parameters,
relationships, roles, balances, and receipts have been verified; explorer publication remains a
separate follow-up before issue #45 is closed.

## 1. Read-Only Preflight

From the repository root:

```bash
cast chain-id --rpc-url https://testnet.hsk.xyz
cast balance 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  --rpc-url https://testnet.hsk.xyz --ether
cast nonce 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  --rpc-url https://testnet.hsk.xyz
```

Stop unless the chain ID is exactly `133`. At the latest rehearsal preflight, the wallet held
`0.1 HSK`, its nonce was `0`, and the simulated ten-transaction gas limit totaled `6,851,898`.
At the observed gas price, the rough upper estimate was `0.00686 HSK`; MetaMask's live estimate at
signing time is authoritative.

## 2. Build and Test

```bash
forge fmt --root contracts --check
forge build --root contracts
forge test --root contracts --match-contract DeployHskTestnetTest -vvv
```

The tests prove that the script rejects mainnet, creates only the explicit test reserve on chain
133, restricts reserve minting to the configured owner, activates the registry version, creates
one issuer pair, and ends with reserve equal to total supply.

## 3. Simulate Against Live HSK Testnet State

Run this from the Foundry workspace:

```bash
cd contracts
forge script script/DeployHskTestnet.s.sol:DeployHskTestnet \
  --rpc-url https://testnet.hsk.xyz \
  --sender 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  -vvvv
```

Do not add `--broadcast` during review. The command must end with `SIMULATION COMPLETE`, show ten
transactions on chain `133`, and reconcile pilot reserve and supply to `100000000` base units.
Addresses shown during simulation are predicted addresses, not deployed evidence.

## 4. Owner-Only MetaMask Broadcast

Broadcast only from an approved, merged commit. Confirm MetaMask is connected to HSKChain Testnet,
chain ID `133`, with the expected public account selected. Then run from `contracts/`:

```bash
forge script script/DeployHskTestnet.s.sol:DeployHskTestnet \
  --rpc-url https://testnet.hsk.xyz \
  --sender 0xdE67A35B322e5A31e8215B5245CA4e48d7977F71 \
  --broadcast \
  --browser \
  --slow \
  -vvvv
```

Foundry opens a local browser-wallet page, and MetaMask signs the prepared transactions. Never use
`--private-key`, paste a key into chat, or put wallet material in an environment file. Reject the
request and stop if the wallet shows another chain, another account, unexpected value transfer,
or parameters different from the fixed table above.

## 5. Capture and Verify Real Evidence

After all ten receipts succeed:

1. Copy real addresses and transaction hashes from
   `contracts/broadcast/DeployHskTestnet.s.sol/133/run-latest.json`.
2. Independently confirm every address has code using `cast code ADDRESS --rpc-url
https://testnet.hsk.xyz`.
3. Compare registry, factory, token, vault, reserve, roles, supply, and reserve balance with direct
   `cast call` reads.
4. Verify the five non-proxy source contracts using Foundry's Blockscout verifier, compiler
   `0.8.30`, optimizer runs `200`, and `https://testnet-explorer.hskchain.net/api`.
5. Replace the `undeployed` values in
   [`config/deployments/hsk-testnet.json`](../config/deployments/hsk-testnet.json) through a
   dedicated evidence PR. Include the full source commit, real receipts, addresses, and UTC time.

Minimal token/vault clones should point to the verified implementation bytecode. A simulation
address, dry-run file, screenshot, or testnet receipt must never be used as HSK mainnet evidence.

## Stop Conditions

- Chain ID is not exactly `133`.
- Selected wallet is not the reviewed deployer.
- Available HSK is below MetaMask's complete transaction estimate plus a safety margin.
- Source commit differs from the reviewed commit.
- Simulation fails, produces a different transaction count, or does not end fully backed.
- Any teammate requests the private key or seed phrase.
- Any signed transaction fails; do not use `--resume` until nonce and successful receipts are
  independently checked.
