# Sources And Reproducibility

Research date: **2026-08-26**

## Primary Organization Sources

- [`HashkeyHSK`](https://github.com/HashkeyHSK)
- [`official-web-data`](https://github.com/HashkeyHSK/official-web-data) — inspected commit
  `bd224222` (2026-08-21)
- [`documentation`](https://github.com/HashkeyHSK/documentation) — inspected commit
  `64ac1088` (2026-06-22)
- [`hsk-data-report`](https://github.com/HashkeyHSK/hsk-data-report) — inspected commit
  `c66a23df` (2026-05-14)
- [`hashkey-hodlium`](https://github.com/HashkeyHSK/hashkey-hodlium) — inspected commit
  `7d4badca` (2026-02-11)
- [`whale-staking`](https://github.com/HashkeyHSK/whale-staking) — inspected commit
  `35728f21` (2025-12-16)
- [`agentkit`](https://github.com/HashkeyHSK/agentkit) — inspected commit `f06f0669`
  (2025-04-17)
- [`Wow-contract`](https://github.com/HashkeyHSK/Wow-contract) — inspected commit `b611b168`
  (2025-04-08)
- [`2025-Hackathon-Taiyi-Seoul`](https://github.com/HashkeyHSK/2025-Hackathon-Taiyi-Seoul)
  — inspected commit `916d1c2a` (2025-03-28)
- [`2024-Hackerhouse-Taichu-HongKong`](https://github.com/HashkeyHSK/2024-Hackerhouse-Taichu-HongKong)
  — inspected commit `507bf075` (2024-12-20)
- [`Brand-Kit`](https://github.com/HashkeyHSK/Brand-Kit) — inspected commit `7b1ac4e`
  (2024-12-17)
- [`developers`](https://github.com/HashkeyHSK/developers) — inspected commit `457bfe13`
  (2024-10-28)
- [`static`](https://github.com/HashkeyHSK/static) — empty repository with no commit

## Related Canonical Sources

- [Live HSK Chain documentation](https://docs.hskchain.net/)
- [`HSKChain` GitHub organization](https://github.com/HSKChain)
- [`HSKChain/fullnode-sync`](https://github.com/HSKChain/fullnode-sync)
- [HSK Chain explorer](https://hashkey.blockscout.com/)

## High-Signal Source Files

- [HSK Chain rebrand announcement](https://github.com/HashkeyHSK/official-web-data/blob/main/news/20260713/rebranding.md)
- [August 2026 gas-fee announcement](https://github.com/HashkeyHSK/official-web-data/blob/main/news/20260804/GasFeeAdjustment.md)
- [Official website ecosystem directory](https://github.com/HashkeyHSK/official-web-data/blob/main/ecosystem/en.json)
- [Asseto/AoABT announcement and infrastructure-provider disclaimer](https://github.com/HashkeyHSK/official-web-data/blob/main/news/20250516/asseto.md)
- [GF Token announcement](https://github.com/HashkeyHSK/official-web-data/blob/main/news/20250627/gfsecurities.md)
- [Silver-backed token announcement](https://github.com/HashkeyHSK/official-web-data/blob/main/news/20260324/SilverTokens.md)
- [Documentation content tree](https://github.com/HashkeyHSK/documentation/tree/main/contents/docs)
- [HSK data-report method](https://github.com/HashkeyHSK/hsk-data-report/blob/main/tools/hsk_gas_report.md)
- [Whale staking contract](https://github.com/HashkeyHSK/whale-staking/blob/main/contracts/implementation/HSKStaking.sol)
- [Whale staking Hardhat configuration](https://github.com/HashkeyHSK/whale-staking/blob/main/hardhat.config.ts)
- [Hodlium contract configuration](https://github.com/HashkeyHSK/hashkey-hodlium/blob/main/config/contracts.ts)
- [AgentKit HSK network mapping](https://github.com/HashkeyHSK/agentkit/blob/main/typescript/agentkit/src/network/network.ts)
- [AgentKit WHSK provider](https://github.com/HashkeyHSK/agentkit/tree/main/typescript/agentkit/src/action-providers/whsk)
- [WOW contracts](https://github.com/HashkeyHSK/Wow-contract/tree/main/src)
- [Grant discussion form](https://github.com/HashkeyHSK/developers/blob/main/.github/DISCUSSION_TEMPLATE/session-1.yml)

## Refresh Commands

The snapshot can be refreshed with the GitHub CLI:

```bash
gh api orgs/HashkeyHSK \
  --jq '{login,name,description,location,public_repos,followers,created_at,updated_at}'

gh repo list HashkeyHSK --limit 100 \
  --json name,description,url,primaryLanguage,licenseInfo,isArchived,isFork,\
stargazerCount,forkCount,createdAt,updatedAt,pushedAt,diskUsage,defaultBranchRef

gh api --paginate 'orgs/HashkeyHSK/repos?per_page=100&type=public&sort=updated'
```

For a new contents inspection, clone into a disposable directory rather than this context
folder:

```bash
research_dir="$(mktemp -d /tmp/hsk-org-research.XXXXXX)"

for repo in $(gh repo list HashkeyHSK --limit 100 --json name --jq '.[].name'); do
  gh repo clone "HashkeyHSK/$repo" "$research_dir/$repo" -- --depth 1
done
```

Then inspect tracked files and latest commits:

```bash
for repo_dir in "$research_dir"/*; do
  git -C "$repo_dir" log -1 --date=iso-strict \
    --format='commit=%H%ndate=%aI%nsubject=%s'
  git -C "$repo_dir" ls-files
done
```

## Snapshot Limitations

- GitHub metadata and repository contents can change after the research date.
- Default branches do not reveal private repositories or unmerged work.
- A public repository may differ from deployed production code.
- GitHub’s detected license field can be incomplete, but the absence of a tracked license file
  was also checked in the cloned default branches.
- Commit activity alone does not prove whether a product is supported or operational.

