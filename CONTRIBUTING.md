# Contributing

All work starts from a GitHub issue and reaches `main` through a reviewed pull request.

Read these before contributing:

- [Product specification](./.thoughts/specs/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [User stories](./.thoughts/stories/2026-08-27-hsk-stablecoin-issuer-studio.md)
- [Threat model](./docs/threat-model.md)
- [Team workflow](./docs/team-workflow.md)
- [Issue backlog](./docs/github-backlog.md)

## Workflow

1. Claim an unassigned `status:ready` issue.
2. Branch from the latest `main` using `<type>/<issue>-<short-name>`.
3. Keep the change inside the issue scope.
4. Run the checks relevant to the change.
5. Open a pull request using the repository template and link the issue.
6. Resolve review conversations and obtain approval from another teammate.
7. Merge only after required checks pass.

Never push directly to `main`. Never place a mock, fake receipt, fabricated balance, hardcoded
success response or simulated integration in a production route while presenting it as real.

Mock contracts and fixtures are allowed only in clearly identified test/local environments.

## Commits

Use conventional commits with the issue number:

```text
feat(vault): gate minting by reserve deposit (#23)
test(distribution): reject repeated claims (#35)
docs(product): clarify redemption behavior (#7)
```

## Security

Do not open a public issue containing an exploitable vulnerability, private key, seed phrase,
service secret or sensitive recipient data. Contact the repository owner privately so the team
can use GitHub's private vulnerability-reporting/security-advisory path when configured.
