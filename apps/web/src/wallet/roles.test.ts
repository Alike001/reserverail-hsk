import { describe, expect, it, vi } from "vitest";
import {
  ROLE_IDENTIFIERS,
  validateNewAccountAddress,
  ZERO_ADDRESS,
  fetchVaultAuthorities,
  fetchTokenAuthorities,
} from "./roles";

const MOCK_ADMIN = "0x1111111111111111111111111111111111111111";
const MOCK_OPERATOR = "0x2222222222222222222222222222222222222222";
const MOCK_PAUSER = "0x3333333333333333333333333333333333333333";
const MOCK_VAULT = "0x4444444444444444444444444444444444444444";
const MOCK_TOKEN = "0x5555555555555555555555555555555555555555";

describe("Roles and Emergency Controls Service", () => {
  it("defines standard role identifiers", () => {
    expect(ROLE_IDENTIFIERS.ADMINISTRATOR).toBeDefined();
    expect(ROLE_IDENTIFIERS.RESERVE_OPERATOR).toBeDefined();
    expect(ROLE_IDENTIFIERS.PAUSER).toBeDefined();
  });

  describe("validateNewAccountAddress", () => {
    it("accepts valid EVM addresses and returns checksummed address", () => {
      const result = validateNewAccountAddress(MOCK_ADMIN.toLowerCase());
      expect(result.valid).toBe(true);
      expect(result.sanitizedAddress).toBe(MOCK_ADMIN);
      expect(result.error).toBeUndefined();
    });

    it("rejects empty or whitespace address", () => {
      expect(validateNewAccountAddress("").valid).toBe(false);
      expect(validateNewAccountAddress("   ").valid).toBe(false);
    });

    it("rejects malformed address string", () => {
      const result = validateNewAccountAddress("0xinvalid");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid EVM address format");
    });

    it("strictly rejects the zero address (0x0...0)", () => {
      const result = validateNewAccountAddress(ZERO_ADDRESS);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Zero address");
    });
  });

  describe("fetchVaultAuthorities", () => {
    it("reads all on-chain authorities and pause state from public client", async () => {
      const mockClient = {
        readContract: vi.fn().mockImplementation(({ functionName }) => {
          if (functionName === "administrator")
            return Promise.resolve(MOCK_ADMIN);
          if (functionName === "reserveOperator")
            return Promise.resolve(MOCK_OPERATOR);
          if (functionName === "pauser") return Promise.resolve(MOCK_PAUSER);
          if (functionName === "operationallyPaused")
            return Promise.resolve(false);
          return Promise.reject(new Error("Unknown function"));
        }),
      };

      const authorities = await fetchVaultAuthorities(
        MOCK_VAULT,
        mockClient as any,
      );

      expect(authorities).toEqual({
        administrator: MOCK_ADMIN,
        reserveOperator: MOCK_OPERATOR,
        pauser: MOCK_PAUSER,
        operationallyPaused: false,
      });
      expect(mockClient.readContract).toHaveBeenCalledTimes(4);
    });
  });

  describe("fetchTokenAuthorities", () => {
    it("reads token administrator, pause state, and paired vault", async () => {
      const mockClient = {
        readContract: vi.fn().mockImplementation(({ functionName }) => {
          if (functionName === "administrator")
            return Promise.resolve(MOCK_ADMIN);
          if (functionName === "paused") return Promise.resolve(true);
          if (functionName === "vault") return Promise.resolve(MOCK_VAULT);
          if (functionName === "transferPolicy")
            return Promise.resolve(ZERO_ADDRESS);
          return Promise.reject(new Error("Unknown function"));
        }),
      };

      const authorities = await fetchTokenAuthorities(
        MOCK_TOKEN,
        mockClient as any,
      );

      expect(authorities.administrator).toBe(MOCK_ADMIN);
      expect(authorities.paused).toBe(true);
      expect(authorities.vault).toBe(MOCK_VAULT);
      expect(authorities.transferPolicy).toBe(ZERO_ADDRESS);
    });
  });
});
