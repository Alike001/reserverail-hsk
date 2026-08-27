import {
  encodeFunctionData,
  formatUnits,
  getAddress,
  isAddress,
  parseEventLogs,
  parseUnits,
  zeroAddress,
  type Address,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { hskPublicClient } from "./chain";
import { WalletOperationError } from "./errors";
import { HSK_MAINNET_USDC_E, RESERVE_DECIMALS } from "./issuer";
import { executeHskTransaction, type TransactionState } from "./transaction";

export const holderTokenAbi = [
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
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
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const holderVaultAbi = [
  {
    type: "function",
    name: "reserveAsset",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "issuerToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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
    name: "operationallyPaused",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "redeem",
    inputs: [
      { name: "tokenAmount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Redeemed",
    inputs: [
      { name: "holder", type: "address", indexed: true },
      { name: "issuerToken", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "burnedAmount", type: "uint256", indexed: false },
      { name: "reservePaid", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

const reserveAbi = [
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export type HolderPublicClient = Pick<
  typeof hskPublicClient,
  "getBlockNumber" | "readContract" | "waitForTransactionReceipt"
>;

export interface HolderPosition {
  blockNumber: bigint;
  holder: Address;
  isFullyBacked: boolean;
  operationallyPaused: boolean;
  reserveAsset: Address;
  reserveBalance: bigint;
  reserveDecimals: number;
  tokenAddress: Address;
  tokenBalance: bigint;
  tokenDecimals: number;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: bigint;
  vaultAddress: Address;
  vaultReserveBalance: bigint;
}

export interface TransferBaseline {
  position: HolderPosition;
  recipient: Address;
  recipientBalance: bigint;
}

export interface RedemptionBaseline {
  position: HolderPosition;
  recipient: Address;
  recipientReserveBalance: bigint;
}

export interface HolderActionResult {
  blockNumber: bigint;
  position: HolderPosition;
}

export function parseHolderAmount(
  input: string,
  decimals: number,
  available: bigint,
): { amount?: bigint; error?: string; valid: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Amount is required.", valid: false };
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return {
      error: "Use a positive decimal amount without signs or exponents.",
      valid: false,
    };
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    return { error: "Unsupported token decimal configuration.", valid: false };
  }
  const fraction = trimmed.split(".")[1];
  if (fraction && fraction.length > decimals) {
    return {
      error: `Maximum precision is ${decimals} decimal places.`,
      valid: false,
    };
  }

  try {
    const amount = parseUnits(trimmed, decimals);
    if (amount <= 0n) {
      return { error: "Amount must be greater than zero.", valid: false };
    }
    if (amount > available) {
      return { error: "Amount exceeds the available balance.", valid: false };
    }
    return { amount, valid: true };
  } catch {
    return { error: "Amount could not be parsed safely.", valid: false };
  }
}

export function validateHolderRecipient(
  value: string,
  holder?: Address,
  rejectHolder = false,
): { address?: Address; error?: string; valid: boolean } {
  const trimmed = value.trim();
  if (!isAddress(trimmed) || getAddress(trimmed) === zeroAddress) {
    return { error: "Enter a valid non-zero EVM address.", valid: false };
  }
  const address = getAddress(trimmed);
  if (rejectHolder && holder && address === getAddress(holder)) {
    return {
      error: "Transfer recipient must be different from your wallet.",
      valid: false,
    };
  }
  return { address, valid: true };
}

export function formatHolderUnits(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

export async function fetchHolderPosition({
  holder,
  tokenAddress,
  vaultAddress,
  blockNumber,
  client = hskPublicClient,
}: {
  blockNumber?: bigint;
  client?: HolderPublicClient;
  holder: Address;
  tokenAddress: Address;
  vaultAddress: Address;
}): Promise<HolderPosition> {
  const checkedToken = getAddress(tokenAddress);
  const checkedVault = getAddress(vaultAddress);
  const checkedHolder = getAddress(holder);
  const pinnedBlock = blockNumber ?? (await client.getBlockNumber());

  const [tokenVault, vaultToken, reserveAsset] = await Promise.all([
    client.readContract({
      address: checkedToken,
      abi: holderTokenAbi,
      functionName: "vault",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedVault,
      abi: holderVaultAbi,
      functionName: "issuerToken",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedVault,
      abi: holderVaultAbi,
      functionName: "reserveAsset",
      blockNumber: pinnedBlock,
    }),
  ]);

  if (
    getAddress(tokenVault) !== checkedVault ||
    getAddress(vaultToken) !== checkedToken
  ) {
    throw new WalletOperationError(
      "rpc",
      "Configured token and vault do not identify each other as a verified pair.",
    );
  }

  const checkedReserve = getAddress(reserveAsset);
  if (checkedReserve !== getAddress(HSK_MAINNET_USDC_E)) {
    throw new WalletOperationError(
      "rpc",
      "Paired vault reserve is not the configured HSK mainnet USDC.e asset.",
    );
  }
  const [
    tokenName,
    tokenSymbol,
    tokenDecimals,
    totalSupply,
    tokenBalance,
    tokenPaused,
    vaultPaused,
    vaultReserveBalance,
    reserveDecimals,
    reserveBalance,
  ] = await Promise.all([
    client.readContract({
      address: checkedToken,
      abi: holderTokenAbi,
      functionName: "name",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedToken,
      abi: holderTokenAbi,
      functionName: "symbol",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedToken,
      abi: holderTokenAbi,
      functionName: "decimals",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedToken,
      abi: holderTokenAbi,
      functionName: "totalSupply",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedToken,
      abi: holderTokenAbi,
      functionName: "balanceOf",
      args: [checkedHolder],
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedToken,
      abi: holderTokenAbi,
      functionName: "paused",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedVault,
      abi: holderVaultAbi,
      functionName: "operationallyPaused",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedVault,
      abi: holderVaultAbi,
      functionName: "reserveBalance",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedReserve,
      abi: reserveAbi,
      functionName: "decimals",
      blockNumber: pinnedBlock,
    }),
    client.readContract({
      address: checkedReserve,
      abi: reserveAbi,
      functionName: "balanceOf",
      args: [checkedHolder],
      blockNumber: pinnedBlock,
    }),
  ]);

  if (tokenPaused !== vaultPaused) {
    throw new WalletOperationError(
      "rpc",
      "Token and vault pause reads disagree at the same confirmed block.",
    );
  }
  if (
    tokenDecimals !== RESERVE_DECIMALS ||
    reserveDecimals !== RESERVE_DECIMALS
  ) {
    throw new WalletOperationError(
      "rpc",
      "Token and reserve decimal configuration is incompatible with exact 1:1 redemption.",
    );
  }

  return {
    blockNumber: pinnedBlock,
    holder: checkedHolder,
    isFullyBacked: vaultReserveBalance >= totalSupply,
    operationallyPaused: vaultPaused,
    reserveAsset: checkedReserve,
    reserveBalance,
    reserveDecimals,
    tokenAddress: checkedToken,
    tokenBalance,
    tokenDecimals,
    tokenName,
    tokenSymbol,
    totalSupply,
    vaultAddress: checkedVault,
    vaultReserveBalance,
  };
}

export async function prepareHolderTransfer({
  holder,
  recipient,
  tokenAddress,
  vaultAddress,
  client = hskPublicClient,
}: {
  client?: HolderPublicClient;
  holder: Address;
  recipient: Address;
  tokenAddress: Address;
  vaultAddress: Address;
}): Promise<TransferBaseline> {
  if (getAddress(holder) === getAddress(recipient)) {
    throw new WalletOperationError(
      "unauthorized",
      "Transfer recipient must be different from the holder wallet.",
    );
  }
  const blockNumber = await client.getBlockNumber();
  const [position, recipientBalance] = await Promise.all([
    fetchHolderPosition({
      blockNumber,
      client,
      holder,
      tokenAddress,
      vaultAddress,
    }),
    client.readContract({
      address: tokenAddress,
      abi: holderTokenAbi,
      functionName: "balanceOf",
      args: [recipient],
      blockNumber,
    }),
  ]);

  if (position.operationallyPaused) {
    throw new WalletOperationError(
      "unauthorized",
      "Token transfers are disabled while the pair is operationally paused.",
    );
  }
  return { position, recipient: getAddress(recipient), recipientBalance };
}

export async function prepareHolderRedemption({
  holder,
  recipient,
  tokenAddress,
  vaultAddress,
  client = hskPublicClient,
}: {
  client?: HolderPublicClient;
  holder: Address;
  recipient: Address;
  tokenAddress: Address;
  vaultAddress: Address;
}): Promise<RedemptionBaseline> {
  const blockNumber = await client.getBlockNumber();
  const position = await fetchHolderPosition({
    blockNumber,
    client,
    holder,
    tokenAddress,
    vaultAddress,
  });
  const recipientReserveBalance = await client.readContract({
    address: position.reserveAsset,
    abi: reserveAbi,
    functionName: "balanceOf",
    args: [recipient],
    blockNumber,
  });
  return {
    position,
    recipient: getAddress(recipient),
    recipientReserveBalance,
  };
}

export async function executeHolderTransfer({
  account,
  amount,
  baseline,
  onState = () => undefined,
  publicClient = hskPublicClient,
  walletClient,
}: {
  account: Address;
  amount: bigint;
  baseline: TransferBaseline;
  onState?: (state: TransactionState) => void;
  publicClient?: HolderPublicClient;
  walletClient: WalletClient;
}): Promise<{ receipt: TransactionReceipt; result: HolderActionResult }> {
  if (
    amount <= 0n ||
    amount > baseline.position.tokenBalance ||
    baseline.position.operationallyPaused
  ) {
    throw new WalletOperationError(
      "unauthorized",
      "Transfer amount is unavailable from the latest confirmed holder position.",
    );
  }
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () =>
      walletClient.sendTransaction({
        account,
        chain: null,
        data: encodeFunctionData({
          abi: holderTokenAbi,
          functionName: "transfer",
          args: [baseline.recipient, amount],
        }),
        to: baseline.position.tokenAddress,
      }),
    verify: (receipt) =>
      reconcileHolderTransfer({
        amount,
        baseline,
        blockNumber: receipt.blockNumber,
        client: publicClient,
        receipt,
      }),
    waitForReceipt: (hash) =>
      publicClient.waitForTransactionReceipt({ confirmations: 1, hash }),
  });
}

export async function executeHolderRedemption({
  account,
  amount,
  baseline,
  onState = () => undefined,
  publicClient = hskPublicClient,
  walletClient,
}: {
  account: Address;
  amount: bigint;
  baseline: RedemptionBaseline;
  onState?: (state: TransactionState) => void;
  publicClient?: HolderPublicClient;
  walletClient: WalletClient;
}): Promise<{ receipt: TransactionReceipt; result: HolderActionResult }> {
  if (
    amount <= 0n ||
    amount > baseline.position.tokenBalance ||
    amount > baseline.position.vaultReserveBalance
  ) {
    throw new WalletOperationError(
      "unauthorized",
      "Redemption amount exceeds the latest confirmed holder or vault balance.",
    );
  }
  return executeHskTransaction({
    getChainId: () => walletClient.getChainId(),
    onState,
    send: async () =>
      walletClient.sendTransaction({
        account,
        chain: null,
        data: encodeFunctionData({
          abi: holderVaultAbi,
          functionName: "redeem",
          args: [amount, baseline.recipient],
        }),
        to: baseline.position.vaultAddress,
      }),
    verify: (receipt) =>
      reconcileHolderRedemption({
        amount,
        baseline,
        blockNumber: receipt.blockNumber,
        client: publicClient,
        receipt,
      }),
    waitForReceipt: (hash) =>
      publicClient.waitForTransactionReceipt({ confirmations: 1, hash }),
  });
}

export async function reconcileHolderTransfer({
  amount,
  baseline,
  blockNumber,
  client = hskPublicClient,
  receipt,
}: {
  amount: bigint;
  baseline: TransferBaseline;
  blockNumber: bigint;
  client?: HolderPublicClient;
  receipt: TransactionReceipt;
}): Promise<HolderActionResult> {
  assertTransferEvent(receipt, baseline, amount);
  const [position, recipientBalance] = await Promise.all([
    fetchHolderPosition({
      blockNumber,
      client,
      holder: baseline.position.holder,
      tokenAddress: baseline.position.tokenAddress,
      vaultAddress: baseline.position.vaultAddress,
    }),
    client.readContract({
      address: baseline.position.tokenAddress,
      abi: holderTokenAbi,
      functionName: "balanceOf",
      args: [baseline.recipient],
      blockNumber,
    }),
  ]);

  if (
    baseline.position.tokenBalance - position.tokenBalance !== amount ||
    recipientBalance - baseline.recipientBalance !== amount ||
    position.totalSupply !== baseline.position.totalSupply
  ) {
    throw new WalletOperationError(
      "rpc",
      "Confirmed transfer did not reconcile with sender, recipient, and total-supply post-reads.",
    );
  }
  return { blockNumber, position };
}

export async function reconcileHolderRedemption({
  amount,
  baseline,
  blockNumber,
  client = hskPublicClient,
  receipt,
}: {
  amount: bigint;
  baseline: RedemptionBaseline;
  blockNumber: bigint;
  client?: HolderPublicClient;
  receipt: TransactionReceipt;
}): Promise<HolderActionResult> {
  assertRedemptionEvent(receipt, baseline, amount);
  const position = await fetchHolderPosition({
    blockNumber,
    client,
    holder: baseline.position.holder,
    tokenAddress: baseline.position.tokenAddress,
    vaultAddress: baseline.position.vaultAddress,
  });
  const recipientReserveBalance = await client.readContract({
    address: position.reserveAsset,
    abi: reserveAbi,
    functionName: "balanceOf",
    args: [baseline.recipient],
    blockNumber,
  });

  if (
    baseline.position.tokenBalance - position.tokenBalance !== amount ||
    baseline.position.totalSupply - position.totalSupply !== amount ||
    baseline.position.vaultReserveBalance - position.vaultReserveBalance !==
      amount ||
    recipientReserveBalance - baseline.recipientReserveBalance !== amount
  ) {
    throw new WalletOperationError(
      "rpc",
      "Confirmed redemption did not reconcile with burn, reserve payout, supply, and holder post-reads.",
    );
  }
  return { blockNumber, position };
}

function assertTransferEvent(
  receipt: TransactionReceipt,
  baseline: TransferBaseline,
  amount: bigint,
) {
  const events = parseEventLogs({
    abi: holderTokenAbi,
    eventName: "Transfer",
    logs: receipt.logs.filter(
      (log) => getAddress(log.address) === baseline.position.tokenAddress,
    ),
    strict: true,
  }).filter(
    (event) =>
      getAddress(event.args.from) === baseline.position.holder &&
      getAddress(event.args.to) === baseline.recipient &&
      event.args.value === amount,
  );
  if (events.length !== 1) {
    throw new WalletOperationError(
      "rpc",
      "Confirmed receipt does not contain exactly one matching token Transfer event.",
    );
  }
}

function assertRedemptionEvent(
  receipt: TransactionReceipt,
  baseline: RedemptionBaseline,
  amount: bigint,
) {
  const events = parseEventLogs({
    abi: holderVaultAbi,
    eventName: "Redeemed",
    logs: receipt.logs.filter(
      (log) => getAddress(log.address) === baseline.position.vaultAddress,
    ),
    strict: true,
  }).filter(
    (event) =>
      getAddress(event.args.holder) === baseline.position.holder &&
      getAddress(event.args.issuerToken) === baseline.position.tokenAddress &&
      getAddress(event.args.recipient) === baseline.recipient &&
      event.args.burnedAmount === amount &&
      event.args.reservePaid === amount,
  );
  if (events.length !== 1) {
    throw new WalletOperationError(
      "rpc",
      "Confirmed receipt does not contain exactly one matching vault Redeemed event.",
    );
  }
}
