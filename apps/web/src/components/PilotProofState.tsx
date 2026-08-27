import {
  toExplorerAddress,
  toExplorerTransaction,
  type deploymentManifest,
} from "../config/hsk";
import type { PilotProofData } from "../types/pilot";

interface PilotProofStateProps {
  manifest: Extract<typeof deploymentManifest, { status: "deployed" }>;
  proofData?: PilotProofData;
}

export function PilotProofState({ manifest, proofData }: PilotProofStateProps) {
  if (proofData?.status === "loading") {
    return (
      <div className="pilot-state-card pilot-loading" role="status">
        <div className="spinner" aria-hidden="true" />
        <p>Reading HSK Chain mainnet contract state…</p>
      </div>
    );
  }

  if (!proofData || proofData.status !== "deployed") {
    const message =
      proofData?.status === "error"
        ? proofData.errorMessage
        : "No verified proof reader has supplied current HSK data.";

    return (
      <div className="pilot-state-card pilot-error" role="alert">
        <h2>Live HSK data unavailable</h2>
        <p>{message ?? "Unable to read pilot proof data from HSK RPC."}</p>
        <p className="error-note">
          Financial values are hidden instead of showing defaults, fixtures,
          stale coverage, or inferred operational state.
        </p>
      </div>
    );
  }

  return (
    <section className="pilot-deployed-state" aria-label="Verified pilot proof">
      <div className="metrics-grid">
        <Metric
          label="Vault Reserve"
          value={`${proofData.vaultReserve} USDC.e`}
        />
        <Metric
          label="Total Supply"
          value={`${proofData.totalSupply} ${proofData.tokenSymbol}`}
        />
        <Metric label="Coverage" value={`${proofData.coverageRatio}%`} />
        <Metric label="Operational State" value={proofData.operationalState} />
      </div>

      <div className="contract-links-box">
        <h2>On-chain contracts</h2>
        <ul>
          <ContractLink label="Factory" address={manifest.factory} />
          <ContractLink label="Token" address={manifest.pilot.token} />
          <ContractLink label="Vault" address={manifest.pilot.vault} />
        </ul>
      </div>

      <div className="transactions-box">
        <h2>Confirmed proof transactions</h2>
        {proofData.transactions.length > 0 ? (
          <ul className="tx-list">
            {proofData.transactions.map((transaction) => (
              <li key={transaction.hash} className="tx-item">
                <span className="tx-type">{transaction.type}</span>
                <span className="tx-amount">{transaction.amount}</span>
                <a
                  href={toExplorerTransaction(transaction.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-hash code-font"
                >
                  {shorten(transaction.hash)} ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state-text">
            No proof transactions recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}

function ContractLink({ label, address }: { label: string; address: string }) {
  return (
    <li>
      {label}:{" "}
      <a
        href={toExplorerAddress(address)}
        target="_blank"
        rel="noopener noreferrer"
        className="code-font"
      >
        {address} ↗
      </a>
    </li>
  );
}

function shorten(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}
