# Three-Person Team Workflow

Date: **2026-08-27**

## Decision

Use GitHub milestones for phases and small GitHub issues for work units. Teammates select ready,
unassigned issues, work on separate branches, and open pull requests. Nobody pushes directly to
`main`, including the repository owner during normal work. Only repository owner `Alike001`
performs the final squash merge for every pull request, including the owner's own pull requests.

This is safer and faster than one issue per phase: a phase is too large for one owner, difficult
to review, and likely to create merge conflicts.

## Repository Setup

Setup evidence as of **2026-08-27**:

- Public repository: [Alike001/reserverail-hsk](https://github.com/Alike001/reserverail-hsk)
- Default branch: `main`
- Active ruleset: [Protect main](https://github.com/Alike001/reserverail-hsk/rules/21609595)
- Enforced: pull request, one approval, last-push approval, resolved conversations, linear
  history, restricted updates, no deletion, and no force push.
- Merge authority: only the repository-admin role can update `main`, using a pull-request-only
  bypass. Contributors can push feature branches and open/review pull requests but cannot merge.
- Merge method: squash only; merged branches are deleted automatically.
- Required CI status checks remain intentionally unset until real Phase 2 jobs run once.

The repository owner should:

1. Create a **public** GitHub repository. Public visibility also supports the hackathon's source
   requirement and makes repository rulesets available on GitHub Free.
2. Add the other two teammates with write access.
3. Add the labels and milestones listed in [the backlog](./github-backlog.md).
4. Create a GitHub Project with these columns:
   `Backlog → Ready → In progress → In review → Done`.
5. Create and activate the `Protect main` repository ruleset described below.
6. Add required status checks after their first successful GitHub Actions run.
7. Disable or avoid merge methods other than squash merge for normal work.

Current GitHub references:

- [About repository rulesets](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Rules available for rulesets](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

If the repository is private, confirm the account plan supports the intended ruleset. Current
GitHub documentation says repository rulesets are available for public repositories on Free,
and for private repositories on Pro, Team and Enterprise Cloud.

## Protect `main`

In **Settings → Rules → Rulesets → New branch ruleset**, create `Protect main`:

- Enforcement status: **Active**.
- Target: default branch or branch pattern `main`.
- Do not add normal contributors to the bypass list.
- Restrict deletions.
- Block force pushes.
- Require a pull request before merging.
- Require **1 approving review**.
- Dismiss stale approvals when new commits change the diff.
- Require approval from someone other than the last person to push.
- Require all review conversations to be resolved.
- Require status checks to pass.
- Require the branch to be up to date before merging for security-sensitive work.

Target required checks after CI exists:

- `contracts-format-build-test`
- `contracts-invariants`
- `contracts-static-analysis`
- `web-lint-typecheck-test-build`
- `docs-links-and-secrets`

GitHub does not know whether a review is thoughtful. The team still follows the review checklist
below.

## Milestones And Issues

Create these milestones:

- Phase 1 — Product contract
- Phase 2 — HSK preflight and scaffold
- Phase 3 — Reserve-safe contract core
- Phase 4 — Distribution
- Phase 5 — Product surfaces
- Phase 6 — Mainnet hardening and deployment
- Phase 7 — Demo Day and submission

Each issue should be small enough for roughly half a day to two focused days. If it cannot be
reviewed independently, split it before someone claims it.

Every issue contains:

- Problem or outcome
- In scope
- Out of scope
- Acceptance criteria
- Verification commands/evidence
- Dependencies
- Security or no-mock notes
- Likely work area, without prescribing every implementation detail

## Labels

Use one label from each relevant group:

- Type: `type:feature`, `type:bug`, `type:test`, `type:docs`, `type:security`, `type:chore`
- Area: `area:contracts`, `area:web`, `area:hsk`, `area:devops`, `area:product`
- Priority: `priority:p0`, `priority:p1`, `priority:p2`
- State: `status:ready`, `status:in-review`, `status:blocked`, `status:needs-decision`
- Risk: `risk:funds`, `risk:privileged`, `risk:mainnet`

## Claiming Work

1. Pick only an issue marked `status:ready` with no assignee.
2. Assign yourself and comment with the intended approach.
3. Move it to `In progress`.
4. Create a branch from an updated `main`.
5. If the issue grows, stop and split it rather than silently expanding the PR.

Suggested branch names:

```text
feat/23-reserve-vault
fix/41-claim-replay
test/24-reserve-invariant
docs/7-product-spec
```

Only one person owns an issue, but another teammate may pair or review. Avoid assigning the same
source file to two parallel issues unless their merge order is explicit.

## Pull Request Flow

```text
Issue claimed
    ↓
Feature branch
    ↓
Small commits + local checks
    ↓
Pull request linked to issue
    ↓
CI + teammate review
    ↓
Feedback resolved and rechecked
    ↓
Squash merge to protected main
```

Pull requests should:

- Use `Closes #<issue>` when the PR completes the issue.
- Describe what changed and what deliberately did not change.
- Include exact verification commands and results.
- Include screenshots for visible UI changes.
- Include transaction/explorer links only when they are real.
- Call out changes to funds, roles, reserve accounting, policies, deployment or mainnet state.
- Stay small; prefer several ordered PRs over one phase-sized PR.

After checks and review, only `Alike001` presses **Squash and merge**. Contributors must not
merge their own or another contributor's pull request even if GitHub displays a merge control.
For an urgent owner-authored change, the owner may use the PR-only administrator bypass, but the
pull request, passing available checks, self-review evidence, and bypass reason must remain in
the audit trail.

## Review Policy

The author cannot approve their own PR. The reviewer checks:

- Does it meet every issue acceptance criterion?
- Is any implementation mocked, hardcoded or simulated in the production path?
- Does a financial change preserve the reserve invariant?
- Are authorization failure cases tested?
- Could the change affect another teammate's open branch?
- Are addresses, chain IDs and explorer links correct?
- Are error states truthful?
- Did the author add unnecessary scope?
- Are security, license and deployment consequences documented?

For any PR carrying `risk:funds`, `risk:privileged` or `risk:mainnet`, both non-author teammates
should review even though GitHub technically requires one approval. A mainnet deployment is a
team decision, not an individual merge.

## Merge And Release Policy

- Normal merge strategy: squash merge.
- Delete the feature branch after merge.
- Pull/rebase from `main` before final approval when GitHub requires the branch to be current.
- Never force-push `main`.
- Never commit private keys, seed phrases, API secrets or funded test accounts.
- HSK testnet deployments use reviewed address manifests.
- HSK mainnet deployment requires a tagged commit, reviewed parameters, capped funds and two
  teammates present.
- The deployed address manifest is changed only by a dedicated deployment PR.

## Conflict Prevention For Three People

Prefer these parallel work areas after the architecture issue is accepted:

- Contracts and invariant tests
- Web product and read-only proof pages
- HSK integration, CI, documentation and deployment evidence

These are workstreams, not permanent titles. Teammates still choose issues, and every teammate
must review outside their main area. Shared ABI, address-manifest and configuration files should
have an explicit owner for each phase.

## Daily Team Check-In

Keep it to ten minutes:

- What merged since the last check-in?
- What issue is each person claiming now?
- What is blocked or likely to collide?
- Has scope, financial risk or the no-mock rule changed?
- What can be demonstrated from `main` today?

The repository's `main` branch should remain demonstrable throughout the build.
