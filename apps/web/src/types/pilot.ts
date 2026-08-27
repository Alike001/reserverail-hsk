import type { Address } from "../config/hsk";

export type RouteState = "landing" | "pilot";

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
      status: "deployed";
      tokenAddress: Address;
      vaultAddress: Address;
      factoryAddress: Address;
      tokenName: string;
      tokenSymbol: string;
      totalSupply: string;
      vaultReserve: string;
      coverageRatio: string;
      operationalState: string;
      lastConfirmedBlock: number;
      updatedAt: string;
      transactions: ProofTransaction[];
    };
