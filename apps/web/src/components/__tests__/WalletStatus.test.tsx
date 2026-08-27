import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WalletStatus } from "../WalletStatus";
import type { InjectedProvider } from "../../wallet/provider";
import { createWalletStore } from "../../wallet/store";

const ACCOUNT = "0x1111111111111111111111111111111111111111";

describe("WalletStatus", () => {
  it("truthfully reports when no injected browser wallet exists", () => {
    render(<WalletStatus store={createWalletStore()} />);
    expect(screen.getByText("No browser wallet")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Connect wallet" })).toBeNull();
  });

  it("connects, identifies a wrong network, switches to HSK, and disconnects", async () => {
    const provider = new WalletUiProvider(133);
    const store = createWalletStore(provider.asInjected());
    render(<WalletStatus store={store} />);

    const connect = await screen.findByRole("button", {
      name: "Connect wallet",
    });
    fireEvent.click(connect);

    expect(await screen.findByText("0x1111…1111")).toBeDefined();
    const switchButton = screen.getByRole("button", { name: "Switch to HSK" });
    fireEvent.click(switchButton);

    expect(await screen.findByText("HSK 177")).toBeDefined();
    expect(provider.methods).toContain("wallet_switchEthereumChain");

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(
      await screen.findByRole("button", { name: "Connect wallet" }),
    ).toBeDefined();
  });

  it("shows rejected requests and provides a real retry", async () => {
    const provider = new WalletUiProvider();
    provider.rejectConnect = true;
    const store = createWalletStore(provider.asInjected());
    render(<WalletStatus store={store} />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Connect wallet" }),
    );
    expect(
      await screen.findByText("The wallet request was rejected."),
    ).toBeDefined();

    provider.rejectConnect = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("0x1111…1111")).toBeDefined();
  });

  it("marks provider disconnect state stale and refreshes from the wallet", async () => {
    const provider = new WalletUiProvider(177, [ACCOUNT]);
    const store = createWalletStore(provider.asInjected());
    render(<WalletStatus store={store} />);
    expect(await screen.findByText("0x1111…1111")).toBeDefined();

    act(() => provider.emit("disconnect", { code: 4900 }));
    expect(await screen.findByText(/Wallet state may be stale/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Refresh wallet" }));
    await waitFor(() => {
      expect(screen.getByText("0x1111…1111")).toBeDefined();
      expect(screen.queryByText(/Wallet state may be stale/)).toBeNull();
    });
  });
});

class WalletUiProvider {
  methods: string[] = [];
  rejectConnect = false;
  private chainId: number;
  private readonly authorizedAccounts: string[];
  private readonly listeners = new Map<
    string,
    Set<(...parameters: unknown[]) => void>
  >();

  constructor(chainId = 177, authorizedAccounts: string[] = []) {
    this.chainId = chainId;
    this.authorizedAccounts = authorizedAccounts;
  }

  asInjected() {
    return this as unknown as InjectedProvider;
  }

  async request({ method }: { method: string }) {
    this.methods.push(method);
    if (method === "eth_accounts") return this.authorizedAccounts;
    if (method === "eth_requestAccounts") {
      if (this.rejectConnect) throw Object.assign(new Error(), { code: 4001 });
      return [ACCOUNT];
    }
    if (method === "eth_chainId") return `0x${this.chainId.toString(16)}`;
    if (method === "wallet_switchEthereumChain") {
      this.chainId = 177;
      return null;
    }
    throw new Error(`Unexpected method: ${method}`);
  }

  on(event: string, listener: (...parameters: unknown[]) => void) {
    const eventListeners = this.listeners.get(event) ?? new Set();
    eventListeners.add(listener);
    this.listeners.set(event, eventListeners);
  }

  removeListener(event: string, listener: (...parameters: unknown[]) => void) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, value: unknown) {
    this.listeners.get(event)?.forEach((listener) => listener(value));
  }
}
