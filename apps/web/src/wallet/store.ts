import {
  createWalletClient,
  custom,
  type Address,
  type WalletClient,
} from "viem";
import { hskMainnet } from "../config/hsk";
import { hskChain, switchWalletClientToHsk } from "./chain";
import {
  normalizeWalletError,
  WalletOperationError,
  type WalletErrorKind,
} from "./errors";
import {
  getInjectedProvider,
  parseProviderAccount,
  parseProviderChainId,
} from "./provider";

export type WalletStatus =
  "connected" | "connecting" | "disconnected" | "unavailable";

export type WalletSnapshot = Readonly<{
  account?: Address;
  chainId?: number;
  error?: Readonly<{ kind: WalletErrorKind; message: string }>;
  isHskMainnet: boolean;
  status: WalletStatus;
}>;

export type WalletStore = ReturnType<typeof createWalletStore>;

const serverSnapshot: WalletSnapshot = {
  isHskMainnet: false,
  status: "unavailable",
};

export function createWalletStore(provider = getInjectedProvider()) {
  let snapshot: WalletSnapshot = provider
    ? { isHskMainnet: false, status: "disconnected" }
    : serverSnapshot;
  const listeners = new Set<() => void>();
  const client = provider
    ? createWalletClient({ chain: hskChain, transport: custom(provider) })
    : undefined;

  const publish = (next: WalletSnapshot) => {
    snapshot = Object.freeze(next);
    listeners.forEach((listener) => listener());
  };

  const publishError = (error: unknown, status: WalletStatus) => {
    const normalized = normalizeWalletError(error);
    publish({
      ...snapshot,
      account: status === "connected" ? snapshot.account : undefined,
      error: { kind: normalized.kind, message: normalized.message },
      isHskMainnet: snapshot.chainId === hskMainnet.id,
      status,
    });
    return normalized;
  };

  const onAccountsChanged = (...parameters: unknown[]) => {
    const account = parseProviderAccount(parameters[0]);
    publish({
      account,
      chainId: snapshot.chainId,
      isHskMainnet: snapshot.chainId === hskMainnet.id,
      status: account ? "connected" : "disconnected",
    });
  };

  const onChainChanged = (...parameters: unknown[]) => {
    try {
      const chainId = parseProviderChainId(parameters[0]);
      publish({
        ...snapshot,
        chainId,
        error: undefined,
        isHskMainnet: chainId === hskMainnet.id,
      });
    } catch (error) {
      publishError(error, snapshot.status);
    }
  };

  const onDisconnect = (...parameters: unknown[]) => {
    publishError(parameters[0], "disconnected");
  };

  provider?.on?.("accountsChanged", onAccountsChanged);
  provider?.on?.("chainChanged", onChainChanged);
  provider?.on?.("disconnect", onDisconnect);

  return {
    getClient: (): WalletClient | undefined => client,
    getServerSnapshot: (): WalletSnapshot => serverSnapshot,
    getSnapshot: (): WalletSnapshot => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async initialize() {
      if (!provider) return snapshot;

      try {
        const [accounts, rawChainId] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ]);
        const account = parseProviderAccount(accounts);
        const chainId = parseProviderChainId(rawChainId);
        publish({
          account,
          chainId,
          isHskMainnet: chainId === hskMainnet.id,
          status: account ? "connected" : "disconnected",
        });
        return snapshot;
      } catch (error) {
        throw publishError(error, "disconnected");
      }
    },
    async connect() {
      const walletClient = requireClient(client);
      publish({ ...snapshot, error: undefined, status: "connecting" });

      try {
        const [accounts, chainId] = await Promise.all([
          walletClient.requestAddresses(),
          walletClient.getChainId(),
        ]);
        const account = accounts[0];
        if (!account) {
          throw new WalletOperationError(
            "unauthorized",
            "The wallet returned no authorized account.",
          );
        }
        publish({
          account,
          chainId,
          isHskMainnet: chainId === hskMainnet.id,
          status: "connected",
        });
        return snapshot;
      } catch (error) {
        throw publishError(error, "disconnected");
      }
    },
    disconnect() {
      publish({
        chainId: snapshot.chainId,
        isHskMainnet: snapshot.chainId === hskMainnet.id,
        status: provider ? "disconnected" : "unavailable",
      });
    },
    async switchToHskMainnet() {
      const walletClient = requireClient(client);

      try {
        await switchWalletClientToHsk(walletClient);
      } catch (error) {
        throw publishError(error, snapshot.status);
      }

      publish({
        ...snapshot,
        chainId: hskMainnet.id,
        error: undefined,
        isHskMainnet: true,
      });
      return snapshot;
    },
    destroy() {
      provider?.removeListener?.("accountsChanged", onAccountsChanged);
      provider?.removeListener?.("chainChanged", onChainChanged);
      provider?.removeListener?.("disconnect", onDisconnect);
      listeners.clear();
    },
  };
}

export const walletStore = createWalletStore();

function requireClient(client: WalletClient | undefined): WalletClient {
  if (!client) {
    throw new WalletOperationError(
      "no-wallet",
      "Install or enable an injected EVM wallet to continue.",
    );
  }
  return client;
}
