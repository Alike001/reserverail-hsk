import { deploymentManifest, hskMainnet } from "../config/hsk";
import type { PilotProofData, RouteState } from "../types/pilot";
import { PilotProofState } from "./PilotProofState";
import { PilotUndeployedState } from "./PilotUndeployedState";
import { UnauditedBadge } from "./UnauditedBadge";

interface PilotRouteProps {
  onNavigate: (route: RouteState) => void;
  onRetryProof?: () => void;
  proofData?: PilotProofData;
  manifestOverride?: typeof deploymentManifest;
}

export function PilotRoute({
  onNavigate,
  onRetryProof,
  proofData,
  manifestOverride,
}: PilotRouteProps) {
  const manifest = manifestOverride ?? deploymentManifest;
  const pilotName =
    proofData?.status === "deployed"
      ? `${proofData.tokenName} (${proofData.tokenSymbol})`
      : "ReserveRail Pilot";

  return (
    <div className="pilot-route-view">
      <header className="pilot-header">
        <button
          type="button"
          className="btn-back"
          onClick={() => onNavigate("landing")}
        >
          ← Back to landing
        </button>

        <div className="pilot-title-group">
          <div className="pilot-title-row">
            <h1>{pilotName}</h1>
            <UnauditedBadge />
          </div>
          <p className="pilot-subtitle">
            {hskMainnet.name} · Chain ID {hskMainnet.id}
          </p>
        </div>
      </header>

      {manifest.status === "undeployed" ? (
        <PilotUndeployedState manifest={manifest} />
      ) : (
        <PilotProofState
          manifest={manifest}
          proofData={proofData}
          onRetry={onRetryProof}
        />
      )}
    </div>
  );
}
