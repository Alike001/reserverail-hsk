import type { Hash, TransactionReceipt } from "viem";
import { hskMainnet } from "../config/hsk";
import { hskPublicClient } from "./chain";
import {
  normalizeWalletError,
  revertedTransactionError,
  WalletOperationError,
  wrongNetworkError,
} from "./errors";

export type TransactionPhase =
  "awaiting-signature" | "confirmed" | "failed" | "pending" | "verifying";

export type TransactionState =
  | { phase: "awaiting-signature" }
  | { hash: Hash; phase: "pending" }
  | { hash: Hash; phase: "verifying"; receipt: TransactionReceipt }
  | { hash: Hash; phase: "confirmed"; receipt: TransactionReceipt }
  | {
      error: WalletOperationError;
      failedAt:
        Exclude<TransactionPhase, "confirmed" | "failed"> | "network-check";
      hash?: Hash;
      phase: "failed";
      receipt?: TransactionReceipt;
    };

type ExecuteTransactionOptions<Result> = {
  getChainId: () => Promise<number>;
  onState?: (state: TransactionState) => void;
  send: () => Promise<Hash>;
  verify: (receipt: TransactionReceipt) => Promise<Result>;
  waitForReceipt?: (hash: Hash) => Promise<TransactionReceipt>;
};

export async function executeHskTransaction<Result>({
  getChainId,
  onState = () => undefined,
  send,
  verify,
  waitForReceipt = (hash) =>
    hskPublicClient.waitForTransactionReceipt({ confirmations: 1, hash }),
}: ExecuteTransactionOptions<Result>): Promise<{
  receipt: TransactionReceipt;
  result: Result;
}> {
  let failedAt:
    Exclude<TransactionPhase, "confirmed" | "failed"> | "network-check" =
    "network-check";
  let hash: Hash | undefined;
  let receipt: TransactionReceipt | undefined;

  try {
    const chainId = await getChainId();
    if (chainId !== hskMainnet.id) throw wrongNetworkError(chainId);

    failedAt = "awaiting-signature";
    onState({ phase: "awaiting-signature" });
    hash = await send();

    failedAt = "pending";
    onState({ hash, phase: "pending" });
    receipt = await waitForReceipt(hash);
    if (receipt.status !== "success") throw revertedTransactionError();

    failedAt = "verifying";
    onState({ hash, phase: "verifying", receipt });
    const result = await verify(receipt);

    onState({ hash, phase: "confirmed", receipt });
    return { receipt, result };
  } catch (error) {
    const normalized = normalizeWalletError(error);
    onState({
      error: normalized,
      failedAt,
      ...(hash ? { hash } : {}),
      phase: "failed",
      ...(receipt ? { receipt } : {}),
    });
    throw normalized;
  }
}
