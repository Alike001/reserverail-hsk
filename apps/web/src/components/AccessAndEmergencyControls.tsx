import { useCallback, useEffect, useState } from "react";
import {
  deploymentManifest,
  hskMainnet,
  toExplorerAddress,
  toExplorerTransaction,
  type Address,
} from "../config/hsk";
import {
  executeVaultPause,
  executeVaultRotateRole,
  executeVaultUnpause,
  fetchVaultAuthorities,
  ROLE_IDENTIFIERS,
  validateNewAccountAddress,
  type RoleAuditRecord,
  type RoleType,
  type VaultAuthorities,
} from "../wallet/roles";
import { walletStore, type WalletStore } from "../wallet/store";
import type { TransactionState } from "../wallet/transaction";
import { useWallet } from "../wallet/use-wallet";

interface AccessAndEmergencyControlsProps {
  store?: WalletStore;
  vaultAddressOverride?: Address;
}

export function AccessAndEmergencyControls({
  store = walletStore,
  vaultAddressOverride,
}: AccessAndEmergencyControlsProps) {
  const wallet = useWallet(store);
  const vaultAddress =
    vaultAddressOverride ?? deploymentManifest.pilot.vault ?? undefined;

  const [authorities, setAuthorities] = useState<VaultAuthorities | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Pause / Unpause Action State
  const [pauseTxState, setPauseTxState] = useState<TransactionState | null>(
    null,
  );
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [pauseActionType, setPauseActionType] = useState<
    "pause" | "unpause" | null
  >(null);

  // Role Rotation Form State
  const [selectedRole, setSelectedRole] =
    useState<RoleType>("RESERVE_OPERATOR");
  const [newAccountInput, setNewAccountInput] = useState("");
  const [adminLockoutAcknowledged, setAdminLockoutAcknowledged] =
    useState(false);
  const [rotateTxState, setRotateTxState] = useState<TransactionState | null>(
    null,
  );
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  // Confirmed Event Audit Log
  const [auditLog, setAuditLog] = useState<RoleAuditRecord[]>([]);

  // Fetch authorities on demand
  const loadAuthorities = useCallback(async () => {
    if (!vaultAddress) return;
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const data = await fetchVaultAuthorities(vaultAddress);
      setAuthorities(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load on-chain roles.";
      setAuthError(msg);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [vaultAddress]);

  useEffect(() => {
    let active = true;
    if (!vaultAddress) return;
    setIsLoadingAuth(true);
    setAuthError(null);
    fetchVaultAuthorities(vaultAddress)
      .then((data) => {
        if (active) setAuthorities(data);
      })
      .catch((err: unknown) => {
        if (active) {
          const msg =
            err instanceof Error
              ? err.message
              : "Failed to load on-chain roles.";
          setAuthError(msg);
        }
      })
      .finally(() => {
        if (active) setIsLoadingAuth(false);
      });

    return () => {
      active = false;
    };
  }, [vaultAddress]);

  const connectedAccount = wallet.account?.toLowerCase();
  const isAdmin =
    Boolean(authorities && connectedAccount) &&
    authorities?.administrator.toLowerCase() === connectedAccount;
  const isPauser =
    Boolean(authorities && connectedAccount) &&
    authorities?.pauser.toLowerCase() === connectedAccount;

  const canPause = isAdmin || isPauser;
  const canUnpause = isAdmin; // Only Admin can unpause!
  const canRotate = isAdmin; // Only Admin can rotate roles!

  const isPaused = authorities?.operationallyPaused ?? false;

  // Handle Pause / Unpause Execution
  const handleExecutePauseAction = async () => {
    if (!vaultAddress || !wallet.account) return;
    const client = store.getClient();
    if (!client) return;

    setShowPauseConfirm(false);
    try {
      if (pauseActionType === "pause") {
        const { receipt } = await executeVaultPause({
          vaultAddress,
          walletClient: client,
          account: wallet.account,
          onState: setPauseTxState,
        });

        // Add confirmed audit record
        const newRecord: RoleAuditRecord = {
          id: `${receipt.transactionHash}-pause`,
          type: "Paused",
          contractAddress: vaultAddress,
          actor: wallet.account,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          timestamp: new Date().toLocaleTimeString(),
        };
        setAuditLog((prev) => [newRecord, ...prev]);
      } else if (pauseActionType === "unpause") {
        const { receipt } = await executeVaultUnpause({
          vaultAddress,
          walletClient: client,
          account: wallet.account,
          onState: setPauseTxState,
        });

        const newRecord: RoleAuditRecord = {
          id: `${receipt.transactionHash}-unpause`,
          type: "Unpaused",
          contractAddress: vaultAddress,
          actor: wallet.account,
          txHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          timestamp: new Date().toLocaleTimeString(),
        };
        setAuditLog((prev) => [newRecord, ...prev]);
      }

      // Re-fetch authoritative state post-confirmation
      await loadAuthorities();
    } catch {
      // Handled in transaction state
    }
  };

  // Handle Role Rotation Execution
  const handleExecuteRotateRole = async () => {
    if (!vaultAddress || !wallet.account) return;
    const client = store.getClient();
    if (!client) return;

    const validated = validateNewAccountAddress(newAccountInput);
    if (!validated.valid || !validated.sanitizedAddress) return;

    setShowRotateConfirm(false);
    try {
      const roleHash = ROLE_IDENTIFIERS[selectedRole];
      const { receipt } = await executeVaultRotateRole({
        vaultAddress,
        roleHash,
        newAccount: validated.sanitizedAddress,
        walletClient: client,
        account: wallet.account,
        onState: setRotateTxState,
      });

      const newRecord: RoleAuditRecord = {
        id: `${receipt.transactionHash}-rotate`,
        type: "RoleRotated",
        contractAddress: vaultAddress,
        actor: wallet.account,
        role: selectedRole,
        previousAccount:
          selectedRole === "ADMINISTRATOR"
            ? authorities?.administrator
            : selectedRole === "RESERVE_OPERATOR"
              ? authorities?.reserveOperator
              : authorities?.pauser,
        newAccount: validated.sanitizedAddress,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date().toLocaleTimeString(),
      };
      setAuditLog((prev) => [newRecord, ...prev]);

      setNewAccountInput("");
      setAdminLockoutAcknowledged(false);

      // Re-fetch authoritative state post-confirmation
      await loadAuthorities();
    } catch {
      // Handled in transaction state
    }
  };

  const validationResult = validateNewAccountAddress(newAccountInput);
  const isRotatingAdmin = selectedRole === "ADMINISTRATOR";
  const isRotationValid =
    validationResult.valid && (!isRotatingAdmin || adminLockoutAcknowledged);

  return (
    <div className="controls-view">
      <div className="controls-header">
        <span className="eyebrow">Technical Policy Controls</span>
        <h1>Access & Emergency Controls</h1>
        <p className="controls-subtitle">
          Manage on-chain authorities, execute secure role rotations, and
          trigger coordinated emergency pause controls on {hskMainnet.name}{" "}
          (Chain ID {hskMainnet.id}).
        </p>
      </div>

      {!vaultAddress ? (
        <div className="pilot-state-card" role="status">
          <h3>Pilot Vault Undeployed</h3>
          <p>
            The HSK mainnet deployment manifest is currently undeployed.
            Controls will connect to the verified vault once contract addresses
            are committed.
          </p>
        </div>
      ) : (
        <>
          {/* Current Authorities Grid */}
          <section
            className="authorities-section"
            aria-labelledby="authorities-heading"
          >
            <div className="manifest-header">
              <div>
                <span className="eyebrow">On-Chain Governance</span>
                <h2 id="authorities-heading">Current Authorities</h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isLoadingAuth}
                onClick={loadAuthorities}
              >
                {isLoadingAuth ? "Refreshing…" : "Refresh Authorities"}
              </button>
            </div>

            {authError && (
              <div className="wallet-feedback" role="alert">
                <span>{authError}</span>
                <button
                  type="button"
                  className="wallet-retry"
                  onClick={loadAuthorities}
                >
                  Retry
                </button>
              </div>
            )}

            <div className="authorities-grid">
              {/* Administrator Card */}
              <div
                className={`authority-card ${
                  isAdmin ? "caller-holds-role" : ""
                }`}
              >
                <div className="authority-role-title">
                  <span className="authority-role-name">Administrator</span>
                  {isAdmin && <span className="caller-badge">Your Wallet</span>}
                </div>
                <p className="authority-desc">
                  Exclusive power to unpause the vault and rotate contract
                  roles.
                </p>
                <div className="authority-address">
                  {authorities ? (
                    <a
                      href={toExplorerAddress(authorities.administrator)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={authorities.administrator}
                    >
                      {shorten(authorities.administrator)} ↗
                    </a>
                  ) : (
                    <span className="item-label">Loading…</span>
                  )}
                </div>
              </div>

              {/* Reserve Operator Card */}
              <div
                className={`authority-card ${
                  authorities &&
                  connectedAccount === authorities.reserveOperator.toLowerCase()
                    ? "caller-holds-role"
                    : ""
                }`}
              >
                <div className="authority-role-title">
                  <span className="authority-role-name">Reserve Operator</span>
                  {authorities &&
                    connectedAccount ===
                      authorities.reserveOperator.toLowerCase() && (
                      <span className="caller-badge">Your Wallet</span>
                    )}
                </div>
                <p className="authority-desc">
                  Authorized to deposit USDC.e reserve and trigger 1:1
                  stablecoin minting.
                </p>
                <div className="authority-address">
                  {authorities ? (
                    <a
                      href={toExplorerAddress(authorities.reserveOperator)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={authorities.reserveOperator}
                    >
                      {shorten(authorities.reserveOperator)} ↗
                    </a>
                  ) : (
                    <span className="item-label">Loading…</span>
                  )}
                </div>
              </div>

              {/* Pauser Card */}
              <div
                className={`authority-card ${
                  isPauser ? "caller-holds-role" : ""
                }`}
              >
                <div className="authority-role-title">
                  <span className="authority-role-name">Emergency Pauser</span>
                  {isPauser && (
                    <span className="caller-badge">Your Wallet</span>
                  )}
                </div>
                <p className="authority-desc">
                  Authorized to trigger an emergency operational pause during an
                  incident.
                </p>
                <div className="authority-address">
                  {authorities ? (
                    <a
                      href={toExplorerAddress(authorities.pauser)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={authorities.pauser}
                    >
                      {shorten(authorities.pauser)} ↗
                    </a>
                  ) : (
                    <span className="item-label">Loading…</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Emergency Pause Panel */}
          <section
            className="emergency-panel"
            aria-labelledby="emergency-panel-heading"
          >
            <div className="emergency-header">
              <div className="emergency-header-text">
                <span className="eyebrow">Incident Response</span>
                <h2 id="emergency-panel-heading">Emergency Pause Control</h2>
                <p className="controls-subtitle">
                  Coordinated operational stop across both vault and token
                  contracts.
                </p>
              </div>
              <span
                className={`emergency-status-badge ${
                  isPaused ? "status-paused" : "status-active"
                }`}
              >
                {isPaused
                  ? "⚠️ OPERATIONALLY PAUSED"
                  : "✓ ACTIVE (OPERATIONAL)"}
              </span>
            </div>

            {/* Operation Matrix */}
            <div className="matrix-container">
              <span className="matrix-title">
                Coordinated Operation Matrix Under Pause
              </span>
              <div className="operation-matrix-grid">
                <div className="matrix-item">
                  <span className="matrix-item-op">Deposit & Mint</span>
                  <span className="matrix-item-status status-blocked">
                    BLOCKED
                  </span>
                  <span className="matrix-item-detail">
                    Prevents unbacked or unauthorized minting during an
                    incident.
                  </span>
                </div>
                <div className="matrix-item">
                  <span className="matrix-item-op">Token Transfers</span>
                  <span className="matrix-item-status status-blocked">
                    BLOCKED
                  </span>
                  <span className="matrix-item-detail">
                    Halts secondary token movements to contain potential
                    exploit.
                  </span>
                </div>
                <div className="matrix-item">
                  <span className="matrix-item-op">Holder Redemption</span>
                  <span className="matrix-item-status status-available">
                    AVAILABLE
                  </span>
                  <span className="matrix-item-detail">
                    Holders can always burn tokens directly to exit for USDC.e.
                  </span>
                </div>
                <div className="matrix-item">
                  <span className="matrix-item-op">Role Recovery</span>
                  <span className="matrix-item-status status-available">
                    AVAILABLE
                  </span>
                  <span className="matrix-item-detail">
                    Administrator retains power to rotate compromised keys.
                  </span>
                </div>
              </div>
            </div>

            {/* Redemption Guarantee Note */}
            <div className="redemption-notice-box">
              <span className="redemption-notice-title">
                🛡️ Why Redemption Remains Available During An Operational Pause
              </span>
              <p className="redemption-notice-desc">
                By architectural design, the vault's <code>redeem</code> path
                executes supply burn directly via vault-only authorization,
                bypassing the ordinary transfer pause. This guarantees that an
                operational incident never strands legitimate holders from
                withdrawing their underlying 1:1 USDC.e reserve backing.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="emergency-actions">
              {!isPaused ? (
                <button
                  type="button"
                  className="btn btn-pause"
                  disabled={!canPause || pauseTxState?.phase === "pending"}
                  onClick={() => {
                    setPauseActionType("pause");
                    setShowPauseConfirm(true);
                  }}
                >
                  {pauseTxState?.phase === "pending"
                    ? "Pausing Vault…"
                    : "Pause Operations"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-unpause"
                  disabled={!canUnpause || pauseTxState?.phase === "pending"}
                  onClick={() => {
                    setPauseActionType("unpause");
                    setShowPauseConfirm(true);
                  }}
                >
                  {pauseTxState?.phase === "pending"
                    ? "Resuming Vault…"
                    : "Resume Operations (Unpause)"}
                </button>
              )}

              <span className="action-auth-note">
                {!isPaused
                  ? canPause
                    ? "Authorized: You hold Pauser or Administrator privileges."
                    : "Requires Pauser or Administrator wallet."
                  : canUnpause
                    ? "Authorized: You hold Administrator privileges."
                    : "Requires Administrator wallet to unpause (Pauser cannot unpause)."}
              </span>
            </div>

            {/* Pause Transaction Feedback */}
            {pauseTxState?.phase === "failed" && (
              <div className="wallet-feedback" role="alert">
                <span>{pauseTxState.error.message}</span>
              </div>
            )}
          </section>

          {/* Role Rotation Panel */}
          <section
            className="rotation-panel"
            aria-labelledby="rotation-panel-heading"
          >
            <div className="manifest-header">
              <div>
                <span className="eyebrow">Authority Rotation</span>
                <h2 id="rotation-panel-heading">Rotate On-Chain Roles</h2>
              </div>
            </div>

            <p className="controls-subtitle">
              Replaces the on-chain authority address for the chosen role. Only
              the current Administrator can execute role rotations.
            </p>

            <form
              className="rotation-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (isRotationValid) setShowRotateConfirm(true);
              }}
            >
              <div className="form-group">
                <label htmlFor="role-select">Select Authority Role</label>
                <select
                  id="role-select"
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as RoleType);
                    setAdminLockoutAcknowledged(false);
                  }}
                  disabled={!canRotate}
                >
                  <option value="RESERVE_OPERATOR">
                    Reserve Operator (Deposit & Mint)
                  </option>
                  <option value="PAUSER">Emergency Pauser</option>
                  <option value="ADMINISTRATOR">
                    Administrator (Governance & Unpause)
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="new-account-input">
                  New Authority Address (0x...)
                </label>
                <input
                  id="new-account-input"
                  type="text"
                  className="form-input code-font"
                  placeholder="0x..."
                  value={newAccountInput}
                  onChange={(e) => setNewAccountInput(e.target.value)}
                  disabled={!canRotate}
                />
                {newAccountInput.trim() && !validationResult.valid && (
                  <span className="form-error-msg">
                    {validationResult.error}
                  </span>
                )}
              </div>

              {/* Admin Lockout Warning Box */}
              {isRotatingAdmin && validationResult.valid && (
                <div className="admin-lockout-warning" role="alert">
                  <span className="lockout-heading">
                    ⚠️ Critical: Administrator Authority Handover
                  </span>
                  <p className="lockout-desc">
                    Rotating the Administrator role transfers all governance and
                    unpause powers to{" "}
                    <code>{validationResult.sanitizedAddress}</code>. Your
                    current wallet (<code>{wallet.account}</code>) will
                    permanently lose admin rights over this vault.
                  </p>
                  <label className="lockout-checkbox-label">
                    <input
                      type="checkbox"
                      checked={adminLockoutAcknowledged}
                      onChange={(e) =>
                        setAdminLockoutAcknowledged(e.target.checked)
                      }
                    />
                    I acknowledge that I am permanently transferring
                    administrative control.
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  !canRotate ||
                  !isRotationValid ||
                  rotateTxState?.phase === "pending"
                }
              >
                {rotateTxState?.phase === "pending"
                  ? "Rotating Role…"
                  : "Review & Rotate Role"}
              </button>

              {!canRotate && (
                <span className="action-auth-note">
                  Requires Administrator wallet (
                  {authorities ? shorten(authorities.administrator) : "..."}) to
                  rotate roles.
                </span>
              )}
            </form>

            {/* Rotate Transaction Feedback */}
            {rotateTxState?.phase === "failed" && (
              <div className="wallet-feedback" role="alert">
                <span>{rotateTxState.error.message}</span>
              </div>
            )}
          </section>

          {/* Confirmed Audit Log */}
          <section className="audit-panel" aria-labelledby="audit-heading">
            <h2 id="audit-heading">Confirmed Audit History</h2>
            {auditLog.length === 0 ? (
              <p className="action-subtext">
                No role rotation or emergency events submitted in this session.
              </p>
            ) : (
              <ul className="audit-list">
                {auditLog.map((log) => (
                  <li key={log.id} className="audit-item">
                    <div className="audit-item-main">
                      <span className="audit-type-pill">{log.type}</span>
                      <span className="audit-desc">
                        {log.type === "RoleRotated"
                          ? `Rotated ${log.role} to ${shorten(
                              log.newAccount ?? "",
                            )}`
                          : log.type === "Paused"
                            ? "Vault operationally paused"
                            : "Vault operations resumed"}
                      </span>
                    </div>
                    <div className="audit-item-meta">
                      <span>Block #{log.blockNumber.toString()}</span>
                      <a
                        href={toExplorerTransaction(log.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="code-font"
                      >
                        {log.txHash.slice(0, 10)}…{log.txHash.slice(-8)} ↗
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Pre-Sign Review Modal for Pause / Unpause */}
      {showPauseConfirm && (
        <div className="review-modal-backdrop" role="dialog" aria-modal="true">
          <div className="review-modal">
            <h3>Confirm {pauseActionType === "pause" ? "Pause" : "Unpause"}</h3>
            <div className="review-details">
              <div className="review-row">
                <span className="review-label">Action</span>
                <span className="review-val">
                  {pauseActionType === "pause"
                    ? "Coordinated Operational Pause"
                    : "Resume Operations (Unpause)"}
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Target Vault</span>
                <span className="review-val code-font">{vaultAddress}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Signer Wallet</span>
                <span className="review-val code-font">{wallet.account}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Redemption State</span>
                <span className="review-val status-available">
                  Always Available (1:1 USDC.e exit)
                </span>
              </div>
            </div>
            <div className="review-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPauseConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${
                  pauseActionType === "pause" ? "btn-pause" : "btn-primary"
                }`}
                onClick={handleExecutePauseAction}
              >
                Sign on HSK Chain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Sign Review Modal for Role Rotation */}
      {showRotateConfirm && validationResult.sanitizedAddress && (
        <div className="review-modal-backdrop" role="dialog" aria-modal="true">
          <div className="review-modal">
            <h3>Confirm Role Rotation</h3>
            <div className="review-details">
              <div className="review-row">
                <span className="review-label">Role</span>
                <span className="review-val">{selectedRole}</span>
              </div>
              <div className="review-row">
                <span className="review-label">Target Vault</span>
                <span className="review-val code-font">{vaultAddress}</span>
              </div>
              <div className="review-row">
                <span className="review-label">New Authority</span>
                <span className="review-val code-font">
                  {validationResult.sanitizedAddress}
                </span>
              </div>
              {isRotatingAdmin && (
                <div className="review-row">
                  <span className="review-label">Warning</span>
                  <span className="review-val status-blocked">
                    Current wallet loses Admin privileges
                  </span>
                </div>
              )}
            </div>
            <div className="review-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRotateConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteRotateRole}
              >
                Sign on HSK Chain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function shorten(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
