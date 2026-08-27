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
