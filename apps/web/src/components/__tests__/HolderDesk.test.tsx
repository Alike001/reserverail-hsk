import { fireEvent, render, screen, within } from "@testing-library/react";
import type { TransactionReceipt } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InjectedProvider } from "../../wallet/provider";
import { WalletOperationError } from "../../wallet/errors";
import * as holderModule from "../../wallet/holder";
import { createWalletStore } from "../../wallet/store";
import { HolderDesk } from "../HolderDesk";

const HOLDER = "0x1111111111111111111111111111111111111111";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const TOKEN = "0x3333333333333333333333333333333333333333";
const VAULT = "0x4444444444444444444444444444444444444444";
const RESERVE = "0x054ed45810DbBAb8B27668922D110669c9D88D0a";
const HASH = `0x${"ab".repeat(32)}` as const;

const POSITION: holderModule.HolderPosition = {
  blockNumber: 100n,
  holder: HOLDER,
  isFullyBacked: true,
  operationallyPaused: false,
  reserveAsset: RESERVE,
  reserveBalance: 8_000_000n,
  reserveDecimals: 6,
  tokenAddress: TOKEN,
  tokenBalance: 25_000_000n,
  tokenDecimals: 6,
  tokenName: "Reserve USD",
  tokenSymbol: "rUSD",
  totalSupply: 100_000_000n,
  vaultAddress: VAULT,
  vaultReserveBalance: 100_000_000n,
};

const RECEIPT = {
  blockNumber: 101n,
  logs: [],
  status: "success",
  transactionHash: HASH,
} as unknown as TransactionReceipt;

describe("HolderDesk", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(holderModule, "fetchHolderPosition").mockResolvedValue(POSITION);
  });

  it("renders a truthful unavailable state without committed pair addresses", () => {
    render(<HolderDesk />);
    expect(
      screen.getByText("Holder route awaiting a deployed pair"),
    ).toBeDefined();
    expect(screen.getByText(/will not show fixture balances/)).toBeDefined();
  });

  it("shows block-pinned holder and reserve balances", async () => {
    renderDesk(await connectedStore());
    expect(await screen.findByText("Your balances")).toBeDefined();
    expect(screen.getAllByText("25").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("8")).toBeDefined();
    expect(screen.getByText("Vault reserves cover total supply")).toBeDefined();
    expect(screen.getByText(/Read at block #100/)).toBeDefined();
  });

  it("replaces holder values with an unavailable state when RPC reads fail", async () => {
    vi.mocked(holderModule.fetchHolderPosition).mockRejectedValue(
      new Error("HSK RPC unavailable"),
    );
    renderDesk(await connectedStore());
    expect(await screen.findByText("HSK RPC unavailable")).toBeDefined();
    expect(screen.queryByText("Vault reserves cover total supply")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("disables paused transfers while preserving redemption", async () => {
    vi.mocked(holderModule.fetchHolderPosition).mockResolvedValue({
      ...POSITION,
      operationallyPaused: true,
    });
    renderDesk(await connectedStore());
    const transfer = await actionSection("Transfer stablecoin");
    const redemption = await actionSection("Redeem for USDC.e");

    fireEvent.change(within(transfer).getByLabelText("Amount (rUSD)"), {
      target: { value: "1" },
    });
    fireEvent.change(within(transfer).getByLabelText("Recipient HSK address"), {
      target: { value: RECIPIENT },
    });
    expect(
      within(transfer)
        .getByRole("button", { name: "Review Transfer" })
        .hasAttribute("disabled"),
    ).toBe(true);

    fireEvent.change(within(redemption).getByLabelText("Amount (rUSD)"), {
      target: { value: "1" },
    });
    expect(
      within(redemption)
        .getByRole("button", { name: "Review Redemption" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(
      within(redemption).getByText(/preserves ordinary holder redemption/),
    ).toBeDefined();
  });

  it("reviews and confirms a transfer only after reconciled reads", async () => {
    const baseline: holderModule.TransferBaseline = {
      position: POSITION,
      recipient: RECIPIENT,
      recipientBalance: 5_000_000n,
    };
    vi.spyOn(holderModule, "prepareHolderTransfer").mockResolvedValue(baseline);
    vi.spyOn(holderModule, "executeHolderTransfer").mockImplementation(
      async ({ onState = () => undefined }) => {
        onState({ phase: "awaiting-signature" });
        onState({ hash: HASH, phase: "pending" });
        onState({ hash: HASH, phase: "verifying", receipt: RECEIPT });
        onState({ hash: HASH, phase: "confirmed", receipt: RECEIPT });
        return {
          receipt: RECEIPT,
          result: {
            blockNumber: 101n,
            position: {
              ...POSITION,
              blockNumber: 101n,
              tokenBalance: 24_000_000n,
            },
          },
        };
      },
    );

    renderDesk(await connectedStore());
    const transfer = await actionSection("Transfer stablecoin");
    fireEvent.change(within(transfer).getByLabelText("Amount (rUSD)"), {
      target: { value: "1" },
    });
    fireEvent.change(within(transfer).getByLabelText("Recipient HSK address"), {
      target: { value: RECIPIENT },
    });
    fireEvent.click(
      within(transfer).getByRole("button", { name: "Review Transfer" }),
    );
    expect(screen.getByText("Confirm token transfer")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Sign Transfer on HSK" }),
    );

    expect(
      await screen.findByText("Transfer confirmed and reconciled"),
    ).toBeDefined();
    expect(holderModule.executeHolderTransfer).toHaveBeenCalledTimes(1);
  });

  it("executes redemption while paused and refreshes the reconciled position", async () => {
    const pausedPosition = { ...POSITION, operationallyPaused: true };
    vi.mocked(holderModule.fetchHolderPosition).mockResolvedValue(
      pausedPosition,
    );
    const baseline: holderModule.RedemptionBaseline = {
      position: pausedPosition,
      recipient: HOLDER,
      recipientReserveBalance: 8_000_000n,
    };
    vi.spyOn(holderModule, "prepareHolderRedemption").mockResolvedValue(
      baseline,
    );
    const execute = vi
      .spyOn(holderModule, "executeHolderRedemption")
      .mockImplementation(async ({ onState = () => undefined }) => {
        onState({ hash: HASH, phase: "pending" });
        onState({ hash: HASH, phase: "confirmed", receipt: RECEIPT });
        return {
          receipt: RECEIPT,
          result: {
            blockNumber: 101n,
            position: {
              ...pausedPosition,
              blockNumber: 101n,
              reserveBalance: 9_000_000n,
              tokenBalance: 24_000_000n,
              totalSupply: 99_000_000n,
              vaultReserveBalance: 99_000_000n,
            },
          },
        };
      });

    renderDesk(await connectedStore());
    const redemption = await actionSection("Redeem for USDC.e");
    fireEvent.change(within(redemption).getByLabelText("Amount (rUSD)"), {
      target: { value: "1" },
    });
    fireEvent.click(
      within(redemption).getByRole("button", { name: "Review Redemption" }),
    );
    expect(screen.getByText("Confirm 1:1 redemption")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Sign Redemption on HSK" }),
    );

    expect(
      await screen.findByText("Redemption confirmed and reconciled"),
    ).toBeDefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("retries verification without resubmitting a successful transaction", async () => {
    const baseline: holderModule.TransferBaseline = {
      position: POSITION,
      recipient: RECIPIENT,
      recipientBalance: 5_000_000n,
    };
    vi.spyOn(holderModule, "prepareHolderTransfer").mockResolvedValue(baseline);
    const verificationError = new WalletOperationError(
      "rpc",
      "HSK post-read unavailable",
    );
    const execute = vi
      .spyOn(holderModule, "executeHolderTransfer")
      .mockImplementation(async ({ onState = () => undefined }) => {
        onState({ hash: HASH, phase: "verifying", receipt: RECEIPT });
        onState({
          error: verificationError,
          failedAt: "verifying",
          hash: HASH,
          phase: "failed",
          receipt: RECEIPT,
        });
        throw verificationError;
      });
    const reconcile = vi
      .spyOn(holderModule, "reconcileHolderTransfer")
      .mockResolvedValue({
        blockNumber: 101n,
        position: { ...POSITION, blockNumber: 101n, tokenBalance: 24_000_000n },
      });

    renderDesk(await connectedStore());
    const transfer = await actionSection("Transfer stablecoin");
    fireEvent.change(within(transfer).getByLabelText("Amount (rUSD)"), {
      target: { value: "1" },
    });
    fireEvent.change(within(transfer).getByLabelText("Recipient HSK address"), {
      target: { value: RECIPIENT },
    });
    fireEvent.click(
      within(transfer).getByRole("button", { name: "Review Transfer" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Sign Transfer on HSK" }),
    );

    expect(
      await screen.findByText(/do not submit another transfer/),
    ).toBeDefined();
    fireEvent.change(within(transfer).getByLabelText("Amount (rUSD)"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry Verification" }));
    expect(
      await screen.findByText("Transfer confirmed and reconciled"),
    ).toBeDefined();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1_000_000n }),
    );
  });
});

function renderDesk(store: Awaited<ReturnType<typeof connectedStore>>) {
  return render(
    <HolderDesk
      store={store}
      tokenAddressOverride={TOKEN}
      vaultAddressOverride={VAULT}
    />,
  );
}

async function actionSection(title: string): Promise<HTMLElement> {
  const heading = await screen.findByRole("heading", { name: title });
  const section = heading.closest("section");
  if (!section) throw new Error(`Missing action section for ${title}`);
  return section;
}

async function connectedStore() {
  const provider = new MockInjectedProvider(177, [HOLDER]);
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

  constructor(chainId: number, accounts: string[]) {
    this.chainId = chainId;
    this.accounts = accounts;
  }

  asInjected(): InjectedProvider {
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
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeListener(event: string, listener: (...parameters: unknown[]) => void) {
    this.listeners.get(event)?.delete(listener);
  }
}
