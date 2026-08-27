import type { Address } from "viem";
import type { WalletErrorKind } from "./errors";

export type WalletStatus =
  "connected" | "connecting" | "disconnected" | "unavailable";

export type WalletSnapshot = Readonly<{
  account?: Address;
  chainId?: number;
  error?: Readonly<{ kind: WalletErrorKind; message: string }>;
  isHskMainnet: boolean;
  isStale: boolean;
  status: WalletStatus;
}>;
