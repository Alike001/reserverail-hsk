import { useState } from "react";
import {
  deploymentManifest,
  hskMainnet,
  toExplorerAddress,
  toExplorerTransaction,
  type Address,
} from "../config/hsk";
import {
  executeApproveReserve,
  executeCreateIssuer,
  executeDepositAndMint,
  formatReserveUnits,
  HSK_MAINNET_USDC_E,
  parseReserveUnits,
  reconcileIssuerMint,
  validateIssuerFormData,
  type DiscoveredIssuerPair,
  type MintReconciliationResult,
} from "../wallet/issuer";
import { walletStore, type WalletStore } from "../wallet/store";
import type { TransactionState } from "../wallet/transaction";
import { useWallet } from "../wallet/use-wallet";

interface IssuerCreateViewProps {
  store?: WalletStore;
  factoryAddressOverride?: Address;
  usdcAddressOverride?: Address;
  onSuccessNavigate?: (vaultAddress: Address) => void;
}

type WizardStage = "form" | "pipeline" | "success";
type ActiveStepIndex = 1 | 2 | 3;

export function IssuerCreateView({
  store = walletStore,
  factoryAddressOverride,
  usdcAddressOverride,
  onSuccessNavigate,
}: IssuerCreateViewProps) {
  const wallet = useWallet(store);
  const factoryAddress =
    factoryAddressOverride ?? deploymentManifest.factory ?? undefined;
  const usdcAddress = usdcAddressOverride ?? HSK_MAINNET_USDC_E;

  const defaultAccount = wallet.account ?? "";

  // Form State
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [administrator, setAdministrator] = useState(defaultAccount);
  const [reserveOperator, setReserveOperator] = useState(defaultAccount);
  const [pauser, setPauser] = useState(defaultAccount);
  const [reserveAmountInput, setReserveAmountInput] = useState("100");
  const [recipient, setRecipient] = useState(defaultAccount);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPreSignReview, setShowPreSignReview] = useState(false);

  // Execution Wizard State
  const [stage, setStage] = useState<WizardStage>("form");
  const [activeStep, setActiveStep] = useState<ActiveStepIndex>(1);

  // Step 1 State: Create Instance
  const [step1TxState, setStep1TxState] = useState<TransactionState | null>(
    null,
  );
  const [discoveredPair, setDiscoveredPair] =
    useState<DiscoveredIssuerPair | null>(null);

  // Step 2 State: Approve USDC.e
  const [step2TxState, setStep2TxState] = useState<TransactionState | null>(
    null,
  );
  const [step2ConfirmedHash, setStep2ConfirmedHash] = useState<string | null>(
    null,
  );

  // Step 3 State: Deposit & Mint
  const [step3TxState, setStep3TxState] = useState<TransactionState | null>(
    null,
  );
  const [step3ConfirmedHash, setStep3ConfirmedHash] = useState<string | null>(
    null,
  );

  // Reconciliation State
  const [reconciliation, setReconciliation] =
    useState<MintReconciliationResult | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationError, setReconciliationError] = useState<string | null>(
    null,
  );

  // Sync wallet account to empty fields if updated
  const fillConnectedAccount = () => {
    if (wallet.account) {
      if (!administrator) setAdministrator(wallet.account);
      if (!reserveOperator) setReserveOperator(wallet.account);
      if (!pauser) setPauser(wallet.account);
      if (!recipient) setRecipient(wallet.account);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateIssuerFormData({
      name,
      symbol,
      administrator: administrator || defaultAccount,
      reserveOperator: reserveOperator || defaultAccount,
      pauser: pauser || defaultAccount,
      reserveAmount: reserveAmountInput,
      recipient: recipient || defaultAccount,
    });

    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setShowPreSignReview(true);
  };

  // Step 1: Execute Factory Create
  const handleRunStep1 = async () => {
    if (!factoryAddress || !wallet.account) return;
    const client = store.getClient();
    if (!client) return;

    setShowPreSignReview(false);
    setStage("pipeline");
    setActiveStep(1);

    try {
      const { result } = await executeCreateIssuer({
        factoryAddress,
        params: {
          name,
          symbol,
          administrator: (administrator || defaultAccount) as Address,
          reserveOperator: (reserveOperator || defaultAccount) as Address,
          pauser: (pauser || defaultAccount) as Address,
        },
        walletClient: client,
        account: wallet.account,
        onState: setStep1TxState,
      });

      setDiscoveredPair(result);
      setActiveStep(2);
    } catch {
      // Handled in transaction state
    }
  };

  // Step 2: Execute USDC.e Approval
  const handleRunStep2 = async () => {
    if (!discoveredPair || !wallet.account) return;
    const client = store.getClient();
    if (!client) return;

    const parsedAmount = parseReserveUnits(reserveAmountInput).amount;
    if (!parsedAmount) return;

    setActiveStep(2);
    try {
      const { receipt } = await executeApproveReserve({
        reserveAssetAddress: usdcAddress,
        spender: discoveredPair.vault,
        amount: parsedAmount,
        walletClient: client,
        account: wallet.account,
        onState: setStep2TxState,
      });

      setStep2ConfirmedHash(receipt.transactionHash);
      setActiveStep(3);
    } catch {
      // Handled in transaction state
    }
  };

  // Step 3: Execute Deposit & Mint + Authoritative Reconciliation
  const handleRunStep3 = async () => {
    if (!discoveredPair || !wallet.account) return;
    const client = store.getClient();
    if (!client) return;

    const parsedAmount = parseReserveUnits(reserveAmountInput).amount;
    if (!parsedAmount) return;

    const targetRecipient = (recipient || defaultAccount) as Address;

    setActiveStep(3);
    try {
      const { receipt } = await executeDepositAndMint({
        vaultAddress: discoveredPair.vault,
        reserveAmount: parsedAmount,
        recipient: targetRecipient,
        walletClient: client,
        account: wallet.account,
        onState: setStep3TxState,
      });

      setStep3ConfirmedHash(receipt.transactionHash);

      // Perform Authoritative Post-Read Reconciliation
      setIsReconciling(true);
      setReconciliationError(null);
      const reconResult = await reconcileIssuerMint({
        vaultAddress: discoveredPair.vault,
        tokenAddress: discoveredPair.token,
        recipient: targetRecipient,
        expectedMintAmount: parsedAmount,
      });

      setReconciliation(reconResult);
      setIsReconciling(false);

      if (reconResult.isReconciled) {
        setStage("success");
      } else {
        setReconciliationError(
          reconResult.reconciliationError ??
            "On-chain reconciliation failed between reserve and token supply.",
        );
      }
    } catch {
      setIsReconciling(false);
      // Handled in transaction state
    }
  };

  const parsedAmountPreview = parseReserveUnits(reserveAmountInput);

  return (
    <div className="issuer-create-view">
      <div className="issuer-header">
        <span className="eyebrow">Production Stablecoin Factory</span>
        <h1>Issue Stablecoin & Mint Reserve</h1>
        <p className="issuer-subtitle">
          Deploy an isolated Token and Reserve Vault pair on {hskMainnet.name}{" "}
          (Chain ID {hskMainnet.id}), deposit USDC.e reserve, and mint 1:1
          backed tokens in a verified 3-step on-chain sequence.
        </p>
      </div>

      {/* Stepper Bar */}
      <div className="stepper-container" aria-label="Creation Steps">
        <div
          className={`step-indicator ${
            stage === "form" ? "active" : activeStep >= 1 ? "completed" : ""
          }`}
        >
          <span className="step-number">1</span>
          <span>Configure & Review</span>
        </div>
        <div className="step-divider" />
        <div
          className={`step-indicator ${
            activeStep === 1 && stage === "pipeline"
              ? "active"
              : activeStep > 1
                ? "completed"
                : ""
          }`}
        >
          <span className="step-number">2</span>
          <span>Deploy Pair</span>
        </div>
        <div className="step-divider" />
        <div
          className={`step-indicator ${
            activeStep === 2 ? "active" : activeStep > 2 ? "completed" : ""
          }`}
        >
          <span className="step-number">3</span>
          <span>Approve USDC.e</span>
        </div>
        <div className="step-divider" />
        <div
          className={`step-indicator ${
            stage === "success" ? "completed" : activeStep === 3 ? "active" : ""
          }`}
        >
          <span className="step-number">4</span>
          <span>Deposit & Reconcile</span>
        </div>
      </div>

      {!factoryAddress ? (
        <div className="pilot-state-card" role="status">
          <h3>Stablecoin Factory Undeployed</h3>
          <p>
            The factory contract is not yet committed in the deployment
            manifest. Contract deployment must be verified before new issuer
            clones can be launched.
          </p>
        </div>
      ) : stage === "form" ? (
        /* Form View */
        <form className="issuer-form-card" onSubmit={handleFormSubmit}>
          <div className="manifest-header">
            <div>
              <span className="eyebrow">Step 1 of 3</span>
              <h2>Token & Authority Setup</h2>
            </div>
            {wallet.account && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={fillConnectedAccount}
              >
                Use Connected Wallet for Roles
              </button>
            )}
          </div>

          <div className="issuer-form-grid">
            <div className="form-field">
              <label htmlFor="token-name">Stablecoin Name</label>
              <input
                id="token-name"
                type="text"
                className="form-control"
                placeholder="e.g. Reserve USD"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {formErrors.name && (
                <span className="field-error">{formErrors.name}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="token-symbol">Token Symbol</label>
              <input
                id="token-symbol"
                type="text"
                className="form-control"
                placeholder="e.g. RUSD"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
              {formErrors.symbol && (
                <span className="field-error">{formErrors.symbol}</span>
              )}
            </div>

            <div className="form-field full-width">
              <label htmlFor="admin-role">
                <span>Administrator Address</span>
                <span className="field-hint">
                  Governance & role rotation power
                </span>
              </label>
              <input
                id="admin-role"
                type="text"
                className="form-control code-font"
                placeholder="0x..."
                value={administrator || defaultAccount}
                onChange={(e) => setAdministrator(e.target.value)}
              />
              {formErrors.administrator && (
                <span className="field-error">{formErrors.administrator}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="operator-role">
                <span>Reserve Operator</span>
                <span className="field-hint">Deposit & mint power</span>
              </label>
              <input
                id="operator-role"
                type="text"
                className="form-control code-font"
                placeholder="0x..."
                value={reserveOperator || defaultAccount}
                onChange={(e) => setReserveOperator(e.target.value)}
              />
              {formErrors.reserveOperator && (
                <span className="field-error">
                  {formErrors.reserveOperator}
                </span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="pauser-role">
                <span>Emergency Pauser</span>
                <span className="field-hint">Incident response switch</span>
              </label>
              <input
                id="pauser-role"
                type="text"
                className="form-control code-font"
                placeholder="0x..."
                value={pauser || defaultAccount}
                onChange={(e) => setPauser(e.target.value)}
              />
              {formErrors.pauser && (
                <span className="field-error">{formErrors.pauser}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="reserve-amount">
                <span>Initial Reserve Deposit (USDC.e)</span>
                <span className="field-hint">6 decimals exact base units</span>
              </label>
              <input
                id="reserve-amount"
                type="text"
                className="form-control"
                placeholder="100.00"
                value={reserveAmountInput}
                onChange={(e) => setReserveAmountInput(e.target.value)}
              />
              {formErrors.reserveAmount && (
                <span className="field-error">{formErrors.reserveAmount}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="recipient-address">
                <span>Initial Mint Recipient</span>
                <span className="field-hint">Receives minted stablecoins</span>
              </label>
              <input
                id="recipient-address"
                type="text"
                className="form-control code-font"
                placeholder="0x..."
                value={recipient || defaultAccount}
                onChange={(e) => setRecipient(e.target.value)}
              />
              {formErrors.recipient && (
                <span className="field-error">{formErrors.recipient}</span>
              )}
            </div>
          </div>

          <div className="emergency-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!wallet.account || !wallet.isHskMainnet}
            >
              Review Pre-Sign Sequence
            </button>
            <span className="action-auth-note">
              {!wallet.account
                ? "Connect wallet to continue."
                : !wallet.isHskMainnet
                  ? "Switch to HSK Chain (177) to continue."
                  : "All transactions require wallet signature on HSK Mainnet."}
            </span>
          </div>
        </form>
      ) : stage === "pipeline" ? (
        /* Multi-Step Pipeline View */
        <div className="pipeline-container">
          {/* Step 1 Card */}
          <div
            className={`pipeline-step-card ${
              activeStep === 1 ? "active" : discoveredPair ? "completed" : ""
            }`}
          >
            <div className="pipeline-step-header">
              <div className="pipeline-step-title">
                <span className="step-number">1</span>
                <span>Deploy Token & Vault Clones</span>
              </div>
              <span
                className={`step-status-pill ${
                  step1TxState?.phase === "confirmed" || discoveredPair
                    ? "pill-completed"
                    : step1TxState?.phase === "pending"
                      ? "pill-active"
                      : step1TxState?.phase === "failed"
                        ? "pill-failed"
                        : "pill-waiting"
                }`}
              >
                {discoveredPair
                  ? "CONFIRMED"
                  : step1TxState?.phase === "pending"
                    ? "MINING…"
                    : step1TxState?.phase === "failed"
                      ? "FAILED"
                      : "READY"}
              </span>
            </div>

            <p className="pipeline-step-desc">
              Calls <code>StablecoinFactory.createIssuer()</code> to
              instantaneously instantiate and initialize paired clones.
            </p>

            {discoveredPair ? (
              <div className="discovered-addresses-list">
                <div className="discovered-row">
                  <span className="summary-label">Discovered Token:</span>
                  <a
                    href={toExplorerAddress(discoveredPair.token)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {discoveredPair.token} ↗
                  </a>
                </div>
                <div className="discovered-row">
                  <span className="summary-label">Discovered Vault:</span>
                  <a
                    href={toExplorerAddress(discoveredPair.vault)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {discoveredPair.vault} ↗
                  </a>
                </div>
              </div>
            ) : (
              <div className="emergency-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={step1TxState?.phase === "pending"}
                  onClick={handleRunStep1}
                >
                  {step1TxState?.phase === "pending"
                    ? "Confirming in Wallet…"
                    : step1TxState?.phase === "failed"
                      ? "Retry Step 1"
                      : "Sign Step 1 Transaction"}
                </button>
                {step1TxState?.phase === "failed" && (
                  <span className="field-error">
                    {step1TxState.error.message}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Step 2 Card */}
          <div
            className={`pipeline-step-card ${
              activeStep === 2
                ? "active"
                : step2ConfirmedHash
                  ? "completed"
                  : ""
            }`}
          >
            <div className="pipeline-step-header">
              <div className="pipeline-step-title">
                <span className="step-number">2</span>
                <span>Approve USDC.e Reserve Transfer</span>
              </div>
              <span
                className={`step-status-pill ${
                  step2ConfirmedHash
                    ? "pill-completed"
                    : step2TxState?.phase === "pending"
                      ? "pill-active"
                      : step2TxState?.phase === "failed"
                        ? "pill-failed"
                        : "pill-waiting"
                }`}
              >
                {step2ConfirmedHash
                  ? "APPROVED"
                  : step2TxState?.phase === "pending"
                    ? "MINING…"
                    : step2TxState?.phase === "failed"
                      ? "FAILED"
                      : "WAITING"}
              </span>
            </div>

            <p className="pipeline-step-desc">
              Authorizes the new Vault (
              {discoveredPair ? discoveredPair.vault.slice(0, 10) + "…" : "..."}
              ) to draw {reserveAmountInput} USDC.e.
            </p>

            {step2ConfirmedHash ? (
              <div className="pipeline-step-meta">
                <span className="summary-label">Approval Transaction:</span>
                <a
                  href={toExplorerTransaction(step2ConfirmedHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {step2ConfirmedHash} ↗
                </a>
              </div>
            ) : discoveredPair ? (
              <div className="emergency-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={step2TxState?.phase === "pending"}
                  onClick={handleRunStep2}
                >
                  {step2TxState?.phase === "pending"
                    ? "Approving USDC.e…"
                    : step2TxState?.phase === "failed"
                      ? "Retry Step 2"
                      : "Sign Step 2 Approval"}
                </button>
                {step2TxState?.phase === "failed" && (
                  <span className="field-error">
                    {step2TxState.error.message}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {/* Step 3 Card */}
          <div
            className={`pipeline-step-card ${
              activeStep === 3
                ? "active"
                : step3ConfirmedHash
                  ? "completed"
                  : ""
            }`}
          >
            <div className="pipeline-step-header">
              <div className="pipeline-step-title">
                <span className="step-number">3</span>
                <span>Deposit Reserve & Mint Stablecoins</span>
              </div>
              <span
                className={`step-status-pill ${
                  step3ConfirmedHash
                    ? "pill-completed"
                    : step3TxState?.phase === "pending" || isReconciling
                      ? "pill-active"
                      : step3TxState?.phase === "failed"
                        ? "pill-failed"
                        : "pill-waiting"
                }`}
              >
                {step3ConfirmedHash
                  ? "MINTED & RECONCILED"
                  : isReconciling
                    ? "RECONCILING POST-READS…"
                    : step3TxState?.phase === "pending"
                      ? "MINING…"
                      : step3TxState?.phase === "failed"
                        ? "FAILED"
                        : "WAITING"}
              </span>
            </div>

            <p className="pipeline-step-desc">
              Deposits {reserveAmountInput} USDC.e into the vault and triggers
              1:1 minting of {reserveAmountInput} {symbol} to recipient.
            </p>

            {step2ConfirmedHash && !step3ConfirmedHash && (
              <div className="emergency-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={step3TxState?.phase === "pending" || isReconciling}
                  onClick={handleRunStep3}
                >
                  {step3TxState?.phase === "pending"
                    ? "Depositing & Minting…"
                    : isReconciling
                      ? "Reconciling Balances…"
                      : step3TxState?.phase === "failed"
                        ? "Retry Step 3"
                        : "Sign Step 3 Mint"}
                </button>
                {step3TxState?.phase === "failed" && (
                  <span className="field-error">
                    {step3TxState.error.message}
                  </span>
                )}
                {reconciliationError && (
                  <span className="field-error">{reconciliationError}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Success & Reconciliation View */
        <div className="reconciliation-card">
          <div className="reconciliation-header">
            <div>
              <span className="eyebrow">Issuance Success</span>
              <h2>Stablecoin Deployed & Reconciled</h2>
            </div>
            <span className="coverage-pill-100">🛡️ 100% Reserve Backed</span>
          </div>

          <p className="pilot-subtitle">
            Authoritative on-chain post-reads confirmed that vault USDC.e
            reserves exactly equal total issued token supply.
          </p>

          <div className="reconciliation-grid">
            <div className="reconcile-item">
              <span className="reconcile-item-label">
                Vault Reserve Balance
              </span>
              <span className="reconcile-item-val">
                {reconciliation
                  ? formatReserveUnits(reconciliation.vaultReserveBalance)
                  : "0"}{" "}
                USDC.e
              </span>
            </div>
            <div className="reconcile-item">
              <span className="reconcile-item-label">Total Token Supply</span>
              <span className="reconcile-item-val">
                {reconciliation
                  ? formatReserveUnits(reconciliation.tokenTotalSupply)
                  : "0"}{" "}
                {symbol}
              </span>
            </div>
            <div className="reconcile-item">
              <span className="reconcile-item-label">Recipient Balance</span>
              <span className="reconcile-item-val">
                {reconciliation
                  ? formatReserveUnits(reconciliation.recipientBalance)
                  : "0"}{" "}
                {symbol}
              </span>
            </div>
          </div>

          <div className="discovered-addresses-list">
            <div className="discovered-row">
              <span className="summary-label">Deployed Token Contract:</span>
              <a
                href={toExplorerAddress(discoveredPair?.token ?? "")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {discoveredPair?.token} ↗
              </a>
            </div>
            <div className="discovered-row">
              <span className="summary-label">Deployed Reserve Vault:</span>
              <a
                href={toExplorerAddress(discoveredPair?.vault ?? "")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {discoveredPair?.vault} ↗
              </a>
            </div>
          </div>

          <div className="emergency-actions">
            {onSuccessNavigate && discoveredPair && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSuccessNavigate(discoveredPair.vault)}
              >
                Manage Vault Controls
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setStage("form");
                setName("");
                setSymbol("");
                setDiscoveredPair(null);
                setStep2ConfirmedHash(null);
                setStep3ConfirmedHash(null);
                setReconciliation(null);
              }}
            >
              Issue Another Token
            </button>
          </div>
        </div>
      )}

      {/* Pre-Sign Review Modal */}
      {showPreSignReview && (
        <div className="review-modal-backdrop" role="dialog" aria-modal="true">
          <div className="review-modal">
            <h3>Review Issuance & Mint Plan</h3>
            <div className="review-summary-table">
              <div className="summary-row">
                <span className="summary-label">Issuer (Caller)</span>
                <span className="summary-value code-font">
                  {wallet.account}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Token Metadata</span>
                <span className="summary-value">
                  {name} ({symbol})
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Administrator</span>
                <span className="summary-value code-font">
                  {administrator || defaultAccount}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Reserve Operator</span>
                <span className="summary-value code-font">
                  {reserveOperator || defaultAccount}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Emergency Pauser</span>
                <span className="summary-value code-font">
                  {pauser || defaultAccount}
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Initial Reserve</span>
                <span className="summary-value">
                  {parsedAmountPreview.amount
                    ? formatReserveUnits(parsedAmountPreview.amount)
                    : "0"}{" "}
                  USDC.e ({parsedAmountPreview.amount?.toString() ?? "0"} base
                  units)
                </span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Configured USDC.e</span>
                <span className="summary-value code-font">{usdcAddress}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Network</span>
                <span className="summary-value">
                  {hskMainnet.name} (Chain ID {hskMainnet.id})
                </span>
              </div>
            </div>

            <div className="sequence-box">
              <span className="sequence-title">
                3-Step On-Chain Transaction Sequence
              </span>
              <ol className="sequence-steps">
                <li>
                  <strong>Step 1:</strong> Call Factory to deploy Token & Vault
                  clones.
                </li>
                <li>
                  <strong>Step 2:</strong> Approve Vault to spend exact reserve
                  amount.
                </li>
                <li>
                  <strong>Step 3:</strong> Deposit USDC.e into Vault and mint
                  1:1 backed tokens.
                </li>
              </ol>
            </div>

            <div className="review-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPreSignReview(false)}
              >
                Edit Parameters
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunStep1}
              >
                Proceed to Step 1 Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
