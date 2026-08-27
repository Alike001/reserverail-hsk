import { describe, expect, it, vi } from "vitest";
import { HSK_MAINNET_USDC_E } from "./issuer";
import {
  fetchPilotProof,
  formatCoverage,
  type DeployedManifest,
  type ProofPublicClient,
} from "./proof";

const factory = "0x1111111111111111111111111111111111111111" as const;
const token = "0x2222222222222222222222222222222222222222" as const;
const vault = "0x3333333333333333333333333333333333333333" as const;
const registry = "0x4444444444444444444444444444444444444444" as const;
const issuer = "0x5555555555555555555555555555555555555555" as const;
const administrator = "0x6666666666666666666666666666666666666666" as const;

const manifest = {
  schemaVersion: 1,
  status: "deployed",
  chainId: 177,
  sourceCommit: "a".repeat(40),
  factory,
  pilot: { token, vault },
  updatedAt: "2026-08-27T00:00:00Z",
} as DeployedManifest;

describe("live pilot proof reader", () => {
  it("formats coverage from bigint base units without floating point", () => {
    expect(formatCoverage(100_000_000n, 100_000_000n)).toBe("100.00");
    expect(formatCoverage(99_999_999n, 100_000_000n)).toBe("99.99");
    expect(formatCoverage(0n, 0n)).toBeNull();
  });

  it("withholds financial reads when the safe block is stale", async () => {
    const readContract = vi.fn();
    const client = {
      getChainId: vi.fn().mockResolvedValue(177),
      getBlock: vi.fn().mockResolvedValue({ number: 123n, timestamp: 1_000n }),
      getBytecode: vi.fn(),
      readContract,
    } as unknown as ProofPublicClient;

    const result = await fetchPilotProof({
      client,
      manifest,
      nowMs: 2_000_000,
    });

    expect(result.status).toBe("stale");
    expect(readContract).not.toHaveBeenCalled();
  });

  it("reconciles every relationship and value at one safe block", async () => {
    const readContract = vi.fn(async (request: Record<string, unknown>) => {
      const address = request.address;
      const functionName = request.functionName;
      if (address === factory) {
        if (functionName === "versionRegistry") return registry;
        if (functionName === "configuredReserveAsset")
          return HSK_MAINNET_USDC_E;
        if (functionName === "isRegisteredIssuerToken") return true;
        if (
          functionName === "issuerForToken" ||
          functionName === "issuerForVault"
        ) {
          return {
            issuer,
            token,
            vault,
            reserveAsset: HSK_MAINNET_USDC_E,
            version: 1n,
          };
        }
      }
      if (address === token) {
        if (functionName === "name") return "ReserveRail USD";
        if (functionName === "symbol") return "rrUSD";
        if (functionName === "decimals") return 6;
        if (functionName === "totalSupply") return 100_000_000n;
        if (functionName === "paused") return false;
        if (functionName === "vault") return vault;
        if (functionName === "factory") return factory;
        if (functionName === "administrator") return administrator;
      }
      if (address === vault) {
        if (functionName === "factory") return factory;
        if (functionName === "reserveAsset") return HSK_MAINNET_USDC_E;
        if (functionName === "issuerToken") return token;
        if (functionName === "administrator") return administrator;
        if (functionName === "reserveOperator") return administrator;
        if (functionName === "pauser") return administrator;
        if (functionName === "operationallyPaused") return false;
        if (functionName === "reserveBalance") return 100_000_000n;
        if (functionName === "redeemableSupply") return 100_000_000n;
      }
      if (address === HSK_MAINNET_USDC_E) {
        if (functionName === "decimals") return 6;
        if (functionName === "balanceOf") return 100_000_000n;
      }
      if (address === registry && functionName === "isVersionActive") {
        return true;
      }
      throw new Error(`Unhandled ${String(address)} ${String(functionName)}`);
    });
    const client = {
      getChainId: vi.fn().mockResolvedValue(177),
      getBlock: vi.fn().mockResolvedValue({
        number: 123n,
        timestamp: 1_787_834_400n,
      }),
      getBytecode: vi.fn().mockResolvedValue("0x01"),
      readContract,
    } as unknown as ProofPublicClient;

    const result = await fetchPilotProof({
      client,
      manifest,
      nowMs: 1_787_834_500_000,
    });

    expect(result).toMatchObject({
      status: "deployed",
      coverageRatio: "100.00",
      backingState: "Fully backed",
      totalSupply: "100",
      vaultReserve: "100",
      lastConfirmedBlock: "123",
      transactions: [],
    });
    expect(
      readContract.mock.calls.every(
        ([request]) => request.blockNumber === 123n,
      ),
    ).toBe(true);
  });

  it("fails closed when the RPC reports another chain", async () => {
    const client = {
      getChainId: vi.fn().mockResolvedValue(133),
      getBlock: vi.fn(),
      getBytecode: vi.fn(),
      readContract: vi.fn(),
    } as unknown as ProofPublicClient;

    await expect(fetchPilotProof({ client, manifest })).rejects.toThrow(
      /mainnet/,
    );
  });
});
