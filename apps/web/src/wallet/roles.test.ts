import { encodeEventTopics, type Address, type TransactionReceipt } from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  executeVaultPause,
  executeVaultRotateRole,
  executeVaultUnpause,
  executeTokenAdministratorRotation,
  fetchPairAuthorities,
  fetchTokenAuthorities,
  fetchVaultAuthorities,
  ROLE_IDENTIFIERS,
  tokenAbi,
  validateNewAccountAddress,
  vaultAbi,
  ZERO_ADDRESS,
} from "./roles";

const ADMIN = "0x1111111111111111111111111111111111111111";
const TOKEN_ADMIN = "0x1212121212121212121212121212121212121212";
const OPERATOR = "0x2222222222222222222222222222222222222222";
const NEXT_OPERATOR = "0x2323232323232323232323232323232323232323";
const PAUSER = "0x3333333333333333333333333333333333333333";
const VAULT = "0x4444444444444444444444444444444444444444";
const TOKEN = "0x5555555555555555555555555555555555555555";
const OTHER_VAULT = "0x6666666666666666666666666666666666666666";
const TX_HASH = `0x${"ab".repeat(32)}` as const;

describe("roles and emergency controls service", () => {
  it("uses the contract role identifiers and rejects invalid replacements", () => {
    expect(ROLE_IDENTIFIERS.ADMINISTRATOR).toHaveLength(66);
    expect(ROLE_IDENTIFIERS.RESERVE_OPERATOR).toHaveLength(66);
    expect(ROLE_IDENTIFIERS.PAUSER).toHaveLength(66);
    expect(validateNewAccountAddress(ADMIN).valid).toBe(true);
    expect(validateNewAccountAddress("").valid).toBe(false);
    expect(validateNewAccountAddress("0xinvalid").valid).toBe(false);
    expect(validateNewAccountAddress(ZERO_ADDRESS).valid).toBe(false);
  });

  it("reads both contracts at one requested block and rejects a forged pair", async () => {
    const client = mockPublicClient({ blockNumber: 41n });
    const pair = await fetchPairAuthorities(VAULT, TOKEN, client, 41n);
    expect(pair.vault.administrator).toBe(ADMIN);
    expect(pair.token.administrator).toBe(TOKEN_ADMIN);
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ blockNumber: 41n }),
    );

    const forged = mockPublicClient({ tokenVault: OTHER_VAULT });
    await expect(
      fetchPairAuthorities(VAULT, TOKEN, forged),
    ).rejects.toMatchObject({ kind: "rpc" });
  });

  it("keeps individual vault and token authority readers available", async () => {
    const client = mockPublicClient({ paused: true });
    const vault = await fetchVaultAuthorities(VAULT, client);
    const token = await fetchTokenAuthorities(TOKEN, client);
    expect(vault.operationallyPaused).toBe(true);
    expect(token.paused).toBe(true);
    expect(token.vault).toBe(VAULT);
  });

  it("confirms pause only from block-pinned paired reads and both decoded events", async () => {
    const receipt = successfulReceipt([
      pauseLog(VAULT, "Paused", ADMIN),
      pauseLog(TOKEN, "Paused", VAULT),
    ]);
    const publicClient = mockPublicClient({ paused: true, receipt });
    const walletClient = mockWalletClient();
    const states: string[] = [];

    const result = await executeVaultPause({
      account: ADMIN,
      onState: (state) => states.push(state.phase),
      publicClient,
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
      walletClient,
    });

    expect(result.result.auditRecord).toMatchObject({
      actor: ADMIN,
      blockNumber: 77n,
      type: "Paused",
    });
    expect(states).toEqual([
      "awaiting-signature",
      "pending",
      "verifying",
      "confirmed",
    ]);
    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ blockNumber: 77n }),
    );
  });

  it("confirms unpause from paired state and coordinated events", async () => {
    const receipt = successfulReceipt([
      pauseLog(VAULT, "Unpaused", ADMIN),
      pauseLog(TOKEN, "Unpaused", VAULT),
    ]);
    const result = await executeVaultUnpause({
      account: ADMIN,
      publicClient: mockPublicClient({ paused: false, receipt }),
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
      walletClient: mockWalletClient(),
    });
    expect(result.result.auditRecord.type).toBe("Unpaused");
    expect(result.result.authorities.token.paused).toBe(false);
  });

  it("rejects a half-paused read or a receipt missing either event", async () => {
    const oneEventReceipt = successfulReceipt([
      pauseLog(VAULT, "Paused", ADMIN),
    ]);
    await expect(
      executeVaultPause({
        account: ADMIN,
        publicClient: mockPublicClient({
          paused: true,
          receipt: oneEventReceipt,
        }),
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
        walletClient: mockWalletClient(),
      }),
    ).rejects.toMatchObject({ kind: "rpc" });

    const coordinatedReceipt = successfulReceipt([
      pauseLog(VAULT, "Paused", ADMIN),
      pauseLog(TOKEN, "Paused", VAULT),
    ]);
    await expect(
      executeVaultPause({
        account: ADMIN,
        publicClient: mockPublicClient({
          paused: true,
          receipt: coordinatedReceipt,
          tokenPaused: false,
        }),
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
        walletClient: mockWalletClient(),
      }),
    ).rejects.toMatchObject({ kind: "rpc" });
  });

  it("confirms role rotation only when the event and post-read match", async () => {
    const receipt = successfulReceipt([
      roleLog(
        VAULT,
        ROLE_IDENTIFIERS.RESERVE_OPERATOR,
        OPERATOR,
        NEXT_OPERATOR,
      ),
    ]);
    const result = await executeVaultRotateRole({
      account: ADMIN,
      newAccount: NEXT_OPERATOR,
      publicClient: mockPublicClient({ operator: NEXT_OPERATOR, receipt }),
      role: "RESERVE_OPERATOR",
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
      walletClient: mockWalletClient(),
    });
    expect(result.result.auditRecord).toMatchObject({
      newAccount: NEXT_OPERATOR,
      previousAccount: OPERATOR,
      role: "RESERVE_OPERATOR",
      type: "RoleRotated",
    });

    await expect(
      executeVaultRotateRole({
        account: ADMIN,
        newAccount: NEXT_OPERATOR,
        publicClient: mockPublicClient({ operator: OPERATOR, receipt }),
        role: "RESERVE_OPERATOR",
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
        walletClient: mockWalletClient(),
      }),
    ).rejects.toMatchObject({ kind: "rpc" });
  });

  it("rotates the token administrator independently and verifies its token event", async () => {
    const receipt = successfulReceipt([
      roleLog(
        TOKEN,
        ROLE_IDENTIFIERS.ADMINISTRATOR,
        TOKEN_ADMIN,
        NEXT_OPERATOR,
      ),
    ]);
    const result = await executeTokenAdministratorRotation({
      account: TOKEN_ADMIN,
      newAccount: NEXT_OPERATOR,
      publicClient: mockPublicClient({ receipt, tokenAdmin: NEXT_OPERATOR }),
      tokenAddress: TOKEN,
      vaultAddress: VAULT,
      walletClient: mockWalletClient(),
    });
    expect(result.result.auditRecord).toMatchObject({
      contractAddress: TOKEN,
      newAccount: NEXT_OPERATOR,
      previousAccount: TOKEN_ADMIN,
      role: "TOKEN_ADMINISTRATOR",
    });
    expect(result.result.authorities.vault.administrator).toBe(ADMIN);
  });

  it("reports wallet rejection and reverted receipts without verification", async () => {
    const rejectedWallet = mockWalletClient();
    rejectedWallet.sendTransaction.mockRejectedValue({ code: 4001 });
    const rejectedPublic = mockPublicClient();
    await expect(
      executeVaultPause({
        account: ADMIN,
        publicClient: rejectedPublic,
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
        walletClient: rejectedWallet,
      }),
    ).rejects.toMatchObject({ kind: "user-rejected" });
    expect(rejectedPublic.waitForTransactionReceipt).not.toHaveBeenCalled();

    const revertedPublic = mockPublicClient({
      receipt: { ...successfulReceipt([]), status: "reverted" },
    });
    await expect(
      executeVaultPause({
        account: ADMIN,
        publicClient: revertedPublic,
        tokenAddress: TOKEN,
        vaultAddress: VAULT,
        walletClient: mockWalletClient(),
      }),
    ).rejects.toMatchObject({ kind: "transaction-reverted" });
    expect(revertedPublic.readContract).not.toHaveBeenCalled();
  });
});

function mockWalletClient() {
  return {
    getChainId: vi.fn().mockResolvedValue(177),
    sendTransaction: vi.fn().mockResolvedValue(TX_HASH),
  } as any;
}

function mockPublicClient({
  blockNumber,
  operator = OPERATOR,
  paused = false,
  receipt = successfulReceipt([]),
  tokenAdmin = TOKEN_ADMIN,
  tokenPaused = paused,
  tokenVault = VAULT,
}: {
  blockNumber?: bigint;
  operator?: Address;
  paused?: boolean;
  receipt?: TransactionReceipt;
  tokenAdmin?: Address;
  tokenPaused?: boolean;
  tokenVault?: Address;
} = {}) {
  return {
    readContract: vi.fn().mockImplementation(({ address, functionName }) => {
      if (functionName === "administrator") {
        return Promise.resolve(address === TOKEN ? tokenAdmin : ADMIN);
      }
      if (functionName === "reserveOperator") return Promise.resolve(operator);
      if (functionName === "pauser") return Promise.resolve(PAUSER);
      if (functionName === "operationallyPaused") {
        return Promise.resolve(paused);
      }
      if (functionName === "paused") return Promise.resolve(tokenPaused);
      if (functionName === "vault") return Promise.resolve(tokenVault);
      if (functionName === "transferPolicy") {
        return Promise.reject(new Error("not implemented in this version"));
      }
      return Promise.reject(
        new Error(`unknown read at ${blockNumber ?? "latest"}`),
      );
    }),
    waitForTransactionReceipt: vi.fn().mockResolvedValue(receipt),
  } as any;
}

function successfulReceipt(
  logs: TransactionReceipt["logs"],
): TransactionReceipt {
  return {
    blockNumber: 77n,
    logs,
    status: "success",
    transactionHash: TX_HASH,
  } as TransactionReceipt;
}

function pauseLog(
  address: Address,
  eventName: "Paused" | "Unpaused",
  account: Address,
): TransactionReceipt["logs"][number] {
  return {
    address,
    data: "0x",
    topics: encodeEventTopics({
      abi: eventName === "Paused" ? vaultAbi : tokenAbi,
      eventName,
      args: { account },
    }),
  } as unknown as TransactionReceipt["logs"][number];
}

function roleLog(
  address: Address,
  role: `0x${string}`,
  previousAccount: Address,
  newAccount: Address,
): TransactionReceipt["logs"][number] {
  return {
    address,
    data: "0x",
    topics: encodeEventTopics({
      abi: vaultAbi,
      eventName: "RoleRotated",
      args: { newAccount, previousAccount, role },
    }),
  } as unknown as TransactionReceipt["logs"][number];
}
