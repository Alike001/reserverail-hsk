import { formatUnits, getAddress, type Address, type PublicClient } from "viem";
import {
  deploymentManifest,
  hskMainnet,
  type Address as ConfigAddress,
} from "../config/hsk";
import type { PilotProofData } from "../types/pilot";
import { hskPublicClient } from "./chain";
import { HSK_MAINNET_USDC_E, RESERVE_DECIMALS } from "./issuer";

export const MAX_PROOF_AGE_SECONDS = 15n * 60n;

const factoryProofAbi = [
  {
    type: "function",
    name: "versionRegistry",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
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
    name: "isRegisteredIssuerToken",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "issuerForToken",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        name: "instance",
        type: "tuple",
        components: [
          { name: "issuer", type: "address" },
          { name: "token", type: "address" },
          { name: "vault", type: "address" },
          { name: "reserveAsset", type: "address" },
          { name: "version", type: "uint64" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "issuerForVault",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [
      {
        name: "instance",
        type: "tuple",
        components: [
          { name: "issuer", type: "address" },
          { name: "token", type: "address" },
          { name: "vault", type: "address" },
          { name: "reserveAsset", type: "address" },
          { name: "version", type: "uint64" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

const tokenProofAbi = [
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
    name: "factory",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "administrator",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const vaultProofAbi = [
  {
    type: "function",
    name: "factory",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
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
] as const;

const reserveProofAbi = [
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

const registryProofAbi = [
  {
    type: "function",
    name: "isVersionActive",
    inputs: [{ name: "version", type: "uint64" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

export type DeployedManifest = Extract<
  typeof deploymentManifest,
  { status: "deployed" }
>;

export type ProofPublicClient = Pick<
  PublicClient,
  "getBlock" | "getBytecode" | "getChainId" | "readContract"
>;

export async function fetchPilotProof({
  client = hskPublicClient,
  manifest,
  nowMs = Date.now(),
}: {
  client?: ProofPublicClient;
  manifest: DeployedManifest;
  nowMs?: number;
}): Promise<Extract<PilotProofData, { status: "deployed" | "stale" }>> {
  if ((await client.getChainId()) !== hskMainnet.id) {
    throw new Error("The public RPC did not identify HSK Chain mainnet.");
  }

  const safeBlock = await client.getBlock({ blockTag: "safe" });
  if (safeBlock.number === null) {
    throw new Error("The HSK RPC returned a safe block without a number.");
  }

  const blockNumber = safeBlock.number;
  const updatedAt = timestampToIso(safeBlock.timestamp);
  const nowSeconds = BigInt(Math.floor(nowMs / 1_000));
  if (safeBlock.timestamp > nowSeconds + 60n) {
    throw new Error(
      "The HSK safe block timestamp is unexpectedly in the future.",
    );
  }
  const snapshotAge =
    nowSeconds > safeBlock.timestamp ? nowSeconds - safeBlock.timestamp : 0n;

  if (snapshotAge > MAX_PROOF_AGE_SECONDS) {
    return {
      status: "stale",
      errorMessage:
        "The latest HSK safe block is older than the 15-minute proof window. Financial values are withheld until a fresh safe snapshot is available.",
      lastConfirmedBlock: blockNumber.toString(),
      updatedAt,
    };
  }

  const factory = getAddress(manifest.factory);
  const token = getAddress(manifest.pilot.token);
  const vault = getAddress(manifest.pilot.vault);
  const expectedReserve = getAddress(HSK_MAINNET_USDC_E);

  const [
    versionRegistry,
    configuredReserve,
    registered,
    tokenInstance,
    vaultInstance,
    tokenName,
    tokenSymbol,
    tokenDecimals,
    totalSupply,
    tokenPaused,
    tokenVault,
    tokenFactory,
    tokenAdministrator,
    vaultFactory,
    vaultReserveAsset,
    vaultToken,
    vaultAdministrator,
    reserveOperator,
    pauser,
    vaultPaused,
    reportedReserve,
    redeemableSupply,
  ] = await Promise.all([
    read(client, factory, factoryProofAbi, "versionRegistry", blockNumber),
    read(
      client,
      factory,
      factoryProofAbi,
      "configuredReserveAsset",
      blockNumber,
    ),
    read(
      client,
      factory,
      factoryProofAbi,
      "isRegisteredIssuerToken",
      blockNumber,
      [token],
    ),
    read(client, factory, factoryProofAbi, "issuerForToken", blockNumber, [
      token,
    ]),
    read(client, factory, factoryProofAbi, "issuerForVault", blockNumber, [
      vault,
    ]),
    read(client, token, tokenProofAbi, "name", blockNumber),
    read(client, token, tokenProofAbi, "symbol", blockNumber),
    read(client, token, tokenProofAbi, "decimals", blockNumber),
    read(client, token, tokenProofAbi, "totalSupply", blockNumber),
    read(client, token, tokenProofAbi, "paused", blockNumber),
    read(client, token, tokenProofAbi, "vault", blockNumber),
    read(client, token, tokenProofAbi, "factory", blockNumber),
    read(client, token, tokenProofAbi, "administrator", blockNumber),
    read(client, vault, vaultProofAbi, "factory", blockNumber),
    read(client, vault, vaultProofAbi, "reserveAsset", blockNumber),
    read(client, vault, vaultProofAbi, "issuerToken", blockNumber),
    read(client, vault, vaultProofAbi, "administrator", blockNumber),
    read(client, vault, vaultProofAbi, "reserveOperator", blockNumber),
    read(client, vault, vaultProofAbi, "pauser", blockNumber),
    read(client, vault, vaultProofAbi, "operationallyPaused", blockNumber),
    read(client, vault, vaultProofAbi, "reserveBalance", blockNumber),
    read(client, vault, vaultProofAbi, "redeemableSupply", blockNumber),
  ]);

  const registry = getAddress(versionRegistry as Address);
  const addressesToCheck = [factory, token, vault, expectedReserve, registry];
  const bytecodes = await Promise.all(
    addressesToCheck.map((address) =>
      client.getBytecode({ address, blockNumber }),
    ),
  );
  if (bytecodes.some((code) => !code || code === "0x")) {
    throw new Error(
      "A checked HSK deployment address has no contract code at the safe block.",
    );
  }

  assertAddress(configuredReserve, expectedReserve, "factory reserve");
  assertAddress(tokenVault, vault, "token vault");
  assertAddress(tokenFactory, factory, "token factory");
  assertAddress(vaultFactory, factory, "vault factory");
  assertAddress(vaultReserveAsset, expectedReserve, "vault reserve");
  assertAddress(vaultToken, token, "vault token");
  if (!registered) {
    throw new Error(
      "The pilot token is not registered by the checked factory.",
    );
  }

  assertInstance(tokenInstance, {
    factoryToken: token,
    factoryVault: vault,
    reserveAsset: expectedReserve,
  });
  assertInstance(vaultInstance, {
    factoryToken: token,
    factoryVault: vault,
    reserveAsset: expectedReserve,
  });
  if (
    getAddress(tokenInstance.issuer) !== getAddress(vaultInstance.issuer) ||
    tokenInstance.version !== vaultInstance.version
  ) {
    throw new Error("Factory token and vault records disagree.");
  }
  if (tokenPaused !== vaultPaused) {
    throw new Error("Token and vault pause states disagree at the safe block.");
  }
  if (tokenDecimals !== RESERVE_DECIMALS) {
    throw new Error("The pilot token does not use the required six decimals.");
  }
  if (totalSupply !== redeemableSupply) {
    throw new Error("Token supply and vault redeemable supply disagree.");
  }

  const [reserveDecimals, directReserve, versionActive] = await Promise.all([
    read(client, expectedReserve, reserveProofAbi, "decimals", blockNumber),
    read(client, expectedReserve, reserveProofAbi, "balanceOf", blockNumber, [
      vault,
    ]),
    read(client, registry, registryProofAbi, "isVersionActive", blockNumber, [
      tokenInstance.version,
    ]),
  ]);
  if (reserveDecimals !== RESERVE_DECIMALS) {
    throw new Error("The configured reserve does not use six decimals.");
  }
  if (reportedReserve !== directReserve) {
    throw new Error("Vault and reserve-token balance reads disagree.");
  }

  const coverageRatio = formatCoverage(reportedReserve, totalSupply);
  const backingState =
    totalSupply === 0n
      ? "No outstanding supply"
      : reportedReserve >= totalSupply
        ? "Fully backed"
        : "Under-backed";

  return {
    status: "deployed",
    tokenAddress: token as ConfigAddress,
    vaultAddress: vault as ConfigAddress,
    factoryAddress: factory as ConfigAddress,
    reserveAssetAddress: expectedReserve as ConfigAddress,
    issuerAddress: getAddress(tokenInstance.issuer) as ConfigAddress,
    tokenAdministrator: getAddress(
      tokenAdministrator as Address,
    ) as ConfigAddress,
    vaultAdministrator: getAddress(
      vaultAdministrator as Address,
    ) as ConfigAddress,
    reserveOperator: getAddress(reserveOperator as Address) as ConfigAddress,
    pauser: getAddress(pauser as Address) as ConfigAddress,
    tokenName,
    tokenSymbol,
    totalSupply: formatUnits(totalSupply, RESERVE_DECIMALS),
    vaultReserve: formatUnits(reportedReserve, RESERVE_DECIMALS),
    coverageRatio,
    backingState,
    operationalState: vaultPaused ? "Paused" : "Active",
    version: tokenInstance.version.toString(),
    versionStatus: versionActive ? "Active" : "Inactive",
    lastConfirmedBlock: blockNumber.toString(),
    snapshotAgeSeconds: snapshotAge.toString(),
    updatedAt,
    transactions: [],
  };
}

function read<
  const TAbi extends readonly unknown[],
  const TFunctionName extends string,
>(
  client: ProofPublicClient,
  address: Address,
  abi: TAbi,
  functionName: TFunctionName,
  blockNumber: bigint,
  args?: readonly unknown[],
): Promise<any> {
  return client.readContract({
    address,
    abi: abi as never,
    functionName: functionName as never,
    args: args as never,
    blockNumber,
  }) as Promise<any>;
}

function assertAddress(actual: unknown, expected: Address, label: string) {
  if (getAddress(actual as Address) !== expected) {
    throw new Error(`The checked ${label} relationship does not reconcile.`);
  }
}

function assertInstance(
  instance: {
    issuer: Address;
    reserveAsset: Address;
    token: Address;
    vault: Address;
    version: bigint;
  },
  expected: {
    factoryToken: Address;
    factoryVault: Address;
    reserveAsset: Address;
  },
) {
  assertAddress(instance.token, expected.factoryToken, "factory token");
  assertAddress(instance.vault, expected.factoryVault, "factory vault");
  assertAddress(
    instance.reserveAsset,
    expected.reserveAsset,
    "factory reserve",
  );
  if (
    getAddress(instance.issuer) ===
    getAddress("0x0000000000000000000000000000000000000000")
  ) {
    throw new Error("The checked factory issuer is the zero address.");
  }
  if (instance.version === 0n) {
    throw new Error("The checked factory version is invalid.");
  }
}

export function formatCoverage(
  reserveBalance: bigint,
  totalSupply: bigint,
): string | null {
  if (totalSupply === 0n) return null;
  const basisPoints = (reserveBalance * 10_000n) / totalSupply;
  return `${basisPoints / 100n}.${(basisPoints % 100n)
    .toString()
    .padStart(2, "0")}`;
}

function timestampToIso(timestamp: bigint): string {
  if (timestamp > BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1_000))) {
    throw new Error(
      "The HSK safe block timestamp is outside the supported range.",
    );
  }
  return new Date(Number(timestamp) * 1_000).toISOString();
}
