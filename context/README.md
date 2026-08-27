# HSK Chain Research Context

This folder records a point-in-time research snapshot of the public
[`HashkeyHSK`](https://github.com/HashkeyHSK) GitHub organization.

Research date: **2026-08-26**

## Read This First

1. [Organization reality brief](./hashkeyhsk-organization-research.md) — verified facts,
   inferences, and unresolved questions.
2. [Repository index](./repository-index.md) — all 12 public repositories and what was
   actually found in each one.
3. [Ecosystem and code map](./ecosystem-and-code-map.md) — how the repositories relate to
   HSK Chain, HashKey Group, RWA activity, and the separately maintained node software.
4. [Sources and reproducibility](./sources.md) — inspected commits, primary links, and
   commands for refreshing this snapshot.
5. [Stablecoin issuer-platform research](./stablecoin-issuer-platform-research.md) — the
   proposed product, comparable systems, HSK fit, risks, and recommended scope.
6. [Stablecoin comparator repositories](./stablecoin-comparator-repositories.md) — inspected
   open-source projects, exact commits, licenses, and reusable ideas.

The implementation sequence based on this research is in
[the HSK Stablecoin Issuer Studio plan](../.thoughts/plans/2026-08-26-hsk-stablecoin-issuer-studio.md).

## Phase 1 Product Contract

- [Product specification](../.thoughts/specs/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [User stories](../.thoughts/stories/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [Threat model](../docs/threat-model.md)
- [Provisional quality profile](../.thoughts/quality/2026-08-27-project-quality-profile.md)
- [Three-person team workflow](../docs/team-workflow.md)
- [GitHub milestone and issue backlog](../docs/github-backlog.md)

## Important Boundary

`HashkeyHSK` is not a complete source tree for the HSK Chain protocol. It primarily contains
website content, documentation, analytics artifacts, staking applications/contracts,
developer experiments, and community-program material. The public full-node repository is
maintained separately at [`HSKChain/fullnode-sync`](https://github.com/HSKChain/fullnode-sync).

## Naming

The official website content records that **HashKey Chain was rebranded to HSK Chain on
2026-07-13**. Older repositories, package names, documentation, URLs, and contract comments
still use “HashKey Chain” or “Hashkey.” This folder uses **HSK Chain** for the current network
name and preserves historical names when referring to existing source material.

## Evidence Rules

- Repository claims in these files are based on public default-branch contents and GitHub
  metadata available on the research date.
- Marketing announcements are identified as issuer-published claims, not independently
  verified facts.
- A test-suite claim in a README is not treated as a security audit.
- An ecosystem listing is not proof that a project is deployed, active, endorsed, or safe.
- Network addresses and live configuration should be rechecked against current official
  documentation and on-chain explorers before use.
