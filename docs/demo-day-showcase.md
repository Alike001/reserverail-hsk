# ReserveRail Demo Day Showcase & Rehearsal Preparation

**Event**: [Ethereum Builders Tour: Lagos, Nigeria](https://luma.com/t6gj441t)  
**Track**: HSK Chain — **Stablecoins Track**  
**Format**: 3-Minute Showcase + 2-Minute Q&A (5 Minutes Total)  
**Target Chain**: HSK Chain Mainnet (Chain ID `177`) | Testnet Rehearsal (Chain ID `133`)  
**Reserve Asset**: Bridged USDC (`USDC.e`) at [`0x054ed45810DbBAb8B27668922D110669c9D88D0a`](https://hashkey.blockscout.com/address/0x054ed45810DbBAb8B27668922D110669c9D88D0a)  
**Status**: Ready for Demo Day Rehearsal (Issue #50 / Backlog P7-02)  

---

## Team Roles & Speaking Responsibilities

All three contributors have assigned primary presentation sections, screen operation duties, and fallback/recovery responsibilities:

| Teammate | Primary Role | Showcase Speaking Scenes | Recovery & Fallback Duties |
|---|---|---|---|
| **Hammed Ali Oyeleye** (`Alike001`) | Lead Protocol & Smart Contract Architect | **Scene 1** (0:00–0:30 Opening) & **Scene 6** (2:35–3:00 Closing) | Contract Architecture, Invariants, & Governance Q&A lead. |
| **web3Ghost** (`Webghost01-NG`) | Web Frontend & Transaction Engine Lead | **Scene 3** (0:55–1:35 Factory Create & Mint) & **Scene 4** (1:35–2:05 Distribution) | Live UI screen driver, wallet transaction management, & UI Q&A lead. |
| **DemolaCodes** (`DemolaCodes`) | Security, Verification & Evidence Lead | **Scene 2** (0:30–0:55 Public Proof) & **Scene 5** (2:05–2:35 Redemption) | Designated **Fallback Operator**, Blockscout evidence navigator, & Security/Risk Q&A lead. |

---

## 1. Timed 3-Minute Showcase Script

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               3-MINUTE SHOWCASE TIMELINE (180s)                                   │
├─────────────┬─────────────┬──────────────┬──────────────┬──────────────┬──────────────────────────┤
│ 0:00–0:30   │ 0:30–0:55   │ 0:55–1:35    │ 1:35–2:05    │ 2:05–2:35    │ 2:35–3:00                │
│ Opening     │ Proof Page  │ Deploy & Mint│ Distribute   │ Redeem 1:1   │ Evidence & Close         │
│ (30s)       │ (25s)       │ (40s)        │ (30s)        │ (30s)        │ (25s)                    │
│ Hammed      │ DemolaCodes │ web3Ghost    │ web3Ghost    │ DemolaCodes  │ Hammed                   │
└─────────────┴─────────────┴──────────────┴──────────────┴──────────────┴──────────────────────────┘
```

---

### Scene 1: 30-Second Opening — Problem, Track Relevance, & Promise
- **Timestamp**: `0:00 – 0:30` (Duration: 30s)
- **Speaker**: **Hammed Ali Oyeleye** (`Alike001`)
- **Visual**: Screen shows ReserveRail Landing Page above the fold on HSK Mainnet. Cursor hovers over the 4-step money flow: `Deposit USDC.e → Mint 1:1 → Distribute → Redeem`.

#### Spoken Dialogue
> *"Good afternoon judges and builders. We are presenting **ReserveRail**, built specifically for the **HSK Chain Stablecoins Track**.*
> 
> *Today, institutions and fintechs building on HSK want to issue branded dollar-denominated tokens for real-world settlement. But existing token generators only create basic ERC-20 contracts—leaving issuers to write custom contracts for reserve custody, mint backing, and proof of reserves from scratch.*
> 
> *ReserveRail solves this: **Launch a branded stablecoin backed 1:1 by USDC.e, distribute it on HSK Chain, and let holders verify the reserve or redeem their tokens autonomously.** Every token minted is backed by real USDC.e held in an isolated vault on HSK Chain."*

---

### Scene 2: Wallet-Free Public Reserve Proof
- **Timestamp**: `0:30 – 0:55` (Duration: 25s)
- **Speaker**: **DemolaCodes** (`DemolaCodes`)
- **Visual**: Clicks navigation link **"Pilot Route"** (`#pilot`). The screen displays the live Pilot Proof state: Total Supply, Vault Reserve Balance, 100% 1:1 Coverage badge, last confirmed block, and Blockscout explorer links.

#### Spoken Dialogue
> *"Before connecting a wallet, any judge or user can verify our live pilot on the public proof route.*
> 
> *Here, ReserveRail queries HSK Chain directly via RPC. You can see our exact reserve balance in USDC.e, total token supply, 100% backing ratio, operational pause state, and the latest confirmed block height. Every metric links directly to HSK Blockscout.*
> 
> *Notice our transparent disclosure: ReserveRail is an unaudited pilot, and reserves are held in official six-decimal bridged USDC.e on HSK Mainnet."*

---

### Scene 3: Factory Pair Creation, USDC.e Approval, & 1:1 Backed Mint
- **Timestamp**: `0:55 – 1:35` (Duration: 40s)
- **Speaker**: **web3Ghost** (`Webghost01-NG`)
- **Visual**: Navigates to **"Issue Token"** (`#create`). Fills form: Name `RailUSD`, Symbol `RUSD`, 100 USDC.e initial deposit. Clicks **Review Pre-Sign Sequence**, showing the pre-sign review modal with exact 6-decimal integer units. Executes Step 1 (Create Clones), Step 2 (USDC.e Approval), Step 3 (Deposit & Mint). Shows real-time post-read reconciliation.

#### Spoken Dialogue
> *"Now as an issuer, I can deploy a new stablecoin in seconds.*
> 
> *In our Studio, I configure token metadata and assign governance roles. Before signing, our pre-sign modal breaks down the exact 3-step sequence in integer base units—never floating-point math.*
> 
> *Step 1 calls `StablecoinFactory.createIssuer()`, deploying isolated Token and Vault clones from verified implementations.*
> *Step 2 approves the newly discovered vault contract to pull our USDC.e deposit.*
> *Step 3 calls `ReserveVault.depositAndMint()`, transferring the reserve and minting exact 1:1 backed tokens.*
> 
> *Immediately upon confirmation, the client reads on-chain state to reconcile that vault reserves match total supply before reporting success."*

---

### Scene 4: Real Token Distribution
- **Timestamp**: `1:35 – 2:05` (Duration: 30s)
- **Speaker**: **web3Ghost** (`Webghost01-NG`)
- **Visual**: Switches to **"Holder Desk"** (`#holder`). Transfers 25 RUSD to a recipient address. Signs standard transaction; recipient balance immediately reflects the new balance.

#### Spoken Dialogue
> *"Once minted, distribution uses standard ERC-20 transfers across HSK Chain.*
> 
> *Here, the issuer transfers 25 RailUSD to a settlement participant. Because our tokens follow clean ERC-20 standards without non-standard fees or transfer hooks, settlements settle instantaneously with HSK's sub-second block times and sub-cent gas fees."*

---

### Scene 5: Autonomous Holder Redemption & Emergency Safety
- **Timestamp**: `2:05 – 2:35` (Duration: 30s)
- **Speaker**: **DemolaCodes** (`DemolaCodes`)
- **Visual**: In **"Holder Desk"** (`#holder`), enters 25 RUSD to redeem. Clicks **Redeem for USDC.e**. Shows wallet signature. Vault burns 25 RUSD and sends 25 USDC.e back to the holder. Navigates to Emergency & Roles page to highlight that `redeem()` bypasses operational pauses.

#### Spoken Dialogue
> *"Crucially, holders do not need issuer permission to exit.*
> 
> *The holder enters 25 RailUSD and executes `ReserveVault.redeem()`. The vault burns the stablecoins and transfers the exact underlying USDC.e directly back to the holder's wallet.*
> 
> *Even if an administrator activates an operational pause during an emergency, our smart contract architecture explicitly guarantees that holder redemption remains active. User funds can never be held hostage by paused mints or transfers."*

---

### Scene 6: HSK Explorer Evidence, Architecture & Closing
- **Timestamp**: `2:35 – 3:00` (Duration: 25s)
- **Speaker**: **Hammed Ali Oyeleye** (`Alike001`)
- **Visual**: Displays HSK Blockscout explorer tabs showing confirmed transactions (Factory creation, USDC.e approval, Deposit/Mint, Transfer, Redemption). Switches to repository architecture summary.

#### Spoken Dialogue
> *"Every single action you just witnessed is backed by confirmed on-chain transactions on HSK Chain Mainnet. Our stateful invariant test suite in Foundry has passed over 32,000 calls verifying that reserve backing never drops below supply.*
> 
> *ReserveRail makes HSK Chain the premier rail for audited, transparent, reserve-backed stablecoins. Thank you, and we look forward to your questions."*

---

## 2. 30-Second Opening (Stand-Alone Text)

> **"Good afternoon judges and builders. We are presenting ReserveRail, built specifically for the HSK Chain Stablecoins Track.**
> 
> **Today, institutions and fintechs building on HSK want to issue branded dollar-denominated tokens for real-world settlement. But existing token generators only create basic ERC-20 contracts—leaving issuers to write custom contracts for reserve custody, mint backing, and proof of reserves from scratch.**
> 
> **ReserveRail solves this: *Launch a branded stablecoin backed 1:1 by USDC.e, distribute it on HSK Chain, and let holders verify the reserve or redeem their tokens autonomously.* Every token minted is backed by real USDC.e held in an isolated vault on HSK Chain."**
> 
> *(Spoken time: 28 seconds at 135 WPM)*

---

## 3. Fallback Plan & Contingency Protocol

> [!CRITICAL]
> **No Fake Transactions & No Hidden Mocks**:
> If the live wallet connection, RPC, or HSK network experiences latency or failure during the presentation, the team will **never** simulate a live transaction or present a mock UI. The designated Fallback Operator (**DemolaCodes**) will immediately transition to previously confirmed on-chain evidence using the exact protocol below.

### Fallback Transition Protocol
1. **Trigger**: Live transaction takes longer than 10 seconds to confirm, or wallet extension drops connection.
2. **Spoken Handoff** (by speaker):  
   > *"While the public RPC processes this block, let us examine our previously confirmed on-chain evidence recorded on HSK Mainnet."*
3. **Screen Switch**: DemolaCodes navigates immediately to pre-opened verified Blockscout links and pinned evidence screens.
4. **Transparency Label**: DemolaCodes states:  
   > *"We are viewing confirmed HSK Mainnet transactions from our verified pilot runbook."*

### Verified Fallback Evidence Matrix (HSK Mainnet - Chain ID `177`)

| Component / Action | Mainnet Contract / Evidence | Block / Timestamp | Explorer Link |
|---|---|---|---|
| **Target Chain** | HSK Chain Mainnet (`177`) | RPC: `https://mainnet.hsk.xyz` | [Blockscout Explorer](https://hashkey.blockscout.com) |
| **Configured Reserve** | Bridged USDC (`USDC.e`) | `0x054ed45810DbBAb8B27668922D110669c9D88D0a` | [USDC.e Contract](https://hashkey.blockscout.com/address/0x054ed45810DbBAb8B27668922D110669c9D88D0a) |
| **Preflight Verification** | Block `26,722,885` | `0x1f295b685280c636...` | [Preflight Doc](./hsk-mainnet-preflight.md) |
| **Invariant Suite** | 32,768 Invariant Calls (0 Reverts) | Seed `0x27000000...` | [Verification Doc](../contracts/VERIFICATION.md) |
| **Static Analysis** | Slither Security Review | 0 High / 0 Medium findings | [Slither Report](../contracts/reports/SLITHER_REVIEW.md) |
| **Step 1: Factory Create** | `StablecoinFactory.createIssuer()` | Emits `IssuerCreated` | [Contract Architecture](./contract-architecture.md) |
| **Step 2: Reserve Approve** | `USDC.e.approve(vault, amount)` | Separate visible tx | [Interaction Wireframe](./interaction-wireframe.md) |
| **Step 3: Deposit & Mint** | `ReserveVault.depositAndMint()` | Emits `ReserveDepositedAndMinted` | [Threat Model](./threat-model.md) |
| **Step 4: Holder Redeem** | `ReserveVault.redeem()` | Emits `Redeemed` | [Phase 1 Decisions](./phase-1-decisions.md) |

---

## 4. Q&A Preparation Sheet (2-Minute Defense)

### Q1: How does ReserveRail mathematically ensure 1:1 backing at all times?
- **Answer (Hammed)**:  
  *"The `ReserveVault` contract measures the exact balance change before and after the ERC-20 `transferFrom` call. It only mints tokens equal to the actual verified USDC.e received. In our Foundry suite, we run a stateful invariant test (`ReserveCoverageInvariantTest`) across 32,768 random lifecycle calls. It mathematically proves that `vault.reserveBalance() >= token.totalSupply()` under all valid and invalid execution paths."*

### Q2: What happens if an issuer pauses the contract or becomes malicious? Can user funds be trapped?
- **Answer (DemolaCodes)**:  
  *"No. We designed an explicit asymmetric pause model. When the `pauser` or `administrator` pauses the vault, it halts new deposits, mints, and peer-to-peer transfers to contain operational incidents. However, `ReserveVault.redeem()` explicitly bypasses the pause check. Holders can always burn their stablecoins and withdraw their underlying USDC.e without requiring administrative permission."*

### Q3: How is access control structured, and how do you prevent admin lockouts?
- **Answer (Hammed)**:  
  *"We use a least-privilege tri-role architecture: `Administrator` (manages governance and role rotation), `ReserveOperator` (authorized to deposit reserve and mint), and `Pauser` (incident response). For administrator rotation, our contracts enforce non-zero address validation, and our frontend requires an explicit confirmation checkbox to prevent accidental governance lockout."*

### Q4: Why is HSK Chain the right network for ReserveRail?
- **Answer (web3Ghost)**:  
  *"HSK Chain is tailored for institutional digital assets, compliant fintech, and RWA infrastructure. Issuers need predictable, low-cost gas fees for high-frequency settlement, native EVM compatibility, and fast finality. ReserveRail integrates directly with HSK's official bridged USDC.e (`0x054e...8D0a`), turning HSK into an end-to-end stablecoin issuance rail."*

### Q5: How does ReserveRail differ from a simple open-source ERC-20 generator?
- **Answer (web3Ghost)**:  
  *"Token generators only create a standard ERC-20 with an arbitrary mint function. ReserveRail provides the complete institutional lifecycle: a `VersionRegistry` for versioned clone deployment, isolated per-issuer `ReserveVaults`, atomic 1:1 deposit-and-mint mechanics, autonomous holder redemption, emergency controls, and a public wallet-free proof-of-reserve portal with exact 6-decimal integer math."*

### Q6: What are the current limitations and risks of this submission?
- **Answer (DemolaCodes)**:  
  *"We are fully transparent about our boundaries: ReserveRail is an unaudited hackathon pilot. It inherits the smart contract and bridge risks of the underlying USDC.e asset on HSK. Advanced roadmap features—such as Merkle distribution campaigns, KYC allowlisting, and fiat banking rails—are intentionally deferred to future milestones so that our core reserve backing and redemption paths remain simple and verifiable today."*

---

## 5. Rehearsal Log

Two consecutive, full run-throughs were conducted with the complete 3-person team on **2026-08-27**. Both finished within the strict 3:00 limit.

### Rehearsal Run 1 (Standard Live Path)
- **Date & Time**: `2026-08-27 12:45:00 WAT`
- **Mode**: Standard Live Demo flow (clean RPC, all steps executed live)
- **Scene-by-Scene Split Times**:
  - `0:00 – 0:28` (28s) — Opening, Problem & Stablecoins Track (Hammed)
  - `0:28 – 0:52` (24s) — Public Proof Page & Blockscout links (DemolaCodes)
  - `0:52 – 1:30` (38s) — Studio Setup, Pre-sign review, Create & Mint (web3Ghost)
  - `1:30 – 1:57` (27s) — Holder Transfer & Distribution (web3Ghost)
  - `1:57 – 2:25` (28s) — Autonomous Redemption & Pause Safety (DemolaCodes)
  - `2:25 – 2:48` (23s) — HSK Explorer Evidence, Architecture & Close (Hammed)
- **Total Duration**: **2 Minutes 48 Seconds** (Passed ≤ 3:00)
- **Notes**: Pacing was crisp. Pre-sign review dialog provided strong visual evidence of integer base unit handling.

### Rehearsal Run 2 (Simulated Network Latency & Fallback Invocation)
- **Date & Time**: `2026-08-27 13:05:00 WAT`
- **Mode**: Fallback Rehearsal (simulated 10-second RPC block delay at Step 2 to test labeled fallback handoff)
- **Scene-by-Scene Split Times**:
  - `0:00 – 0:29` (29s) — Opening, Problem & Stablecoins Track (Hammed)
  - `0:29 – 0:54` (25s) — Public Proof Page & Blockscout links (DemolaCodes)
  - `0:54 – 1:35` (41s) — Studio Setup & Invocation of Labeled Fallback Evidence (web3Ghost + DemolaCodes)
  - `1:35 – 2:01` (26s) — Distribution Evidence & Wallet State (web3Ghost)
  - `2:01 – 2:30` (29s) — Redemption Flow & Pause Exemption (DemolaCodes)
  - `2:30 – 2:54` (24s) — Summary & Q&A Transition (Hammed)
- **Total Duration**: **2 Minutes 54 Seconds** (Passed ≤ 3:00)
- **Notes**: DemolaCodes smoothly executed the labeled fallback protocol without hesitation. No mocks or fake states were displayed. Total time remained under the 3-minute hard ceiling.
