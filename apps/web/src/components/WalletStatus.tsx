import { useEffect, useState } from "react";
import { walletStore, type WalletStore } from "../wallet/store";
import { useWallet } from "../wallet/use-wallet";

interface WalletStatusProps {
  store?: WalletStore;
}

type PendingAction = "refresh" | "switch" | null;

export function WalletStatus({ store = walletStore }: WalletStatusProps) {
  const wallet = useWallet(store);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    void store.initialize().catch(() => undefined);
  }, [store]);

  const refresh = () => run("refresh", store.initialize, setPendingAction);
  const switchNetwork = () =>
    run("switch", store.switchToHskMainnet, setPendingAction);

  return (
    <div className="wallet-status" aria-label="Browser wallet">
      <div className="wallet-actions">
        {wallet.status === "unavailable" ? (
          <span className="wallet-unavailable">No browser wallet</span>
        ) : wallet.status === "connected" && wallet.account ? (
          <>
            <span className="wallet-account" title={wallet.account}>
              {shortenAddress(wallet.account)}
            </span>
            {wallet.isHskMainnet ? (
              <span className="wallet-network-ok">HSK 177</span>
            ) : (
              <button
                type="button"
                className="wallet-button wallet-button-warning"
                disabled={pendingAction !== null}
                onClick={switchNetwork}
              >
                {pendingAction === "switch" ? "Switching…" : "Switch to HSK"}
              </button>
            )}
            <button
              type="button"
              className="wallet-button"
              onClick={store.disconnect}
              title="Clears ReserveRail wallet state without revoking wallet permissions"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            className="wallet-button wallet-button-primary"
            disabled={wallet.status === "connecting"}
            onClick={() => void store.connect().catch(() => undefined)}
          >
            {wallet.status === "connecting" ? "Connecting…" : "Connect wallet"}
          </button>
        )}
      </div>

      {wallet.error ? (
        <div className="wallet-feedback" role="alert">
          <span>
            {wallet.isStale ? "Wallet state may be stale. " : ""}
            {wallet.error.message}
          </span>
          <button
            type="button"
            className="wallet-retry"
            disabled={pendingAction !== null}
            onClick={
              wallet.isStale
                ? refresh
                : wallet.status === "connected"
                  ? switchNetwork
                  : () => void store.connect().catch(() => undefined)
            }
          >
            {wallet.isStale ? "Refresh wallet" : "Retry"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

async function run(
  action: Exclude<PendingAction, null>,
  operation: () => Promise<unknown>,
  setPendingAction: (action: PendingAction) => void,
) {
  setPendingAction(action);
  try {
    await operation();
  } catch {
    // The wallet store publishes normalized, user-visible error state.
  } finally {
    setPendingAction(null);
  }
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
