import { describe, expect, it, vi } from "vitest";
import type { Hash, TransactionReceipt } from "viem";
import { executeHskTransaction, type TransactionState } from "./transaction";

const HASH = `0x${"a".repeat(64)}` as Hash;

describe("HSK transaction lifecycle", () => {
  it("rejects the wrong chain before requesting a signature", async () => {
    const send = vi.fn<() => Promise<Hash>>();
    const states: TransactionState[] = [];

    await expect(
      executeHskTransaction({
        getChainId: async () => 133,
        onState: (state) => states.push(state),
        send,
        verify: async () => undefined,
      }),
    ).rejects.toMatchObject({ kind: "wrong-network" });

    expect(send).not.toHaveBeenCalled();
    expect(states).toMatchObject([
      {
        error: { kind: "wrong-network" },
        failedAt: "network-check",
        phase: "failed",
      },
    ]);
  });

  it("confirms only after the receipt and authoritative post-read", async () => {
    const states: TransactionState[] = [];
    const receipt = makeReceipt("success");
    let postReadCompleted = false;

    const result = await executeHskTransaction({
      getChainId: async () => 177,
      onState: (state) => {
        if (state.phase === "confirmed") expect(postReadCompleted).toBe(true);
        states.push(state);
      },
      send: async () => HASH,
      verify: async () => {
        postReadCompleted = true;
        return { reserve: 1_000_000n };
      },
      waitForReceipt: async () => receipt,
    });

    expect(result).toEqual({ receipt, result: { reserve: 1_000_000n } });
    expect(states.map((state) => state.phase)).toEqual([
      "awaiting-signature",
      "pending",
      "verifying",
      "confirmed",
    ]);
  });

  it("classifies a rejected signature separately", async () => {
    const states: TransactionState[] = [];

    await expect(
      executeHskTransaction({
        getChainId: async () => 177,
        onState: (state) => states.push(state),
        send: async () => {
          throw Object.assign(new Error("denied"), { code: 4001 });
        },
        verify: async () => undefined,
      }),
    ).rejects.toMatchObject({ kind: "user-rejected" });

    expect(states.at(-1)).toMatchObject({
      error: { kind: "user-rejected" },
      failedAt: "awaiting-signature",
      phase: "failed",
    });
  });

  it("does not run post-reads for a reverted receipt", async () => {
    const verify = vi.fn<() => Promise<void>>();

    await expect(
      executeHskTransaction({
        getChainId: async () => 177,
        send: async () => HASH,
        verify,
        waitForReceipt: async () => makeReceipt("reverted"),
      }),
    ).rejects.toMatchObject({ kind: "transaction-reverted" });

    expect(verify).not.toHaveBeenCalled();
  });
});

function makeReceipt(status: "reverted" | "success"): TransactionReceipt {
  return {
    blockHash: HASH,
    blockNumber: 1n,
    contractAddress: null,
    cumulativeGasUsed: 1n,
    effectiveGasPrice: 1n,
    from: "0x1111111111111111111111111111111111111111",
    gasUsed: 1n,
    logs: [],
    logsBloom: `0x${"0".repeat(512)}`,
    status,
    to: "0x2222222222222222222222222222222222222222",
    transactionHash: HASH,
    transactionIndex: 0,
    type: "eip1559",
  };
}
