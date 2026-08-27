# ReserveRail Contracts

Foundry workspace for the ReserveRail protocol.

At scaffold stage this package contains only `ScaffoldStatus`, an explicitly non-financial
compile/test sentinel. It is not a stablecoin, reserve vault, factory, or deployed product.

```bash
forge fmt --root contracts --check
forge build --root contracts
forge test --root contracts
```

Production financial contracts must arrive through their dedicated security-reviewed issues.

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
