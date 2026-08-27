import { useCallback, useEffect, useState } from "react";
import type { Address, TransactionReceipt } from "viem";
import {
  deploymentManifest,
  hskMainnet,
  toExplorerAddress,
  toExplorerTransaction,
} from "../config/hsk";
import { normalizeWalletError } from "../wallet/errors";
import {
  executeHolderRedemption,
  executeHolderTransfer,
  fetchHolderPosition,
  formatHolderUnits,
  parseHolderAmount,
  prepareHolderRedemption,
  prepareHolderTransfer,
  reconcileHolderRedemption,
  reconcileHolderTransfer,
  validateHolderRecipient,
  type HolderPosition,
  type RedemptionBaseline,
  type TransferBaseline,
} from "../wallet/holder";
import { walletStore, type WalletStore } from "../wallet/store";
import type { TransactionState } from "../wallet/transaction";
import { useWallet } from "../wallet/use-wallet";
import { UnauditedBadge } from "./UnauditedBadge";

interface HolderDeskProps {
  store?: WalletStore;
  tokenAddressOverride?: Address;
  vaultAddressOverride?: Address;
}

type ReviewAction = "redeem" | "transfer" | null;

export function HolderDesk({
  store = walletStore,
  tokenAddressOverride,
  vaultAddressOverride,
}: HolderDeskProps) {
  const wallet = useWallet(store);
  const tokenAddress =
    tokenAddressOverride ?? deploymentManifest.pilot.token ?? undefined;
  const vaultAddress =
    vaultAddressOverride ?? deploymentManifest.pilot.vault ?? undefined;

  const [position, setPosition] = useState<HolderPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction>(null);

  const [transferAmount, setTransferAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferState, setTransferState] = useState<TransactionState | null>(
    null,
  );
  const [transferBaseline, setTransferBaseline] =
    useState<TransferBaseline | null>(null);
  const [submittedTransferAmount, setSubmittedTransferAmount] = useState<
    bigint | null
  >(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isRetryingTransfer, setIsRetryingTransfer] = useState(false);

  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemRecipient, setRedeemRecipient] = useState("");
  const [redeemState, setRedeemState] = useState<TransactionState | null>(null);
  const [redemptionBaseline, setRedemptionBaseline] =
    useState<RedemptionBaseline | null>(null);
  const [submittedRedemptionAmount, setSubmittedRedemptionAmount] = useState<
    bigint | null
  >(null);
  const [redemptionError, setRedemptionError] = useState<string | null>(null);
  const [isRetryingRedemption, setIsRetryingRedemption] = useState(false);

  const loadPosition = useCallback(async () => {
    if (!tokenAddress || !vaultAddress || !wallet.account) return;
    setIsLoading(true);
    setPositionError(null);
    try {
      const next = await fetchHolderPosition({
        holder: wallet.account,
        tokenAddress,
        vaultAddress,
      });
      setPosition(next);
    } catch (error) {
      setPosition(null);
      setPositionError(normalizeWalletError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, vaultAddress, wallet.account]);

  useEffect(() => {
    let active = true;
    if (!tokenAddress || !vaultAddress || !wallet.account) {
      return;
    }
    fetchHolderPosition({
      holder: wallet.account,
      tokenAddress,
      vaultAddress,
    })
      .then((next) => {
        if (active) {
          setPositionError(null);
          setPosition(next);
        }
      })
      .catch((error) => {
        if (active) {
          setPosition(null);
          setPositionError(normalizeWalletError(error).message);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tokenAddress, vaultAddress, wallet.account]);

  const redeemableBalance = position
    ? minBigInt(position.tokenBalance, position.vaultReserveBalance)
    : 0n;
  const transferAmountResult = position
    ? parseHolderAmount(
        transferAmount,
        position.tokenDecimals,
        position.tokenBalance,
      )
    : { valid: false, error: "Holder position is unavailable." };
  const transferRecipientResult = validateHolderRecipient(
    transferRecipient,
    wallet.account,
    true,
  );
  const redeemAmountResult = position
    ? parseHolderAmount(redeemAmount, position.tokenDecimals, redeemableBalance)
    : { valid: false, error: "Holder position is unavailable." };
  const redeemRecipientValue = redeemRecipient || wallet.account || "";
  const redeemRecipientResult = validateHolderRecipient(redeemRecipientValue);

  const transferReceipt = successfulReceipt(transferState);
  const redemptionReceipt = successfulReceipt(redeemState);
  const transferBusy = isTransactionBusy(transferState);
  const redemptionBusy = isTransactionBusy(redeemState);
  const positionIsCurrent = Boolean(
    position &&
    wallet.account &&
    tokenAddress &&
    vaultAddress &&
    position.holder === wallet.account &&
    position.tokenAddress === tokenAddress &&
    position.vaultAddress === vaultAddress,
  );
  const canWrite =
    wallet.status === "connected" && wallet.isHskMainnet && positionIsCurrent;

  const handleTransfer = async () => {
    if (
      !wallet.account ||
      !tokenAddress ||
      !vaultAddress ||
      !transferAmountResult.amount ||
      !transferRecipientResult.address
    ) {
      return;
    }
    const client = store.getClient();
    if (!client) return;

    setReviewAction(null);
    setTransferError(null);
    setTransferState(null);
    try {
      const baseline = await prepareHolderTransfer({
        holder: wallet.account,
        recipient: transferRecipientResult.address,
        tokenAddress,
        vaultAddress,
      });
      setTransferBaseline(baseline);
      setSubmittedTransferAmount(transferAmountResult.amount);
      const { result } = await executeHolderTransfer({
        account: wallet.account,
        amount: transferAmountResult.amount,
        baseline,
        onState: setTransferState,
        walletClient: client,
      });
      setPosition(result.position);
      setTransferAmount("");
      setTransferRecipient("");
    } catch (error) {
      setTransferError(normalizeWalletError(error).message);
    }
  };

  const handleRedemption = async () => {
    if (
      !wallet.account ||
      !tokenAddress ||
      !vaultAddress ||
      !redeemAmountResult.amount ||
      !redeemRecipientResult.address
    ) {
      return;
    }
    const client = store.getClient();
    if (!client) return;

    setReviewAction(null);
    setRedemptionError(null);
    setRedeemState(null);
    try {
      const baseline = await prepareHolderRedemption({
        holder: wallet.account,
        recipient: redeemRecipientResult.address,
        tokenAddress,
        vaultAddress,
      });
      setRedemptionBaseline(baseline);
      setSubmittedRedemptionAmount(redeemAmountResult.amount);
      const { result } = await executeHolderRedemption({
        account: wallet.account,
        amount: redeemAmountResult.amount,
        baseline,
        onState: setRedeemState,
        walletClient: client,
      });
      setPosition(result.position);
      setRedeemAmount("");
    } catch (error) {
      setRedemptionError(normalizeWalletError(error).message);
    }
  };

  const retryTransferVerification = async () => {
    if (!transferBaseline || !transferReceipt || !submittedTransferAmount) {
      return;
    }
    setIsRetryingTransfer(true);
    setTransferError(null);
    try {
      const result = await reconcileHolderTransfer({
        amount: submittedTransferAmount,
        baseline: transferBaseline,
        blockNumber: transferReceipt.blockNumber,
        receipt: transferReceipt,
      });
      setPosition(result.position);
      setTransferState({
        hash: transferReceipt.transactionHash,
        phase: "confirmed",
        receipt: transferReceipt,
      });
      setTransferAmount("");
      setTransferRecipient("");
    } catch (error) {
      setTransferError(normalizeWalletError(error).message);
    } finally {
      setIsRetryingTransfer(false);
    }
  };

  const retryRedemptionVerification = async () => {
    if (
      !redemptionBaseline ||
      !redemptionReceipt ||
      !submittedRedemptionAmount
    ) {
      return;
    }
    setIsRetryingRedemption(true);
    setRedemptionError(null);
    try {
      const result = await reconcileHolderRedemption({
        amount: submittedRedemptionAmount,
        baseline: redemptionBaseline,
        blockNumber: redemptionReceipt.blockNumber,
        receipt: redemptionReceipt,
      });
      setPosition(result.position);
      setRedeemState({
        hash: redemptionReceipt.transactionHash,
        phase: "confirmed",
        receipt: redemptionReceipt,
      });
      setRedeemAmount("");
    } catch (error) {
      setRedemptionError(normalizeWalletError(error).message);
    } finally {
      setIsRetryingRedemption(false);
    }
  };

  return (
    <div className="holder-view">
      <header className="holder-header">
        <div>
          <span className="eyebrow">Holder Operations · HSK 177</span>
          <h1>Transfer or redeem your stablecoin.</h1>
          <p>
            Inspect confirmed balances, send funded tokens, or burn them for the
            vault&apos;s USDC.e reserve through separate on-chain actions.
          </p>
        </div>
        <UnauditedBadge />
      </header>

      {!tokenAddress || !vaultAddress ? (
        <section className="pilot-state-card" role="status">
          <h3>Holder route awaiting a deployed pair</h3>
          <p>
            No token or vault address is committed in the HSK mainnet manifest.
            ReserveRail will not show fixture balances or pretend redemption is
            available.
          </p>
        </section>
      ) : !wallet.account ? (
        <section className="pilot-state-card" role="status">
          <h3>Connect the wallet that holds the stablecoin</h3>
          <p>
            Your balance is read directly from HSK Chain. Connect from the
            header; no account registration or custody deposit is required.
          </p>
        </section>
      ) : (
        <>
          <section className="holder-overview" aria-labelledby="balance-title">
            <div className="holder-section-heading">
              <div>
                <span className="eyebrow">Block-pinned position</span>
                <h2 id="balance-title">Your balances</h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isLoading}
                onClick={loadPosition}
              >
                {isLoading ? "Refreshing…" : "Refresh On-Chain Reads"}
              </button>
            </div>

            {positionError ? (
              <div className="wallet-feedback" role="alert">
                <span>{positionError}</span>
                <button
                  type="button"
                  className="wallet-retry"
                  onClick={loadPosition}
                >
                  Retry
                </button>
              </div>
            ) : isLoading || !positionIsCurrent ? (
              <div className="holder-loading" role="status">
                Reading the verified token-vault pair from HSK Chain…
              </div>
            ) : position ? (
              <>
                <div className="holder-balance-grid">
                  <BalanceCard
                    label={`${position.tokenSymbol} balance`}
                    value={formatHolderUnits(
                      position.tokenBalance,
                      position.tokenDecimals,
                    )}
                    detail={position.tokenName}
                  />
                  <BalanceCard
                    label="USDC.e wallet balance"
                    value={formatHolderUnits(
                      position.reserveBalance,
                      position.reserveDecimals,
                    )}
                    detail="Bridged reserve asset"
                  />
                  <BalanceCard
                    label="Currently redeemable"
                    value={formatHolderUnits(
                      redeemableBalance,
                      position.tokenDecimals,
                    )}
                    detail="Limited by your balance and vault reserve"
                  />
                </div>
                <div
                  className={`holder-safety-banner ${
                    position.isFullyBacked ? "is-backed" : "is-underbacked"
                  }`}
                  role={position.isFullyBacked ? "status" : "alert"}
                >
                  <strong>
                    {position.isFullyBacked
                      ? "Vault reserves cover total supply"
                      : "Warning: vault reserves are below total supply"}
                  </strong>
                  <span>
                    Read at block #{position.blockNumber.toString()} · Transfers
                    are {position.operationallyPaused ? "paused" : "available"};
                    supported redemption remains available while paused.
                  </span>
                </div>
                <div className="holder-address-row">
                  <a
                    href={toExplorerAddress(position.tokenAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Token {shorten(position.tokenAddress)} ↗
                  </a>
                  <a
                    href={toExplorerAddress(position.vaultAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Vault {shorten(position.vaultAddress)} ↗
                  </a>
                  <a
                    href={toExplorerAddress(position.reserveAsset)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    USDC.e {shorten(position.reserveAsset)} ↗
                  </a>
                </div>
              </>
            ) : null}
          </section>

          {position && positionIsCurrent && (
            <div className="holder-action-grid">
              <ActionCard
                title="Transfer stablecoin"
                eyebrow="ERC-20 transfer"
                description={`Send ${position.tokenSymbol} to another HSK address. Total supply and vault reserves do not change.`}
                amount={transferAmount}
                amountError={
                  transferAmount && !transferAmountResult.valid
                    ? transferAmountResult.error
                    : undefined
                }
                amountLabel={`Amount (${position.tokenSymbol})`}
                maxLabel={formatHolderUnits(
                  position.tokenBalance,
                  position.tokenDecimals,
                )}
                recipient={transferRecipient}
                recipientError={
                  transferRecipient && !transferRecipientResult.valid
                    ? transferRecipientResult.error
                    : undefined
                }
                recipientLabel="Recipient HSK address"
                pausedMessage={
                  position.operationallyPaused
                    ? "Transfers are disabled by the on-chain operational pause. Redemption remains available."
                    : undefined
                }
                onAmountChange={(value) => {
                  setTransferAmount(value);
                  setReviewAction(null);
                }}
                onRecipientChange={(value) => {
                  setTransferRecipient(value);
                  setReviewAction(null);
                }}
                onMax={() => {
                  setTransferAmount(
                    formatHolderUnits(
                      position.tokenBalance,
                      position.tokenDecimals,
                    ),
                  );
                  setReviewAction(null);
                }}
                reviewDisabled={
                  !canWrite ||
                  position.operationallyPaused ||
                  !transferAmountResult.valid ||
                  !transferRecipientResult.valid ||
                  transferBusy ||
                  Boolean(transferReceipt)
                }
                reviewLabel="Review Transfer"
                onReview={() => setReviewAction("transfer")}
              >
                {reviewAction === "transfer" &&
                  transferAmountResult.amount &&
                  transferRecipientResult.address && (
                    <ReviewPanel
                      title="Confirm token transfer"
                      rows={[
                        [
                          "You send",
                          `${transferAmount} ${position.tokenSymbol}`,
                        ],
                        ["Recipient", transferRecipientResult.address],
                        ["Network", `${hskMainnet.name} (${hskMainnet.id})`],
                        ["Vault reserve", "Unchanged"],
                      ]}
                      buttonLabel="Sign Transfer on HSK"
                      busy={transferBusy}
                      onCancel={() => setReviewAction(null)}
                      onConfirm={handleTransfer}
                    />
                  )}
                <TransactionFeedback
                  action="transfer"
                  state={transferState}
                  error={transferError}
                  isRetrying={isRetryingTransfer}
                  onRetryVerification={retryTransferVerification}
                />
              </ActionCard>

              <ActionCard
                title="Redeem for USDC.e"
                eyebrow="1:1 on-chain redemption"
                description={`Burn ${position.tokenSymbol} and send the same base-unit amount of USDC.e from the paired vault.`}
                amount={redeemAmount}
                amountError={
                  redeemAmount && !redeemAmountResult.valid
                    ? redeemAmountResult.error
                    : undefined
                }
                amountLabel={`Amount (${position.tokenSymbol})`}
                maxLabel={formatHolderUnits(
                  redeemableBalance,
                  position.tokenDecimals,
                )}
                recipient={redeemRecipientValue}
                recipientError={
                  redeemRecipientValue && !redeemRecipientResult.valid
                    ? redeemRecipientResult.error
                    : undefined
                }
                recipientLabel="USDC.e recipient address"
                pausedMessage={
                  position.operationallyPaused
                    ? "The pair is paused, but the contract deliberately preserves ordinary holder redemption."
                    : undefined
                }
                onAmountChange={(value) => {
                  setRedeemAmount(value);
                  setReviewAction(null);
                }}
                onRecipientChange={(value) => {
                  setRedeemRecipient(value);
                  setReviewAction(null);
                }}
                onMax={() => {
                  setRedeemAmount(
                    formatHolderUnits(
                      redeemableBalance,
                      position.tokenDecimals,
                    ),
                  );
                  setReviewAction(null);
                }}
                reviewDisabled={
                  !canWrite ||
                  !redeemAmountResult.valid ||
                  !redeemRecipientResult.valid ||
                  redemptionBusy ||
                  Boolean(redemptionReceipt)
                }
                reviewLabel="Review Redemption"
                onReview={() => setReviewAction("redeem")}
              >
                {reviewAction === "redeem" &&
                  redeemAmountResult.amount &&
                  redeemRecipientResult.address && (
                    <ReviewPanel
                      title="Confirm 1:1 redemption"
                      rows={[
                        [
                          "Token burned",
                          `${redeemAmount} ${position.tokenSymbol}`,
                        ],
                        ["USDC.e expected", redeemAmount],
                        ["Recipient", redeemRecipientResult.address],
                        ["Network", `${hskMainnet.name} (${hskMainnet.id})`],
                      ]}
                      buttonLabel="Sign Redemption on HSK"
                      busy={redemptionBusy}
                      onCancel={() => setReviewAction(null)}
                      onConfirm={handleRedemption}
                    />
                  )}
                <TransactionFeedback
                  action="redemption"
                  state={redeemState}
                  error={redemptionError}
                  isRetrying={isRetryingRedemption}
                  onRetryVerification={retryRedemptionVerification}
                />
              </ActionCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BalanceCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <article className="holder-balance-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

interface ActionCardProps {
  amount: string;
  amountError?: string;
  amountLabel: string;
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  maxLabel: string;
  onAmountChange: (value: string) => void;
  onMax: () => void;
  onRecipientChange: (value: string) => void;
  onReview: () => void;
  pausedMessage?: string;
  recipient: string;
  recipientError?: string;
  recipientLabel: string;
  reviewDisabled: boolean;
  reviewLabel: string;
  title: string;
}

function ActionCard({
  amount,
  amountError,
  amountLabel,
  children,
  description,
  eyebrow,
  maxLabel,
  onAmountChange,
  onMax,
  onRecipientChange,
  onReview,
  pausedMessage,
  recipient,
  recipientError,
  recipientLabel,
  reviewDisabled,
  reviewLabel,
  title,
}: ActionCardProps) {
  return (
    <section className="holder-action-card">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {pausedMessage && (
        <div className="holder-pause-note" role="status">
          {pausedMessage}
        </div>
      )}
      <div className="form-field">
        <div className="holder-field-label">
          <label htmlFor={`${eyebrow}-amount`}>{amountLabel}</label>
          <button type="button" className="holder-max" onClick={onMax}>
            Max {maxLabel}
          </button>
        </div>
        <input
          id={`${eyebrow}-amount`}
          className="form-control"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
        />
        {amountError && <span className="field-error">{amountError}</span>}
      </div>
      <div className="form-field">
        <label htmlFor={`${eyebrow}-recipient`}>{recipientLabel}</label>
        <input
          id={`${eyebrow}-recipient`}
          className="form-control code-font"
          autoComplete="off"
          placeholder="0x…"
          value={recipient}
          onChange={(event) => onRecipientChange(event.target.value)}
        />
        {recipientError && (
          <span className="field-error">{recipientError}</span>
        )}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={reviewDisabled}
        onClick={onReview}
      >
        {reviewLabel}
      </button>
      {children}
    </section>
  );
}

function ReviewPanel({
  busy,
  buttonLabel,
  onCancel,
  onConfirm,
  rows,
  title,
}: {
  busy: boolean;
  buttonLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  rows: [string, string][];
  title: string;
}) {
  return (
    <div className="holder-review" role="dialog" aria-label={title}>
      <strong>{title}</strong>
      <div className="review-summary-table">
        {rows.map(([label, value]) => (
          <div className="summary-row" key={label}>
            <span className="summary-label">{label}</span>
            <span className="summary-value">{value}</span>
          </div>
        ))}
      </div>
      <p>
        Success is shown only after a confirmed receipt, matching event, and
        authoritative post-transaction reads.
      </p>
      <div className="holder-review-actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Waiting for HSK…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}

function TransactionFeedback({
  action,
  error,
  isRetrying,
  onRetryVerification,
  state,
}: {
  action: "redemption" | "transfer";
  error: string | null;
  isRetrying: boolean;
  onRetryVerification: () => void;
  state: TransactionState | null;
}) {
  if (!state && !error) return null;
  const receipt = successfulReceipt(state);
  const hash = transactionHash(state);
  const confirmed = state?.phase === "confirmed";

  return (
    <div
      className={`holder-transaction ${confirmed ? "is-confirmed" : ""}`}
      role={confirmed ? "status" : "alert"}
    >
      <strong>{transactionLabel(state, action)}</strong>
      {(error || (state?.phase === "failed" && state.error.message)) && (
        <span>
          {error ?? (state?.phase === "failed" ? state.error.message : null)}
        </span>
      )}
      {hash && (
        <a
          href={toExplorerTransaction(hash)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Inspect transaction on HSK Blockscout ↗
        </a>
      )}
      {receipt && !confirmed && (
        <>
          <span>
            The transaction succeeded. Retry verification only—do not submit
            another {action}.
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isRetrying}
            onClick={onRetryVerification}
          >
            {isRetrying ? "Verifying On-Chain Reads…" : "Retry Verification"}
          </button>
        </>
      )}
    </div>
  );
}

function successfulReceipt(
  state: TransactionState | null,
): TransactionReceipt | null {
  if (!state) return null;
  if (state.phase === "confirmed") return state.receipt;
  if (state.phase === "failed" && state.receipt?.status === "success") {
    return state.receipt;
  }
  return null;
}

function transactionHash(state: TransactionState | null): string | null {
  if (!state || state.phase === "awaiting-signature") return null;
  return "hash" in state ? (state.hash ?? null) : null;
}

function isTransactionBusy(state: TransactionState | null): boolean {
  return (
    state?.phase === "awaiting-signature" ||
    state?.phase === "pending" ||
    state?.phase === "verifying"
  );
}

function transactionLabel(
  state: TransactionState | null,
  action: "redemption" | "transfer",
): string {
  const noun = action === "transfer" ? "Transfer" : "Redemption";
  if (!state) return `${noun} not submitted`;
  if (state.phase === "awaiting-signature") return "Confirm in wallet";
  if (state.phase === "pending") return `${noun} submitted · confirming`;
  if (state.phase === "verifying") return `${noun} mined · verifying reads`;
  if (state.phase === "confirmed") return `${noun} confirmed and reconciled`;
  if (state.receipt?.status === "success") {
    return `${noun} confirmed · verification needed`;
  }
  return `${noun} failed`;
}

function minBigInt(first: bigint, second: bigint): bigint {
  return first < second ? first : second;
}

function shorten(address: Address): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
