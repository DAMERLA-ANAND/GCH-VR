# Database Specific Design Document

> **System**: Dispute Resolution Platform Prototype  
> **Primary RDBMS**: PostgreSQL 15 (Cloud SQL)  
> **NoSQL / Audit Store**: Firestore (Native Mode)  
> **Analytics Warehouse**: BigQuery  
> **Blob Store**: Cloud Storage (`drp-evidence`, `drp-rules`)

---

## 1. Relational Schema & Entity Relationship (PostgreSQL 15)

### 1.1 Logical ER Diagram

```
 +------------------+           +----------------------+           +---------------------+
 |      USERS       | 1       * |       DISPUTES       | 1       * |      EVIDENCE       |
 +------------------+-----------+----------------------+-----------+---------------------+
 | id (PK)          |           | id (PK)              |           | id (PK)             |
 | type             |           | cardmember_id (FK)   |           | dispute_id (FK)     |
 | email            |           | merchant_id (FK)     |           | submitted_by (FK)   |
 | firebase_uid     |           | transaction_ref      |           | side                |
 +------------------+           | category             |           | evidence_type       |
                                | status               |           | gcs_uri             |
                                | amount               |           | ocr_text            |
                                | evidence_deadline    |           | extracted_fields    |
                                +----------+-----------+           | content_hash        |
                                           |                       +---------------------+
                                           |
                   +-----------------------+-----------------------+
                   | 1                                           1 | 
         +---------+------------+                        +---------+------------+
         |       VERDICTS       |                        |     FUNDS_HOLDS      |
         +----------------------+                        +----------------------+
         | id (PK)              |                        | id (PK)              |
         | dispute_id (FK, UNQ) |                        | dispute_id (FK, UNQ) |
         | outcome              |                        | amount               |
         | explanation          |                        | status               |
         | rules_fired (JSONB)  |                        | external_hold_ref    |
         | confidence           |                        +----------------------+
         | issued_by            |
         +---------+------------+
                   | 0..1
         +---------+------------+                        +----------------------+
         |       APPEALS        |                        |  MEDIATED_REQUESTS   |
         +----------------------+                        +----------------------+
         | id (PK)              |                        | id (PK)              |
         | dispute_id (FK, UNQ) |                        | dispute_id (FK)      |
         | filed_by (FK)        |                        | requested_by (FK)    |
         | reason               |                        | request_type         |
         | status               |                        | message              |
         | appeal_outcome       |                        | response_text        |
         +----------------------+                        +----------------------+
```

---

## 2. Complete PostgreSQL DDL Script

```sql
-- PostgreSQL 15 DDL for Dispute Resolution Platform

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Enum Types
CREATE TYPE user_type AS ENUM (
    'CARDMEMBER', 
    'MERCHANT', 
    'REVIEWER', 
    'ADMIN'
);

CREATE TYPE dispute_category AS ENUM (
    'NON_DELIVERY', 
    'UNAUTHORIZED_CHARGE'
);

CREATE TYPE dispute_status AS ENUM (
    'FILED', 
    'EVIDENCE_COLLECTION', 
    'UNDER_REVIEW', 
    'VERDICT_ISSUED', 
    'APPEALED', 
    'CLOSED'
);

CREATE TYPE evidence_type AS ENUM (
    'RECEIPT', 
    'PHOTO', 
    'TRACKING', 
    'CHAT_LOG', 
    'ORDER_CONFIRMATION', 
    'OTHER'
);

CREATE TYPE evidence_side AS ENUM (
    'CARDMEMBER', 
    'MERCHANT'
);

CREATE TYPE verdict_outcome AS ENUM (
    'CARDMEMBER_WIN', 
    'MERCHANT_WIN'
);

CREATE TYPE verdict_issuer AS ENUM (
    'SYSTEM', 
    'HUMAN',
    'AI_SIMULATOR'
);

CREATE TYPE hold_status AS ENUM (
    'HELD', 
    'RELEASED_TO_CARDMEMBER', 
    'RETURNED_TO_MERCHANT'
);

CREATE TYPE appeal_status AS ENUM (
    'FILED', 
    'UNDER_REVIEW', 
    'RESOLVED'
);

CREATE TYPE appeal_outcome AS ENUM (
    'UPHELD', 
    'OVERTURNED'
);

CREATE TYPE mediated_request_status AS ENUM (
    'PENDING', 
    'RESPONDED', 
    'EXPIRED'
);

-- Table: USERS
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          user_type       NOT NULL,
    email         VARCHAR(255)    NOT NULL UNIQUE,
    phone         VARCHAR(20),
    display_name  VARCHAR(100)    NOT NULL,
    firebase_uid  VARCHAR(128)    NOT NULL UNIQUE,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Table: DISPUTES
CREATE TABLE disputes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cardmember_id     UUID             NOT NULL REFERENCES users(id),
    merchant_id       UUID             NOT NULL REFERENCES users(id),
    transaction_ref   VARCHAR(128)     NOT NULL, -- Tokenized transaction identifier (NO PAN)
    category          dispute_category NOT NULL,
    status            dispute_status   NOT NULL DEFAULT 'FILED',
    amount            NUMERIC(12,2)    NOT NULL CHECK (amount > 0),
    currency          VARCHAR(3)       NOT NULL DEFAULT 'USD',
    description       TEXT             NOT NULL,
    filed_at          TIMESTAMPTZ      NOT NULL DEFAULT now(),
    evidence_deadline TIMESTAMPTZ      NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
    resolved_at       TIMESTAMPTZ,
    rule_set_version  VARCHAR(64)      DEFAULT 'v1.0',
    created_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- Table: EVIDENCE
CREATE TABLE evidence (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id       UUID           NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by     UUID           NOT NULL REFERENCES users(id),
    side             evidence_side  NOT NULL,
    evidence_type    evidence_type  NOT NULL,
    gcs_uri          TEXT           NOT NULL,
    ocr_text         TEXT,
    extracted_fields JSONB,          -- Structured Document AI output
    content_hash     VARCHAR(64)    NOT NULL, -- SHA-256 integrity check
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Table: VERDICTS
CREATE TABLE verdicts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id  UUID            NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    outcome     verdict_outcome NOT NULL,
    explanation TEXT            NOT NULL, -- Natural plain-language explanation (Gemini 2.5 Flash / Rule Engine)
    rules_fired JSONB           NOT NULL, -- Detailed trace of rules evaluated & weights
    confidence  REAL            NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    issued_by   verdict_issuer  NOT NULL DEFAULT 'SYSTEM',
    reviewer_id UUID            REFERENCES users(id),
    issued_at   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Table: APPEALS
CREATE TABLE appeals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id     UUID           NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    filed_by       UUID           NOT NULL REFERENCES users(id),
    reason         TEXT           NOT NULL,
    status         appeal_status  NOT NULL DEFAULT 'FILED',
    reviewer_id    UUID           REFERENCES users(id),
    review_notes   TEXT,
    appeal_outcome appeal_outcome,
    filed_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    resolved_at    TIMESTAMPTZ
);

-- Table: FUNDS_HOLDS
CREATE TABLE funds_holds (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id       UUID        NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency         VARCHAR(3)  NOT NULL DEFAULT 'USD',
    status           hold_status NOT NULL DEFAULT 'HELD',
    external_hold_ref VARCHAR(128) NOT NULL,
    held_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at      TIMESTAMPTZ
);

-- Table: MEDIATED_REQUESTS
CREATE TABLE mediated_requests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id     UUID                   NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    requested_by   UUID                   NOT NULL REFERENCES users(id),
    request_type   VARCHAR(64)            NOT NULL, -- e.g. "REQUEST_TRACKING_PROOF", "REQUEST_ITEM_DETAILS"
    message        TEXT                   NOT NULL,
    response_text  TEXT,
    response_gcs_uri TEXT,
    status         mediated_request_status NOT NULL DEFAULT 'PENDING',
    created_at     TIMESTAMPTZ            NOT NULL DEFAULT now(),
    responded_at   TIMESTAMPTZ
);

-- Table: ABUSE_FLAGS
CREATE TABLE abuse_flags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id),
    dispute_id UUID        REFERENCES disputes(id),
    flag_type  VARCHAR(64) NOT NULL, -- e.g. "SERIAL_DISPUTER", "CHARGEBACK_SPIKE"
    score      REAL        NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
    details    JSONB       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Indexing Strategy & Performance Tuning

```sql
-- Indexes for Frequent Queries & Joins

-- 1. Dashboard filtering by user & status
CREATE INDEX idx_disputes_cardmember_status ON disputes (cardmember_id, status);
CREATE INDEX idx_disputes_merchant_status ON disputes (merchant_id, status);

-- 2. Evidence lookups per dispute
CREATE INDEX idx_evidence_dispute_side ON evidence (dispute_id, side);

-- 3. Automatic evidence deadline monitor (Cloud Scheduler queries)
CREATE INDEX idx_disputes_deadline_status ON disputes (evidence_deadline, status) 
WHERE status = 'EVIDENCE_COLLECTION';

-- 4. Mediated request pending lookup
CREATE INDEX idx_mediated_requests_dispute_status ON mediated_requests (dispute_id, status);

-- 5. Full text search on evidence OCR text
CREATE INDEX idx_evidence_ocr_trgm ON evidence USING gin (ocr_text gin_trgm_ops);

-- Trigger: Automatic updated_at timestamp maintenance
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE TRIGGER update_disputes_modtime
BEFORE UPDATE ON disputes
FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
```

---

## 4. Firestore Document Schema (Immutable Audit Trail)

```
Collection: audit_events
Document ID: auto-generated (UUID or Timestamp-prefixed)

Schema:
{
  "event_id": "evt_99882233",
  "dispute_id": "00000000-0000-0000-0000-000000000000",
  "actor_id": "user_12345",
  "actor_type": "CARDMEMBER" | "MERCHANT" | "SYSTEM" | "REVIEWER",
  "action": "DISPUTE_FILED" | "EVIDENCE_SUBMITTED" | "MEDIATED_REQUEST_SENT" | "VERDICT_ISSUED" | "APPEAL_FILED" | "FUNDS_RELEASED",
  "payload": {
    "category": "NON_DELIVERY",
    "amount": 149.99,
    "rule_set_version": "v1.0",
    "confidence": 0.94,
    "verdict_outcome": "MERCHANT_WIN"
  },
  "payload_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // SHA-256
  "timestamp": Timestamp("2026-07-23T14:00:00Z"),
  "environment": "prototype-gcp"
}
```

---

## 5. BigQuery Analytics Partitioning & Schema

**Dataset**: `drp_analytics`  
**Table**: `dispute_events` (Partitioned by `timestamp` DAY, Clustered by `category`, `verdict_outcome`)

```sql
CREATE TABLE `drp_analytics.dispute_events` (
  dispute_id STRING NOT NULL,
  event_type STRING NOT NULL,
  actor_id STRING,
  actor_type STRING,
  category STRING,
  amount NUMERIC,
  verdict_outcome STRING,
  confidence FLOAT64,
  duration_seconds INT64,
  payload_json STRING,
  timestamp TIMESTAMP NOT NULL
)
PARTITION BY DATE(timestamp)
CLUSTER BY category, verdict_outcome;
```

---

## 6. Key Data Integrity Rules & Constraints

1. **Tokenization Guard**: `transaction_ref` MUST NOT match a standard 16-digit PAN pattern (`^[0-9]{13,19}$`). Enforced in application layer and via check constraint:
   ```sql
   ALTER TABLE disputes ADD CONSTRAINT check_no_raw_pan 
   CHECK (transaction_ref NOT SIMILAR TO '[0-9]{13,19}');
   ```
2. **Immutable Verdicts**: Verdicts cannot be modified once written. Override decisions during appeals write a new `appeals` record and trigger state transition, keeping the original `verdict` intact.
3. **Evidence Integrity**: `content_hash` calculated on raw file bytes before GCS upload to guarantee anti-tampering verification.
