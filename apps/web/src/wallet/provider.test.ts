import { describe, expect, it } from "vitest";
import { hskChain } from "./chain";
import {
  normalizeWalletError,
  revertedTransactionError,
  wrongNetworkError,
} from "./errors";
import {
  getInjectedProvider,
  parseProviderAccount,
  parseProviderChainId,
} from "./provider";

describe("HSK wallet primitives", () => {
  it("defines HSK mainnet from checked configuration", () => {
    expect(hskChain.id).toBe(177);
    expect(hskChain.nativeCurrency.symbol).toBe("HSK");
    expect(hskChain.rpcUrls.default.http).toEqual(["https://mainnet.hsk.xyz"]);
    expect(hskChain.blockExplorers?.default.url).toBe(
      "https://hashkey.blockscout.com",
    );
  });

  it("accepts only a request-capable injected provider", () => {
    const provider = { request: () => Promise.resolve(null) };
    expect(getInjectedProvider({ ethereum: provider })).toBe(provider);
    expect(getInjectedProvider({ ethereum: {} })).toBeUndefined();
    expect(getInjectedProvider({})).toBeUndefined();
  });

  it("parses provider chain IDs and accounts defensively", () => {
    expect(parseProviderChainId("0xb1")).toBe(177);
    expect(parseProviderChainId(133)).toBe(133);
    expect(() => parseProviderChainId("not-a-chain")).toThrow(
      "Wallet returned an invalid chain ID",
    );
    expect(
      parseProviderAccount(["0x1111111111111111111111111111111111111111"]),
    ).toBe("0x1111111111111111111111111111111111111111");
    expect(parseProviderAccount([])).toBeUndefined();
  });

  it("separates rejection, provider, chain, and transaction failures", () => {
    expect(normalizeWalletError({ code: 4001 }).kind).toBe("user-rejected");
    expect(normalizeWalletError({ cause: { code: 4902 } }).kind).toBe(
      "unsupported-chain",
    );
    expect(normalizeWalletError({ code: -32603 }).kind).toBe("rpc");
    expect(wrongNetworkError(133).kind).toBe("wrong-network");
    expect(revertedTransactionError().kind).toBe("transaction-reverted");
  });
});
