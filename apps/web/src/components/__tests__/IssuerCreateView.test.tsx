import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssuerCreateView } from "../IssuerCreateView";
import * as issuerModule from "../../wallet/issuer";
import { WalletOperationError } from "../../wallet/errors";
import { createWalletStore } from "../../wallet/store";
import type { InjectedProvider } from "../../wallet/provider";

const MOCK_ACCOUNT = "0x1111111111111111111111111111111111111111";
const MOCK_FACTORY = "0x8888888888888888888888888888888888888888";
const MOCK_TOKEN = "0x2222222222222222222222222222222222222222";
const MOCK_VAULT = "0x3333333333333333333333333333333333333333";
const MOCK_TX =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("IssuerCreateView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders truthful undeployed message when factory address is missing", () => {
    render(<IssuerCreateView factoryAddressOverride={null} />);
    expect(screen.getByText("Stablecoin Factory Undeployed")).toBeDefined();
    expect(
      screen.getByText(/The factory contract is not yet committed/),
    ).toBeDefined();
  });

  it("renders creation form, validates inputs, and opens pre-sign review", async () => {
    const provider = new MockInjectedProvider(177, [MOCK_ACCOUNT]);
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    render(
      <IssuerCreateView store={store} factoryAddressOverride={MOCK_FACTORY} />,
    );

    // Form inputs
    const nameInput = screen.getByLabelText("Stablecoin Name");
    const symbolInput = screen.getByLabelText("Token Symbol");
    const amountInput = screen.getByLabelText(
      /Initial Reserve Deposit \(USDC\.e\)/,
    );

    fireEvent.change(nameInput, { target: { value: "Reserve USD" } });
    fireEvent.change(symbolInput, { target: { value: "RUSD" } });
    fireEvent.change(amountInput, { target: { value: "250.50" } });

    const reviewBtn = screen.getByRole("button", {
      name: "Review Pre-Sign Sequence",
    });
    fireEvent.click(reviewBtn);

    // Modal review must appear
    expect(
      await screen.findByText("Review Issuance & Mint Plan"),
    ).toBeDefined();
    expect(screen.getByText("Reserve USD (RUSD)")).toBeDefined();
    expect(
      screen.getByText(/250\.5 USDC\.e \(250500000 base units\)/),
    ).toBeDefined();
    expect(
      screen.getByText(/0x054ed45810DbBAb8B27668922D110669c9D88D0a/),
    ).toBeDefined();
    expect(screen.getByText("HSK Chain (Chain ID 177)")).toBeDefined();
  });

  it("completes full 3-step pipeline: Create -> Approve -> Deposit/Mint -> Reconciliation", async () => {
    const provider = new MockInjectedProvider(177, [MOCK_ACCOUNT]);
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    vi.spyOn(issuerModule, "executeCreateIssuer").mockResolvedValue({
      receipt: { transactionHash: MOCK_TX } as any,
      result: {
        issuer: MOCK_ACCOUNT,
        token: MOCK_TOKEN,
        vault: MOCK_VAULT,
        reserveAsset: issuerModule.HSK_MAINNET_USDC_E,
        version: 1n,
        name: "Reserve USD",
        symbol: "RUSD",
      },
    });

    vi.spyOn(issuerModule, "executeApproveReserve").mockResolvedValue({
      receipt: { transactionHash: MOCK_TX } as any,
      result: 100_000_000n,
    });

    vi.spyOn(issuerModule, "executeDepositAndMint").mockResolvedValue({
      receipt: { transactionHash: MOCK_TX } as any,
      result: 100_000_000n,
    });

    vi.spyOn(issuerModule, "reconcileIssuerMint").mockResolvedValue({
      vaultReserveBalance: 100_000_000n,
      tokenTotalSupply: 100_000_000n,
      recipientBalance: 100_000_000n,
      isReconciled: true,
    });

    const onSuccessNavigate = vi.fn();
    render(
      <IssuerCreateView
        store={store}
        factoryAddressOverride={MOCK_FACTORY}
        onSuccessNavigate={onSuccessNavigate}
      />,
    );

    fireEvent.change(screen.getByLabelText("Stablecoin Name"), {
      target: { value: "Reserve USD" },
    });
    fireEvent.change(screen.getByLabelText("Token Symbol"), {
      target: { value: "RUSD" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Review Pre-Sign Sequence" }),
    );

    const proceedBtn = await screen.findByRole("button", {
      name: "Proceed to Step 1 Signature",
    });
    fireEvent.click(proceedBtn);

    // Step 1: Deploy Token & Vault Clones
    await waitFor(() => {
      expect(screen.getByText("CONFIRMED")).toBeDefined();
      expect(screen.getByText(new RegExp(MOCK_TOKEN))).toBeDefined();
      expect(screen.getByText(new RegExp(MOCK_VAULT))).toBeDefined();
    });

    // Step 2: Sign Step 2 Approval
    const signStep2 = await screen.findByRole("button", {
      name: "Sign Step 2 Approval",
    });
    fireEvent.click(signStep2);

    await waitFor(() => {
      expect(screen.getByText("APPROVED")).toBeDefined();
    });

    // Step 3: Sign Step 3 Mint
    const signStep3 = await screen.findByRole("button", {
      name: "Sign Step 3 Mint",
    });
    fireEvent.click(signStep3);

    // Final Success & Reconciliation View
    await waitFor(() => {
      expect(
        screen.getByText("Stablecoin Deployed & Reconciled"),
      ).toBeDefined();
      expect(screen.getByText("🛡️ 100% Reserve Backed")).toBeDefined();
      expect(screen.getByText(/100 USDC\.e/)).toBeDefined();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Manage Vault Controls" }),
    );
    expect(onSuccessNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        token: MOCK_TOKEN,
        vault: MOCK_VAULT,
      }),
    );
  });

  it("retries only reconciliation after a confirmed mint and never resubmits depositAndMint", async () => {
    const provider = new MockInjectedProvider(177, [MOCK_ACCOUNT]);
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    vi.spyOn(issuerModule, "executeCreateIssuer").mockResolvedValue({
      receipt: { transactionHash: MOCK_TX } as any,
      result: {
        issuer: MOCK_ACCOUNT,
        token: MOCK_TOKEN,
        vault: MOCK_VAULT,
        reserveAsset: issuerModule.HSK_MAINNET_USDC_E,
        version: 1n,
        name: "Reserve USD",
        symbol: "RUSD",
      },
    });
    vi.spyOn(issuerModule, "executeApproveReserve").mockResolvedValue({
      receipt: { transactionHash: MOCK_TX } as any,
      result: 100_000_000n,
    });
    const executeMint = vi
      .spyOn(issuerModule, "executeDepositAndMint")
      .mockResolvedValue({
        receipt: { transactionHash: MOCK_TX } as any,
        result: 100_000_000n,
      });
    const reconcile = vi
      .spyOn(issuerModule, "reconcileIssuerMint")
      .mockResolvedValueOnce({
        vaultReserveBalance: 100_000_000n,
        tokenTotalSupply: 100_000_000n,
        recipientBalance: 0n,
        isReconciled: false,
        reconciliationError:
          "Recipient reconciliation mismatch: recipient balance is 0.",
      })
      .mockResolvedValueOnce({
        vaultReserveBalance: 100_000_000n,
        tokenTotalSupply: 100_000_000n,
        recipientBalance: 100_000_000n,
        isReconciled: true,
      });

    render(
      <IssuerCreateView store={store} factoryAddressOverride={MOCK_FACTORY} />,
    );
    fireEvent.change(screen.getByLabelText("Stablecoin Name"), {
      target: { value: "Reserve USD" },
    });
    fireEvent.change(screen.getByLabelText("Token Symbol"), {
      target: { value: "RUSD" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Review Pre-Sign Sequence" }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Proceed to Step 1 Signature",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Sign Step 2 Approval" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Sign Step 3 Mint" }),
    );

    const retryVerification = await screen.findByRole("button", {
      name: "Retry On-Chain Verification",
    });
    expect(screen.getByText("MINTED · VERIFICATION NEEDED")).toBeDefined();
    expect(screen.getByText(/Recipient reconciliation mismatch/)).toBeDefined();
    expect(executeMint).toHaveBeenCalledTimes(1);

    fireEvent.click(retryVerification);
    await waitFor(() => {
      expect(
        screen.getByText("Stablecoin Deployed & Reconciled"),
      ).toBeDefined();
    });
    expect(executeMint).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(2);
  });

  it("does not resubmit mint when its receipt succeeded but the first post-read failed", async () => {
    const provider = new MockInjectedProvider(177, [MOCK_ACCOUNT]);
    const store = createWalletStore(provider.asInjected());
    await store.initialize();

    vi.spyOn(issuerModule, "executeCreateIssuer").mockResolvedValue({
      receipt: { transactionHash: MOCK_TX } as any,
      result: {
        issuer: MOCK_ACCOUNT,
        token: MOCK_TOKEN,
        vault: MOCK_VAULT,
        reserveAsset: issuerModule.HSK_MAINNET_USDC_E,
        version: 1n,
        name: "Reserve USD",
        symbol: "RUSD",
      },
    });
    vi.spyOn(issuerModule, "executeApproveReserve").mockResolvedValue({
      receipt: { transactionHash: MOCK_TX } as any,
      result: 100_000_000n,
    });

    const successfulReceipt = {
      status: "success",
      transactionHash: MOCK_TX,
    } as any;
    const postReadError = new WalletOperationError(
      "rpc",
      "Mint receipt succeeded, but the reserve post-read was unavailable.",
    );
    const executeMint = vi
      .spyOn(issuerModule, "executeDepositAndMint")
      .mockImplementation(async ({ onState }) => {
        onState?.({
          error: postReadError,
          failedAt: "verifying",
          hash: MOCK_TX,
          phase: "failed",
          receipt: successfulReceipt,
        });
        throw postReadError;
      });
    const reconcile = vi
      .spyOn(issuerModule, "reconcileIssuerMint")
      .mockResolvedValue({
        vaultReserveBalance: 100_000_000n,
        tokenTotalSupply: 100_000_000n,
        recipientBalance: 100_000_000n,
        isReconciled: true,
      });

    render(
      <IssuerCreateView store={store} factoryAddressOverride={MOCK_FACTORY} />,
    );
    fireEvent.change(screen.getByLabelText("Stablecoin Name"), {
      target: { value: "Reserve USD" },
    });
    fireEvent.change(screen.getByLabelText("Token Symbol"), {
      target: { value: "RUSD" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Review Pre-Sign Sequence" }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Proceed to Step 1 Signature",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Sign Step 2 Approval" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Sign Step 3 Mint" }),
    );

    const retryVerification = await screen.findByRole("button", {
      name: "Retry On-Chain Verification",
    });
    expect(
      screen.getByText(/Mint receipt succeeded, but the reserve post-read/),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Retry Step 3" })).toBeNull();

    fireEvent.click(retryVerification);
    await waitFor(() => {
      expect(
        screen.getByText("Stablecoin Deployed & Reconciled"),
      ).toBeDefined();
    });
    expect(executeMint).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
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
