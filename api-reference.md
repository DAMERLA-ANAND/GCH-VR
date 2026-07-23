# API Reference Document & Interface Contracts

> **System**: Dispute Resolution Platform  
> **API Version**: `v1`  
> **Protocol**: REST (HTTPS) over JSON / Multipart  
> **Auth Scheme**: Bearer Token (Firebase Auth JWT)  
> **Specification Format**: OpenAPI 3.0 / Standard JSON Schema  

---

## 1. Global API Standards & Conventions

### 1.1 Base URLs & Gateway Topology

| Environment | Base URL | Routing Layer |
|---|---|---|
| Local Development | `http://localhost:8001` | FastAPI Local Gateway / Docker Compose |
| GCP Staging | `https://api.staging.drp.example.com` | Cloud Endpoints ESPv2 on Cloud Run |
| GCP Production | `https://api.drp.example.com` | Cloud Endpoints ESPv2 on Cloud Run |

### 1.2 Global Request Headers

| Header | Type | Required | Description |
|---|---|---|---|
| `Authorization` | String | Yes | `Bearer <Firebase_ID_Token>` |
| `Content-Type` | String | Yes | `application/json` (or `multipart/form-data` for evidence upload) |
| `X-Correlation-ID` | UUID | Optional | Distributed tracing identifier (generated if omitted) |
| `Accept-Language` | String | Optional | ISO language code for plain-language verdict explanations (default: `en-US`) |

### 1.3 Standard Error Response (RFC 7807 Problem Details)

All API errors return a standardized JSON structure with HTTP status codes in the 4xx or 5xx range:

```json
{
  "type": "https://api.drp.example.com/errors/INVALID_STATE_TRANSITION",
  "title": "Invalid State Transition",
  "status": 400,
  "detail": "Cannot transition dispute from VERDICT_ISSUED to EVIDENCE_COLLECTION.",
  "code": "INVALID_STATE_TRANSITION",
  "instance": "/api/v1/disputes/99332211-4455-6677-8899-aabbccddeeff",
  "timestamp": "2026-07-23T14:15:00Z",
  "invalid_params": []
}
```

---

## 2. Auth Claims & Role-Based Access Control (RBAC)

### 2.1 Firebase JWT Custom Claims
The API Gateway decodes the Firebase JWT and injects caller context into downstream microservice requests:

```json
{
  "iss": "https://securetoken.google.com/drp-gcp-project",
  "aud": "drp-gcp-project",
  "sub": "firebase_uid_12345",
  "email": "user@example.com",
  "role": "CARDMEMBER", // CARDMEMBER | MERCHANT | REVIEWER | ADMIN
  "user_id": "00000000-0000-0000-0000-000000000001",
  "merchant_id": null // Populated if role == MERCHANT
}
```

---

## 3. Dispute Service APIs

### 3.1 `POST /api/v1/disputes` — File a New Dispute
Initiates a new dispute, holds funds provisionally via Funds Service, sets the 72-hour evidence window, and notifies the merchant.

- **Security**: Cardmember Only (`role: CARDMEMBER`)
- **Request Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "transaction_ref": "tok_visa_txn_998877",
  "category": "NON_DELIVERY",
  "amount": 149.99,
  "currency": "USD",
  "description": "Ordered sneakers on July 10th. Merchant provided no tracking and package has not arrived."
}
```

#### Response Body (`201 Created`)
```json
{
  "id": "99332211-4455-6677-8899-aabbccddeeff",
  "cardmember_id": "00000000-0000-0000-0000-000000000001",
  "merchant_id": "00000000-0000-0000-0000-000000000002",
  "transaction_ref": "tok_visa_txn_998877",
  "category": "NON_DELIVERY",
  "status": "FILED",
  "amount": 149.99,
  "currency": "USD",
  "description": "Ordered sneakers on July 10th. Merchant provided no tracking and package has not arrived.",
  "filed_at": "2026-07-23T14:00:00Z",
  "evidence_deadline": "2026-07-26T14:00:00Z",
  "rule_set_version": "v1.0"
}
```

---

### 3.2 `GET /api/v1/disputes` — List Disputes
Retrieves paginated disputes filtered by caller role. Cardmembers view their disputes; Merchants view disputes filed against them.

- **Security**: Any Authenticated Role
- **Query Parameters**:
  - `status` (optional): `FILED`, `EVIDENCE_COLLECTION`, `UNDER_REVIEW`, `VERDICT_ISSUED`, `APPEALED`, `CLOSED`
  - `category` (optional): `NON_DELIVERY`, `UNAUTHORIZED_CHARGE`
  - `page` (optional, default: `1`): Integer
  - `limit` (optional, default: `20`, max: `100`): Integer

#### Response Body (`200 OK`)
```json
{
  "items": [
    {
      "id": "99332211-4455-6677-8899-aabbccddeeff",
      "category": "NON_DELIVERY",
      "status": "VERDICT_ISSUED",
      "amount": 149.99,
      "currency": "USD",
      "filed_at": "2026-07-23T14:00:00Z",
      "evidence_deadline": "2026-07-26T14:00:00Z",
      "verdict": {
        "outcome": "MERCHANT_WIN",
        "explanation": "Shipping records confirm delivery to your registered address on July 18. USPS Tracking #9400111899223.",
        "confidence": 0.94,
        "issued_by": "SYSTEM"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

---

### 3.3 `GET /api/v1/disputes/{id}` — Get Dispute Detail
Fetches full dispute details, attached evidence metadata, active mediated requests, and verdict (if issued).

- **Security**: Party to Dispute or Admin/Reviewer

#### Response Body (`200 OK`)
```json
{
  "id": "99332211-4455-6677-8899-aabbccddeeff",
  "cardmember_id": "00000000-0000-0000-0000-000000000001",
  "merchant_id": "00000000-0000-0000-0000-000000000002",
  "transaction_ref": "tok_visa_txn_998877",
  "category": "NON_DELIVERY",
  "status": "VERDICT_ISSUED",
  "amount": 149.99,
  "currency": "USD",
  "description": "Package never arrived.",
  "filed_at": "2026-07-23T14:00:00Z",
  "evidence_deadline": "2026-07-26T14:00:00Z",
  "resolved_at": "2026-07-23T14:02:15Z",
  "verdict": {
    "outcome": "MERCHANT_WIN",
    "explanation": "Carrier tracking confirms successful delivery to your front porch.",
    "confidence": 0.94,
    "issued_by": "SYSTEM",
    "rules_fired": [
      { "rule_id": "ND-001", "result": true, "weight": 0.5 }
    ],
    "issued_at": "2026-07-23T14:02:15Z"
  },
  "evidence_count": 2,
  "mediated_requests_count": 0
}
```

---

### 3.4 `POST /api/v1/disputes/{id}/appeal` — Submit Dispute Appeal
Submits an appeal against a verdict within the 14-day appeal window.

- **Security**: Losing Party of Verdict (`CARDMEMBER` or `MERCHANT`)

#### Request Body
```json
{
  "reason": "Carrier tracking zip code (90210) does not match my delivery address zip code (90211). Package was delivered to the wrong town.",
  "simulate_ai_reviewer": true // Optional: triggers Gemini 2.5 Flash Appeal Simulator immediately
}
```

#### Response Body (`202 Accepted`)
```json
{
  "appeal_id": "app_55443322-1100-9988-7766-554433221100",
  "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
  "status": "FILED",
  "filed_at": "2026-07-23T14:20:00Z",
  "simulated_outcome": {
    "appeal_outcome": "OVERTURNED",
    "review_notes": "Gemini 2.5 Flash Secondary Review: Confirmed carrier tracking address zip code mismatch. Verdict overturned to CARDMEMBER_WIN.",
    "resolved_at": "2026-07-23T14:20:02Z"
  }
}
```

---

## 4. Evidence Service APIs

### 4.1 `POST /api/v1/disputes/{id}/evidence` — Upload Evidence Document
Uploads an evidence document (Receipt, Photo, Tracking PDF, Chat Log), generates SHA-256 hash, stores file in GCS, and executes Document AI OCR parsing.

- **Security**: Party to Dispute
- **Request Headers**: `Content-Type: multipart/form-data`

#### Form Parameters
- `file`: Binary Blob (Max 25 MB; `.pdf`, `.png`, `.jpg`, `.jpeg`)
- `evidence_type`: Enum (`RECEIPT`, `PHOTO`, `TRACKING`, `CHAT_LOG`, `ORDER_CONFIRMATION`, `OTHER`)

#### Response Body (`201 Created`)
```json
{
  "id": "evi_11223344-5566-7788-9900-aabbccddeeff",
  "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
  "submitted_by": "00000000-0000-0000-0000-000000000002",
  "side": "MERCHANT",
  "evidence_type": "TRACKING",
  "gcs_uri": "gs://drp-evidence-dev/99332211-4455-6677-8899-aabbccddeeff/evi_11223344.pdf",
  "content_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "ocr_text": "USPS Tracking Number: 9400111899223...\nStatus: Delivered July 18 2026 2:34pm",
  "extracted_fields": {
    "carrier": "USPS",
    "tracking_number": "9400111899223",
    "delivery_status": "DELIVERED",
    "delivery_date": "2026-07-18"
  },
  "created_at": "2026-07-23T14:01:00Z"
}
```

---

## 5. Mediated Information Request APIs

### 5.1 `POST /api/v1/disputes/{id}/mediated-requests` — Request Clarification
Merchant sends a platform-moderated, structured request to the cardmember asking for missing information (e.g. photo of outer packaging label).

- **Security**: Merchant Only (`role: MERCHANT`)

#### Request Body
```json
{
  "request_type": "REQUEST_PHOTO_PACKAGING",
  "message": "Please upload a clear photo of the shipping label on the outer box to verify carrier routing numbers."
}
```

#### Response Body (`201 Created`)
```json
{
  "id": "med_77889900-1122-3344-5566-778899001122",
  "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
  "requested_by": "00000000-0000-0000-0000-000000000002",
  "request_type": "REQUEST_PHOTO_PACKAGING",
  "message": "Please upload a clear photo of the shipping label on the outer box to verify carrier routing numbers.",
  "status": "PENDING",
  "created_at": "2026-07-23T14:01:30Z"
}
```

---

## 6. Rule Engine & Visual Authoring APIs (Admin / Ops)

### 6.1 `GET /api/v1/admin/rules/{category}` — Fetch Rule Set JSON Schema
Retrieves current rule configuration for visual builder rendering.

- **Security**: Admin / Reviewer (`role: ADMIN` or `role: REVIEWER`)

#### Response Body (`200 OK`)
```json
{
  "category": "NON_DELIVERY",
  "version": "v1.2",
  "rules": [
    {
      "id": "ND-001",
      "name": "tracking_confirms_delivery",
      "description": "Tracking shows delivered to cardmember address",
      "conditions": [
        {
          "field": "merchant.evidence.TRACKING.extracted_fields.delivery_status",
          "operator": "eq",
          "value": "DELIVERED"
        }
      ],
      "outcome": "MERCHANT_WIN",
      "weight": 0.5,
      "explanation_template": "Carrier tracking confirms delivery on {delivery_date}."
    }
  ],
  "gemini_fallback": {
    "enabled": true,
    "confidence_threshold": 0.85
  }
}
```

---

### 6.2 `POST /api/v1/admin/rules/{category}/test` — Dry-Run Rule Evaluation
Executes live dry-run test of rule set against mock evidence JSON payload without modifying system state.

- **Security**: Admin Only (`role: ADMIN`)

#### Request Body
```json
{
  "rule_set": {
    "category": "NON_DELIVERY",
    "version": "v1.2-draft",
    "rules": [ ... ]
  },
  "mock_evidence": [
    {
      "side": "MERCHANT",
      "type": "TRACKING",
      "extracted_fields": { "delivery_status": "DELIVERED" }
    }
  ]
}
```

#### Response Body (`200 OK`)
```json
{
  "outcome": "MERCHANT_WIN",
  "confidence": 0.95,
  "rules_fired": [
    { "rule_id": "ND-001", "result": true, "weight": 0.5 }
  ],
  "gemini_invoked": false,
  "explanation": "Carrier tracking confirms delivery on 2026-07-18."
}
```

---

## 7. Internal Service-to-Service Contracts (`/internal/v1/`)

Internal APIs require Google IAM authentication (`roles/run.invoker`) and are isolated behind VPC connectors:

### 7.1 `POST /internal/v1/evaluate` (Rule Engine Service)

```json
// Request Payload (Dispute Service -> Rule Engine Service)
{
  "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
  "category": "NON_DELIVERY",
  "amount": 149.99,
  "currency": "USD",
  "description": "Package never arrived.",
  "evidence_summaries": [
    {
      "side": "MERCHANT",
      "evidence_type": "TRACKING",
      "ocr_text": "Delivered July 18",
      "extracted_fields": { "delivery_status": "DELIVERED" }
    }
  ]
}

// Response Payload (Rule Engine Service -> Dispute Service)
{
  "outcome": "MERCHANT_WIN",
  "confidence": 0.94,
  "explanation": "Shipping records confirm delivery to front door on July 18.",
  "rules_fired": [
    { "rule_id": "ND-001", "result": true, "weight": 0.5 }
  ],
  "ai_reasoning_used": true,
  "evaluator_engine": "Gemini-2.5-Flash-RuleEngine-Hybrid"
}
```

---

### 7.2 `POST /internal/v1/funds/hold` (Funds Service)

```json
// Request Payload
{
  "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
  "amount": 149.99,
  "currency": "USD"
}

// Response Payload
{
  "hold_id": "hld_99001122",
  "status": "HELD",
  "external_hold_ref": "HOLD_STUB_VISA_88291",
  "held_at": "2026-07-23T14:00:01Z"
}
```

---

## 8. Error Code Dictionary

| Error Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Invalid or expired Firebase JWT token |
| `FORBIDDEN` | 403 | User role does not have permission for this resource |
| `DISPUTE_NOT_FOUND` | 404 | Specified dispute UUID does not exist |
| `INVALID_STATE_TRANSITION` | 400 | Disallowed dispute status jump |
| `EVIDENCE_DEADLINE_EXPIRED` | 400 | Attempted to submit evidence after 72-hour window |
| `RAW_PAN_DETECTED` | 400 | Security violation: raw 16-digit card number submitted |
| `FILE_TOO_LARGE` | 413 | Uploaded evidence file exceeds 25 MB limit |
| `INVALID_RULE_SYNTAX` | 422 | YAML rule payload failed syntax schema validation |
| `GEMINI_API_TIMEOUT` | 504 | Gemini 2.5 Flash API call timed out (fallback to default template) |
