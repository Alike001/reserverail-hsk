import {
  encodeFunctionData,
  formatUnits,
  getAddress,
  isAddress,
  parseEventLogs,
  parseUnits,
  type Address,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { hskPublicClient } from "./chain";
import { WalletOperationError } from "./errors";
import { executeHskTransaction, type TransactionState } from "./transaction";

export const RESERVE_DECIMALS = 6;
export const HSK_MAINNET_USDC_E: Address =
  "0x054ed45810DbBAb8B27668922D110669c9D88D0a";

export interface CreateIssuerParams {
  name: string;
  symbol: string;
  administrator: Address;
  reserveOperator: Address;
  pauser: Address;
}

export interface DiscoveredIssuerPair {
  issuer: Address;
  token: Address;
  vault: Address;
  reserveAsset: Address;
  version: bigint;
  name: string;
  symbol: string;
}

export interface MintReconciliationResult {
  vaultReserveBalance: bigint;
  tokenTotalSupply: bigint;
  recipientBalance: bigint;
  isReconciled: boolean;
  reconciliationError?: string;
}

export const factoryAbi = [
  {
    type: "function",
    name: "createIssuer",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "administrator", type: "address" },
      { name: "reserveOperator", type: "address" },
      { name: "pauser", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "vault", type: "address" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "configuredReserveAsset",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "currentVersion",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "IssuerCreated",
    inputs: [
      { name: "issuer", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "reserveAsset", type: "address", indexed: false },
      { name: "version", type: "uint64", indexed: false },
      { name: "administrator", type: "address", indexed: false },
      { name: "reserveOperator", type: "address", indexed: false },
      { name: "pauser", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

export const vaultAbi = [
  {
    type: "function",
    name: "depositAndMint",
    inputs: [
      { name: "reserveAmount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
    type: "event",
    name: "ReserveDepositedAndMinted",
    inputs: [
      { name: "actor", type: "address", indexed: true },
      { name: "issuerToken", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "reserveReceived", type: "uint256", indexed: false },
      { name: "mintedAmount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const tokenAbi = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

/**
 * Strict 6-decimal amount parser.
 * Rejects invalid strings, scientific notation, negative numbers, zero, and fractions with >6 decimals.
 */
export function parseReserveUnits(input: string): {
  valid: boolean;
  amount?: bigint;
  error?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Reserve amount is required." };
  }

  // Ensure standard positive decimal format: e.g. "100" or "100.5" or "0.5"
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid amount format (must be a positive decimal number).",
    };
  }

  const parts = trimmed.split(".");
  if (parts.length === 2 && parts[1].length > RESERVE_DECIMALS) {
    return {
      valid: false,
      error: `Maximum precision is ${RESERVE_DECIMALS} decimal places.`,
    };
  }

  try {
    const amount = parseUnits(trimmed, RESERVE_DECIMALS);
    if (amount <= 0n) {
      return { valid: false, error: "Reserve amount must be greater than 0." };
    }
    return { valid: true, amount };
  } catch {
    return { valid: false, error: "Failed to parse reserve amount." };
  }
}

/**
 * Formats a 6-decimal integer base unit amount to a readable string.
 */
export function formatReserveUnits(amount: bigint): string {
  return formatUnits(amount, RESERVE_DECIMALS);
}

/**
 * Extracts and validates the IssuerCreated event from a confirmed factory receipt.
 */
export function extractIssuerCreatedEvent(
  receipt: TransactionReceipt,
): DiscoveredIssuerPair {
  const logs = parseEventLogs({
    abi: factoryAbi,
    eventName: "IssuerCreated",
    logs: receipt.logs,
  });

  if (!logs || logs.length === 0) {
    throw new WalletOperationError(
      "unknown",
      "Factory transaction confirmed, but no IssuerCreated event was found in the receipt logs.",
    );
  }

  const event = logs[0];
  const { issuer, token, vault, reserveAsset, version, name, symbol } =
    event.args;

  return {
    issuer: getAddress(issuer),
    token: getAddress(token),
    vault: getAddress(vault),
    reserveAsset: getAddress(reserveAsset),
    version: BigInt(version),
    name,
    symbol,
  };
}

export interface ExecuteCreateIssuerOptions {
  factoryAddress: Address;
  params: CreateIssuerParams;
  walletClient: WalletClient;
  account: Address;
  onState?: (state: TransactionState) => void;
}

/**
 * Step 1: Submits createIssuer on StablecoinFactory and discovers deployed clone addresses from confirmed receipt.
 */
export async function executeCreateIssuer({
  factoryAddress,
  params,
  walletClient,
  account,
  onState = () => undefined,
}: ExecuteCreateIssuerOptions): Promise<{
  receipt: TransactionReceipt;
  result: DiscoveredIssuerPair;
}> {
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi: factoryAbi,
        functionName: "createIssuer",
        args: [
          params.name.trim(),
          params.symbol.trim(),
          getAddress(params.administrator),
          getAddress(params.reserveOperator),
          getAddress(params.pauser),
        ],
      });

      return walletClient.sendTransaction({
        account,
        to: factoryAddress,
        data,
        chain: null,
      });
    },
    verify: async (receipt) => {
      return extractIssuerCreatedEvent(receipt);
    },
  });
}

export interface ExecuteApproveReserveOptions {
  reserveAssetAddress: Address;
  spender: Address;
  amount: bigint;
  walletClient: WalletClient;
  account: Address;
  onState?: (state: TransactionState) => void;
}

/**
 * Step 2: Approves the newly discovered vault contract to spend the exact reserveAmount of USDC.e.
 */
export async function executeApproveReserve({
  reserveAssetAddress,
  spender,
  amount,
  walletClient,
  account,
  onState = () => undefined,
}: ExecuteApproveReserveOptions): Promise<{
  receipt: TransactionReceipt;
  result: bigint;
}> {
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
      });

      return walletClient.sendTransaction({
        account,
        to: reserveAssetAddress,
        data,
        chain: null,
      });
    },
    verify: async () => {
      // Authoritative read: verify allowance
      const allowance = await hskPublicClient.readContract({
        address: reserveAssetAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, spender],
      });

      if (allowance < amount) {
        throw new WalletOperationError(
          "rpc",
          `Authoritative post-read showed insufficient allowance: confirmed ${allowance.toString()}, required ${amount.toString()}.`,
        );
      }

      return allowance;
    },
  });
}

export interface ExecuteDepositAndMintOptions {
  vaultAddress: Address;
  reserveAmount: bigint;
  recipient: Address;
  walletClient: WalletClient;
  account: Address;
  onState?: (state: TransactionState) => void;
}

/**
 * Step 3: Calls depositAndMint on ReserveVault to deposit USDC.e and mint 1:1 backed stablecoin to recipient.
 */
export async function executeDepositAndMint({
  vaultAddress,
  reserveAmount,
  recipient,
  walletClient,
  account,
  onState = () => undefined,
}: ExecuteDepositAndMintOptions): Promise<{
  receipt: TransactionReceipt;
  result: bigint;
}> {
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () => {
      const data = encodeFunctionData({
        abi: vaultAbi,
        functionName: "depositAndMint",
        args: [reserveAmount, recipient],
      });

      return walletClient.sendTransaction({
        account,
        to: vaultAddress,
        data,
        chain: null,
      });
    },
    verify: async () => {
      const reserveBalance = await hskPublicClient.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "reserveBalance",
      });

      if (reserveBalance < reserveAmount) {
        throw new WalletOperationError(
          "rpc",
          `Vault reserve balance (${reserveBalance.toString()}) did not reflect expected deposit of ${reserveAmount.toString()}.`,
        );
      }

      return reserveBalance;
    },
  });
}

/**
 * Authoritatively reads and reconciles on-chain reserve balance and token supply after minting.
 */
export async function reconcileIssuerMint({
  vaultAddress,
  tokenAddress,
  recipient,
  expectedMintAmount,
  client = hskPublicClient,
}: {
  vaultAddress: Address;
  tokenAddress: Address;
  recipient: Address;
  expectedMintAmount: bigint;
  client?: typeof hskPublicClient;
}): Promise<MintReconciliationResult> {
  const [vaultReserveBalance, tokenTotalSupply, recipientBalance] =
    await Promise.all([
      client.readContract({
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "reserveBalance",
      }),
      client.readContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "totalSupply",
      }),
      client.readContract({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: "balanceOf",
        args: [recipient],
      }),
    ]);

  if (vaultReserveBalance < tokenTotalSupply) {
    return {
      vaultReserveBalance,
      tokenTotalSupply,
      recipientBalance,
      isReconciled: false,
      reconciliationError: `CRITICAL INVARIANT VIOLATION: Vault reserve balance (${formatReserveUnits(vaultReserveBalance)}) is less than total token supply (${formatReserveUnits(tokenTotalSupply)}).`,
    };
  }

  if (tokenTotalSupply < expectedMintAmount) {
    return {
      vaultReserveBalance,
      tokenTotalSupply,
      recipientBalance,
      isReconciled: false,
      reconciliationError: `Supply reconciliation mismatch: total supply (${formatReserveUnits(tokenTotalSupply)}) is less than expected minted amount (${formatReserveUnits(expectedMintAmount)}).`,
    };
  }

  return {
    vaultReserveBalance,
    tokenTotalSupply,
    recipientBalance,
    isReconciled: true,
  };
}

export function validateIssuerFormData(form: {
  name: string;
  symbol: string;
  administrator: string;
  reserveOperator: string;
  pauser: string;
  reserveAmount: string;
  recipient: string;
}): {
  valid: boolean;
  errors: Record<string, string>;
  parsedAmount?: bigint;
} {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) errors.name = "Stablecoin name is required.";
  if (!form.symbol.trim()) errors.symbol = "Stablecoin symbol is required.";

  if (!form.administrator.trim() || !isAddress(form.administrator.trim())) {
    errors.administrator = "Valid EVM administrator address required.";
  }
  if (!form.reserveOperator.trim() || !isAddress(form.reserveOperator.trim())) {
    errors.reserveOperator = "Valid EVM reserve operator address required.";
  }
  if (!form.pauser.trim() || !isAddress(form.pauser.trim())) {
    errors.pauser = "Valid EVM pauser address required.";
  }
  if (!form.recipient.trim() || !isAddress(form.recipient.trim())) {
    errors.recipient = "Valid EVM recipient address required.";
  }

  const amountResult = parseReserveUnits(form.reserveAmount);
  if (!amountResult.valid) {
    errors.reserveAmount = amountResult.error ?? "Invalid reserve amount.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    parsedAmount: amountResult.amount,
  };
}
