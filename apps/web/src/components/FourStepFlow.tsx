export function FourStepFlow() {
  const steps = [
    {
      num: 1,
      title: "Deposit USDC.e",
      desc: "Lock USDC.e reserve tokens into the verified vault contract on HSK Chain.",
    },
    {
      num: 2,
      title: "Mint",
      desc: "Issue 1:1 backed stablecoins matching the deposited reserve balance.",
    },
    {
      num: 3,
      title: "Distribute",
      desc: "Transfer minted stablecoins directly to verified holders or payout campaigns.",
    },
    {
      num: 4,
      title: "Redeem",
      desc: "Burn stablecoins to unlock 1:1 underlying USDC.e reserve tokens back to holder.",
    },
  ];

  return (
    <div
      className="flow-container"
      aria-label="ReserveRail Four-Step Money Flow"
    >
      <p className="flow-heading">Planned four-step money flow</p>
      <ol className="four-step-flow">
        {steps.map((step, idx) => (
          <li key={step.num} className="flow-step" tabIndex={0}>
            <div className="step-badge" aria-hidden="true">
              {step.num}
            </div>
            <div className="step-content">
              <span className="step-title">{step.title}</span>
              <span className="step-desc">{step.desc}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className="step-connector" aria-hidden="true">
                →
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
