import { describe, expect, it } from "vitest";
import type { InjectedProvider } from "./provider";
import { createWalletStore } from "./store";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const SECOND_ACCOUNT = "0x2222222222222222222222222222222222222222";

describe("wallet store", () => {
  it("reports unavailable without an injected wallet", () => {
    const store = createWalletStore();
    expect(store.getSnapshot()).toEqual({
      isHskMainnet: false,
      status: "unavailable",
    });
    expect(store.getClient()).toBeUndefined();
  });

  it("initializes without prompting and connects on HSK mainnet", async () => {
    const provider = new MockProvider();
    const store = createWalletStore(provider.asInjected());

    await store.initialize();
    expect(store.getSnapshot()).toMatchObject({
      account: ACCOUNT,
      chainId: 177,
      isHskMainnet: true,
      status: "connected",
    });

    provider.accounts = [];
    store.disconnect();
    await store.connect();
    expect(provider.methods).toContain("eth_requestAccounts");
    expect(store.getSnapshot().status).toBe("connected");
  });

  it("adds HSK only after an unsupported-chain response", async () => {
    const provider = new MockProvider(133);
    provider.rejectFirstSwitch = true;
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    await store.switchToHskMainnet();

    expect(provider.methods).toEqual(
      expect.arrayContaining([
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
      ]),
    );
    expect(store.getSnapshot()).toMatchObject({
      chainId: 177,
      isHskMainnet: true,
    });
  });

  it("reacts to account and chain events and removes listeners", async () => {
    const provider = new MockProvider();
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    const unsubscribeFirst = store.subscribe(() => undefined);
    const unsubscribeSecond = store.subscribe(() => undefined);
    expect(provider.listenerCount()).toBe(3);

    provider.emit("accountsChanged", [SECOND_ACCOUNT]);
    provider.emit("chainChanged", "0x85");
    expect(store.getSnapshot()).toMatchObject({
      account: SECOND_ACCOUNT,
      chainId: 133,
      isHskMainnet: false,
    });

    unsubscribeFirst();
    unsubscribeSecond();
    store.destroy();
    expect(provider.listenerCount()).toBe(0);
  });

  it("keeps user rejection distinct from other failures", async () => {
    const provider = new MockProvider();
    provider.rejectAccountRequest = true;
    const store = createWalletStore(provider.asInjected());

    await expect(store.connect()).rejects.toMatchObject({
      kind: "user-rejected",
    });
    expect(store.getSnapshot()).toMatchObject({
      error: { kind: "user-rejected" },
      status: "disconnected",
    });
  });
});

class MockProvider {
  accounts = [ACCOUNT];
  methods: string[] = [];
  rejectAccountRequest = false;
  rejectFirstSwitch = false;
  private chainId: number;
  private readonly listeners = new Map<
    string,
    Set<(...parameters: unknown[]) => void>
  >();

  constructor(chainId = 177) {
    this.chainId = chainId;
  }

  asInjected() {
    return this as unknown as InjectedProvider;
  }

  async request({ method }: { method: string; params?: unknown }) {
    this.methods.push(method);
    if (method === "eth_accounts")
      return this.accounts.length ? this.accounts : [ACCOUNT];
    if (method === "eth_requestAccounts") {
      if (this.rejectAccountRequest)
        throw Object.assign(new Error(), { code: 4001 });
      return [ACCOUNT];
    }
    if (method === "eth_chainId") return `0x${this.chainId.toString(16)}`;
    if (method === "wallet_switchEthereumChain") {
      if (this.rejectFirstSwitch) {
        this.rejectFirstSwitch = false;
        throw Object.assign(new Error(), { code: 4902 });
      }
      this.chainId = 177;
      return null;
    }
    if (method === "wallet_addEthereumChain") return null;
    throw new Error(`Unexpected method: ${method}`);
  }

  on(event: string, listener: (...parameters: unknown[]) => void) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeListener(event: string, listener: (...parameters: unknown[]) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, value: unknown) {
    this.listeners.get(event)?.forEach((listener) => listener(value));
  }

  listenerCount() {
    return [...this.listeners.values()].reduce(
      (count, listeners) => count + listeners.size,
      0,
    );
  }
}
