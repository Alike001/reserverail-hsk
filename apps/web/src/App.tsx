import "./App.css";
import {
  deploymentManifest,
  hskMainnet,
  toExplorerAddress,
} from "./config/hsk";

function App() {
  return (
    <main>
      <nav aria-label="Primary navigation">
        <a className="wordmark" href="/">
          ReserveRail
        </a>
        <span>
          {hskMainnet.name} · {hskMainnet.id}
        </span>
      </nav>

      <section className="hero">
        <p className="eyebrow">HSK Chain · Stablecoins track</p>
        <h1>Launch a USDC.e-backed stablecoin people can verify and redeem.</h1>
        <p className="lede">
          ReserveRail gives issuers one transparent path from deposited reserve
          to distributed stablecoin and 1:1 redemption.
        </p>

        <ol className="flow" aria-label="ReserveRail money flow">
          <li>Deposit USDC.e</li>
          <li>Mint</li>
          <li>Distribute</li>
          <li>Redeem</li>
        </ol>

        <div className="actions">
          {deploymentManifest.status === "undeployed" ? (
            <span className="disabled-action" aria-disabled="true">
              Live pilot awaiting deployment
            </span>
          ) : (
            <a href={toExplorerAddress(deploymentManifest.pilot.token)}>
              Inspect live pilot
            </a>
          )}
          <a href="https://github.com/Alike001/reserverail-hsk">
            Inspect the public repository
          </a>
        </div>
      </section>

      <section className="status" aria-labelledby="build-status">
        <div>
          <p className="eyebrow">Truthful build state</p>
          <h2 id="build-status">
            Scaffold ready. No contract is deployed yet.
          </h2>
        </div>
        <p>
          This screen contains no simulated balance, reserve coverage,
          transaction, or mainnet success. The live-pilot action will activate
          only after verified HSK addresses are committed.
        </p>
      </section>
    </main>
  );
}

export default App;
