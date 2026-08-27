export type WalletErrorKind =
  | "disconnected"
  | "no-wallet"
  | "rpc"
  | "transaction-reverted"
  | "unauthorized"
  | "unknown"
  | "unsupported"
  | "unsupported-chain"
  | "user-rejected"
  | "wrong-network";

export class WalletOperationError extends Error {
  readonly kind: WalletErrorKind;
  readonly originalError?: unknown;

  constructor(kind: WalletErrorKind, message: string, originalError?: unknown) {
    super(message);
    this.name = "WalletOperationError";
    this.kind = kind;
    this.originalError = originalError;
  }
}

export function normalizeWalletError(error: unknown): WalletOperationError {
  if (error instanceof WalletOperationError) {
    return error;
  }

  const code = findProviderCode(error);

  if (code === 4001) {
    return new WalletOperationError(
      "user-rejected",
      "The wallet request was rejected.",
      error,
    );
  }

  if (code === 4100) {
    return new WalletOperationError(
      "unauthorized",
      "The wallet has not authorized this account or action.",
      error,
    );
  }

  if (code === 4200) {
    return new WalletOperationError(
      "unsupported",
      "The connected wallet does not support this request.",
      error,
    );
  }

  if (code === 4900 || code === 4901) {
    return new WalletOperationError(
      "disconnected",
      "The wallet is disconnected from the requested network.",
      error,
    );
  }

  if (code === 4902 || code === 5710) {
    return new WalletOperationError(
      "unsupported-chain",
      "HSK Chain is not configured in the connected wallet.",
      error,
    );
  }

  if (typeof code === "number") {
    return new WalletOperationError(
      "rpc",
      "The wallet or RPC could not complete the request.",
      error,
    );
  }

  return new WalletOperationError(
    "unknown",
    error instanceof Error && error.message
      ? error.message
      : "The wallet request failed unexpectedly.",
    error,
  );
}

export function wrongNetworkError(
  receivedChainId: number,
): WalletOperationError {
  return new WalletOperationError(
    "wrong-network",
    `Switch to HSK Chain mainnet (177) before signing. Connected chain: ${receivedChainId}.`,
  );
}

export function revertedTransactionError(): WalletOperationError {
  return new WalletOperationError(
    "transaction-reverted",
    "The transaction was confirmed but reverted on HSK Chain.",
  );
}

function findProviderCode(value: unknown, depth = 0): number | undefined {
  if (depth > 5 || typeof value !== "object" || value === null) {
    return undefined;
  }

  if ("code" in value && typeof value.code === "number") {
    return value.code;
  }

  if ("cause" in value) {
    return findProviderCode(value.cause, depth + 1);
  }

  return undefined;
}
