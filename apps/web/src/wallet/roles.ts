import {
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseEventLogs,
  stringToHex,
  type Address,
  type Hash,
  type TransactionReceipt,
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

export type VaultRoleType = keyof typeof ROLE_IDENTIFIERS;
export type RoleSelection = VaultRoleType | "TOKEN_ADMINISTRATOR";

export const ZERO_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";

export interface VaultAuthorities {
  administrator: Address;
  reserveOperator: Address;
  pauser: Address;
  operationallyPaused: boolean;
}

export interface TokenAuthorities {
  administrator: Address;
  paused: boolean;
  vault: Address;
  transferPolicy?: Address;
}

export interface PairAuthorities {
  vault: VaultAuthorities;
  token: TokenAuthorities;
}

export interface RoleAuditRecord {
  id: string;
  type: "RoleRotated" | "Paused" | "Unpaused";
  contractAddress: Address;
  actor?: Address;
  role?: RoleSelection;
  previousAccount?: Address;
  newAccount?: Address;
  txHash: Hash;
  blockNumber: bigint;
}

const pauseEvents = [
  {
    type: "event",
    name: "Paused",
    inputs: [{ name: "account", type: "address", indexed: true }],
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [{ name: "account", type: "address", indexed: true }],
  },
] as const;

const roleEvents = [
  {
    type: "event",
    name: "RoleRotated",
    inputs: [
      { name: "role", type: "bytes32", indexed: true },
      { name: "previousAccount", type: "address", indexed: true },
      { name: "newAccount", type: "address", indexed: true },
    ],
  },
] as const;

export const vaultAbi = [
  ...pauseEvents,
  ...roleEvents,
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
  ...pauseEvents,
  ...roleEvents,
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

type RolesPublicClient = Pick<
  typeof hskPublicClient,
  "readContract" | "waitForTransactionReceipt"
>;

export async function fetchVaultAuthorities(
  vaultAddress: Address,
  client: Pick<RolesPublicClient, "readContract"> = hskPublicClient,
  blockNumber?: bigint,
): Promise<VaultAuthorities> {
  const [administrator, reserveOperator, pauser, operationallyPaused] =
    await Promise.all([
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "administrator",
        blockNumber,
      }),
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "reserveOperator",
        blockNumber,
      }),
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "pauser",
        blockNumber,
      }),
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "operationallyPaused",
        blockNumber,
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
  client: Pick<RolesPublicClient, "readContract"> = hskPublicClient,
  blockNumber?: bigint,
): Promise<TokenAuthorities> {
  const [administrator, paused, vault, transferPolicy] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "administrator",
      blockNumber,
    }),
    client.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "paused",
      blockNumber,
    }),
    client.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "vault",
      blockNumber,
    }),
    client
      .readContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "transferPolicy",
        blockNumber,
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

export async function fetchPairAuthorities(
  vaultAddress: Address,
  tokenAddress: Address,
  client: Pick<RolesPublicClient, "readContract"> = hskPublicClient,
  blockNumber?: bigint,
): Promise<PairAuthorities> {
  const [vault, token] = await Promise.all([
    fetchVaultAuthorities(vaultAddress, client, blockNumber),
    fetchTokenAuthorities(tokenAddress, client, blockNumber),
  ]);

  if (token.vault.toLowerCase() !== vaultAddress.toLowerCase()) {
    throw new WalletOperationError(
      "rpc",
      "Configured token does not identify the configured vault as its pair.",
    );
  }
  if (token.paused !== vault.operationallyPaused) {
    throw new WalletOperationError(
      "rpc",
      "Token and vault operational pause states do not match.",
    );
  }

  return { token, vault };
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

interface ExecuteBaseOptions {
  walletClient: WalletClient;
  publicClient?: RolesPublicClient;
  account: Address;
  onState?: (state: TransactionState) => void;
}

interface ExecutePauseOptions extends ExecuteBaseOptions {
  vaultAddress: Address;
  tokenAddress: Address;
}

export async function executeVaultPause(options: ExecutePauseOptions) {
  return executePauseTransition(options, true);
}

export async function executeVaultUnpause(options: ExecutePauseOptions) {
  return executePauseTransition(options, false);
}

async function executePauseTransition(
  {
    vaultAddress,
    tokenAddress,
    walletClient,
    publicClient = hskPublicClient,
    account,
    onState = () => undefined,
  }: ExecutePauseOptions,
  paused: boolean,
) {
  const eventName = paused ? "Paused" : "Unpaused";
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi: vaultAbi,
        functionName: paused ? "pause" : "unpause",
      });
      return walletClient.sendTransaction({
        account,
        to: vaultAddress,
        data,
        chain: null,
      });
    },
    waitForReceipt: (hash) =>
      publicClient.waitForTransactionReceipt({ confirmations: 1, hash }),
    verify: async (receipt) => {
      const authorities = await fetchPairAuthorities(
        vaultAddress,
        tokenAddress,
        publicClient,
        receipt.blockNumber,
      );
      if (authorities.vault.operationallyPaused !== paused) {
        throw new WalletOperationError(
          "rpc",
          `Authoritative post-transaction read showed the pair is ${
            paused ? "not paused" : "still paused"
          }.`,
        );
      }

      const auditRecord = parsePauseAuditRecord(
        receipt,
        vaultAddress,
        tokenAddress,
        account,
        eventName,
      );
      return { auditRecord, authorities };
    },
  });
}

interface ExecuteVaultRotateRoleOptions extends ExecuteBaseOptions {
  vaultAddress: Address;
  tokenAddress: Address;
  role: VaultRoleType;
  newAccount: Address;
}

export async function executeVaultRotateRole({
  vaultAddress,
  tokenAddress,
  role,
  newAccount,
  walletClient,
  publicClient = hskPublicClient,
  account,
  onState = () => undefined,
}: ExecuteVaultRotateRoleOptions) {
  return executeRoleRotation({
    account,
    contractAddress: vaultAddress,
    newAccount,
    onState,
    publicClient,
    role,
    tokenAddress,
    vaultAddress,
    walletClient,
  });
}

interface ExecuteTokenRotateRoleOptions extends ExecuteBaseOptions {
  tokenAddress: Address;
  vaultAddress: Address;
  newAccount: Address;
}

export async function executeTokenAdministratorRotation({
  tokenAddress,
  vaultAddress,
  newAccount,
  walletClient,
  publicClient = hskPublicClient,
  account,
  onState = () => undefined,
}: ExecuteTokenRotateRoleOptions) {
  return executeRoleRotation({
    account,
    contractAddress: tokenAddress,
    newAccount,
    onState,
    publicClient,
    role: "TOKEN_ADMINISTRATOR",
    tokenAddress,
    vaultAddress,
    walletClient,
  });
}

async function executeRoleRotation({
  account,
  contractAddress,
  newAccount,
  onState,
  publicClient,
  role,
  tokenAddress,
  vaultAddress,
  walletClient,
}: {
  account: Address;
  contractAddress: Address;
  newAccount: Address;
  onState: (state: TransactionState) => void;
  publicClient: RolesPublicClient;
  role: RoleSelection;
  tokenAddress: Address;
  vaultAddress: Address;
  walletClient: WalletClient;
}) {
  const validated = validateNewAccountAddress(newAccount);
  if (!validated.valid || !validated.sanitizedAddress) {
    throw new WalletOperationError(
      "unknown",
      validated.error ?? "Invalid address",
    );
  }

  const roleHash =
    role === "TOKEN_ADMINISTRATOR"
      ? ROLE_IDENTIFIERS.ADMINISTRATOR
      : ROLE_IDENTIFIERS[role];
  const abi = role === "TOKEN_ADMINISTRATOR" ? tokenAbi : vaultAbi;

  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi,
        functionName: "rotateRole",
        args: [roleHash, validated.sanitizedAddress!],
      });
      return walletClient.sendTransaction({
        account,
        to: contractAddress,
        data,
        chain: null,
      });
    },
    waitForReceipt: (hash) =>
      publicClient.waitForTransactionReceipt({ confirmations: 1, hash }),
    verify: async (receipt) => {
      const authorities = await fetchPairAuthorities(
        vaultAddress,
        tokenAddress,
        publicClient,
        receipt.blockNumber,
      );
      const actualAccount = roleAccount(authorities, role);
      if (
        actualAccount.toLowerCase() !==
        validated.sanitizedAddress!.toLowerCase()
      ) {
        throw new WalletOperationError(
          "rpc",
          "Authoritative post-transaction read did not show the requested role replacement.",
        );
      }

      const auditRecord = parseRoleAuditRecord(
        receipt,
        contractAddress,
        role,
        roleHash,
        validated.sanitizedAddress!,
      );
      return { auditRecord, authorities };
    },
  });
}

function roleAccount(
  authorities: PairAuthorities,
  role: RoleSelection,
): Address {
  if (role === "TOKEN_ADMINISTRATOR") return authorities.token.administrator;
  if (role === "ADMINISTRATOR") return authorities.vault.administrator;
  if (role === "RESERVE_OPERATOR") return authorities.vault.reserveOperator;
  return authorities.vault.pauser;
}

function parsePauseAuditRecord(
  receipt: TransactionReceipt,
  vaultAddress: Address,
  tokenAddress: Address,
  actor: Address,
  eventName: "Paused" | "Unpaused",
): RoleAuditRecord {
  const vaultEvent = parseEventLogs({
    abi: pauseEvents,
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === vaultAddress.toLowerCase(),
    ),
    strict: true,
  }).find((event) => event.eventName === eventName);
  const tokenEvent = parseEventLogs({
    abi: pauseEvents,
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === tokenAddress.toLowerCase(),
    ),
    strict: true,
  }).find((event) => event.eventName === eventName);

  if (
    !vaultEvent ||
    !tokenEvent ||
    vaultEvent.args.account.toLowerCase() !== actor.toLowerCase() ||
    tokenEvent.args.account.toLowerCase() !== vaultAddress.toLowerCase()
  ) {
    throw new WalletOperationError(
      "rpc",
      `Confirmed receipt did not contain the coordinated ${eventName} events.`,
    );
  }

  return {
    actor: getAddress(vaultEvent.args.account),
    blockNumber: receipt.blockNumber,
    contractAddress: vaultAddress,
    id: `${receipt.transactionHash}-${eventName}`,
    txHash: receipt.transactionHash,
    type: eventName,
  };
}

function parseRoleAuditRecord(
  receipt: TransactionReceipt,
  contractAddress: Address,
  role: RoleSelection,
  roleHash: Hash,
  newAccount: Address,
): RoleAuditRecord {
  const roleEvent = parseEventLogs({
    abi: roleEvents,
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === contractAddress.toLowerCase(),
    ),
    strict: true,
  }).find((event) => event.eventName === "RoleRotated");

  if (
    !roleEvent ||
    roleEvent.args.role.toLowerCase() !== roleHash.toLowerCase() ||
    roleEvent.args.newAccount.toLowerCase() !== newAccount.toLowerCase()
  ) {
    throw new WalletOperationError(
      "rpc",
      "Confirmed receipt did not contain the requested RoleRotated event.",
    );
  }

  return {
    blockNumber: receipt.blockNumber,
    contractAddress,
    id: `${receipt.transactionHash}-RoleRotated-${role}`,
    newAccount: getAddress(roleEvent.args.newAccount),
    previousAccount: getAddress(roleEvent.args.previousAccount),
    role,
    txHash: receipt.transactionHash,
    type: "RoleRotated",
  };
}
