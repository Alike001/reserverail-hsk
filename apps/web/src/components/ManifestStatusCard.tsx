import { deploymentManifest, hskMainnet } from "../config/hsk";

export function ManifestStatusCard() {
  const isUndeployed = deploymentManifest.status === "undeployed";

  return (
    <section
      className="manifest-card"
      aria-labelledby="manifest-status-heading"
    >
      <div className="manifest-header">
        <div>
          <span className="eyebrow">Deployment Manifest</span>
          <h2 id="manifest-status-heading">
            {isUndeployed
              ? "Awaiting HSK Mainnet Deployment"
              : "Deployed on HSK Mainnet"}
          </h2>
        </div>
        <span
          className={`manifest-status-pill ${
            isUndeployed ? "status-undeployed" : "status-deployed"
          }`}
          role="status"
        >
          {deploymentManifest.status.toUpperCase()}
        </span>
      </div>

      <div className="manifest-grid">
        <div className="manifest-item">
          <span className="item-label">Target Network</span>
          <span className="item-value">
            {hskMainnet.name} (Chain ID {hskMainnet.id})
          </span>
        </div>
        <div className="manifest-item">
          <span className="item-label">Schema Version</span>
          <span className="item-value">
            v{deploymentManifest.schemaVersion}
          </span>
        </div>
        <div className="manifest-item">
          <span className="item-label">Factory Contract</span>
          <span className="item-value code-font">
            {deploymentManifest.factory ?? "Uncommitted (null)"}
          </span>
        </div>
        <div className="manifest-item">
          <span className="item-label">Pilot Token</span>
          <span className="item-value code-font">
            {deploymentManifest.pilot.token ?? "Uncommitted (null)"}
          </span>
        </div>
        <div className="manifest-item">
          <span className="item-label">Pilot Vault</span>
          <span className="item-value code-font">
            {deploymentManifest.pilot.vault ?? "Uncommitted (null)"}
          </span>
        </div>
        <div className="manifest-item">
          <span className="item-label">Source Commit</span>
          <span className="item-value code-font">
            {deploymentManifest.sourceCommit ?? "Uncommitted (null)"}
          </span>
        </div>
      </div>

      <p className="manifest-truth-note">
        {isUndeployed
          ? "ReserveRail reads deployment status directly from the checked manifest. Because status is undeployed, no live coverage or proof transactions are claimed until real HSK contract addresses are committed."
          : `Contracts are recorded from commit ${deploymentManifest.sourceCommit}. Financial evidence remains unavailable unless a verified live proof read succeeds.`}
      </p>
    </section>
  );
}
