import { lazy, Suspense, useState } from "react";
import "./App.css";
import { Header } from "./components/Header";
import { LandingView } from "./components/LandingView";
import { PilotRoute } from "./components/PilotRoute";
import type { Address } from "./config/hsk";
import { useRoute } from "./hooks/useRoute";

const AccessAndEmergencyControls = lazy(() =>
  import("./components/AccessAndEmergencyControls").then((m) => ({
    default: m.AccessAndEmergencyControls,
  })),
);

const IssuerCreateView = lazy(() =>
  import("./components/IssuerCreateView").then((m) => ({
    default: m.IssuerCreateView,
  })),
);

function App() {
  const { route, navigate } = useRoute();
  const [managedPair, setManagedPair] = useState<{
    token: Address;
    vault: Address;
  } | null>(null);

  return (
    <div className="app-container">
      <Header currentRoute={route} onNavigate={navigate} />

      <main className="main-content">
        {route === "landing" ? (
          <LandingView onNavigate={navigate} />
        ) : route === "pilot" ? (
          <PilotRoute onNavigate={navigate} />
        ) : route === "create" ? (
          <Suspense
            fallback={
              <div className="pilot-state-card">
                <h3>Loading Factory Studio…</h3>
                <p>Connecting to stablecoin factory on HSK Mainnet…</p>
              </div>
            }
          >
            <IssuerCreateView
              onSuccessNavigate={(pair) => {
                setManagedPair(pair);
                navigate("controls");
              }}
            />
          </Suspense>
        ) : (
          <Suspense
            fallback={
              <div className="pilot-state-card">
                <h3>Loading Controls…</h3>
                <p>Connecting to on-chain technical policy controls…</p>
              </div>
            }
          >
            <AccessAndEmergencyControls
              tokenAddressOverride={managedPair?.token}
              vaultAddressOverride={managedPair?.vault}
            />
          </Suspense>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <p>ReserveRail · HSK Chain Mainnet · Unaudited low-value pilot</p>
          <a
            href="https://github.com/Alike001/reserverail-hsk"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
