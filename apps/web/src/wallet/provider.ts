import { getAddress, type Address, type EIP1193Provider } from "viem";

type ProviderListener = (...parameters: unknown[]) => void;

export type InjectedProvider = EIP1193Provider & {
  on?: (event: string, listener: ProviderListener) => void;
  removeListener?: (event: string, listener: ProviderListener) => void;
};

export function getInjectedProvider(
  scope: unknown = globalThis,
): InjectedProvider | undefined {
  if (typeof scope !== "object" || scope === null || !("ethereum" in scope)) {
    return undefined;
  }

  const provider = scope.ethereum;

  if (
    typeof provider !== "object" ||
    provider === null ||
    !("request" in provider) ||
    typeof provider.request !== "function"
  ) {
    return undefined;
  }

  return provider as InjectedProvider;
}

export function parseProviderChainId(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, value.startsWith("0x") ? 16 : 10)
        : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Wallet returned an invalid chain ID");
  }

  return parsed;
}

export function parseProviderAccount(value: unknown): Address | undefined {
  if (!Array.isArray(value) || typeof value[0] !== "string") return undefined;
  return getAddress(value[0]);
}
