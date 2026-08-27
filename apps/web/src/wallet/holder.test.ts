import {
  encodeAbiParameters,
  encodeEventTopics,
  type Address,
  type TransactionReceipt,
} from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  executeHolderTransfer,
  fetchHolderPosition,
  holderTokenAbi,
  holderVaultAbi,
  parseHolderAmount,
  prepareHolderRedemption,
  prepareHolderTransfer,
  reconcileHolderRedemption,
  reconcileHolderTransfer,
  validateHolderRecipient,
  type HolderPublicClient,
} from "./holder";

const HOLDER = "0x1111111111111111111111111111111111111111";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const TOKEN = "0x3333333333333333333333333333333333333333";
const VAULT = "0x4444444444444444444444444444444444444444";
const RESERVE = "0x054ed45810DbBAb8B27668922D110669c9D88D0a";
const OTHER = "0x6666666666666666666666666666666666666666";
const HASH = `0x${"ab".repeat(32)}` as const;

describe("holder transfer and redemption service", () => {
  it("parses exact token units and rejects unsafe amounts and recipients", () => {
    expect(parseHolderAmount("12.345678", 6, 20_000_000n)).toMatchObject({
      amount: 12_345_678n,
      valid: true,
    });
    expect(parseHolderAmount("1.0000001", 6, 20_000_000n).valid).toBe(false);
    expect(parseHolderAmount("21", 6, 20_000_000n).error).toMatch(/exceeds/);
    expect(validateHolderRecipient(HOLDER, HOLDER, true).valid).toBe(false);
    expect(validateHolderRecipient(RECIPIENT, HOLDER, true)).toMatchObject({
      address: RECIPIENT,
      valid: true,
    });
  });

  it("reads a paired holder position at one block and reports backing", async () => {
    const client = mockPublicClient();
    const position = await fetchHolderPosition({
      client,
      holder: HOLDER,
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
    });

    expect(position).toMatchObject({
      blockNumber: 10n,
      holder: HOLDER,
      isFullyBacked: true,
      reserveAsset: RESERVE,
      tokenBalance: 100_000_000n,
      tokenDecimals: 6,
      tokenSymbol: "rUSD",
      vaultReserveBalance: 100_000_000n,
    });
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ blockNumber: 10n }),
    );
  });

  it("rejects a forged token-vault pair and mismatched pause state", async () => {
    await expect(
      fetchHolderPosition({
        client: mockPublicClient({ tokenVault: OTHER }),
        holder: HOLDER,
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
      }),
    ).rejects.toMatchObject({ kind: "rpc" });

    await expect(
      fetchHolderPosition({
        client: mockPublicClient({ paused: true, tokenPaused: false }),
        holder: HOLDER,
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
      }),
    ).rejects.toThrow(/pause reads disagree/);
  });

  it("blocks transfers while paused but keeps redemption preparation available", async () => {
    const client = mockPublicClient({ paused: true });
    await expect(
      prepareHolderTransfer({
        client,
        holder: HOLDER,
        recipient: RECIPIENT,
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
      }),
    ).rejects.toMatchObject({ kind: "unauthorized" });

    const redemption = await prepareHolderRedemption({
      client,
      holder: HOLDER,
      recipient: HOLDER,
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
    });
    expect(redemption.position.operationallyPaused).toBe(true);
    expect(redemption.recipientReserveBalance).toBe(10_000_000n);
  });

  it("executes a real transfer lifecycle and reconciles exact post-reads", async () => {
    const client = mockPublicClient({ afterAction: "transfer" });
    const baseline = await prepareHolderTransfer({
      client,
      holder: HOLDER,
      recipient: RECIPIENT,
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
    });
    const receipt = transferReceipt(20_000_000n);
    client.waitForTransactionReceipt.mockResolvedValue(receipt);
    const states: string[] = [];
    const walletClient = {
      getChainId: vi.fn().mockResolvedValue(177),
      sendTransaction: vi.fn().mockResolvedValue(HASH),
    };

    const result = await executeHolderTransfer({
      account: HOLDER,
      amount: 20_000_000n,
      baseline,
      onState: (state) => states.push(state.phase),
      publicClient: client,
      walletClient: walletClient as never,
    });

    expect(states).toEqual([
      "awaiting-signature",
      "pending",
      "verifying",
      "confirmed",
    ]);
    expect(result.result.position.tokenBalance).toBe(80_000_000n);
    expect(walletClient.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ account: HOLDER, to: TOKEN }),
    );
  });

  it("reconciles a paused redemption from its vault event and four deltas", async () => {
    const client = mockPublicClient({
      afterAction: "redemption",
      paused: true,
    });
    const baseline = await prepareHolderRedemption({
      client,
      holder: HOLDER,
      recipient: HOLDER,
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
    });
    const result = await reconcileHolderRedemption({
      amount: 20_000_000n,
      baseline,
      blockNumber: 12n,
      client,
      receipt: redemptionReceipt(20_000_000n),
    });

    expect(result.position.operationallyPaused).toBe(true);
    expect(result.position.tokenBalance).toBe(80_000_000n);
    expect(result.position.reserveBalance).toBe(30_000_000n);
    expect(result.position.totalSupply).toBe(80_000_000n);
  });

  it("rejects a receipt that lacks the exact action event", async () => {
    const client = mockPublicClient({ afterAction: "transfer" });
    const baseline = await prepareHolderTransfer({
      client,
      holder: HOLDER,
      recipient: RECIPIENT,
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
    });
    await expect(
      reconcileHolderTransfer({
        amount: 20_000_000n,
        baseline,
        blockNumber: 11n,
        client,
        receipt: { ...transferReceipt(20_000_000n), logs: [] },
      }),
    ).rejects.toThrow(/matching token Transfer event/);
  });

  it("reports wrong-network, wallet rejection, and reverted receipt states", async () => {
    const publicClient = mockPublicClient();
    const baseline = await prepareHolderTransfer({
      client: publicClient,
      holder: HOLDER,
      recipient: RECIPIENT,
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
    });
    const wrongNetworkWallet = {
      getChainId: vi.fn().mockResolvedValue(1),
      sendTransaction: vi.fn(),
    };
    await expect(
      executeHolderTransfer({
        account: HOLDER,
        amount: 1_000_000n,
        baseline,
        publicClient,
        walletClient: wrongNetworkWallet as never,
      }),
    ).rejects.toMatchObject({ kind: "wrong-network" });
    expect(wrongNetworkWallet.sendTransaction).not.toHaveBeenCalled();

    const rejectedWallet = {
      getChainId: vi.fn().mockResolvedValue(177),
      sendTransaction: vi.fn().mockRejectedValue({ code: 4001 }),
    };
    await expect(
      executeHolderTransfer({
        account: HOLDER,
        amount: 1_000_000n,
        baseline,
        publicClient,
        walletClient: rejectedWallet as never,
      }),
    ).rejects.toMatchObject({ kind: "user-rejected" });

    publicClient.waitForTransactionReceipt.mockResolvedValue({
      ...transferReceipt(1_000_000n),
      status: "reverted",
    });
    await expect(
      executeHolderTransfer({
        account: HOLDER,
        amount: 1_000_000n,
        baseline,
        publicClient,
        walletClient: {
          getChainId: vi.fn().mockResolvedValue(177),
          sendTransaction: vi.fn().mockResolvedValue(HASH),
        } as never,
      }),
    ).rejects.toMatchObject({ kind: "transaction-reverted" });
  });
});

function mockPublicClient({
  afterAction,
  paused = false,
  tokenPaused = paused,
  tokenVault = VAULT,
}: {
  afterAction?: "redemption" | "transfer";
  paused?: boolean;
  tokenPaused?: boolean;
  tokenVault?: Address;
} = {}) {
  const client = {
    getBlockNumber: vi.fn().mockResolvedValue(10n),
    readContract: vi.fn(async (request: any) => {
      const after = request.blockNumber > 10n;
      const functionName = request.functionName;
      if (functionName === "vault") return tokenVault;
      if (functionName === "issuerToken") return TOKEN;
      if (functionName === "reserveAsset") return RESERVE;
      if (functionName === "name") return "Reserve USD";
      if (functionName === "symbol") return "rUSD";
      if (functionName === "decimals") return 6;
      if (functionName === "paused") return tokenPaused;
      if (functionName === "operationallyPaused") return paused;
      if (functionName === "totalSupply") {
        return after && afterAction === "redemption"
          ? 80_000_000n
          : 100_000_000n;
      }
      if (functionName === "reserveBalance") {
        return after && afterAction === "redemption"
          ? 80_000_000n
          : 100_000_000n;
      }
      if (functionName === "balanceOf") {
        const account = request.args[0];
        if (request.address === TOKEN) {
          if (account === HOLDER) {
            return after && afterAction ? 80_000_000n : 100_000_000n;
          }
          if (account === RECIPIENT) {
            return after && afterAction === "transfer"
              ? 25_000_000n
              : 5_000_000n;
          }
        }
        if (request.address === RESERVE) {
          if (account === HOLDER) {
            return after && afterAction === "redemption"
              ? 30_000_000n
              : 10_000_000n;
          }
          return 5_000_000n;
        }
      }
      throw new Error(`Unhandled ${functionName}`);
    }),
    waitForTransactionReceipt: vi.fn(),
  };
  return client as unknown as HolderPublicClient & typeof client;
}

function transferReceipt(amount: bigint): TransactionReceipt {
  return {
    blockNumber: 11n,
    logs: [
      {
        address: TOKEN,
        data: encodeAbiParameters([{ type: "uint256" }], [amount]),
        topics: encodeEventTopics({
          abi: holderTokenAbi,
          eventName: "Transfer",
          args: { from: HOLDER, to: RECIPIENT },
        }),
      },
    ],
    status: "success",
    transactionHash: HASH,
  } as unknown as TransactionReceipt;
}

function redemptionReceipt(amount: bigint): TransactionReceipt {
  return {
    blockNumber: 12n,
    logs: [
      {
        address: VAULT,
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [amount, amount],
        ),
        topics: encodeEventTopics({
          abi: holderVaultAbi,
          eventName: "Redeemed",
          args: { holder: HOLDER, issuerToken: TOKEN, recipient: HOLDER },
        }),
      },
    ],
    status: "success",
    transactionHash: HASH,
  } as unknown as TransactionReceipt;
}
