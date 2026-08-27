import {
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import { hskPublicClient } from "./chain";
import { WalletOperationError } from "./errors";
import { executeHskTransaction, type TransactionState } from "./transaction";

export const ROLE_IDENTIFIERS = {
  ADMINISTRATOR: keccak256(stringToHex("ADMINISTRATOR_ROLE")),
  RESERVE_OPERATOR: keccak256(stringToHex("RESERVE_OPERATOR_ROLE")),
  PAUSER: keccak256(stringToHex("PAUSER_ROLE")),
} as const;

export type RoleType = keyof typeof ROLE_IDENTIFIERS;

export const ZERO_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";

export interface VaultAuthorities {
  administrator: Address;
  reserveOperator: Address;
  pauser: Address;
  operationallyPaused: boolean;
  reserveBalance?: bigint;
  redeemableSupply?: bigint;
}

export interface TokenAuthorities {
  administrator: Address;
  paused: boolean;
  vault: Address;
  transferPolicy?: Address;
}

export interface RoleAuditRecord {
  id: string;
  type: "RoleRotated" | "Paused" | "Unpaused";
  contractAddress: Address;
  actor?: Address;
  role?: string;
  previousAccount?: Address;
  newAccount?: Address;
  txHash: Hash;
  blockNumber: bigint;
  timestamp: string;
}

export const vaultAbi = [
  {
    type: "function",
    name: "administrator",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reserveOperator",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pauser",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "operationallyPaused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reserveBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeemableSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "rotateRole",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "newAccount", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const tokenAbi = [
  {
    type: "function",
    name: "administrator",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "vault",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferPolicy",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rotateRole",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "newAccount", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export async function fetchVaultAuthorities(
  vaultAddress: Address,
  client = hskPublicClient,
): Promise<VaultAuthorities> {
  const [administrator, reserveOperator, pauser, operationallyPaused] =
    await Promise.all([
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "administrator",
      }),
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "reserveOperator",
      }),
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "pauser",
      }),
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "operationallyPaused",
      }),
    ]);

  return {
    administrator: getAddress(administrator),
    reserveOperator: getAddress(reserveOperator),
    pauser: getAddress(pauser),
    operationallyPaused,
  };
}

export async function fetchTokenAuthorities(
  tokenAddress: Address,
  client = hskPublicClient,
): Promise<TokenAuthorities> {
  const [administrator, paused, vault, transferPolicy] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "administrator",
    }),
    client.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "paused",
    }),
    client.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "vault",
    }),
    client
      .readContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "transferPolicy",
      })
      .catch(() => undefined),
  ]);

  return {
    administrator: getAddress(administrator),
    paused,
    vault: getAddress(vault),
    transferPolicy: transferPolicy ? getAddress(transferPolicy) : undefined,
  };
}

export function validateNewAccountAddress(address: string): {
  valid: boolean;
  error?: string;
  sanitizedAddress?: Address;
} {
  if (!address || !address.trim()) {
    return { valid: false, error: "Recipient address is required." };
  }

  const trimmed = address.trim();
  if (!isAddress(trimmed)) {
    return {
      valid: false,
      error: "Invalid EVM address format (expected 0x-prefixed 40-hex string).",
    };
  }

  const checksummed = getAddress(trimmed);
  if (checksummed.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return {
      valid: false,
      error:
        "Zero address (0x000...000) cannot be used as an on-chain authority.",
    };
  }

  return { valid: true, sanitizedAddress: checksummed };
}

export interface ExecutePauseOptions {
  vaultAddress: Address;
  walletClient: WalletClient;
  account: Address;
  onState?: (state: TransactionState) => void;
}

export async function executeVaultPause({
  vaultAddress,
  walletClient,
  account,
  onState = () => undefined,
}: ExecutePauseOptions) {
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi: vaultAbi,
        functionName: "pause",
      });
      return walletClient.sendTransaction({
        account,
        to: vaultAddress,
        data,
        chain: null,
      });
    },
    verify: async () => {
      const authorities = await fetchVaultAuthorities(vaultAddress);
      if (!authorities.operationallyPaused) {
        throw new WalletOperationError(
          "rpc",
          "Authoritative post-transaction read showed vault is not paused.",
        );
      }
      return authorities;
    },
  });
}

export interface ExecuteUnpauseOptions {
  vaultAddress: Address;
  walletClient: WalletClient;
  account: Address;
  onState?: (state: TransactionState) => void;
}

export async function executeVaultUnpause({
  vaultAddress,
  walletClient,
  account,
  onState = () => undefined,
}: ExecuteUnpauseOptions) {
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi: vaultAbi,
        functionName: "unpause",
      });
      return walletClient.sendTransaction({
        account,
        to: vaultAddress,
        data,
        chain: null,
      });
    },
    verify: async () => {
      const authorities = await fetchVaultAuthorities(vaultAddress);
      if (authorities.operationallyPaused) {
        throw new WalletOperationError(
          "rpc",
          "Authoritative post-transaction read showed vault is still paused.",
        );
      }
      return authorities;
    },
  });
}

export interface ExecuteRotateRoleOptions {
  vaultAddress: Address;
  roleHash: `0x${string}`;
  newAccount: Address;
  walletClient: WalletClient;
  account: Address;
  onState?: (state: TransactionState) => void;
}

export async function executeVaultRotateRole({
  vaultAddress,
  roleHash,
  newAccount,
  walletClient,
  account,
  onState = () => undefined,
}: ExecuteRotateRoleOptions) {
  const validated = validateNewAccountAddress(newAccount);
  if (!validated.valid || !validated.sanitizedAddress) {
    throw new WalletOperationError(
      "unknown",
      validated.error ?? "Invalid address",
    );
  }

  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi: vaultAbi,
        functionName: "rotateRole",
        args: [roleHash, validated.sanitizedAddress!],
      });
      return walletClient.sendTransaction({
        account,
        to: vaultAddress,
        data,
        chain: null,
      });
    },
    verify: async () => {
      const authorities = await fetchVaultAuthorities(vaultAddress);
      return authorities;
    },
  });
}
