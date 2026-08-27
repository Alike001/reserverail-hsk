export function UnauditedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`unaudited-badge ${className}`.trim()}
      role="status"
      aria-label="Unaudited low-value pilot notice"
    >
      <span className="unaudited-dot" aria-hidden="true" />
      Unaudited low-value pilot
    </span>
  );
}
