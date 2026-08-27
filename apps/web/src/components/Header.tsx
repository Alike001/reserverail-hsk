import { deploymentManifest, hskMainnet } from "../config/hsk";
import type { RouteState } from "../types/pilot";
import { UnauditedBadge } from "./UnauditedBadge";

interface HeaderProps {
  currentRoute: RouteState;
  onNavigate: (route: RouteState) => void;
}

export function Header({ currentRoute, onNavigate }: HeaderProps) {
  const isUndeployed = deploymentManifest.status === "undeployed";

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="brand-group">
          <button
            type="button"
            className="brand-link"
            onClick={() => onNavigate("landing")}
            aria-label="ReserveRail Home"
          >
            <span className="brand-name">ReserveRail</span>
          </button>
          <span className="network-pill" title="Target Blockchain Network">
            {hskMainnet.name} · {hskMainnet.id}
          </span>
        </div>

        <div className="header-meta">
          <UnauditedBadge />
        </div>

        <nav aria-label="Main Navigation" className="site-nav">
          <button
            type="button"
            className={`nav-item ${currentRoute === "landing" ? "active" : ""}`}
            onClick={() => onNavigate("landing")}
            aria-current={currentRoute === "landing" ? "page" : undefined}
          >
            Landing
          </button>
          <button
            type="button"
            className={`nav-item ${currentRoute === "pilot" ? "active" : ""}`}
            onClick={() => onNavigate("pilot")}
            aria-current={currentRoute === "pilot" ? "page" : undefined}
          >
            Pilot Route
            {isUndeployed && (
              <span
                className="nav-badge-undeployed"
                title="Manifest status: undeployed"
              >
                (Undeployed)
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
