# Frontend Speciific Design Document

> **System**: Dispute Resolution Platform Web Frontends  
> **Framework**: React 18 / TypeScript / Vite  
> **Styling**: Vanilla CSS + Tailwind CSS (Custom Theme Tokens)  
> **State & Data Fetching**: Zustand + TanStack Query (React Query v5)  
> **Iconography**: Lucide React Icons

---

## 1. Application Applications Overview

The platform features two distinct web applications:

```
frontend/
├── cardmember-web/             # Cardholder Mobile-First Web SPA
│   ├── src/
│   │   ├── components/         # Timeline, EvidenceUploader, VerdictCard
│   │   ├── pages/              # TransactionList, DisputeForm, DisputeDetail
│   │   ├── services/           # Axios API client
│   │   └── store/              # User & active dispute state
└── merchant-portal/            # Merchant & Admin Back-Office Console
    ├── src/
    │   ├── components/         # CountdownTimer, MediatedRequestModal, EvidenceViewer
    │   ├── features/
    │   │   ├── rule-builder/   # Low-Code Visual Rule Authoring UI
    │   │   └── appeals/        # Appeal Queue & Gemini AI Reviewer Simulator
    │   ├── pages/              # DisputesDashboard, DisputeReview, Analytics, AdminRules
    │   └── services/           # Admin API client
```

---

## 2. Design System Tokens & Aesthetics

### 2.1 Color Palette & Aesthetic Guidelines
- **Theme**: Dark Slate / Indigo Modern Glassmorphism. Rich gradients, crisp typography, micro-animations, clean visual hierarchy.
- **Tokens**:
  - `bg-primary`: `#0f172a` (Slate 900)
  - `bg-surface`: `rgba(30, 41, 59, 0.7)` (Glass Slate 800 with 70% opacity + `backdrop-blur-md`)
  - `brand-primary`: `#6366f1` (Indigo 500)
  - `brand-accent`: `#8b5cf6` (Purple 500)
  - `status-success`: `#10b981` (Emerald 500) — Cardmember Win / Release
  - `status-warning`: `#f59e0b` (Amber 500) — Pending Evidence (72-hr countdown)
  - `status-danger`: `#ef4444` (Red 500) — Merchant Win / Rejected

---

## 3. Visual Rule Authoring UI Specification

Located at `/admin/rules` within `merchant-portal`:

```
+-----------------------------------------------------------------------------------+
|  DISPUTE RULE AUTHORING CONSOLE — Category: NON_DELIVERY [v1.2]                    |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ + Add New Rule Condition ]       [ Load Category Preset v ]    [ 💾 Publish ] |
|                                                                                   |
|  Rule #1: Tracking Status Delivered                                              |
|  +-----------------------------------------------------------------------------+  |
|  | IF  [ merchant.evidence.TRACKING.delivery_status ]  ( EQUALS )  [ DELIVERED ] |  |
|  | AND [ merchant.evidence.TRACKING.address_match   ]  ( >= )      [ 0.85      ] |  |
|  | THEN Outcome: ( MERCHANT_WIN ) | Weight: [ 0.50 ]                           |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  Rule #2: Missing Tracking                                                       |
|  +-----------------------------------------------------------------------------+  |
|  | IF  [ merchant.evidence.TRACKING               ]  ( NOT_EXISTS )              |  |
|  | THEN Outcome: ( CARDMEMBER_WIN ) | Weight: [ 0.60 ]                         |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  Gemini 2.5 Flash Fallback Threshold: [ 0.85 ]                                    |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  LIVE RULE DRY-RUN TESTER                                                         |
|  Mock Evidence Input (JSON):                 Dry-Run Verdict Result:              |
|  { "tracking": { "status": "DELIVERED" } }   => Outcome: MERCHANT_WIN             |
|                                                 Confidence: 0.95 (Rule #1 fired)  |
+-----------------------------------------------------------------------------------+
```

---

## 4. Appeal Queue & AI Simulator UI Specification

Located at `/admin/appeals` within `merchant-portal`:

```
+-----------------------------------------------------------------------------------+
|  APPEALS REVIEW QUEUE                                                              |
+-----------------------------------------------------------------------------------+
|  Dispute ID   | Category     | Amount  | Filed Reason       | Action              |
|  #DSP-88219   | NON_DELIVERY | $149.99 | "Never got package" | [ Review Case ]     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  CASE REVIEW MODAL (#DSP-88219)                                                   |
|  Cardmember Claim: "Package was stolen or shipped to wrong address."               |
|  Original Verdict: MERCHANT_WIN (Confidence: 0.94)                                |
|                                                                                   |
|  [ ⚡ SIMULATE GEMINI 2.5 FLASH AI REVIEW ]    OR    [ MANUAL OPERATOR OVERRIDE ]  |
|                                                                                   |
|  AI Reviewer Assessment:                                                          |
|  "Upon secondary review, tracking proof shows delivery to Zip 90210, but          |
|   cardmember registered address is Zip 90211. Address mismatch confirmed."         |
|                                                                                   |
|  Action Result: [ OVERTURN VERDICT (Release Funds to Cardmember) ]                |
+-----------------------------------------------------------------------------------+
```

---

## 5. Mediated Information Request UI Specification

Replaces unmonitored direct chat. Cardmembers and merchants interact through structured request templates:

```
+-----------------------------------------------------------------------------------+
|  MEDIATED EVIDENCE REQUEST (Merchant -> Cardmember)                               |
+-----------------------------------------------------------------------------------+
|  Select Request Template:                                                         |
|  (o) Request Photo of Received Package Condition                                  |
|  ( ) Request Clarification of Delivery Location                                   |
|  ( ) Request Communication Log with Local Carrier                                 |
|                                                                                   |
|  Additional Note (Platform Monitored):                                            |
|  "Please upload a photo showing the shipping label attached to the outer box."    |
|                                                                                   |
|  [ Send Mediated Request ]                                                        |
+-----------------------------------------------------------------------------------+
```

---

## 6. Route Maps & Pages

### 6.1 Cardmember Web App (`cardmember-web`)
- `/` — Transaction History & Select Charge to Dispute
- `/dispute/new/:transactionId` — Guided Dispute Filing Form
- `/dispute/:disputeId` — Live Dispute Status Timeline & Verdict View
- `/dispute/:disputeId/appeal` — Appeal Submission Form

### 6.2 Merchant Portal & Admin (`merchant-portal`)
- `/` — Disputes Dashboard (72-hour countdown timers, filter by category/status)
- `/dispute/:disputeId` — Evidence Upload & Mediated Request Center
- `/admin/rules` — Visual Rule Authoring UI (Low-code builder)
- `/admin/appeals` — Appeal Review Queue & Gemini 2.5 Flash AI Simulator
- `/analytics` — Dispute Analytics, Win Rates, Bias Metrics & Chargeback Trends
