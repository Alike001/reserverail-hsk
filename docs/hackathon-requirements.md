# Stablecoins Track Requirement And Evidence Matrix

Status: **Evidence mapped; mainnet, hosted-product, independent-review, and participation blockers remain**

Checked: **2026-08-27**

Matrix baseline: [`4ad3a70612203b4ff6cf3a9a0afd9b5aa2435b98`](https://github.com/Alike001/reserverail-hsk/commit/4ad3a70612203b4ff6cf3a9a0afd9b5aa2435b98)

ReserveRail is entering the HSK Chain Stablecoins track at the Ethereum Builders Tour in Lagos.
This matrix separates facts published by the organizer from requirements supplied by the
participant. It never treats a plan, testnet result, or fork result as HSK mainnet deployment
evidence.

## Evidence status and source strength

- **Verified:** the linked artifact exists and directly supports the row at the pinned commit.
- **Evidence ready:** concrete implementation or test evidence exists for a judge to assess; this
  does not predetermine a subjective judging result.
- **Partial - blocked:** some direct evidence exists, but an explicitly required artifact is
  missing and linked to an open blocking issue.
- **Pending - scheduled:** the required human or external action has an open scheduled issue; no
  completion is claimed.
- **Organizer-published:** the event host published the fact on the official event page.
- **Participant-supplied:** the participant supplied the requirement in
  [issue #52](https://github.com/Alike001/reserverail-hsk/issues/52); the event page reviewed below
  does not independently publish it.
- **Repository product gate:** an internal truthfulness or judge-experience gate recorded in
  issue #52, not an organizer rule.

## Organizer-published event facts

The single primary source for these rows is the official
[Ethereum Builders Tour: Lagos event page](https://luma.com/t6gj441t).

| Organizer fact                                                         | Source strength     | Direct evidence                                                                                                                     | Status   |
| ---------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- |
| HSK Chain sponsors the event                                           | Organizer-published | [Event description](https://luma.com/t6gj441t)                                                                                      | Verified |
| HSK Chain offers a Stablecoins track                                   | Organizer-published | [HSK Chain Tracks](https://luma.com/t6gj441t)                                                                                       | Verified |
| Submission ends August 27 at 14:00 Lagos time                          | Organizer-published | [Day 2 agenda](https://luma.com/t6gj441t)                                                                                           | Verified |
| Demo format is five minutes: three-minute showcase plus two-minute Q&A | Organizer-published | [Day 2 agenda](https://luma.com/t6gj441t)                                                                                           | Verified |
| Displayed HSK prizes are 500 USDT, 300 USDT, and 200 `UDT`             | Organizer-published | [Hackathon prize section](https://luma.com/t6gj441t); the third-place unit is reproduced as published and is not silently corrected | Verified |

The event page also lists AI Agents, AI x Web3, DeFi, Payments, RWA, and Blockchain
Infrastructure. ReserveRail is mapped only to Stablecoins.

## Evidence conflict on the current baseline

The checked [mainnet manifest](https://github.com/Alike001/reserverail-hsk/blob/4ad3a70612203b4ff6cf3a9a0afd9b5aa2435b98/config/deployments/hsk-mainnet.json)
is `undeployed`, with no ReserveRail mainnet address or receipt. However, the merged
[demo document](https://github.com/Alike001/reserverail-hsk/blob/4ad3a70612203b4ff6cf3a9a0afd9b5aa2435b98/docs/demo-day-showcase.md#L193-L221)
records a "Standard Live Demo" with all steps executed live, and its
[script says](https://github.com/Alike001/reserverail-hsk/blob/4ad3a70612203b4ff6cf3a9a0afd9b5aa2435b98/docs/demo-day-showcase.md#L115-L120)
every shown action has a confirmed HSK mainnet transaction. Those statements are unsupported by the
manifest and are not accepted as evidence.

[Issue #50](https://github.com/Alike001/reserverail-hsk/issues/50) remains open to reconcile the
script and rehearsal record. Mainnet execution statements also remain blocked by
[#46](https://github.com/Alike001/reserverail-hsk/issues/46) and
[#47](https://github.com/Alike001/reserverail-hsk/issues/47). Until real receipts exist, the demo
must use the explicit undeployed path and label any fork or simulation evidence accurately.

## Participant-supplied requirements and judging criteria

| Requirement or criterion                            | Source strength                        | Direct ReserveRail evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Status / missing evidence                                                                                                                                                                                                                                                                              |
| --------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Built on HSK Chain                                  | Participant-supplied                   | Pinned [chain 177 configuration](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/config/hsk-networks.json), [write-chain guard](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/config/hsk.ts#L57-L65), and [real USDC.e fork test](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/fork/HskUsdcE.t.sol)                                                                                                     | Verified for implementation; this is not a deployment claim                                                                                                                                                                                                                                            |
| Deployed on HSK Chain mainnet                       | Participant-supplied                   | The checked [mainnet manifest](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/config/deployments/hsk-mainnet.json) explicitly says `undeployed`                                                                                                                                                                                                                                                                                                                                                                        | Partial - blocked by [#46 platform deployment](https://github.com/Alike001/reserverail-hsk/issues/46), [#47 pilot lifecycle](https://github.com/Alike001/reserverail-hsk/issues/47), and [#48 final manifest](https://github.com/Alike001/reserverail-hsk/issues/48); no address or receipt exists yet |
| Integrates HSK Chain technology                     | Participant-supplied                   | [Pinned mainnet RPC/USDC.e reads](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/docs/hsk-mainnet-preflight.md) and [fork proof at block 26,722,885](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/docs/hsk-usdce-fork-proof.md)                                                                                                                                                                                                                                           | Partial - real read integration is verified; live product reads and mainnet writes remain blocked by [#40](https://github.com/Alike001/reserverail-hsk/issues/40) and [#47](https://github.com/Alike001/reserverail-hsk/issues/47)                                                                     |
| Includes a GitHub repository                        | Participant-supplied                   | [Public repository](https://github.com/Alike001/reserverail-hsk), pinned [evidence commit](https://github.com/Alike001/reserverail-hsk/commit/37080dcd5660350bf5b64c1359ac4ff0091c3182), and [PR #72 with required CI](https://github.com/Alike001/reserverail-hsk/pull/72)                                                                                                                                                                                                                                                                                       | Verified                                                                                                                                                                                                                                                                                               |
| Provides a working product                          | Participant-supplied                   | Tested [issuer workflow](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/__tests__/IssuerCreateView.test.tsx), [holder transfer/redemption workflow](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/__tests__/HolderDesk.test.tsx), and [desktop product screen](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/docs/evidence/p5-01/pilot-desktop.png)                            | Partial - implemented and locally reproducible, but hosted access and the real mainnet journey remain blocked by [#53](https://github.com/Alike001/reserverail-hsk/issues/53) and [#47](https://github.com/Alike001/reserverail-hsk/issues/47)                                                         |
| Participates in project review or Demo Day          | Participant-supplied                   | Official [demo schedule](https://luma.com/t6gj441t) and the team's scheduled [submission/participation action #54](https://github.com/Alike001/reserverail-hsk/issues/54)                                                                                                                                                                                                                                                                                                                                                                                         | Pending - scheduled; attendance or submission is not yet claimed                                                                                                                                                                                                                                       |
| Feasibility and real-world implementation potential | Participant-supplied judging criterion | Deterministic [42-test/invariant/coverage/gas evidence](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/VERIFICATION.md) and [reviewed static-analysis report](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/reports/SLITHER_REVIEW.md)                                                                                                                                                                                                                 | Evidence ready for judging; final low-value mainnet feasibility remains blocked by [#47](https://github.com/Alike001/reserverail-hsk/issues/47) and independent verification by [#49](https://github.com/Alike001/reserverail-hsk/issues/49)                                                           |
| Addresses a meaningful user or market problem       | Participant-supplied judging criterion | The implemented [issuer creation/backing path](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/wallet/issuer.ts), [holder path](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/wallet/holder.ts), and [stablecoin issuer research](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/context/stablecoin-issuer-platform-research.md) connect issuer duplication and opaque backing to tested product flows | Evidence ready for judging; no claim is made that judges must accept the problem framing                                                                                                                                                                                                               |
| Demonstrates technical and product innovation       | Participant-supplied judging criterion | [Reusable versioned factory](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/src/StablecoinFactory.sol#L45-L84), [independent-pair factory test](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/test/StablecoinFactory.t.sol#L45-L101), and [reserve-isolation invariant](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/test/ReserveCoverageInvariant.t.sol#L94-L121)                              | Evidence ready for judging                                                                                                                                                                                                                                                                             |

## Participant-supplied product gates

| Product gate                                                       | Source strength         | Direct evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Status / missing evidence                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Five-second clarity                                                | Repository product gate | The [desktop screen](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/docs/evidence/p5-01/pilot-desktop.png) leads with "Launch a USDC.e-backed stablecoin people can verify and redeem," and the exact promise is protected by the [landing test](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/__tests__/LandingAndPilot.test.tsx#L9-L26)                                                                                                              | Verified in the shipped screen and test                                                                                                                                                                                                                                                                |
| Thirty-second inspection with no registration                      | Repository product gate | The [landing action](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/LandingView.tsx#L29-L66) requires no registration and links the public repository; the [README quick start](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/README.md#L13-L21) is reproducible                                                                                                                                                                                       | Partial - no hosted URL or live proof exists; blocked by [#40](https://github.com/Alike001/reserverail-hsk/issues/40) and [#53](https://github.com/Alike001/reserverail-hsk/issues/53)                                                                                                                 |
| No mock, false, or placeholder implementation is presented as real | Repository product gate | The [manifest parser](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/config/hsk.ts#L69-L97), explicit [undeployed screen](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/PilotUndeployedState.tsx#L18-L45), and [anti-fabrication test](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/__tests__/LandingAndPilot.test.tsx#L45-L66) fail closed while evidence is absent | Partial - the UI passes, but the current demo document has unsupported live-mainnet statements blocked by [#50](https://github.com/Alike001/reserverail-hsk/issues/50), [#46](https://github.com/Alike001/reserverail-hsk/issues/46), and [#47](https://github.com/Alike001/reserverail-hsk/issues/47) |
| Reusable product, not a one-off scripted demo                      | Repository product gate | The [factory creates discoverable issuer pairs](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/src/StablecoinFactory.sol#L45-L84), while separate tested [issuer](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/IssuerCreateView.tsx) and [holder](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/HolderDesk.tsx) surfaces execute reusable wallet transactions           | Verified as implemented product code; mainnet use remains separately blocked                                                                                                                                                                                                                           |

## Stablecoins-track differentiation

Every row below has **commit-pinned repository evidence** source strength. A local test proves the
implemented behavior at that commit, but does not prove mainnet execution or independent audit.

| Differentiator    | Direct evidence                                                                                                                                                                                                                                                                                                                                                                                               | Status / limit                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reserve isolation | [Two independent pairs are created and checked](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/test/StablecoinFactory.t.sol#L45-L101), and the [stateful invariant](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/test/ReserveCoverageInvariant.t.sol#L94-L121) checks pair and aggregate coverage | Verified locally across 256 runs and 32,768 calls; not an audit                                                                                                                                        |
| Redemption        | The vault's [atomic burn-and-return path](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/src/ReserveVault.sol#L129-L150) is covered by the [deposit/redemption reconciliation test](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/test/ReserveVault.t.sol#L38-L75) and holder UI tests             | Implemented and tested; a real holder receipt remains blocked by [#47](https://github.com/Alike001/reserverail-hsk/issues/47)                                                                          |
| Public proof      | The product currently renders an explicit [unavailable/undeployed proof state](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/apps/web/src/components/PilotUndeployedState.tsx) rather than fixtures                                                                                                                                                               | Partial - live reserve/supply reads and explorer receipts are blocked by [#40](https://github.com/Alike001/reserverail-hsk/issues/40) and [#47](https://github.com/Alike001/reserverail-hsk/issues/47) |
| Reusable factory  | The [versioned factory implementation](https://github.com/Alike001/reserverail-hsk/blob/37080dcd5660350bf5b64c1359ac4ff0091c3182/contracts/src/StablecoinFactory.sol) creates isolated token/vault clones and permanent discovery records                                                                                                                                                                     | Verified in source and factory tests                                                                                                                                                                   |

Together these make the concrete differentiation: an issuer can create a reusable isolated
token/vault pair, mint only from measured reserve, distribute standard tokens, let holders redeem,
and expose evidence without presenting unavailable state as real.

## Blocking evidence register

Every missing required artifact above has an open issue. Closing an issue without attaching its
required evidence does not upgrade a matrix row.

The source strength for each row is an **open first-party GitHub issue**. These issues are direct
evidence that the gap is tracked, not evidence that the missing artifact exists.

| Missing evidence                                                | Blocking issue                                               | Required artifact before status changes                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Live wallet-free reserve, supply, policy, and explorer proof    | [#40](https://github.com/Alike001/reserverail-hsk/issues/40) | Public URL compared with direct RPC reads                                                                                                 |
| Verified HSK mainnet platform addresses and deployment receipts | [#46](https://github.com/Alike001/reserverail-hsk/issues/46) | Tagged commit, addresses, receipts, bytecode, source verification, and role reads                                                         |
| Real low-value mint, transfer, redemption, and reconciliation   | [#47](https://github.com/Alike001/reserverail-hsk/issues/47) | Mainnet receipts, before/after reads, pilot addresses, and public product URL                                                             |
| Final manifest, provenance, operator runbook, and limitations   | [#48](https://github.com/Alike001/reserverail-hsk/issues/48) | Independently replayed clean-clone verification                                                                                           |
| Non-implementer specification/implementation review             | [#49](https://github.com/Alike001/reserverail-hsk/issues/49) | Reviewer-authored pass/fail matrix and remediation links                                                                                  |
| Truthful timed showcase and recovery roles                      | [#50](https://github.com/Alike001/reserverail-hsk/issues/50) | Remove or correct unsupported live-mainnet statements, then attach two timed rehearsals, real-receipt fallback, Q&A sheet, and team roles |
| Hosted product and final clean-clone/judge journey              | [#53](https://github.com/Alike001/reserverail-hsk/issues/53) | Hosted URL, clean-clone output, screenshots, link checks, and team go/no-go                                                               |
| Submission confirmation and review/Demo Day participation       | [#54](https://github.com/Alike001/reserverail-hsk/issues/54) | Owner-approved submitted URL/confirmation and attendance record                                                                           |

## Non-author verification handoff

A teammate who did not author this matrix must perform these checks before approval:

1. Open every source, implementation, test, screen, issue, address, and commit link in the tables.
2. Check out commit `37080dcd5660350bf5b64c1359ac4ff0091c3182`, run
   `pnpm install --frozen-lockfile`, then run `pnpm verify`.
3. Run the pinned fork proof:

   ```bash
   FOUNDRY_PROFILE=fork forge test --root contracts \
     --fork-url https://mainnet.hsk.xyz \
     --fork-block-number 26722885 -vv
   ```

4. Independently read chain ID `177`, block `26,722,885`, and USDC.e
   `0x054ed45810DbBAb8B27668922D110669c9D88D0a` using the commands in the
   [mainnet preflight](./hsk-mainnet-preflight.md).
5. Confirm the deployment manifest is still `undeployed`, compare it with the conflicting demo
   statements above, and reject any submission claim of a ReserveRail mainnet address, receipt,
   live coverage value, hosted URL, or completed attendance until its blocking issue contains that
   artifact.
6. Record the result in the pull-request review. Approval means the reviewer opened the links and
   reproduced the critical reads; it does not mean the blocked rows passed.

## Technology and demo decisions

No HSP requirement or mandatory sponsor SDK appears on the organizer page reviewed above. HSK
mainnet contracts, RPC reads, gas transactions, and Blockscout evidence are therefore the planned
submission integration. HSP remains optional and must not be claimed unless a supported integration
is built and evidenced.

The official presentation window is used as follows:

```text
0:00-0:20  Problem, Stablecoins track, and ReserveRail promise
0:20-0:45  Public live reserve proof without a wallet
0:45-1:30  Reserve deposit and 1:1 mint
1:30-2:00  Real token distribution
2:00-2:35  Holder redemption and updated coverage
2:35-3:00  HSK explorer evidence, reusable factory, limits, and close
```

Never replace a failed live transaction with a prerecorded result while describing it as live. If
network access fails, only previously confirmed receipts may be shown, and they must be labeled as
previous evidence rather than a live action.
