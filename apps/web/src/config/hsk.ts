import deploymentData from "../../../../config/deployments/hsk-mainnet.json";
import networkData from "../../../../config/hsk-networks.json";

export type Address = `0x${string}`;

type DeploymentManifestBase = {
  schemaVersion: 1;
  chainId: 177;
};

type UndeployedManifest = DeploymentManifestBase & {
  status: "undeployed";
  sourceCommit: null;
  factory: null;
  pilot: {
    token: null;
    vault: null;
  };
  updatedAt: null;
};

type DeployedManifest = DeploymentManifestBase & {
  status: "deployed";
  sourceCommit: string;
  factory: Address;
  pilot: {
    token: Address;
    vault: Address;
  };
  updatedAt: string;
};

type DeploymentManifest = UndeployedManifest | DeployedManifest;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;

const publicRpcOverride = import.meta.env.VITE_HSK_MAINNET_RPC_URL?.trim();
const publicExplorerOverride =
  import.meta.env.VITE_HSK_MAINNET_EXPLORER_URL?.trim();

export const hskMainnet = {
  ...networkData.mainnet,
  rpcUrl: publicRpcOverride || networkData.mainnet.rpcUrl,
  explorerUrl: stripTrailingSlash(
    publicExplorerOverride || networkData.mainnet.explorerUrl,
  ),
};

export const hskTestnet = networkData.testnet;

export const deploymentManifest = parseDeploymentManifest(deploymentData);

export function assertHskMainnet(
  writeChainId: number,
): asserts writeChainId is 177 {
  if (writeChainId !== hskMainnet.id) {
    throw new Error(
      `Wrong network: expected HSK Chain mainnet ${hskMainnet.id}, received ${writeChainId}`,
    );
  }
}

export function toExplorerAddress(address: string): string {
  return `${hskMainnet.explorerUrl}/address/${assertAddress(address, "explorer")}`;
}

export function toExplorerTransaction(hash: string): string {
  if (!HASH_PATTERN.test(hash)) {
    throw new Error("Invalid transaction hash");
  }

  return `${hskMainnet.explorerUrl}/tx/${hash}`;
}

export function parseDeploymentManifest(value: unknown): DeploymentManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.chainId !== 177) {
    throw new Error("Unsupported HSK deployment manifest");
  }

  if (value.status !== "undeployed" && value.status !== "deployed") {
    throw new Error("Invalid deployment status");
  }

  if (!isRecord(value.pilot)) {
    throw new Error("Invalid pilot deployment entry");
  }

  const manifest = value as unknown as DeploymentManifest;

  if (manifest.status === "deployed") {
    assertAddress(manifest.factory, "factory");
    assertAddress(manifest.pilot.token, "pilot token");
    assertAddress(manifest.pilot.vault, "pilot vault");

    if (!manifest.sourceCommit || !COMMIT_PATTERN.test(manifest.sourceCommit)) {
      throw new Error("Deployed manifest requires a full source commit");
    }

    if (!manifest.updatedAt || Number.isNaN(Date.parse(manifest.updatedAt))) {
      throw new Error("Deployed manifest requires a valid update time");
    }
  }

  return manifest;
}

function assertAddress(value: unknown, label: string): Address {
  if (typeof value !== "string" || !ADDRESS_PATTERN.test(value)) {
    throw new Error(`Invalid ${label} address`);
  }

  return value as Address;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
