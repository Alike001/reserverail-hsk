import { describe, expect, it } from "vitest";
import {
  assertHskMainnet,
  deploymentManifest,
  hskMainnet,
  hskTestnet,
  parseDeploymentManifest,
  toExplorerAddress,
  toExplorerTransaction,
} from "./hsk";

const address = "0x1111111111111111111111111111111111111111";
const hash = `0x${"a".repeat(64)}`;

describe("HSK configuration", () => {
  it("pins the reviewed networks and reserve asset", () => {
    expect(hskMainnet.id).toBe(177);
    expect(hskTestnet.id).toBe(133);
    expect(hskMainnet.usdcE.address).toBe(
      "0x054ed45810DbBAb8B27668922D110669c9D88D0a",
    );
    expect(hskMainnet.usdcE.decimals).toBe(6);
  });

  it("rejects a write on the wrong chain before signing", () => {
    expect(() => assertHskMainnet(133)).toThrow(
      "Wrong network: expected HSK Chain mainnet 177, received 133",
    );
  });

  it("builds checked Blockscout links", () => {
    expect(toExplorerAddress(address)).toBe(
      `https://hashkey.blockscout.com/address/${address}`,
    );
    expect(toExplorerTransaction(hash)).toBe(
      `https://hashkey.blockscout.com/tx/${hash}`,
    );
    expect(() => toExplorerAddress("0x1234")).toThrow(
      "Invalid explorer address",
    );
    expect(() => toExplorerTransaction("0x1234")).toThrow(
      "Invalid transaction hash",
    );
  });

  it("loads the checked, provenance-bound mainnet deployment", () => {
    expect(deploymentManifest.status).toBe("deployed");
    expect(deploymentManifest.sourceCommit).toBe(
      "ab6928abd991848ec4886e264b8d9708def694b0",
    );
    expect(deploymentManifest.factory).toBe(
      "0xe6F9207A41766edB96B762e29Bd6B299e1009Df6",
    );
    expect(deploymentManifest.pilot.token).toBe(
      "0x98D13E05EaaC2E66e86A87603781c6ff9b9cd8B0",
    );
    expect(deploymentManifest.pilot.vault).toBe(
      "0x05edbecb97ee9128a83465D6227b680627C5130b",
    );
  });

  it("rejects a deployed manifest without real addresses and provenance", () => {
    expect(() =>
      parseDeploymentManifest({
        schemaVersion: 1,
        status: "deployed",
        chainId: 177,
        sourceCommit: null,
        factory: null,
        pilot: { token: null, vault: null },
        updatedAt: null,
      }),
    ).toThrow("Invalid factory address");
  });
});
