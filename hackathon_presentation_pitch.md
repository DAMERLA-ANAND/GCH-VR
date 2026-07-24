# 🎤 GCH-VR — Hackathon Presentation Pitch
### *Killing the Chargeback War. One Dispute at a Time.*

---

## 🔴 1. Problem Statement

> **The financial industry's most broken process hasn't changed in 30 years.**

When a cardholder disputes a charge today, here's what actually happens:

1. The customer calls the bank
2. The bank issues a provisional credit and notifies the merchant's bank
3. The merchant's account gets **debited immediately** — before any investigation
4. The merchant gets a reason code and a **7–21 day window** to respond with evidence
5. Evidence gets emailed — sometimes **faxed**
6. Both sides argue their case to a middleman juggling thousands of cases
7. A decision arrives **weeks later**, often without explanation

**This system is broken for everyone:**

| Who | Why It's Broken |
|---|---|
| 🧑‍💼 Cardholders | Slow, opaque, no updates — often wait **2–6 weeks** for resolution |
| 🏪 Merchants | Debited instantly, no voice, lose product + money + a chargeback fee |
| 🏦 Banks / Issuers | ~**$90 processing cost per dispute** in staff time and overhead |

No shared platform. No real-time communication. No transparency. No fairness.

---

## 🟠 2. Existing Solutions & The Gap

The industry is aware of the problem, and there are some partial fixes:

| Solution | What It Does | What It Misses |
|---|---|---|
| **Visa RDR** (Rapid Dispute Resolution) | Pre-authorizes auto-refunds on small disputes | Covers only a subset of cases |
| **Ethoca / Verifi Alerts** | Notifies merchants 48–72 hrs before chargeback | Doesn't cover all categories; dispute still goes offline |
| **Bank Mobile Apps** | Track dispute status | Passive tracking only — no two-way evidence exchange |

### The Critical Gap
> **None of these solutions connect the cardholder, merchant, and bank in one unified real-time workflow.**

- Evidence still travels by **email or fax**
- Arbitration still happens **offline**
- Decisions still take **weeks**
- Neither party ever speaks directly to the other

These are band-aids on a broken pipe. What the industry needs is a full replacement of the workflow — and that's exactly what we built.

---

## 🟢 3. Our Solution — GCH-VR Dispute Resolution Platform

> **One platform. Three parties. Real-time. Transparent. Fair.**

**GCH-VR DRP** is a unified, AI-powered Dispute Resolution Platform that brings the cardholder, merchant, and bank into a single shared workflow — with automated evidence collection, transparent rule-based arbitration, and AI-assisted verdicts.

### How It Works (End-to-End)

```
[Cardholder files dispute in mobile app]
        ↓
[Guided form: describe claim, upload evidence (photo, chat log, receipt)]
        ↓
[System notifies merchant in REAL TIME via Merchant Portal]
        ↓
[Merchant uploads counter-evidence: tracking, delivery confirmation]
        ↓
[Rule Engine evaluates evidence against Visa/MC dispute codes]
        ↓
[If confidence ≥ 0.85] → Auto-verdict in MINUTES
[If confidence < 0.85] → Gemini 2.5 Flash AI arbitrates
        ↓
[Both sides receive verdict + plain-language explanation]
        ↓
[Funds released/held accordingly. Either party may appeal.]
```

### Three Portals, One Platform

| Portal | Who Uses It | Key Features |
|---|---|---|
| **Cardmember Web App** | Cardholders | Mobile-first, dispute wizard, real-time status timeline, evidence upload, appeal submission |
| **Merchant Portal** | Merchants & Admins | 72-hr countdown timers, evidence viewer, mediated request center, analytics dashboard |
| **Admin Console** | Banks / Compliance | Visual Rule Authoring UI (no-code), Appeals Review Queue, Gemini AI Review Simulator, bias monitoring |

### The Magic: Visual Rule Authoring UI
> Non-technical compliance teams can write, test, and publish dispute rules **without a single line of code.**

```
IF merchant.evidence.TRACKING.delivery_status = DELIVERED
AND merchant.evidence.TRACKING.address_match >= 0.85
THEN → MERCHANT_WIN (Confidence: 0.95)

IF merchant.evidence.TRACKING does NOT EXIST
THEN → CARDMEMBER_WIN (Confidence: 0.90)
```
Rules are tested live against mock evidence *before* being published. No engineers required.

### AI Arbitration with Gemini 2.5 Flash
When deterministic rules aren't enough (confidence < 0.85), **Gemini 2.5 Flash** steps in as an AI arbitrator:
- Reads OCR-parsed evidence documents
- Reasons over unstructured evidence (chat logs, descriptions, photos)
- Returns a **structured verdict**: outcome + confidence score + plain-language explanation

> *Real example from our testing: Original verdict was MERCHANT_WIN. Gemini on appeal noticed a **zip code mismatch** (delivery Zip 90210 vs. registered Zip 90211) and overturned the outcome to CARDMEMBER_WIN.*

---

## 🔵 4. Tech Stack & Architecture

### Architecture Philosophy
> **Microservices. Event-driven. Every component has a GCP service behind it — chosen because it's the right tool for that job.**

### 7 Backend Microservices (Python 3.12 / FastAPI / Cloud Run)

| Service | Responsibility |
|---|---|
| **Dispute Service** | Core state machine: Filed → Evidence → Under Review → Verdict → Closed |
| **Evidence Service** | File uploads → GCS → Document AI OCR (entity extraction) |
| **Rule Engine** | YAML rule evaluator + Gemini 2.5 Flash AI fallback |
| **Funds Service** | Provisional holds & releases (issuer core banking layer) |
| **Notification Service** | Email (SendGrid) + Push (Firebase Cloud Messaging) at every event |
| **Audit Service** | Immutable, hash-verified log to Firestore → BigQuery |
| **Analytics Worker** | Cloud Functions — runs every 15 min, computes dispute trends & bias metrics |

### GCP Services Used (14 Distinct Services)

| GCP Service | What We Use It For |
|---|---|
| **Cloud Run** | All 7 microservices — auto-scaling containers, scale-to-zero |
| **Cloud SQL (PostgreSQL 15)** | Primary relational DB — disputes, evidence, verdicts, appeals |
| **Cloud Storage (GCS)** | Evidence file storage + versioned YAML rule definitions |
| **Cloud Pub/Sub** | Event bus — fully decoupled async communication between services |
| **Document AI** | OCR on uploaded receipts, tracking docs, photos — entity extraction |
| **Vertex AI / Gemini 2.5 Flash** | AI fallback arbitration + appeal review simulation |
| **Firestore** | Immutable audit log — append-only, hot storage |
| **BigQuery** | Analytics warehouse — dispute trends, win rates, resolution times |
| **Cloud Functions (2nd Gen)** | Analytics worker — scheduled every 15 minutes |
| **Cloud Endpoints + ESPv2** | API gateway — JWT auth, rate limiting, TLS, routing |
| **Firebase Auth** | User authentication + JWT with custom role claims |
| **Cloud CDN + Cloud Storage** | Frontend static hosting with global edge delivery |
| **Cloud Monitoring** | Custom metrics from analytics worker |
| **SendGrid / FCM** | Email + push notifications |

### Frontend
- **React 18 TypeScript SPAs** (Vite) — Mobile-first, dark glassmorphism design
- **State**: Zustand + TanStack Query (React Query v5)
- **Two apps**: `cardmember-web` + `merchant-portal`

---

## 🟡 5. Key Technical Challenges

### Challenge 1: State Machine Integrity
**Problem**: A dispute has a strict lifecycle. Invalid state transitions (e.g., jumping from Filed to Closed) must be impossible.

**Solution**: Implemented a strict state machine in the Dispute Service. Every API endpoint validates the current state before allowing a transition. Invalid transitions are **rejected at the API level**.

### Challenge 2: AI Arbitration That's Explainable (Not a Black Box)
**Problem**: Using AI in high-stakes financial decisions is sensitive. "The AI said so" is not good enough for regulators or customers.

**Solution**: Gemini 2.5 Flash runs at **low temperature** (deterministic, not creative). It returns structured JSON: `{ outcome, confidence, explanation, reasoning_summary }`. Every verdict shows **exactly which evidence was considered and why**.

### Challenge 3: Decoupled Services Without Tight Coupling
**Problem**: 7 services need to react to the same events (e.g., dispute filed → notify merchant + log audit + start analytics). Coupling them directly creates a maintenance nightmare.

**Solution**: **Google Cloud Pub/Sub event bus**. Dispute Service publishes an event. Notification, Audit, and Analytics services each subscribe independently. They never need to know each other exists.

### Challenge 4: Evidence That's Actually Readable by Machines
**Problem**: Cardholders upload photos, receipts, PDFs — raw binary. The rule engine needs structured data (delivery status, address, date).

**Solution**: Every upload is automatically passed through **Document AI** for OCR — extracting text, tracking numbers, dates, addresses, zip codes — before being stored in GCS.

### Challenge 5: Non-Technical Teams Need to Update Dispute Rules
**Problem**: Visa/Mastercard dispute rules change. Engineers shouldn't have to deploy code every time.

**Solution**: Dispute rules are stored as **versioned YAML files in GCS**. The Admin Rule Authoring UI lets compliance teams write, test (dry-run against mock evidence), and publish rules — zero code required.

### Challenge 6: Auditability for Financial Compliance
**Problem**: Every action in a financial dispute must be traceable, immutable, and verifiable — especially under Reg Z and Reg E.

**Solution**: The Audit Service writes every action as a **hash-verified, append-only record to Firestore**. You cannot edit or delete it. Everything is also streamed to BigQuery for analytics. The trail is permanent by design.

---

## 🌟 6. Impact & Scalability — Benefits

### Quantified Impact

| Metric | Before (Today) | With GCH-VR |
|---|---|---|
| Dispute resolution time | 2–6 weeks | **Minutes to hours** |
| Cost per dispute | ~$90 | **Dramatically reduced** |
| % disputes auto-resolved | ~0% | **Target: >90%** |
| Cardholder visibility | Phone call + wait | **Real-time status timeline** |
| Merchant response | Blind, deadline-driven | **Instant notification + guided portal** |

### Who Benefits

**🧑‍💼 For Cardholders:**
- Know exactly where their case is at every moment
- Receive a plain-English verdict with a reason — not just "claim denied"
- No more 6-week waits or mysterious letters

**🏪 For Merchants:**
- See the dispute the moment it's filed
- Submit their own evidence (not just respond to the bank's judgment)
- Fair arbitration based on evidence — not whoever submitted faster

**🏦 For Banks & Issuers:**
- Slash the $90-per-dispute processing cost
- Reduce call center volume (customers get answers in-app)
- Satisfy Reg Z / Reg E compliance requirements
- Retain the **66% of fraud victims who would switch banks** after a bad dispute experience

**🌐 For the Financial Ecosystem:**
- Bias monitoring built in — win rates tracked by side; skews are surfaced and corrected
- Transparent, auditable process reduces CFPB complaints
- Scales to handle millions of disputes without proportionally scaling human headcount

### Scalability

The architecture is designed to scale from prototype to production:

- **Cloud Run** — scales to zero when idle, scales out automatically under load
- **Pub/Sub** — handles millions of events per second without service coupling
- **PostgreSQL on Cloud SQL** — battle-tested, ACID-compliant, horizontally scalable with read replicas
- **BigQuery** — handles petabyte-scale analytics for trend monitoring across all disputes globally
- **CDN-hosted frontends** — global edge delivery for sub-second load times anywhere

### The Design Principle
> **Evidence wins — not paperwork.** The side that submits better proof wins. Not the side that submits more forms faster.

---

## 📊 Quick Reference — Key Stats for Q&A

| Metric | Value |
|---|---|
| Current avg. dispute resolution time | 2–6 weeks |
| Target with GCH-VR | Minutes to hours |
| Cost per dispute today | ~$90 |
| % of fraud victims who'd switch banks | 66% |
| Auto-resolution target | >90% of cases |
| AI fallback threshold | Confidence < 0.85 |
| GCP services used | **14 distinct services** |
| Backend microservices | **7** |
| Frontend apps | **2** (Cardmember Web + Merchant Portal) |
| AI model | Gemini 2.5 Flash (via Vertex AI) |
| Backend language | Python 3.12 / FastAPI |
| Database | PostgreSQL 15 on Cloud SQL |
| Audit store | Firestore (immutable) + BigQuery |
| State machine states | Filed → Evidence → Under Review → Verdict Issued → Closed |

---

## 💬 Likely Judge Questions & Answers

**Q: How is this different from Ethoca/Verifi or Visa RDR?**
> Those are point solutions that prevent a subset of chargebacks. We're a full replacement of the workflow — connecting all three parties in real time with shared evidence, automated rules, and explainable AI verdicts. They stop chargebacks. We resolve disputes.

**Q: How do you ensure the AI isn't biased toward cardholders?**
> We track win rates by side on our analytics dashboard. If Gemini is systematically favoring one party without evidence-based reasons, that metric surfaces it. We also run at low temperature with structured JSON output — this is arbitration, not creative AI.

**Q: What about regulatory compliance?**
> Every decision is logged as an immutable, hash-verified audit record in Firestore. The system enforces Reg Z's 60-day dispute window and gives both parties an appeal path. Verdicts come with plain-language explanations — not just reason codes.

**Q: Can banks actually adopt this?**
> Yes. The API layer is standard REST/JWT. Card network integrations (Visa/Mastercard APIs) and issuer core banking are modular stubs in the prototype — ready to swap in. The visual rule authoring UI means compliance teams can update dispute logic without touching code.

**Q: What's the business model?**
> SaaS licensing to issuers — priced per dispute processed. Even at a fraction of the $90 per-dispute current cost, the ROI is compelling. Additional revenue from merchant portal subscriptions.

---

*Built for Google Cloud Hackathon | GCH-VR Team | 2026*
