import type { deploymentManifest } from "../config/hsk";

interface PilotUndeployedStateProps {
  manifest: typeof deploymentManifest;
}

export function PilotUndeployedState({ manifest }: PilotUndeployedStateProps) {
  return (
    <section
      className="pilot-undeployed-state"
      aria-labelledby="undeployed-state-title"
    >
      <div className="state-banner state-banner-undeployed">
        <span className="banner-icon" aria-hidden="true">
          ⚠️
        </span>
        <div className="banner-text">
          <h2 id="undeployed-state-title">
            Pilot Awaiting HSK Mainnet Deployment
          </h2>
          <p>
            The checked manifest is <strong>undeployed</strong>. Live contract
            inspection stays disabled until verified addresses are committed.
          </p>
        </div>
        <span className="pill-badge pill-undeployed" role="status">
          UNDEPLOYED
        </span>
      </div>

      <div className="truth-commitment-box">
        <h3>Truthful presentation policy</h3>
        <p>
          ReserveRail does not show fabricated reserves, token balances,
          transaction hashes, or coverage while contracts are undeployed.
        </p>
        <ul>
          <li>No wallet or registration is required for inspection.</li>
          <li>No fixture address is presented as live HSK evidence.</li>
          <li>
            P5-07 must implement and verify live reads before evidence appears.
          </li>
        </ul>
      </div>

      <div className="manifest-details-grid" aria-label="Manifest details">
        <ManifestDetail label="Manifest Status" value={manifest.status} />
        <ManifestDetail label="Factory Address" value={manifest.factory} />
        <ManifestDetail label="Pilot Token" value={manifest.pilot.token} />
        <ManifestDetail label="Pilot Vault" value={manifest.pilot.vault} />
        <ManifestDetail label="Source Commit" value={manifest.sourceCommit} />
      </div>

      <div className="future-proof-container">
        <h3>Reserved for verified proof integration</h3>
        <p className="future-proof-desc">
          Real reserve, supply, coverage, state, and transaction evidence can
          appear here only after a successful HSK RPC read.
        </p>
        <div className="skeleton-grid" aria-label="Unavailable proof metrics">
          <UnavailableMetric label="Vault Reserve" />
          <UnavailableMetric label="Total Supply" />
          <UnavailableMetric label="Coverage Ratio" />
          <UnavailableMetric label="Operational State" />
        </div>
      </div>
    </section>
  );
}

function ManifestDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="detail-card">
      <span className="card-label">{label}</span>
      <span className="card-value code-font">{value ?? "Uncommitted"}</span>
    </div>
  );
}

function UnavailableMetric({ label }: { label: string }) {
  return (
    <div className="skeleton-card">
      <span className="skeleton-label">{label}</span>
      <span className="skeleton-value">Unavailable</span>
    </div>
  );
}
