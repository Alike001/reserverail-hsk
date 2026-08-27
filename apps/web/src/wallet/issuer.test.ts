import { describe, expect, it, vi } from "vitest";
import {
  formatReserveUnits,
  parseReserveUnits,
  reconcileIssuerMint,
  validateIssuerFormData,
  extractIssuerCreatedEvent,
  factoryAbi,
} from "./issuer";
import { encodeEventTopics, encodeAbiParameters } from "viem";

const MOCK_ISSUER = "0x1111111111111111111111111111111111111111";
const MOCK_TOKEN = "0x2222222222222222222222222222222222222222";
const MOCK_VAULT = "0x3333333333333333333333333333333333333333";
const MOCK_USDC = "0x054ed45810DbBAb8B27668922D110669c9D88D0a";

describe("Issuer Creation & Mint Engine", () => {
  describe("6-Decimal Amount Handling", () => {
    it("parses whole and fractional amounts into 6-decimal base units", () => {
      expect(parseReserveUnits("100").amount).toBe(100_000_000n);
      expect(parseReserveUnits("0.5").amount).toBe(500_000n);
      expect(parseReserveUnits("123.456789").amount).toBe(123_456_789n);
      expect(parseReserveUnits("0.000001").amount).toBe(1n);
    });

    it("formats 6-decimal base units to readable string", () => {
      expect(formatReserveUnits(100_000_000n)).toBe("100");
      expect(formatReserveUnits(500_000n)).toBe("0.5");
      expect(formatReserveUnits(123_456_789n)).toBe("123.456789");
      expect(formatReserveUnits(1n)).toBe("0.000001");
    });

    it("strictly rejects sub-micro precision (>6 decimal places)", () => {
      const result = parseReserveUnits("1.0000001");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Maximum precision is 6 decimal places");
    });

    it("rejects zero, negative, and invalid string formats", () => {
      expect(parseReserveUnits("0").valid).toBe(false);
      expect(parseReserveUnits("-5").valid).toBe(false);
      expect(parseReserveUnits("abc").valid).toBe(false);
      expect(parseReserveUnits("1e6").valid).toBe(false);
      expect(parseReserveUnits("").valid).toBe(false);
    });
  });

  describe("validateIssuerFormData", () => {
    it("validates valid complete form data", () => {
      const form = {
        name: "Test USD",
        symbol: "TUSD",
        administrator: MOCK_ISSUER,
        reserveOperator: MOCK_ISSUER,
        pauser: MOCK_ISSUER,
        reserveAmount: "500",
        recipient: MOCK_ISSUER,
      };

      const result = validateIssuerFormData(form);
      expect(result.valid).toBe(true);
      expect(result.parsedAmount).toBe(500_000_000n);
      expect(result.errors).toEqual({});
    });

    it("flags missing fields and malformed addresses", () => {
      const form = {
        name: "",
        symbol: "",
        administrator: "invalid",
        reserveOperator: "",
        pauser: "0x123",
        reserveAmount: "0",
        recipient: "",
      };

      const result = validateIssuerFormData(form);
      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.symbol).toBeDefined();
      expect(result.errors.administrator).toBeDefined();
      expect(result.errors.reserveOperator).toBeDefined();
      expect(result.errors.pauser).toBeDefined();
      expect(result.errors.reserveAmount).toBeDefined();
      expect(result.errors.recipient).toBeDefined();
    });
  });

  describe("extractIssuerCreatedEvent", () => {
    it("extracts token and vault addresses from IssuerCreated receipt logs", () => {
      const topics = encodeEventTopics({
        abi: factoryAbi,
        eventName: "IssuerCreated",
        args: {
          issuer: MOCK_ISSUER,
          token: MOCK_TOKEN,
          vault: MOCK_VAULT,
        },
      });

      const data = encodeAbiParameters(
        [
          { name: "reserveAsset", type: "address" },
          { name: "version", type: "uint64" },
          { name: "administrator", type: "address" },
          { name: "reserveOperator", type: "address" },
          { name: "pauser", type: "address" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
        ],
        [
          MOCK_USDC,
          1n,
          MOCK_ISSUER,
          MOCK_ISSUER,
          MOCK_ISSUER,
          "Test USD",
          "TUSD",
        ],
      );

      const mockReceipt = {
        logs: [
          {
            address: MOCK_ISSUER,
            topics,
            data,
            blockNumber: 100n,
            transactionHash: "0x1111",
          },
        ],
      };

      const discovered = extractIssuerCreatedEvent(mockReceipt as any);
      expect(discovered.token).toBe(MOCK_TOKEN);
      expect(discovered.vault).toBe(MOCK_VAULT);
      expect(discovered.reserveAsset).toBe(MOCK_USDC);
      expect(discovered.version).toBe(1n);
      expect(discovered.name).toBe("Test USD");
      expect(discovered.symbol).toBe("TUSD");
    });
  });

  describe("reconcileIssuerMint", () => {
    it("successfully reconciles when reserve and total supply match expected mint", async () => {
      const mockClient = {
        readContract: vi.fn().mockImplementation(({ functionName }) => {
          if (functionName === "reserveBalance")
            return Promise.resolve(100_000_000n);
          if (functionName === "totalSupply")
            return Promise.resolve(100_000_000n);
          if (functionName === "balanceOf")
            return Promise.resolve(100_000_000n);
          return Promise.reject(new Error("Unknown function"));
        }),
      };

      const result = await reconcileIssuerMint({
        vaultAddress: MOCK_VAULT,
        tokenAddress: MOCK_TOKEN,
        recipient: MOCK_ISSUER,
        expectedMintAmount: 100_000_000n,
        client: mockClient as any,
      });

      expect(result.isReconciled).toBe(true);
      expect(result.vaultReserveBalance).toBe(100_000_000n);
      expect(result.tokenTotalSupply).toBe(100_000_000n);
      expect(result.recipientBalance).toBe(100_000_000n);
      expect(result.reconciliationError).toBeUndefined();
    });

    it("detects critical reserve backing invariant violation", async () => {
      const mockClient = {
        readContract: vi.fn().mockImplementation(({ functionName }) => {
          if (functionName === "reserveBalance")
            return Promise.resolve(50_000_000n);
          if (functionName === "totalSupply")
            return Promise.resolve(100_000_000n);
          if (functionName === "balanceOf")
            return Promise.resolve(100_000_000n);
          return Promise.reject(new Error("Unknown function"));
        }),
      };

      const result = await reconcileIssuerMint({
        vaultAddress: MOCK_VAULT,
        tokenAddress: MOCK_TOKEN,
        recipient: MOCK_ISSUER,
        expectedMintAmount: 100_000_000n,
        client: mockClient as any,
      });

      expect(result.isReconciled).toBe(false);
      expect(result.reconciliationError).toContain(
        "CRITICAL INVARIANT VIOLATION: Vault reserve balance (50) is less than total token supply (100)",
      );
    });
  });
});
