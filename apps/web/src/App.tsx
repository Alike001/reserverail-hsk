import "./App.css";
import { Header } from "./components/Header";
import { LandingView } from "./components/LandingView";
import { PilotRoute } from "./components/PilotRoute";
import { useRoute } from "./hooks/useRoute";

function App() {
  const { route, navigate } = useRoute();

  return (
    <div className="app-container">
      <Header currentRoute={route} onNavigate={navigate} />

      <main className="main-content">
        {route === "landing" ? (
          <LandingView onNavigate={navigate} />
        ) : (
          <PilotRoute onNavigate={navigate} />
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
