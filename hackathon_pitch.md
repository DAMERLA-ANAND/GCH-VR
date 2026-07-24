# 🎤 GCH-VR — Hackathon Pitch Script
### "Killing the Chargeback War. One Dispute at a Time."

---

> **Format**: Live spoken monologue — approximately 5–7 minutes.  
> Sections are labelled for slide cue timing. Speak naturally — this is written as you'd actually say it on stage.

---

## 🟡 SLIDE 1 — HOOK / OPENING

*[Pause. Look at the audience. Speak slowly.]*

"Imagine you ordered something online. It never showed up. You contact the store — nothing. So you go to your bank and file a dispute.

And then... you wait.

Two weeks pass. You're calling the bank every other day. Nobody can tell you where your money is. Finally, six weeks later, you get a letter. Maybe you won. Maybe you didn't. Either way, nobody explained why.

Now flip it. You're a small business owner. You shipped the item. You have the tracking proof. But someone filed a chargeback anyway. And guess what? Your bank already debited your account, hit you with a fee, and left you to *prove your innocence* — with a deadline you barely knew existed.

That's the reality of dispute resolution today. For 750 million cardholders. And for millions of merchants around the world.

That's the problem we set out to fix."

---

## 🔴 SLIDE 2 — PROBLEM STATEMENT

*[Energy up. Clear and punchy.]*

"Let's talk about what's actually broken.

Today, when a cardholder disputes a charge — the process looks like this:

The customer calls the bank. The bank issues a provisional credit. The merchant's bank gets notified. The merchant's account gets debited *immediately*. Then the merchant has maybe 7 to 21 days to respond with evidence. The bank reviews it, somewhere in a back office. And a decision comes back weeks later.

That's it. That's the system.

No shared platform. No real-time communication. Evidence gets emailed. Sometimes faxed. Both sides are arguing their case to a middleman who's juggling thousands of cases. No one talks to each other directly. And whoever submits the right paperwork wins — not necessarily whoever is actually right.

It's broken for cardholders — because it's slow, opaque, and frustrating.

It's broken for merchants — because it feels like a rigged game where the customer always wins by default.

And it's broken for banks — because they're hemorrhaging money, staff time, and customer trust to manage a process that hasn't evolved in 30 years."

---

## 🔴 SLIDE 3 — THE LOSSES (The Numbers Don't Lie)

*[Slow down. Let each number land.]*

"Here's what this costs in real terms.

Processing a single dispute costs a bank approximately **$90** in staff time, investigation, and overhead. That's not the chargeback amount — that's just the *cost to process it*.

Multiply that by the hundreds of millions of disputes filed globally every year.

**66% of fraud victims say they would switch banks** if their dispute is handled slowly or poorly. That's not a small retention problem. That's a loyalty crisis happening in slow motion.

Merchants are losing on multiple fronts — they lose the product, lose the disputed amount, pay a chargeback fee on top of it, and if their chargeback rate gets too high, Visa and Mastercard threaten to terminate their account entirely.

And then there's friendly fraud — where buyers abuse the chargeback system as a free return policy. Merchants call it 'first-party fraud'. It's rampant. And it's nearly impossible to fight under the current system because the tools don't exist to catch it early enough.

The financial industry talks about dispute resolution like it's a cost of doing business. We say it's a fixable operational failure — and fixing it is worth *billions*."

---

## 🟠 SLIDE 4 — CURRENT STATE (What Exists Today)

*[Matter-of-fact tone. Show you've done the research.]*

"Now, to be fair — the industry isn't standing completely still. There are some partial solutions out there.

Visa has something called Rapid Dispute Resolution, or RDR — where merchants can pre-authorize automatic refunds on certain small disputes. 

Ethoca and Verifi send merchants early alerts when a dispute is being filed, giving them a 48 to 72-hour window to issue a refund before it escalates to a formal chargeback.

Some banks have mobile apps where you can track your dispute status.

These are good ideas. But here's the problem: they're all point solutions. They address fragments of the process. None of them connect the cardmember, the merchant, and the bank in one unified workflow. The evidence still travels by email. The arbitration still happens offline. The decision still takes weeks.

It's like patching a broken pipe with band-aids. The pipe is still broken.

What doesn't exist — until now — is a platform that brings all three parties into the same room, in real time, with shared evidence, automated rules, and transparent verdicts.

That's what we built."

---

## 🟢 SLIDE 5 — THE SOLUTION: GCH-VR Dispute Resolution Platform

*[Confident. Proud. Clear.]*

"We built a unified Dispute Resolution Platform — and we're calling it **GCH-VR DRP**.

Here's the vision in plain English:

When a cardholder disputes a charge, instead of calling the bank and waiting — they open our web app. They select the transaction. They describe what happened. They upload any evidence — a photo, a screenshot, a chat log. The system immediately acknowledges the dispute and tells them exactly what happens next.

At the same time — *literally in real time* — the merchant gets notified. They log into the merchant portal and see the dispute, with the cardholder's claim right there in front of them. They can upload their counter-evidence — a tracking number, a delivery confirmation, order notes.

And here's where it gets interesting.

Our platform doesn't just collect evidence and hand it to a human to sort out. We run it through a **rule engine** — a set of structured, transparent business rules modeled after Visa and Mastercard's actual dispute codes. The system evaluates the evidence automatically.

Tracking shows delivery confirmed to the right address? Merchant wins. No tracking record exists at all? Cardholder wins. Case is ambiguous? We call in our AI.

We integrated **Google's Gemini 2.5 Flash** as our AI arbitrator — a fallback for the cases where the deterministic rules aren't enough. Gemini reads the OCR-parsed evidence, weighs the facts, and produces a verdict with a plain-language explanation that both parties can actually understand. Not 'your claim was denied under reason code 4853.' But: 'Our records show the package was delivered to your registered address on June 5th at 2:17 PM. The tracking scan confirms delivery.' That's it. Clear. Human. Fair.

The whole thing — from dispute filed to verdict issued — can happen in **minutes**, not weeks."

---

## 🟢 SLIDE 6 — WHAT WE ACTUALLY BUILT (The Demo)

*[Grounded. Technical confidence without being dry.]*

"Let me walk you through what we actually built, because this isn't just a concept — it's a working prototype.

**For the cardholder** — we built a mobile-first React web app. You can see your transactions, tap one to dispute it, walk through a guided form, upload evidence, and then track your dispute in real time with a live status timeline. You know exactly where your case is at every moment.

**For the merchant** — we built a full merchant portal with a disputes dashboard. Every incoming dispute has a **72-hour countdown timer** — because in the real world, merchants have response windows, and we make sure they never miss one. They can upload evidence, respond to structured information requests from the cardholder, and see the verdict the moment it's issued.

**For admins** — we built something we're really proud of: a **Visual Rule Authoring UI**. This is a low-code drag-and-drop interface where non-technical compliance teams can write and publish dispute rules — things like 'IF the merchant's tracking shows DELIVERED AND the address matches above 85% confidence, THEN the outcome is MERCHANT_WIN.' They can test rules live against sample evidence before publishing. No engineers required to update dispute logic.

We also built an **Appeal Review Queue** with a Gemini AI Reviewer Simulator. When a party appeals a verdict, an admin can click one button and Gemini runs a second-pass review — acting as a senior arbitrator — checking whether the original verdict should be upheld or overturned. We actually tested a case where the original verdict was MERCHANT_WIN, but Gemini on appeal noticed a zip code mismatch and flipped the outcome. It works."

---

## 🔵 SLIDE 7 — TECHNICAL ARCHITECTURE

*[Fast-paced but confident — show depth without drowning them.]*

"Under the hood, this is a microservices architecture running entirely on Google Cloud Platform.

We have **seven backend services**, each with a single responsibility:

- The **Dispute Service** — the brain. It runs a strict state machine: Filed → Evidence Collection → Under Review → Verdict Issued → Closed. Invalid state transitions are rejected at the API level.

- The **Evidence Service** — handles file uploads, stores everything in **Google Cloud Storage**, and automatically runs **Document AI** OCR on every upload to extract text, dates, addresses, and tracking numbers.

- The **Rule Engine** — loads versioned YAML rule files from Cloud Storage, evaluates deterministic conditions against the evidence data, and produces a confidence-scored outcome.

- The **Gemini 2.5 Flash Client** — if the rule engine's confidence falls below 0.85, it hands off to Gemini, which reasons over the full evidence in unstructured natural language and returns a structured JSON verdict — outcome, confidence score, plain-language explanation, and an internal reasoning summary. All of this is deterministic at low temperature — it's not creative writing. It's arbitration.

- The **Funds Service** — orchestrates provisional holds and releases, simulating the issuer core-banking layer.

- The **Notification Service** — delivers email and push notifications via SendGrid and Firebase Cloud Messaging at every lifecycle event.

- And the **Audit Service** — every single action — every upload, every verdict, every appeal — gets written as an immutable, hash-verified entry to **Firestore**, and streamed to **BigQuery** for analytics. You cannot alter the audit trail. That's by design.

All services talk to each other via **Google Cloud Pub/Sub** — a fully event-driven architecture where no service is tightly coupled to another. Dispute filed publishes an event. Notification service picks it up and sends the merchant an alert. Audit service picks it up and logs it. Analytics worker processes it every 15 minutes. They never have to know about each other.

The API layer sits behind **Cloud Endpoints** with ESPv2 — handling TLS termination, JWT validation, and rate limiting.

The frontends are React 18 TypeScript SPAs hosted on **Cloud Storage with Cloud CDN** for global fast delivery.

The backend is all **Python 3.12 / FastAPI**, deployed as **Cloud Run** containers — so it scales to zero when idle and scales out automatically under load.

The database is **PostgreSQL 15 on Cloud SQL**, with full migrations managed by Alembic.

And authentication is **Firebase Auth** — JWT tokens, custom role claims, the works."

---

## 🔵 SLIDE 8 — GCP SERVICES USED

*[Quick summary, like rattling off your toolkit.]*

"Just to be explicit about our GCP footprint, because this was built specifically to showcase the Google Cloud ecosystem:

| Service | What we use it for |
|---|---|
| **Cloud Run** | All 7 backend microservices — auto-scaling, containerized |
| **Cloud SQL (PostgreSQL 15)** | Primary relational database — disputes, evidence, verdicts, appeals |
| **Cloud Storage (GCS)** | Evidence file storage + versioned YAML rule definitions |
| **Cloud Pub/Sub** | Event bus connecting all services — decoupled, reliable, async |
| **Document AI** | OCR on uploaded receipts, tracking docs, photos — entity extraction |
| **Vertex AI / Gemini 2.5 Flash API** | AI fallback arbitration + appeal review simulation |
| **Firestore** | Immutable audit log — append-only, hot storage |
| **BigQuery** | Analytics warehouse — dispute trends, win rates, resolution times |
| **Cloud Functions (2nd gen)** | Analytics worker — scheduled every 15 minutes |
| **Cloud Endpoints + ESPv2** | API gateway — auth, rate limiting, routing |
| **Firebase Auth** | User authentication + JWT with role claims |
| **Cloud CDN + Cloud Storage** | Frontend static hosting with global edge delivery |
| **Cloud Monitoring** | Custom metrics from analytics worker |
| **SendGrid / FCM** | Email + push notifications via Notification Service |

This isn't just 'deployed on GCP.' Every major component has a deliberate GCP service behind it — chosen because it's the right tool for that job."

---

## 🟣 SLIDE 9 — SOLUTION BENEFITS

*[Return to human language. Paint the outcome.]*

"So what does this actually change?

For **cardholders** — instead of a 6-week black box, they get a real-time status page, clear explanations, and resolution that can happen in minutes. No more calling the bank. No more waiting for a letter. They know where their money is, always.

For **merchants** — they finally have a voice in the process. They see the dispute the moment it's filed. They can submit their side of the story. And if they're right, the system will say so — with evidence, not just a blind reversal. No more losing legitimate disputes because they missed a deadline they didn't know existed.

For **banks and issuers** — this slashes the $90-per-dispute processing cost. It reduces call center volume. It satisfies regulators under Reg Z and Reg E. And it retains customers who would otherwise switch banks after a bad dispute experience.

For **trust in the system** — because every decision comes with a transparent explanation, grounded in the actual evidence submitted, both sides get something the current system never offers: *a reason*. Not just a verdict. A reason.

We modeled the system around one core design principle: **evidence wins, not paperwork.** The side that submits better proof wins — not the side that submits more forms faster.

And our target? **90% of disputes resolved automatically, in under an hour.** For the most complex edge cases, the AI steps in. And for the rare exception, there's always a human appeal path."

---

## ⚪ SLIDE 10 — FAIRNESS & AUDITABILITY

*[Steady. Serious. This matters.]*

"One thing we were deliberate about — this can't be a black box.

We know AI in high-stakes financial decisions is a sensitive topic. So we designed transparency in from day one.

When a verdict is issued, both sides see exactly which rules fired and why. If Gemini was involved, they see the plain-language explanation it generated — not the prompt, not the code, but the reasoning. 'Here's what the evidence showed. Here's what we concluded. Here's why.'

Every action in the system is logged to Firestore as an immutable, hash-verified record. You can't delete it. You can't edit it. Every file upload, every rule evaluation, every verdict, every fund release — permanently recorded.

And every party has a right of appeal — which routes through either a Gemini-powered re-review or a human operator override.

We also track win rates by side. If our system is systematically favoring cardholders or merchants without evidence-based reasons, our analytics dashboard surfaces that. Bias monitoring isn't an afterthought — it's a built-in metric."

---

## 🟡 SLIDE 11 — THE ASK / CLOSE

*[Warm. Sincere. Direct.]*

"We started this project because the problem was obvious and the solution wasn't.

Dispute resolution is one of the most friction-heavy, trust-destroying experiences in consumer finance. And the tooling hasn't caught up.

We built a system that actually connects everyone at the table — the cardholder, the merchant, the bank — with shared evidence, automated fairness, and AI-powered reasoning that explains itself.

We're not reinventing the wheel. We're using what already exists — Google Cloud, Document AI, Gemini — and orchestrating them intelligently to solve a real problem that costs the industry billions every year.

What we built in this hackathon is a working prototype. The core dispute lifecycle works end to end. The rule engine evaluates real evidence. Gemini delivers real verdicts. The portals are live.

The next step is piloting this with a real issuer — even on a small transaction volume — and proving out that 90% auto-resolution rate with live data.

We believe **faster, fairer, and more transparent dispute resolution** isn't just good for customers and merchants — it's good for the entire financial ecosystem.

And we think this is how it gets built.

Thank you."

---

## 📋 QUICK REFERENCE — KEY STATS FOR Q&A

| Metric | Value |
|---|---|
| Current avg. dispute resolution time | 2–6 weeks |
| Target with GCH-VR | Minutes to hours |
| Cost per dispute today | ~$90 |
| % of fraud victims who'd switch banks | 66% |
| Auto-resolution target | >90% of cases |
| AI fallback threshold | Confidence < 0.85 |
| GCP services used | 14 distinct services |
| Backend services | 7 microservices |
| Frontend apps | 2 (Cardmember Web + Merchant Portal) |
| AI model | Gemini 2.5 Flash (via Vertex AI) |
| Database | PostgreSQL 15 on Cloud SQL |
| Audit store | Firestore (immutable) + BigQuery |

---

*Built for Google Cloud Hackathon | GCH-VR Team | 2026*
