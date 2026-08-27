# HSK Testnet Deployment Rehearsal

Status: **simulation passed; no transactions broadcast yet**

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

| Parameter | Value |
| --- | --- |
| Network | HSKChain Testnet |
| Chain ID | `133` |
| RPC | `https://testnet.hsk.xyz` |
| Explorer | `https://testnet-explorer.hskchain.net` |
| Deployer and pilot roles | `0xdE67A35B322e5A31e8215B5245CA4e48d7977F71` |
| Implementation version | `1` |
| Test reserve | `ReserveRail Test USDC (tUSDC)`, 6 decimals |
| Initial test reserve supply | `1,000 tUSDC` |
| Pilot backing and supply | `100 tUSDC` / `100 rrtUSD` |
| Pilot token | `ReserveRail Test USD (rrtUSD)` |

The script submits ten ordered transactions: deploy test reserve, deploy token implementation,
deploy vault implementation, deploy registry, register version, activate version, deploy factory,
create pilot token/vault clones, approve the vault, and deposit/mint the backed pilot supply.

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
