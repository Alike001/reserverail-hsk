import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";
import { LandingView } from "../LandingView";
import { ManifestStatusCard } from "../ManifestStatusCard";
import { PilotRoute } from "../PilotRoute";
import { UnauditedBadge } from "../UnauditedBadge";

describe("ReserveRail Landing & Pilot Route (P5-01)", () => {
  it("renders product promise and four-step money flow on LandingView", () => {
    const onNavigate = vi.fn();
    render(<LandingView onNavigate={onNavigate} />);

    // Product promise
    expect(
      screen.getByText(
        "Launch a USDC.e-backed stablecoin people can verify and redeem.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        /ReserveRail is being built to give issuers one transparent path/i,
      ),
    ).toBeDefined();

    // Four-step money flow
    expect(screen.getByText("Deposit USDC.e")).toBeDefined();
    expect(screen.getByText("Mint")).toBeDefined();
    expect(screen.getByText("Distribute")).toBeDefined();
    expect(screen.getByText("Redeem")).toBeDefined();
  });

  it("renders prominent Unaudited badge across views", () => {
    render(<UnauditedBadge />);
    expect(screen.getByText("Unaudited low-value pilot")).toBeDefined();
  });

  it("reads checked deployment manifest status correctly", () => {
    render(<ManifestStatusCard />);
    expect(screen.getByText("Awaiting HSK Mainnet Deployment")).toBeDefined();
    expect(screen.getByText("UNDEPLOYED")).toBeDefined();
    expect(screen.getAllByText(/177/).length).toBeGreaterThan(0);
  });

  it("displays explicit, truthful undeployed state in PilotRoute when manifest is undeployed", () => {
    const onNavigate = vi.fn();
    render(<PilotRoute onNavigate={onNavigate} />);

    expect(
      screen.getByRole("heading", {
        name: "Pilot Awaiting HSK Mainnet Deployment",
      }),
    ).toBeDefined();

    expect(screen.getByText(/Truthful Presentation Policy/i)).toBeDefined();

    expect(
      screen.getByText(
        /ReserveRail does not show fabricated reserves, token balances/i,
      ),
    ).toBeDefined();

    expect(screen.getAllByText("UNDEPLOYED").length).toBeGreaterThan(0);
  });

  it("allows navigating between Landing and Pilot route in App without wallet prompt", () => {
    render(<App />);

    // Starts on Landing
    expect(
      screen.getByText(
        "Launch a USDC.e-backed stablecoin people can verify and redeem.",
      ),
    ).toBeDefined();

    // Navigate to Pilot route via Hero CTA
    const inspectBtn = screen.getByRole("button", {
      name: /Inspect Pilot Route \(Undeployed\)/i,
    });
    fireEvent.click(inspectBtn);

    // Shows Pilot route undeployed state
    expect(
      screen.getByRole("heading", {
        name: "Pilot Awaiting HSK Mainnet Deployment",
      }),
    ).toBeDefined();

    // Back to Landing
    const backBtn = screen.getByRole("button", { name: /Back to Landing/i });
    fireEvent.click(backBtn);

    expect(
      screen.getByText(
        "Launch a USDC.e-backed stablecoin people can verify and redeem.",
      ),
    ).toBeDefined();
  });

  it("hides every financial value when a deployed manifest has no proof read", () => {
    const onNavigate = vi.fn();
    render(
      <PilotRoute
        onNavigate={onNavigate}
        manifestOverride={deployedManifest}
      />,
    );

    expect(screen.getByText("Live HSK data unavailable")).toBeDefined();
    expect(screen.getByText(/No verified proof reader/i)).toBeDefined();
    expect(screen.queryByText("100.00%")).toBeNull();
    expect(screen.queryByText(/0.00 USDC\.e/)).toBeNull();
    expect(screen.queryByText("Active")).toBeNull();
  });

  it("supports future P5-07 proof data integration in PilotRoute", () => {
    const onNavigate = vi.fn();

    render(
      <PilotRoute
        onNavigate={onNavigate}
        manifestOverride={deployedManifest}
        proofData={{
          status: "deployed",
          tokenAddress: deployedManifest.pilot.token,
          vaultAddress: deployedManifest.pilot.vault,
          factoryAddress: deployedManifest.factory,
          reserveAssetAddress: "0x4444444444444444444444444444444444444444",
          issuerAddress: "0x5555555555555555555555555555555555555555",
          tokenAdministrator: "0x6666666666666666666666666666666666666666",
          vaultAdministrator: "0x7777777777777777777777777777777777777777",
          reserveOperator: "0x8888888888888888888888888888888888888888",
          pauser: "0x9999999999999999999999999999999999999999",
          tokenName: "Verified Test Token",
          tokenSymbol: "VTT",
          vaultReserve: "25.00",
          totalSupply: "25.00",
          coverageRatio: "100.00",
          backingState: "Fully backed",
          operationalState: "Active",
          version: "1",
          versionStatus: "Active",
          lastConfirmedBlock: "123456",
          snapshotAgeSeconds: "20",
          updatedAt: "2026-08-27T00:00:00Z",
          transactions: [
            {
              hash: "0x" + "a".repeat(64),
              type: "deposit",
              amount: "25.00 USDC.e",
              blockNumber: 123456,
              timestamp: "2026-08-27T00:00:00Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getAllByText(/25\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText("100.00%")).toBeDefined();
    expect(screen.getByText("deposit")).toBeDefined();
  });
});

const deployedManifest = {
  schemaVersion: 1 as const,
  status: "deployed" as const,
  chainId: 177 as const,
  sourceCommit: "a".repeat(40),
  factory: "0x1111111111111111111111111111111111111111" as const,
  pilot: {
    token: "0x2222222222222222222222222222222222222222" as const,
    vault: "0x3333333333333333333333333333333333333333" as const,
  },
  updatedAt: "2026-08-27T00:00:00Z",
};
