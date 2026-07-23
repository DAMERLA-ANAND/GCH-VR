# Deployment, External Simulation & Prototype Runbook

> **System**: Dispute Resolution Platform Prototype  
> **Target Scope**: Deployable Prototype (Zero-config local run & GCP Cloud Run deployment)  
> **Simulation Scope**: Stubbed Card Networks (Visa/Mastercard reason code mapper & pre-dispute alerts) + Core Banking Issuer & Acquirer APIs

---

## 1. Identified Prototype Gaps & Resolution Strategy

To ensure the prototype can be run end-to-end smoothly without external dependencies, we resolve the following 4 key gaps:

| # | Identified Gap | Prototype Solution / Architectural Fix |
|---|---|---|
| 1 | **Card Network Dependencies** (Visa VROL, Mastercard Collaboration) | Integrated **Mock Card Network Service** that maps internal categories (`NON_DELIVERY`, `UNAUTHORIZED_CHARGE`) to ISO/Visa reason codes (13.1, 10.4) and emits simulated pre-dispute alerts. |
| 2 | **Core Banking Dependencies** (Issuer/Acquirer funds hold APIs) | Integrated **Mock Core Bank Service** providing transactional provisional credit holds and settlement releases. |
| 3 | **72-Hour Evidence Window Testing Bottleneck** | Added **Prototype Time-Travel Endpoint** (`POST /api/v1/prototype/advance-time`) allowing testers to instantly trigger deadline expirations without waiting 3 calendar days. |
| 4 | **Seed Data & Fixture Availability** | Provided a single **Seed Script** (`POST /api/v1/prototype/seed`) that pre-populates users, transactions, receipts, and USPS tracking PDFs ready for instant testing. |

---

## 2. Card Network & Core Banking Simulation Design

### 2.1 Mock Card Network Service (`mock-card-network`)

Simulates card network (Visa / Mastercard) collaboration layers and reason code translation:

```
+------------------+         Reason Code Mapping          +-----------------------+
|  Dispute Service | -----------------------------------> | Mock Card Network Svc |
+------------------+                                      +-----------------------+
                                                                      |
                                                                      v
                                                         Emits Visa/MC Alert Payload
                                                         (e.g., Visa Reason 13.1)
```

#### Reason Code Mapping Table

| Internal Category | Network | Reason Code | Network Description | Dispute Window |
|---|---|---|---|---|
| `NON_DELIVERY` | Visa | `13.1` | Merchandise/Services Not Received | 120 days from transaction |
| `NON_DELIVERY` | Mastercard | `4855` | Goods/Services Not Provided | 120 days from transaction |
| `UNAUTHORIZED_CHARGE` | Visa | `10.4` | Other Fraud — Card-Absent Environment | 120 days from transaction |
| `UNAUTHORIZED_CHARGE` | Mastercard | `4837` | No Cardholder Authorization | 120 days from transaction |

#### Simulation APIs (`mock-card-network`)

```
POST /mock/network/v1/transactions/verify
- Accepts: { transaction_ref }
- Returns: { valid: true, cardholder_name, merchant_id, amount, mcc: "5732", network: "VISA" }

POST /mock/network/v1/alerts/pre-dispute
- Accepts: { dispute_id, merchant_id, category, amount }
- Returns: { alert_id: "ALT_VISA_9988", status: "DELIVERED_TO_MERCHANT" }
```

---

### 2.2 Mock Core Banking Issuer & Acquirer Service (`mock-core-bank`)

Simulates issuer provisional credit holds and acquirer settlement debit/credit operations:

```
POST /mock/bank/v1/hold-provisional-credit
- Accepts: { cardmember_id, amount, transaction_ref }
- Returns: { hold_reference: "HLD_BANK_554411", status: "HOLD_PLACED" }

POST /mock/bank/v1/settle-dispute
- Accepts: { hold_reference, direction: "TO_CARDMEMBER" | "TO_MERCHANT" }
- Returns: { settlement_id: "STL_887766", status: "FUNDS_TRANSFERRED" }
```

---

## 3. Prototype Testing & Simulation Utilities

To enable smooth demo walkthroughs, two prototype-specific helper endpoints are exposed in `dispute-service`:

### 3.1 Time-Travel Endpoint: `POST /api/v1/prototype/advance-time`
Allows testers or automated tests to fast-forward a dispute's `evidence_deadline` to trigger auto-adjudication immediately.

#### Request Body
```json
{
  "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
  "hours_to_advance": 73
}
```

#### Response Body (`200 OK`)
```json
{
  "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
  "previous_status": "EVIDENCE_COLLECTION",
  "new_status": "UNDER_REVIEW",
  "message": "Deadline expired. Triggered automatic rule engine & Gemini 2.5 Flash adjudication.",
  "verdict_outcome": "CARDMEMBER_WIN",
  "explanation": "Merchant failed to submit evidence within the 72-hour window. Dispute auto-resolved in cardmember favor."
}
```

---

### 3.2 Seed Data Endpoint: `POST /api/v1/prototype/seed`
Populates the local database with pre-configured demo entities:

- **Users**: 1 Cardmember (`alice@example.com`), 1 Merchant (`merchant_techstore@example.com`), 1 Reviewer (`reviewer_bob@example.com`).
- **Transactions**: 3 sample settled credit card charges ($149.99 Electronics, $49.99 Clothing, $299.00 Travel).
- **Pre-generated Assets**: Sample receipt images and valid/invalid USPS tracking PDFs stored in GCS / local volume.

---

## 4. Full Deployment Specification & Runbook

### 4.1 Zero-Dependency Local Docker Setup

Run the entire system (all backend microservices, emulators, and frontends) with one command:

```bash
# 1. Clone repository
git clone <repo-url> && cd drp-platform

# 2. Launch PostgreSQL, Pub/Sub Emulator, Firestore Emulator, 6 Microservices & 2 Frontends
docker compose up --build -d

# 3. Seed demo data
curl -X POST http://localhost:8001/api/v1/prototype/seed

# 4. Access Web Frontends:
# Cardmember App: http://localhost:3000
# Merchant Portal & Visual Rule Builder: http://localhost:3001
```

---

### 4.2 One-Click GCP Cloud Run Deployment

Deploy to GCP using Terraform and Cloud Build:

```bash
# 1. Authenticate GCP CLI
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 2. Run Terraform to provision Cloud SQL, GCS, Pub/Sub, Firestore, Artifact Registry & IAM
cd infrastructure/terraform
terraform init
terraform apply -var-file=environments/dev.tfvars -auto-approve

# 3. Build & Deploy Microservices via Cloud Build
cd ../..
gcloud builds submit --config=cloudbuild.yaml --substitutions=_ENVIRONMENT=dev
```

---

## 5. End-to-End Prototype Validation Matrix

| Step | Action | Endpoint / Screen | Expected Result |
|---|---|---|---|
| **1** | File Dispute | Cardmember App (`http://localhost:3000`) | Select $149.99 transaction → Submit `NON_DELIVERY` dispute → Status transitions to `FILED` then `EVIDENCE_COLLECTION`. Provisional hold created. |
| **2** | Upload Evidence | Merchant Portal (`http://localhost:3001`) | Merchant receives notification → Uploads USPS tracking PDF → Document AI extracts tracking number `9400111899223` and `DELIVERED` status. |
| **3** | Trigger Evaluation | Time-Travel Endpoint or "Submit Evidence" button | Rule Engine runs → Evaluates YAML rules → Invokes Gemini 2.5 Flash for plain-language text generation → Verdict issued: `MERCHANT_WIN`. |
| **4** | File Appeal | Cardmember App | Cardmember clicks "File Appeal" → Enters zip code mismatch reason → Status changes to `APPEALED`. |
| **5** | AI Appeal Simulation | Merchant / Admin Console (`http://localhost:3001/admin/appeals`) | Reviewer clicks "Simulate AI Reviewer" → Gemini 2.5 Flash secondary review overturns verdict → Status changes to `CLOSED`, funds released to cardmember. |
| **6** | Edit Rule Set | Visual Rule Builder (`http://localhost:3001/admin/rules`) | Admin modifies rule threshold → Dry-run test confirms new logic → Saves YAML to GCS without backend redeploy. |

---

## 6. Console Observability & Testing Execution

### 6.1 Viewing Real-Time Console Telemetry Logs

Since the default provider is `ConsoleTelemetryLogger`, structured JSON logs print directly to standard output. View live filtered logs from all services in terminal:

```bash
# 1. View all microservice logs in real-time
docker compose logs -f

# 2. View specific service telemetry (e.g. Rule Engine & Gemini Flash calls)
docker compose logs -f rule-engine

# 3. Filter structured JSON log events for Verdicts or Errors
docker compose logs -f dispute-service | grep '"event_name":"VERDICT_ISSUED"'
```

### 6.2 Executing Terminal Test Suites & Harnesses

Run unit and integration test harnesses directly from terminal:

```bash
# 1. Run backend unit tests (State machine, YAML rule engine)
docker compose exec dispute-service python -m pytest tests/ -v

# 2. Run automated terminal E2E demo workflow script
docker compose exec dispute-service python scripts/run_demo_suite.py
```

To swap telemetry from `console` to `gcp` in production, update the environment variable in `docker-compose.yml` or Terraform:
`OBSERVABILITY_PROVIDER=gcp`

