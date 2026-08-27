# ReserveRail Interaction Wireframe

Status: **Low-fidelity Phase 1 proposal**
Date: **2026-08-27**

This wireframe defines interaction order and truth states, not final visual design. Bracketed
values are design fixtures until replaced by confirmed HSK data.

## 1. Landing — Five-Second Gate

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ReserveRail                                      Built on HSK Chain │
│                                                                     │
│ Launch a branded, USDC-backed stablecoin on HSK Chain.             │
│ Distribute it, prove its backing, and let holders redeem.           │
│                                                                     │
│ Deposit USDC.e  →  Mint  →  Distribute  →  Redeem                  │
│                                                                     │
│ [ Inspect live pilot ]        [ Launch a stablecoin ]               │
│ No wallet needed to inspect                                        │
│                                                                     │
│ Unaudited low-value pilot · Real HSK mainnet evidence               │
└─────────────────────────────────────────────────────────────────────┘
```

Primary action opens the proof page. Wallet connection occurs only after the user chooses an
issuer or holder write action.

## 2. Public Proof — Thirty-Second Gate

```text
┌─────────────────────────────────────────────────────────────────────┐
│ RailUSD Pilot (rUSD)                         [Unaudited pilot]       │
│ HSK Chain Mainnet · 177          Last confirmed block [12,345,678] │
│                                                                     │
│ Vault reserve       Total supply       Coverage       State         │
│ [25.00 USDC.e]      [25.00 rUSD]       [100.00%]      [Active]      │
│                                                                     │
│ Reserve asset [USDC.e]     Transfer mode [Open]                    │
│ Token [0x12A4…91F0 ↗]      Vault [0x77C2…0B18 ↗]                  │
│                                                                     │
│ Proof transactions                                                 │
│ ✓ Deposit + mint  [25.00]  [0xA91B…8CE4 ↗]                       │
│ ✓ Distribution    [5.00]   [0xB772…10AD ↗]                       │
│ ✓ Redemption      [1.00]   [0xD201…77E9 ↗]                       │
└─────────────────────────────────────────────────────────────────────┘
```

If HSK reads fail, amounts are replaced with `Live data unavailable`; the last known values
are never displayed as current coverage.

## 3. Issuer Dashboard

```text
┌─────────────────────────────────────────────────────────────────────┐
│ RailUSD · Issuer dashboard               Wallet [0x8F31…42AA]      │
│                                                                     │
│ Reserve [25.00 USDC.e]  Supply [25.00 rUSD]  Coverage [100.00%]   │
│                                                                     │
│ [ Back & mint ]  [ Distribute ]  [ Access & emergency ]            │
│                                                                     │
│ Recent confirmed activity                                          │
│ Deposit + mint · 25.00 · block […]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

Actions the connected wallet cannot perform remain visible but disabled with the required
role explained.

## 4. Back And Mint

```text
Amount to deposit       [ 25.00 ] USDC.e
Stablecoin recipient    [ 0x3D20…F8C1 ]

You deposit             25.00 USDC.e
Recipient receives      25.00 rUSD
Coverage after          100.00%

[1 Approve USDC.e] → [2 Deposit & mint] → [3 Confirmed receipt]
```

The app never collapses token approval and deposit into a fake single success. Each transaction
has its own rejected, pending, reverted, and confirmed state.

## 5. Distribute

```text
Recipient               [ 0x6A10…11C0 ]
Amount                   [ 5.00 ] rUSD
Available                25.00 rUSD
Operational state       Active

[ Review transfer ] → wallet signature → pending → confirmed receipt
```

The submission MVP uses a real ERC-20 transfer. A bounded batch tool appears only if it is
implemented, tested, and connected to the live product.

## 6. Redeem

```text
Your balance             5.00 rUSD
Redeem amount            [ 1.00 ] rUSD
You receive              1.00 USDC.e
Vault available          25.00 USDC.e

After confirmation
Supply                   24.00 rUSD
Vault reserve            24.00 USDC.e
Coverage                 100.00%

[ Review redemption ] → wallet signature → pending → confirmed receipt
```

General operational pause does not disable redemption. If the redemption mechanism itself is
placed in a separate emergency stop, the reason is explicit and no success state is shown.

## Review Checklist

- [ ] A first-time viewer can describe ReserveRail after five seconds on screen 1.
- [ ] Screens 1–2 are usable without a wallet or registration.
- [ ] Screen 2 exposes chain, freshness, reserve, supply, coverage, and explorer evidence.
- [ ] Every write action distinguishes rejection, pending, revert, and confirmation.
- [ ] No fixture address, amount, or transaction is presented as real evidence.
- [ ] The full deposit → mint → distribute → redeem story fits a three-minute showcase.
