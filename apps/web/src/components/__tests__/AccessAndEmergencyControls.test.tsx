import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessAndEmergencyControls } from "../AccessAndEmergencyControls";
import * as rolesModule from "../../wallet/roles";
import { createWalletStore } from "../../wallet/store";
import type { InjectedProvider } from "../../wallet/provider";

const ADMIN_ADDR = "0x1111111111111111111111111111111111111111";
const OPERATOR_ADDR = "0x2222222222222222222222222222222222222222";
const PAUSER_ADDR = "0x3333333333333333333333333333333333333333";
const OTHER_ADDR = "0x4444444444444444444444444444444444444444";
const VAULT_ADDR = "0x9999999999999999999999999999999999999999";

describe("AccessAndEmergencyControls", () => {
  beforeEach(() => {
    vi.spyOn(rolesModule, "fetchVaultAuthorities").mockResolvedValue({
      administrator: ADMIN_ADDR,
      reserveOperator: OPERATOR_ADDR,
      pauser: PAUSER_ADDR,
      operationallyPaused: false,
    });
  });

  it("renders truthful undeployed state when no vault address is configured", () => {
    render(<AccessAndEmergencyControls vaultAddressOverride={undefined} />);
    expect(screen.getByText("Pilot Vault Undeployed")).toBeDefined();
    expect(
      screen.getByText(
        /The HSK mainnet deployment manifest is currently undeployed/,
      ),
    ).toBeDefined();
  });

  it("renders on-chain authorities and pause operational matrix", async () => {
    render(<AccessAndEmergencyControls vaultAddressOverride={VAULT_ADDR} />);

    expect(await screen.findByText("Current Authorities")).toBeDefined();
    expect(screen.getByText("0x1111…1111 ↗")).toBeDefined();
    expect(screen.getByText("0x2222…2222 ↗")).toBeDefined();
    expect(screen.getByText("0x3333…3333 ↗")).toBeDefined();
    expect(screen.getByText("✓ ACTIVE (OPERATIONAL)")).toBeDefined();

    // Verify matrix items
    expect(screen.getByText("Deposit & Mint")).toBeDefined();
    expect(screen.getByText("Token Transfers")).toBeDefined();
    expect(screen.getByText("Holder Redemption")).toBeDefined();
    expect(screen.getByText("Role Recovery")).toBeDefined();

    // Verify redemption justification
    expect(
      screen.getByText(
        /Why Redemption Remains Available During An Operational Pause/,
      ),
    ).toBeDefined();
  });

  it("disables pause/unpause and role rotation for unauthorized wallets", async () => {
    const provider = new MockInjectedProvider(177, [OTHER_ADDR]);
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    render(
      <AccessAndEmergencyControls
        store={store}
        vaultAddressOverride={VAULT_ADDR}
      />,
    );

    await screen.findByText("Current Authorities");

    const pauseBtn = screen.getByRole("button", { name: "Pause Operations" });
    expect(pauseBtn.hasAttribute("disabled")).toBe(true);

    const rotateBtn = screen.getByRole("button", {
      name: "Review & Rotate Role",
    });
    expect(rotateBtn.hasAttribute("disabled")).toBe(true);

    expect(
      screen.getByText("Requires Pauser or Administrator wallet."),
    ).toBeDefined();
  });

  it("enables pause for pauser wallet, but disallows unpause", async () => {
    const provider = new MockInjectedProvider(177, [PAUSER_ADDR]);
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    const { rerender } = render(
      <AccessAndEmergencyControls
        store={store}
        vaultAddressOverride={VAULT_ADDR}
      />,
    );

    await screen.findByText("Current Authorities");

    // Pauser can pause
    const pauseBtn = screen.getByRole("button", { name: "Pause Operations" });
    expect(pauseBtn.hasAttribute("disabled")).toBe(false);

    // Mock paused state
    vi.spyOn(rolesModule, "fetchVaultAuthorities").mockResolvedValue({
      administrator: ADMIN_ADDR,
      reserveOperator: OPERATOR_ADDR,
      pauser: PAUSER_ADDR,
      operationallyPaused: true,
    });

    rerender(
      <AccessAndEmergencyControls
        store={store}
        vaultAddressOverride={VAULT_ADDR}
      />,
    );

    const refreshBtn = screen.getByRole("button", {
      name: "Refresh Authorities",
    });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText("⚠️ OPERATIONALLY PAUSED")).toBeDefined();
    });

    // Pauser CANNOT unpause
    const unpauseBtn = screen.getByRole("button", {
      name: "Resume Operations (Unpause)",
    });
    expect(unpauseBtn.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText(
        "Requires Administrator wallet to unpause (Pauser cannot unpause).",
      ),
    ).toBeDefined();
  });

  it("shows admin lockout warning and requires acknowledgment when rotating administrator", async () => {
    const provider = new MockInjectedProvider(177, [ADMIN_ADDR]);
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    render(
      <AccessAndEmergencyControls
        store={store}
        vaultAddressOverride={VAULT_ADDR}
      />,
    );

    await screen.findByText("Current Authorities");

    // Select administrator role
    const roleSelect = screen.getByLabelText("Select Authority Role");
    fireEvent.change(roleSelect, { target: { value: "ADMINISTRATOR" } });

    // Enter new address
    const input = screen.getByLabelText("New Authority Address (0x...)");
    fireEvent.change(input, { target: { value: OTHER_ADDR } });

    // Admin lockout warning must be visible
    expect(
      screen.getByText("⚠️ Critical: Administrator Authority Handover"),
    ).toBeDefined();

    const rotateBtn = screen.getByRole("button", {
      name: "Review & Rotate Role",
    });
    expect(rotateBtn.hasAttribute("disabled")).toBe(true);

    // Acknowledge checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(rotateBtn.hasAttribute("disabled")).toBe(false);

    // Open review modal
    fireEvent.click(rotateBtn);
    expect(screen.getByText("Confirm Role Rotation")).toBeDefined();
    expect(
      screen.getByText("Current wallet loses Admin privileges"),
    ).toBeDefined();
  });
});

class MockInjectedProvider {
  private chainId: number;
  private readonly accounts: string[];
  private readonly listeners = new Map<
    string,
    Set<(...parameters: unknown[]) => void>
  >();

  constructor(chainId = 177, accounts: string[] = []) {
    this.chainId = chainId;
    this.accounts = accounts;
  }

  asInjected() {
    return this as unknown as InjectedProvider;
  }

  async request({ method }: { method: string }) {
    if (method === "eth_accounts") return this.accounts;
    if (method === "eth_requestAccounts") return this.accounts;
    if (method === "eth_chainId") return `0x${this.chainId.toString(16)}`;
    return null;
  }

  on(event: string, listener: (...parameters: unknown[]) => void) {
    const eventListeners = this.listeners.get(event) ?? new Set();
    eventListeners.add(listener);
    this.listeners.set(event, eventListeners);
  }

  removeListener(event: string, listener: (...parameters: unknown[]) => void) {
    this.listeners.get(event)?.delete(listener);
  }
}
