import type { Address } from "../config/hsk";

export type RouteState = "landing" | "pilot" | "controls" | "create" | "holder";

export interface ProofTransaction {
  hash: string;
  type: "deposit" | "distribution" | "redemption";
  amount: string;
  actor?: string;
  recipient?: string;
  blockNumber: number;
  timestamp: string;
}

export type PilotProofData =
  | { status: "loading" }
  | { status: "undeployed" }
  | { status: "error"; errorMessage?: string }
  | {
      status: "stale";
      errorMessage: string;
      lastConfirmedBlock: string;
      updatedAt: string;
    }
  | {
      status: "deployed";
      tokenAddress: Address;
      vaultAddress: Address;
      factoryAddress: Address;
      reserveAssetAddress: Address;
      issuerAddress: Address;
      tokenAdministrator: Address;
      vaultAdministrator: Address;
      reserveOperator: Address;
      pauser: Address;
      tokenName: string;
      tokenSymbol: string;
      totalSupply: string;
      vaultReserve: string;
      coverageRatio: string | null;
      backingState: string;
      operationalState: string;
      version: string;
      versionStatus: string;
      lastConfirmedBlock: string;
      snapshotAgeSeconds: string;
      updatedAt: string;
      transactions: ProofTransaction[];
    };
