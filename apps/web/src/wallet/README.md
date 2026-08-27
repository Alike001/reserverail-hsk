# Wallet foundation

This directory owns ReserveRail wallet state and transaction truth. The shared header uses the
store through `WalletStatus`; public pilot inspection still requires no wallet.

- `chain.ts`: checked HSK mainnet Viem chain and public client.
- `provider.ts`: injected EIP-1193 provider discovery and chain-ID parsing.
- `store.ts`: one external wallet store with deduplicated provider listeners.
- `use-wallet.ts`: React `useSyncExternalStore` adapter.
- `transaction.ts`: wrong-chain guard, signature/pending/receipt/post-read lifecycle.
- `errors.ts`: user rejection, disconnect, unsupported-chain, RPC, revert, and unknown errors.

Product-specific write flows must supply a `verify` callback to `executeHskTransaction`. A
transaction is not marked confirmed until its successful receipt and that authoritative
post-transaction read both complete.

An unavailable state means no injected EIP-1193 wallet was detected. A stale state means the
provider disconnected or a background refresh failed; the UI must not present its prior account
or network as current and must offer a real refresh action.
