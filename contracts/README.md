# ReserveRail Contracts

Foundry workspace for the ReserveRail protocol.

The package contains the reserve-backed token, isolated vault, implementation registry, and
issuer factory contracts. They are unaudited and remain undeployed on HSK mainnet.

```bash
forge fmt --root contracts --check
forge build --root contracts
forge test --root contracts
```

The deterministic stateful-invariant, coverage, and gas-snapshot commands and their latest
results are recorded in [`VERIFICATION.md`](./VERIFICATION.md).

Pinned Slither configuration, reviewed finding dispositions, dependency provenance, and the
machine-readable report are recorded in
[`reports/SLITHER_REVIEW.md`](./reports/SLITHER_REVIEW.md).

Production financial contracts must arrive through their dedicated security-reviewed issues.

## HSK testnet deployment rehearsal

The chain-133-only deployment script, test reserve, platform deployment, pilot creation, and
backing checks live in [`script/DeployHskTestnet.s.sol`](./script/DeployHskTestnet.s.sol). Follow
the reviewed [HSK testnet deployment runbook](../docs/hsk-testnet-deployment.md); simulation is
safe by default, while only the repository owner may add `--broadcast` and sign in MetaMask.

## HSK mainnet deployment preparation

The chain-177-only script in [`script/DeployHskMainnet.s.sol`](./script/DeployHskMainnet.s.sol)
deploys the reviewed implementations, registry, factory, and an explicitly unfunded pilot pair.
It cannot deposit or mint reserve funds. Follow the
[HSK mainnet deployment runbook](../docs/hsk-mainnet-deployment.md); simulation is the only
approved action until every recorded go/no-go dependency is satisfied.

## HSK mainnet USDC.e fork proof

The fork suite is isolated from default CI because it depends on a public RPC. Run it against
the exact block reviewed in the HSK preflight:

```bash
FOUNDRY_PROFILE=fork forge test --root contracts \
  --fork-url https://mainnet.hsk.xyz \
  --fork-block-number 26722885 -vv
```

This changes only local fork state; it uses no wallet, private key, mock token, or mainnet
transaction. See [`docs/hsk-usdce-fork-proof.md`](../docs/hsk-usdce-fork-proof.md) for scope,
results, and limitations.
