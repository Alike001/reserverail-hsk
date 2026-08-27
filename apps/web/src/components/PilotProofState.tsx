import {
  toExplorerAddress,
  toExplorerTransaction,
  type deploymentManifest,
} from "../config/hsk";
import type { PilotProofData } from "../types/pilot";

interface PilotProofStateProps {
  manifest: Extract<typeof deploymentManifest, { status: "deployed" }>;
  onRetry?: () => void;
  proofData?: PilotProofData;
}

export function PilotProofState({
  manifest,
  onRetry,
  proofData,
}: PilotProofStateProps) {
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
      proofData?.status === "error" || proofData?.status === "stale"
        ? proofData.errorMessage
        : "No verified proof reader has supplied current HSK data.";

    return (
      <div className="pilot-state-card pilot-error" role="alert">
        <h2>
          {proofData?.status === "stale"
            ? "HSK proof snapshot is stale"
            : "Live HSK data unavailable"}
        </h2>
        <p>{message ?? "Unable to read pilot proof data from HSK RPC."}</p>
        {proofData?.status === "stale" ? (
          <p className="proof-freshness code-font">
            Safe block #{proofData.lastConfirmedBlock} · {proofData.updatedAt}
          </p>
        ) : null}
        <p className="error-note">
          Financial values are hidden instead of showing defaults, fixtures,
          stale coverage, or inferred operational state.
        </p>
        {onRetry ? (
          <button type="button" className="btn-secondary" onClick={onRetry}>
            Retry safe-block proof
          </button>
        ) : null}
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
        <Metric
          label="Coverage"
          value={
            proofData.coverageRatio === null
              ? "N/A · no supply"
              : `${proofData.coverageRatio}%`
          }
        />
        <Metric label="Operational State" value={proofData.operationalState} />
      </div>

      <div className="proof-snapshot-box">
        <div>
          <span className="metric-label">Backing state</span>
          <strong>{proofData.backingState}</strong>
        </div>
        <div>
          <span className="metric-label">Verified safe snapshot</span>
          <strong className="code-font">
            Block #{proofData.lastConfirmedBlock}
          </strong>
          <span className="empty-state-text">
            {proofData.updatedAt} · {proofData.snapshotAgeSeconds}s old when
            read
          </span>
        </div>
        <div>
          <span className="metric-label">Factory version</span>
          <strong>
            v{proofData.version} · {proofData.versionStatus}
          </strong>
        </div>
      </div>

      <div className="contract-links-box">
        <h2>On-chain contracts</h2>
        <ul>
          <ContractLink label="Factory" address={manifest.factory} />
          <ContractLink label="Token" address={manifest.pilot.token} />
          <ContractLink label="Vault" address={manifest.pilot.vault} />
          <ContractLink
            label="USDC.e reserve"
            address={proofData.reserveAssetAddress}
          />
          <ContractLink label="Issuer" address={proofData.issuerAddress} />
        </ul>
      </div>

      <div className="contract-links-box">
        <h2>Current on-chain roles</h2>
        <ul>
          <ContractLink
            label="Token administrator"
            address={proofData.tokenAdministrator}
          />
          <ContractLink
            label="Vault administrator"
            address={proofData.vaultAdministrator}
          />
          <ContractLink
            label="Reserve operator"
            address={proofData.reserveOperator}
          />
          <ContractLink label="Pauser" address={proofData.pauser} />
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
            No verified lifecycle transaction hashes are configured. No
            transaction receipts are invented; the metrics above come from
            direct contract reads at the displayed safe block.
          </p>
        )}
      </div>

      <div className="truth-commitment-box">
        <h3>Risk disclosure</h3>
        <p>
          This is an unaudited low-value pilot. ReserveRail inherits USDC.e
          bridge and issuer risks, and privileged roles remain visible above.
          The page proves contract state; it does not make a legal compliance or
          solvency guarantee.
        </p>
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
