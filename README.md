# ReserveRail

> Launch a branded, USDC-backed stablecoin on HSK Chain, distribute it to users, and let
> anyone verify or redeem its backing.

Status: **Phase 1 product definition**. No product contracts or live deployment exist yet.

[Hackathon submission](https://luma.com/t6gj441t) closes **2026-08-27 at 14:00 WAT**. The
official event format is a three-minute showcase followed by two minutes of Q&A.

The proposed product lets an issuer deposit HSK mainnet USDC.e into an isolated reserve vault,
mint the same quantity of a branded stablecoin, configure operational access, distribute funded
tokens, and offer 1:1 redemption. A public proof page will expose supply, reserve, policy,
roles, status and HSK Blockscout evidence.

```text
Deposit USDC.e → Mint → Distribute → Redeem
```

## Start Here

- [Product specification](./.thoughts/specs/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [Phase 1 decisions](./docs/phase-1-decisions.md)
- [User stories](./.thoughts/stories/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [Product surface map](./.thoughts/design/2026-08-27-product-surface-map.md)
- [Interaction wireframe](./docs/interaction-wireframe.md)
- [Threat model](./docs/threat-model.md)
- [Build plan](./.thoughts/plans/2026-08-26-hsk-stablecoin-issuer-studio.md)
- [Team workflow](./docs/team-workflow.md)
- [GitHub backlog](./docs/github-backlog.md)
- [Research context](./context/README.md)

## Product Rules

- A token is not called stable merely because its name says USD.
- MVP supply is minted only against USDC.e deposited in its vault.
- Redemption is required in the judged product path.
- Production screens never substitute a mock or fake success for a real integration.
- The hosted live pilot must be understandable and inspectable within 30 seconds.
- All changes reach protected `main` through issues, pull requests, review and CI.

## Team

ReserveRail is being built by a three-person hackathon team. Two collaborator invitations are
pending. After the initial commit creates `main`, the repository owner will create the
milestones and issues, activate the protected-main ruleset, and require reviewed pull requests
before implementation begins.
