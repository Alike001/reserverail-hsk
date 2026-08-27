# Product Surface Map: ReserveRail

Status: **Proposed for team review**
Date: **2026-08-27**

This map turns the accepted stories into concrete product surfaces. Sample values below are
design fixtures only and must never be presented as deployed or on-chain evidence.

## Entry Points And Navigation Flow

```text
Public visitor
  Landing
    └─ Inspect live pilot → Public proof page → Explorer evidence

Issuer
  Landing → Connect wallet → Launch stablecoin → Review → Confirm creation
    └─ Issuer dashboard
         ├─ Back & mint
         ├─ Distribute
         ├─ Access & emergency controls
         └─ Public proof page

Holder
  Shared token/proof link → Holder actions
    ├─ Receive/transfer
    └─ Redeem → Confirmation → Public proof page
```

The shortest judge path is `Landing → Inspect live pilot → Explorer evidence`. It never
requires registration or a wallet. The three-minute product path is `Back & mint → Transfer →
Redeem → refreshed proof`.

## Screen Inventory By Role

### Public reviewer

1. **Landing** — promise, four-step money flow, live-pilot action, build status.
2. **Public proof page** — reserve, supply, coverage, policy, pause state, addresses, evidence.
3. **Evidence drawer/list** — named real transactions with status and Blockscout links.

### Issuer operator

4. **Launch stablecoin** — identity, roles, reserve/network facts, review and confirmation.
5. **Issuer dashboard** — balances, backing, privileged actions, recent activity.
6. **Back and mint** — amount, recipient, USDC.e approval, deposit/mint confirmation.
7. **Distribute** — recipient, amount, eligibility/preflight, transfer confirmation.
8. **Access and emergency controls** — role holders, pause/unpause, audit history.

### Holder

9. **Holder actions** — wallet balance, transfer capability, redeem action.
10. **Redeem** — amount, expected USDC.e, reserve availability, review and receipt.

Wallet connection, wrong-network prompts, transaction review, and receipt details are overlays,
not separate destinations.

## Per-Screen Required States

### Demo-critical moments

#### DC-1: Landing and live-pilot entry

- **Loading:** core copy and pilot action remain stable while pilot availability is checked.
- **Available:** `Inspect live pilot` is the primary action.
- **Unavailable:** product promise remains visible; pilot action says live data is unavailable.
- **No wallet:** identical public journey; wallet is not requested.

#### DC-2: Public proof

- **Loading:** skeleton values labelled `Reading HSK Chain`; never show sample numbers.
- **Confirmed:** chain 177, reserve, supply, coverage, block number, and addresses are visible.
- **Stale:** retain last confirmed values only with block/time and a prominent stale warning.
- **RPC failure:** financial values become unavailable; no cached 100% badge.
- **Under-covered:** red critical state with mint/distribution actions unavailable.
- **Paused:** visible pause banner explaining which operations remain possible.

#### DC-3: Redeem and reconcile

- **Ready:** burn amount, expected USDC.e, and post-redemption estimate are visible.
- **Wallet rejected:** no receipt and no balance change shown.
- **Pending:** transaction hash is labelled pending, not successful.
- **Reverted:** old values remain and the reason is explained.
- **Confirmed:** receipt, burned amount, received reserve, and refreshed proof reconcile.

### Full state inventory

| Screen | Loading | Empty | Error | Success | Disabled/product-specific |
|---|---|---|---|---|---|
| Landing | Pilot availability check | No registered pilot yet | RPC unavailable | Live pilot ready | No-wallet read-only mode |
| Public proof | Contract reads | No activity yet | RPC/chain/contract read failure | Confirmed coverage | Stale, paused, under-covered, unaudited |
| Evidence | Receipt lookup | No transactions yet | Explorer unavailable | Confirmed receipt list | Pending/reverted transaction |
| Launch | Wallet/network check | New form | Invalid/duplicate config or revert | Registered token and vault | Wrong chain, insufficient HSK, unsupported reserve |
| Dashboard | Balances/roles | New issuer has zero supply | Partial read failure | Current confirmed state | Wrong wallet role, paused, under-covered |
| Back & mint | Allowance/balance read | No previous deposits | Insufficient USDC.e/allowance or revert | Deposit and mint confirmed | Approval required, wrong chain, paused |
| Distribute | Balance/preflight read | No transfers yet | Invalid recipient/balance or revert | Transfer confirmed | Self/zero address, paused, insufficient supply |
| Access & emergency | Role/event reads | No role history | Unauthorized/revert | Role or pause event confirmed | Last-admin warning, already paused/unpaused |
| Holder actions | Balance/policy read | Zero token balance | RPC or policy failure | Transfer confirmed | Paused, insufficient balance |
| Redeem | Balance/reserve read | Zero redeemable balance | Reserve/USDC.e/revert failure | Burn and payout confirmed | Amount too high, redemption emergency stop |

## On-Screen Data Shapes And Sample Data

All values in this section are labelled **design fixture**.

### Stablecoin summary

- Name: `RailUSD Pilot`
- Symbol: `rUSD`
- Issuer label: `ReserveRail pilot issuer`
- Token address: `0x12A4…91F0`
- Vault address: `0x77C2…0B18`
- Factory version: `v1`
- Network: `HSK Chain Mainnet · 177`
- Status: `Unaudited low-value pilot`

### Reserve proof

- Total supply: `25.00 rUSD`
- Vault reserve: `25.00 USDC.e`
- Coverage: `100.00%`
- Reserve asset: `USDC.e · 6 decimals`
- Operational state: `Active`
- Last confirmed block: `12,345,678`
- Updated: `18 seconds ago`
- Data source: `Confirmed HSK contract reads`

Coverage is calculated from confirmed base units. Color alone must not communicate safety.

### Transaction evidence row

- Action: `Reserve deposit + mint`
- Amount: `25.00 USDC.e → 25.00 rUSD`
- Actor: `0x8F31…42AA`
- Recipient: `0x3D20…F8C1`
- Status: `Confirmed`
- Block: `12,345,670`
- Transaction: `0xA91B…8CE4`
- Time: `27 Aug 2026, 11:42 WAT`

### Launch form

- Stablecoin name and symbol
- Administrator wallet
- Reserve-operator wallet
- Pauser wallet
- Reserve asset: fixed `HSK mainnet USDC.e`
- Network: fixed `HSK Chain Mainnet · 177`
- Acknowledgements: unaudited, low-value pilot, deployment is not legal authorization

### Back and mint review

- Wallet USDC.e balance and allowance
- Deposit amount and exact minted amount
- Mint recipient
- Gas token balance (`HSK`)
- Token and vault addresses
- Approval status, deposit/mint status, transaction hash, confirmed block

### Distribute review

- Recipient address
- Amount and available rUSD balance
- Current pause/transfer state
- Estimated transaction count and HSK gas requirement
- Transaction hash, confirmed block, resulting balances

### Redeem review

- Holder rUSD balance
- Burn amount
- Expected USDC.e received
- Vault reserve before and estimated after
- Supply before and estimated after
- Recipient, transaction hash, confirmed block, resulting balances

## Generated Artifacts

- Creation receipt: factory, token, vault, version, roles, transaction, block.
- Deposit/mint receipt: reserve in, supply out, recipient, transaction, block.
- Distribution receipt: sender, recipient, amount, transaction, block.
- Redemption receipt: burned amount, USDC.e paid, recipient, transaction, block.
- Mainnet manifest: chain ID, verified addresses, deployment commit, timestamps.

Every artifact distinguishes `Pending`, `Confirmed`, and `Reverted`. Only confirmed artifacts
may appear in submission evidence.

## Copy And Vocabulary Rules

- Say `USDC.e-backed`, not `dollar-backed` without qualification.
- Say `technical policy controls`, not `compliant` or `regulator approved`.
- Say `create` or `launch`, not `print money`.
- Say `reserve deposit and mint`, not only `mint`.
- Say `confirmed on HSK Chain`, not `successful` before a receipt.
- Always write `HSK Chain`; do not imply ReserveRail is an official HashKey product.
- Explain `coverage` as `vault USDC.e ÷ redeemable supply` near the first use.

## Decided Vs Designer's Call

### Decided

- Public live pilot is the primary landing-page action.
- The four-step money flow appears above the fold.
- Financial state always includes source/block freshness.
- Explorer evidence is adjacent to the value it proves.
- Risk, pause, stale, and failure states cannot be hidden behind tooltips.
- The transaction lifecycle distinguishes signature, pending, confirmation, and revert.

### Designer's call

- Visual hierarchy, typography, palette, spacing, and motion.
- Whether evidence uses an inline table, drawer, or side panel on wide screens.
- Responsive arrangement of proof cards, provided the critical values remain together.

## Traceability

| Surface | Stories | Requirements |
|---|---|---|
| Landing | S-01 | FR-001–FR-004 |
| Public proof/evidence | S-02 | FR-060–FR-064, FR-070–FR-074 |
| Launch | S-03 | FR-010–FR-013 |
| Back & mint | S-04 | FR-020–FR-024 |
| Access/emergency | S-05, S-11 | FR-040, FR-043–FR-045 |
| Distribute | S-07, S-09 | FR-050, FR-053–FR-054 |
| Holder/redeem | S-09, S-10 | FR-030–FR-033 |

## Open Questions

- Final visual direction and brand identity.
- Exact pilot name/symbol, which must be checked before deployment.
- Whether the product can include bounded batch payout after the core lifecycle is proven.
