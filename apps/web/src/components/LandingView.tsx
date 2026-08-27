import { deploymentManifest } from "../config/hsk";
import type { RouteState } from "../types/pilot";
import { FourStepFlow } from "./FourStepFlow";
import { ManifestStatusCard } from "./ManifestStatusCard";

interface LandingViewProps {
  onNavigate: (route: RouteState) => void;
}

export function LandingView({ onNavigate }: LandingViewProps) {
  const isUndeployed = deploymentManifest.status === "undeployed";

  return (
    <div className="landing-view">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-content">
          <p className="eyebrow">HSK Chain · Stablecoins Track</p>
          <h1 id="hero-title" className="hero-title">
            Launch a USDC.e-backed stablecoin people can verify and redeem.
          </h1>
          <p className="hero-lede">
            ReserveRail is being built to give issuers one transparent path from
            deposited reserve to distributed stablecoin and 1:1 redemption on
            HSK Chain.
          </p>

          <FourStepFlow />

          <div className="hero-actions">
            {isUndeployed ? (
              <button
                type="button"
                className="btn btn-primary btn-undeployed"
                onClick={() => onNavigate("pilot")}
                aria-describedby="undeployed-action-note"
              >
                <span className="btn-icon" aria-hidden="true">
                  ℹ️
                </span>
                Inspect Pilot Route (Undeployed)
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onNavigate("pilot")}
              >
                Inspect Live Pilot
              </button>
            )}

            <a
              href="https://github.com/Alike001/reserverail-hsk"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Inspect Public Repository ↗
            </a>
          </div>

          <p id="undeployed-action-note" className="action-subtext">
            {isUndeployed
              ? "No wallet or registration required. HSK mainnet deployment manifest is currently undeployed."
              : "No wallet or registration required to inspect live proof data."}
          </p>
        </div>
      </section>

      <section className="features-section" aria-labelledby="features-heading">
        <h2 id="features-heading" className="section-title">
          Built for Truthful Verification
        </h2>

        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              🔒
            </div>
            <h3>1:1 USDC.e Reserve Backing</h3>
            <p>
              The contract design requires a verified USDC.e vault deposit
              before the matching stablecoin amount can be minted.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              👁️
            </div>
            <h3>Wallet-Free Public Proof</h3>
            <p>
              The public route is designed to expose real reserve, supply, and
              transaction evidence without requiring a wallet.
            </p>
          </article>

          <article className="feature-card">
            <div className="feature-icon" aria-hidden="true">
              🔄
            </div>
            <h3>Direct 1:1 Redemption</h3>
            <p>
              The planned lifecycle lets holders burn stablecoins to redeem the
              matching USDC.e reserve through one atomic transaction.
            </p>
          </article>
        </div>
      </section>

      <ManifestStatusCard />
    </div>
  );
}
