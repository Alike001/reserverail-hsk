import { useSyncExternalStore } from "react";
import { walletStore, type WalletStore } from "./store";

export function useWallet(store: WalletStore = walletStore) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}
