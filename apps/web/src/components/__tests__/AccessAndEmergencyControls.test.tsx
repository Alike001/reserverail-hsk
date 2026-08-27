import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessAndEmergencyControls } from "../AccessAndEmergencyControls";
import * as rolesModule from "../../wallet/roles";
import { WalletOperationError } from "../../wallet/errors";
import { createWalletStore } from "../../wallet/store";
import type { InjectedProvider } from "../../wallet/provider";

const ADMIN_ADDR = "0x1111111111111111111111111111111111111111";
const TOKEN_ADMIN_ADDR = "0x1212121212121212121212121212121212121212";
const OPERATOR_ADDR = "0x2222222222222222222222222222222222222222";
const PAUSER_ADDR = "0x3333333333333333333333333333333333333333";
const OTHER_ADDR = "0x4444444444444444444444444444444444444444";
const VAULT_ADDR = "0x9999999999999999999999999999999999999999";
const TOKEN_ADDR = "0x8888888888888888888888888888888888888888";
const TX_HASH = `0x${"ab".repeat(32)}` as const;

const ACTIVE_AUTHORITIES: rolesModule.PairAuthorities = {
  token: {
    administrator: TOKEN_ADMIN_ADDR,
    paused: false,
    vault: VAULT_ADDR,
  },
  vault: {
    administrator: ADMIN_ADDR,
    operationallyPaused: false,
    pauser: PAUSER_ADDR,
    reserveOperator: OPERATOR_ADDR,
  },
};

describe("AccessAndEmergencyControls", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(rolesModule, "fetchPairAuthorities").mockResolvedValue(
      ACTIVE_AUTHORITIES,
    );
  });

  it("renders truthful undeployed state unless both addresses are configured", () => {
    render(<AccessAndEmergencyControls vaultAddressOverride={VAULT_ADDR} />);
    expect(screen.getByText("Pilot Vault Undeployed")).toBeDefined();
    expect(
      screen.getByText(/both verified token and vault addresses/),
    ).toBeDefined();
  });

  it("renders separate on-chain administrators and the pause matrix", async () => {
    renderControls();

    expect(await screen.findByText("Current Authorities")).toBeDefined();
    expect(screen.getByText("Vault Administrator")).toBeDefined();
    expect(screen.getByText("Token Administrator")).toBeDefined();
    expect(screen.getByText("0x1111…1111 ↗")).toBeDefined();
    expect(screen.getByText("0x1212…1212 ↗")).toBeDefined();
    expect(screen.getByText("✓ ACTIVE (OPERATIONAL)")).toBeDefined();
    expect(screen.getByText("Deposit & Mint")).toBeDefined();
    expect(screen.getByText("Token Transfers")).toBeDefined();
    expect(screen.getByText("Holder Redemption")).toBeDefined();
    expect(screen.getByText("Role Recovery")).toBeDefined();
  });

  it("disables privileged controls for an unauthorized wallet", async () => {
    const store = await connectedStore(OTHER_ADDR);
    renderControls(store);
    await screen.findByText("Current Authorities");

    expect(
      screen
        .getByRole("button", { name: "Pause Operations" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Review & Rotate Role" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByText("Requires Pauser or Administrator wallet."),
    ).toBeDefined();
  });

  it("clears stale authority controls when an RPC refresh fails", async () => {
    const store = await connectedStore(ADMIN_ADDR);
    renderControls(store);
    await screen.findByText("Current Authorities");
    vi.mocked(rolesModule.fetchPairAuthorities).mockRejectedValueOnce(
      new Error("HSK RPC unavailable"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Authorities" }),
    );

    expect(await screen.findByText("HSK RPC unavailable")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "Pause Operations" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("allows a pauser to pause but never to unpause", async () => {
    const store = await connectedStore(PAUSER_ADDR);
    renderControls(store);
    await screen.findByText("Current Authorities");
    expect(
      screen
        .getByRole("button", { name: "Pause Operations" })
        .hasAttribute("disabled"),
    ).toBe(false);

    vi.mocked(rolesModule.fetchPairAuthorities).mockResolvedValue({
      token: { ...ACTIVE_AUTHORITIES.token, paused: true },
      vault: { ...ACTIVE_AUTHORITIES.vault, operationallyPaused: true },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh Authorities" }),
    );
    expect(await screen.findByText("⚠️ OPERATIONALLY PAUSED")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "Resume Operations (Unpause)" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows real transaction phases and only adds a decoded confirmed event", async () => {
    const store = await connectedStore(ADMIN_ADDR);
    const pausedAuthorities: rolesModule.PairAuthorities = {
      token: { ...ACTIVE_AUTHORITIES.token, paused: true },
      vault: { ...ACTIVE_AUTHORITIES.vault, operationallyPaused: true },
    };
    vi.spyOn(rolesModule, "executeVaultPause").mockImplementation(
      async ({ onState = () => undefined }) => {
        onState({ phase: "awaiting-signature" });
        onState({ hash: TX_HASH, phase: "pending" });
        onState({
          hash: TX_HASH,
          phase: "verifying",
          receipt: { blockNumber: 77n } as never,
        });
        onState({
          hash: TX_HASH,
          phase: "confirmed",
          receipt: { blockNumber: 77n } as never,
        });
        return {
          receipt: { blockNumber: 77n, transactionHash: TX_HASH } as never,
          result: {
            authorities: pausedAuthorities,
            auditRecord: {
              actor: ADMIN_ADDR,
              blockNumber: 77n,
              contractAddress: VAULT_ADDR,
              id: `${TX_HASH}-Paused`,
              txHash: TX_HASH,
              type: "Paused" as const,
            },
          },
        };
      },
    );

    renderControls(store);
    await screen.findByText("Current Authorities");
    fireEvent.click(screen.getByRole("button", { name: "Pause Operations" }));
    expect(screen.getByText("Paused Impact")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Sign on HSK Chain" }));

    expect(
      await screen.findByText(
        "Confirmed from receipt, block-pinned reads, and decoded events.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Verified Events From This Session")).toBeDefined();
    expect(screen.getByText("Vault operationally paused")).toBeDefined();
    expect(screen.getByText("Block #77")).toBeDefined();
  });

  it("shows wallet rejection truthfully and leaves no confirmed event", async () => {
    const store = await connectedStore(ADMIN_ADDR);
    vi.spyOn(rolesModule, "executeVaultPause").mockImplementation(
      async ({ onState = () => undefined }) => {
        const error = new WalletOperationError(
          "user-rejected",
          "The wallet request was rejected.",
        );
        onState({
          error,
          failedAt: "awaiting-signature",
          phase: "failed",
        });
        throw error;
      },
    );

    renderControls(store);
    await screen.findByText("Current Authorities");
    fireEvent.click(screen.getByRole("button", { name: "Pause Operations" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign on HSK Chain" }));

    expect(
      await screen.findByText(/The wallet request was rejected/),
    ).toBeDefined();
    expect(
      screen.getByText(/No receipt-decoded role rotation or emergency events/),
    ).toBeDefined();
  });

  it("lets each administrator rotate only its own contract authority", async () => {
    const store = await connectedStore(TOKEN_ADMIN_ADDR);
    renderControls(store);
    await screen.findByText("Current Authorities");

    const select = screen.getByLabelText("Select Authority Role");
    fireEvent.change(select, { target: { value: "TOKEN_ADMINISTRATOR" } });
    const input = screen.getByLabelText("New Authority Address (0x...)");
    fireEvent.change(input, { target: { value: OTHER_ADDR } });
    expect(
      screen.getByText(/transfers only the selected contract's authority/),
    ).toBeDefined();
    expect(
      screen.getByText(/The other contract administrator is unchanged/),
    ).toBeDefined();

    const rotate = screen.getByRole("button", {
      name: "Review & Rotate Role",
    });
    expect(rotate.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(rotate.hasAttribute("disabled")).toBe(false);
    fireEvent.click(rotate);
    expect(screen.getByText("Confirm Role Rotation")).toBeDefined();
    expect(screen.getByText(TOKEN_ADDR)).toBeDefined();
  });
});

function renderControls(store?: Awaited<ReturnType<typeof connectedStore>>) {
  return render(
    <AccessAndEmergencyControls
      store={store}
      tokenAddressOverride={TOKEN_ADDR}
      vaultAddressOverride={VAULT_ADDR}
    />,
  );
}

async function connectedStore(account: string) {
  const provider = new MockInjectedProvider(177, [account]);
  const store = createWalletStore(provider.asInjected());
  await store.initialize();
  return store;
}

class MockInjectedProvider {
  private readonly chainId: number;
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
    if (method === "eth_accounts" || method === "eth_requestAccounts") {
      return this.accounts;
    }
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
