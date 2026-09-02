import { useCallback, useEffect, useState } from "react";
import {
  deploymentManifest,
  hskMainnet,
  toExplorerAddress,
  toExplorerTransaction,
  type Address,
} from "../config/hsk";
import {
  executeTokenAdministratorRotation,
  executeVaultPause,
  executeVaultRotateRole,
  executeVaultUnpause,
  fetchPairAuthorities,
  validateNewAccountAddress,
  type PairAuthorities,
  type RoleAuditRecord,
  type RoleSelection,
} from "../wallet/roles";
import { walletStore, type WalletStore } from "../wallet/store";
import type { TransactionState } from "../wallet/transaction";
import { useWallet } from "../wallet/use-wallet";

interface AccessAndEmergencyControlsProps {
  store?: WalletStore;
  tokenAddressOverride?: Address | null;
  vaultAddressOverride?: Address | null;
}

export function AccessAndEmergencyControls({
  store = walletStore,
  tokenAddressOverride,
  vaultAddressOverride,
}: AccessAndEmergencyControlsProps) {
  const wallet = useWallet(store);
  const vaultAddress =
    vaultAddressOverride === undefined
      ? (deploymentManifest.pilot.vault ?? undefined)
      : (vaultAddressOverride ?? undefined);
  const tokenAddress =
    tokenAddressOverride === undefined
      ? (deploymentManifest.pilot.token ?? undefined)
      : (tokenAddressOverride ?? undefined);

  const [authorities, setAuthorities] = useState<PairAuthorities | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(() =>
    Boolean(vaultAddress && tokenAddress),
  );
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
    useState<RoleSelection>("RESERVE_OPERATOR");
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
    if (!vaultAddress || !tokenAddress) return;
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const data = await fetchPairAuthorities(vaultAddress, tokenAddress);
      setAuthorities(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load on-chain roles.";
      setAuthorities(null);
      setAuthError(msg);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [tokenAddress, vaultAddress]);

  useEffect(() => {
    let active = true;
    if (!vaultAddress || !tokenAddress) return;
    fetchPairAuthorities(vaultAddress, tokenAddress)
      .then((data) => {
        if (active) setAuthorities(data);
      })
      .catch((err: unknown) => {
        if (active) {
          const msg =
            err instanceof Error
              ? err.message
              : "Failed to load on-chain roles.";
          setAuthorities(null);
          setAuthError(msg);
        }
      })
      .finally(() => {
        if (active) setIsLoadingAuth(false);
      });

    return () => {
      active = false;
    };
  }, [tokenAddress, vaultAddress]);

  const connectedAccount = wallet.account?.toLowerCase();
  const isVaultAdmin =
    Boolean(authorities && connectedAccount) &&
    authorities?.vault.administrator.toLowerCase() === connectedAccount;
  const isTokenAdmin =
    Boolean(authorities && connectedAccount) &&
    authorities?.token.administrator.toLowerCase() === connectedAccount;
  const isPauser =
    Boolean(authorities && connectedAccount) &&
    authorities?.vault.pauser.toLowerCase() === connectedAccount;

  const canPause = isVaultAdmin || isPauser;
  const canUnpause = isVaultAdmin;
  const canRotateAny = isVaultAdmin || isTokenAdmin;
  const canRotateSelected =
    selectedRole === "TOKEN_ADMINISTRATOR" ? isTokenAdmin : isVaultAdmin;

  const isPaused = authorities?.vault.operationallyPaused ?? false;
  const pauseBusy = isTransactionBusy(pauseTxState);
  const rotateBusy = isTransactionBusy(rotateTxState);

  // Handle Pause / Unpause Execution
  const handleExecutePauseAction = async () => {
    if (!vaultAddress || !tokenAddress || !wallet.account) return;
    const client = store.getClient();
    if (!client) return;

    setShowPauseConfirm(false);
    try {
      if (pauseActionType === "pause") {
        const { result } = await executeVaultPause({
          vaultAddress,
          tokenAddress,
          walletClient: client,
          account: wallet.account,
          onState: setPauseTxState,
        });

        setAuthorities(result.authorities);
        setAuditLog((previous) => [result.auditRecord, ...previous]);
      } else if (pauseActionType === "unpause") {
        const { result } = await executeVaultUnpause({
          vaultAddress,
          tokenAddress,
          walletClient: client,
          account: wallet.account,
          onState: setPauseTxState,
        });

        setAuthorities(result.authorities);
        setAuditLog((previous) => [result.auditRecord, ...previous]);
      }
    } catch {
      // Handled in transaction state
    }
  };

  // Handle Role Rotation Execution
  const handleExecuteRotateRole = async () => {
    if (!vaultAddress || !tokenAddress || !wallet.account) return;
    const client = store.getClient();
    if (!client) return;

    const validated = validateNewAccountAddress(newAccountInput);
    if (!validated.valid || !validated.sanitizedAddress) return;

    setShowRotateConfirm(false);
    try {
      const execution =
        selectedRole === "TOKEN_ADMINISTRATOR"
          ? executeTokenAdministratorRotation({
              account: wallet.account,
              newAccount: validated.sanitizedAddress,
              onState: setRotateTxState,
              tokenAddress,
              vaultAddress,
              walletClient: client,
            })
          : executeVaultRotateRole({
              account: wallet.account,
              newAccount: validated.sanitizedAddress,
              onState: setRotateTxState,
              role: selectedRole,
              tokenAddress,
              vaultAddress,
              walletClient: client,
            });
      const { result } = await execution;
      setAuthorities(result.authorities);
      setAuditLog((previous) => [result.auditRecord, ...previous]);

      setNewAccountInput("");
      setAdminLockoutAcknowledged(false);
    } catch {
      // Handled in transaction state
    }
  };

  const validationResult = validateNewAccountAddress(newAccountInput);
  const isRotatingAdmin =
    selectedRole === "ADMINISTRATOR" || selectedRole === "TOKEN_ADMINISTRATOR";
  const isRotationValid =
    validationResult.valid &&
    canRotateSelected &&
    (!isRotatingAdmin || adminLockoutAcknowledged);
  const rotationTargetAddress =
    selectedRole === "TOKEN_ADMINISTRATOR" ? tokenAddress : vaultAddress;

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

      {!vaultAddress || !tokenAddress ? (
        <div className="pilot-state-card" role="status">
          <h3>Pilot Vault Undeployed</h3>
          <p>
            The HSK mainnet deployment manifest is currently undeployed.
            Controls will connect once both verified token and vault addresses
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
                  isVaultAdmin ? "caller-holds-role" : ""
                }`}
              >
                <div className="authority-role-title">
                  <span className="authority-role-name">
                    Vault Administrator
                  </span>
                  {isVaultAdmin && (
                    <span className="caller-badge">Your Wallet</span>
                  )}
                </div>
                <p className="authority-desc">
                  Exclusive power to unpause the vault and rotate vault roles.
                </p>
                <div className="authority-address">
                  {authorities ? (
                    <a
                      href={toExplorerAddress(authorities.vault.administrator)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={authorities.vault.administrator}
                    >
                      {shorten(authorities.vault.administrator)} ↗
                    </a>
                  ) : (
                    <span className="item-label">Loading…</span>
                  )}
                </div>
              </div>

              {/* Token Administrator Card */}
              <div
                className={`authority-card ${
                  isTokenAdmin ? "caller-holds-role" : ""
                }`}
              >
                <div className="authority-role-title">
                  <span className="authority-role-name">
                    Token Administrator
                  </span>
                  {isTokenAdmin && (
                    <span className="caller-badge">Your Wallet</span>
                  )}
                </div>
                <p className="authority-desc">
                  Controls token-specific administration. This authority can
                  differ from the vault administrator.
                </p>
                <div className="authority-address">
                  {authorities ? (
                    <a
                      href={toExplorerAddress(authorities.token.administrator)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={authorities.token.administrator}
                    >
                      {shorten(authorities.token.administrator)} ↗
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
                  connectedAccount ===
                    authorities.vault.reserveOperator.toLowerCase()
                    ? "caller-holds-role"
                    : ""
                }`}
              >
                <div className="authority-role-title">
                  <span className="authority-role-name">Reserve Operator</span>
                  {authorities &&
                    connectedAccount ===
                      authorities.vault.reserveOperator.toLowerCase() && (
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
                      href={toExplorerAddress(
                        authorities.vault.reserveOperator,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={authorities.vault.reserveOperator}
                    >
                      {shorten(authorities.vault.reserveOperator)} ↗
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
                      href={toExplorerAddress(authorities.vault.pauser)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={authorities.vault.pauser}
                    >
                      {shorten(authorities.vault.pauser)} ↗
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
                    The ordinary pause does not block the vault redemption path.
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
                ordinary pause does not disable the supported 1:1 USDC.e
                redemption route. Redemption still depends on usable reserve and
                successful reserve-token transfer.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="emergency-actions">
              {!isPaused ? (
                <button
                  type="button"
                  className="btn btn-pause"
                  disabled={!canPause || pauseBusy}
                  onClick={() => {
                    setPauseActionType("pause");
                    setShowPauseConfirm(true);
                  }}
                >
                  {pauseBusy
                    ? transactionButtonLabel(pauseTxState, "Pausing Vault")
                    : "Pause Operations"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-unpause"
                  disabled={!canUnpause || pauseBusy}
                  onClick={() => {
                    setPauseActionType("unpause");
                    setShowPauseConfirm(true);
                  }}
                >
                  {pauseBusy
                    ? transactionButtonLabel(pauseTxState, "Resuming Vault")
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

            <TransactionFeedback state={pauseTxState} />
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
                    setSelectedRole(e.target.value as RoleSelection);
                    setAdminLockoutAcknowledged(false);
                  }}
                  disabled={!canRotateAny}
                >
                  <option value="RESERVE_OPERATOR" disabled={!isVaultAdmin}>
                    Reserve Operator (Deposit & Mint)
                  </option>
                  <option value="PAUSER" disabled={!isVaultAdmin}>
                    Emergency Pauser
                  </option>
                  <option value="ADMINISTRATOR" disabled={!isVaultAdmin}>
                    Vault Administrator (Governance & Unpause)
                  </option>
                  <option value="TOKEN_ADMINISTRATOR" disabled={!isTokenAdmin}>
                    Token Administrator (Token Governance)
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
                  disabled={!canRotateSelected}
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
                    Rotating this administrator transfers only the selected
                    contract's authority to{" "}
                    <code>{validationResult.sanitizedAddress}</code>. Your
                    current wallet (<code>{wallet.account}</code>) will lose
                    that contract's administrator rights. The other contract
                    administrator is unchanged.
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
                disabled={!canRotateSelected || !isRotationValid || rotateBusy}
              >
                {rotateBusy
                  ? transactionButtonLabel(rotateTxState, "Rotating Role")
                  : "Review & Rotate Role"}
              </button>

              {!canRotateSelected && (
                <span className="action-auth-note">
                  Requires the current {roleContractLabel(selectedRole)} (
                  {authorities
                    ? shorten(roleAdministrator(authorities, selectedRole))
                    : "..."}
                  ) to rotate this role.
                </span>
              )}
            </form>

            <TransactionFeedback state={rotateTxState} />
          </section>

          {/* Receipt-decoded on-chain event log */}
          <section className="audit-panel" aria-labelledby="audit-heading">
            <h2 id="audit-heading">Verified Events From This Session</h2>
            {auditLog.length === 0 ? (
              <p className="action-subtext">
                No receipt-decoded role rotation or emergency events in this
                session.
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
                <span className="review-label">HSK Chain</span>
                <span className="review-val">Mainnet · Chain ID 177</span>
              </div>
              <div className="review-row">
                <span className="review-label">Paused Impact</span>
                <span className="review-val">
                  Deposit/mint and transfers blocked; role recovery and backed
                  redemption remain available.
                </span>
              </div>
              <div className="review-row">
                <span className="review-label">Redemption State</span>
                <span className="review-val status-available">
                  Supported during ordinary pause (1:1 USDC.e route)
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
                <span className="review-label">Target Contract</span>
                <span className="review-val code-font">
                  {rotationTargetAddress}
                </span>
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
                    Current wallet loses this contract's Admin privileges
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

function isTransactionBusy(state: TransactionState | null): boolean {
  return (
    state?.phase === "awaiting-signature" ||
    state?.phase === "pending" ||
    state?.phase === "verifying"
  );
}

function transactionButtonLabel(
  state: TransactionState | null,
  action: string,
): string {
  if (state?.phase === "awaiting-signature") return "Confirm in Wallet…";
  if (state?.phase === "verifying") return "Verifying On-Chain State…";
  return `${action}…`;
}

function roleContractLabel(role: RoleSelection): string {
  return role === "TOKEN_ADMINISTRATOR"
    ? "token administrator"
    : "vault administrator";
}

function roleAdministrator(
  authorities: PairAuthorities,
  role: RoleSelection,
): Address {
  return role === "TOKEN_ADMINISTRATOR"
    ? authorities.token.administrator
    : authorities.vault.administrator;
}

function TransactionFeedback({ state }: { state: TransactionState | null }) {
  if (!state) return null;
  if (state.phase === "failed") {
    return (
      <div className="wallet-feedback" role="alert">
        <span>{state.error.message} You can review the state and retry.</span>
      </div>
    );
  }
  if (state.phase === "awaiting-signature") {
    return (
      <div className="wallet-feedback" role="status">
        <span>Waiting for wallet signature. No transaction exists yet.</span>
      </div>
    );
  }

  const message =
    state.phase === "pending"
      ? "Transaction submitted; waiting for an HSK receipt."
      : state.phase === "verifying"
        ? "Receipt succeeded; verifying paired contract state and event logs."
        : "Confirmed from receipt, block-pinned reads, and decoded events.";
  return (
    <div className="wallet-feedback" role="status">
      <span>{message}</span>
      <a
        href={toExplorerTransaction(state.hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="wallet-retry"
      >
        View transaction ↗
      </a>
    </div>
  );
}
