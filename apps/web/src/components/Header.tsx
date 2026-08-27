import { lazy, Suspense } from "react";
import { deploymentManifest, hskMainnet } from "../config/hsk";
import type { RouteState } from "../types/pilot";
import { UnauditedBadge } from "./UnauditedBadge";

const WalletStatus = lazy(() =>
  import("./WalletStatus").then((module) => ({ default: module.WalletStatus })),
);

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
          <Suspense
            fallback={
              <span className="wallet-unavailable">Wallet loading…</span>
            }
          >
            <WalletStatus />
          </Suspense>
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
          <button
            type="button"
            className={`nav-item ${currentRoute === "create" ? "active" : ""}`}
            onClick={() => onNavigate("create")}
            aria-current={currentRoute === "create" ? "page" : undefined}
          >
            Issue Token
          </button>
          <button
            type="button"
            className={`nav-item ${currentRoute === "holder" ? "active" : ""}`}
            onClick={() => onNavigate("holder")}
            aria-current={currentRoute === "holder" ? "page" : undefined}
          >
            Holder Desk
          </button>
          <button
            type="button"
            className={`nav-item ${currentRoute === "controls" ? "active" : ""}`}
            onClick={() => onNavigate("controls")}
            aria-current={currentRoute === "controls" ? "page" : undefined}
          >
            Emergency & Roles
          </button>
        </nav>
      </div>
    </header>
  );
}
