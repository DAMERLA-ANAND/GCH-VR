PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('CARDMEMBER','MERCHANT','REVIEWER','ADMIN')),
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    display_name TEXT NOT NULL,
    firebase_uid TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    cardmember_id TEXT NOT NULL,
    merchant_id TEXT NOT NULL,
    transaction_ref TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('NON_DELIVERY','UNAUTHORIZED_CHARGE')),
    status TEXT NOT NULL CHECK (status IN ('FILED','EVIDENCE_COLLECTION','UNDER_REVIEW','VERDICT_ISSUED','APPEALED','CLOSED')),
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    filed_at TEXT NOT NULL,
    evidence_deadline TEXT NOT NULL,
    resolved_at TEXT,
    rule_set_version TEXT DEFAULT 'v1.0',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (length(transaction_ref) < 13 OR transaction_ref GLOB '*[^0-9]*'),
    FOREIGN KEY(cardmember_id) REFERENCES users(id),
    FOREIGN KEY(merchant_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    submitted_by TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('CARDMEMBER','MERCHANT')),
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('RECEIPT','PHOTO','TRACKING','CHAT_LOG','ORDER_CONFIRMATION','OTHER')),
    gcs_uri TEXT NOT NULL,
    ocr_text TEXT,
    extracted_fields TEXT,
    content_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
    FOREIGN KEY(submitted_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS verdicts (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL UNIQUE,
    outcome TEXT NOT NULL CHECK (outcome IN ('CARDMEMBER_WIN','MERCHANT_WIN')),
    explanation TEXT NOT NULL,
    rules_fired TEXT NOT NULL,
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    issued_by TEXT NOT NULL CHECK (issued_by IN ('SYSTEM','HUMAN','AI_SIMULATOR')),
    reviewer_id TEXT,
    issued_at TEXT NOT NULL,
    FOREIGN KEY(dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
    FOREIGN KEY(reviewer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS appeals (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL UNIQUE,
    filed_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('FILED','UNDER_REVIEW','RESOLVED')),
    reviewer_id TEXT,
    review_notes TEXT,
    appeal_outcome TEXT CHECK (appeal_outcome IN ('UPHELD','OVERTURNED')),
    filed_at TEXT NOT NULL,
    resolved_at TEXT,
    FOREIGN KEY(dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
    FOREIGN KEY(filed_by) REFERENCES users(id),
    FOREIGN KEY(reviewer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS funds_holds (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL UNIQUE,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL CHECK (status IN ('HELD','RELEASED_TO_CARDMEMBER','RETURNED_TO_MERCHANT')),
    external_hold_ref TEXT NOT NULL,
    held_at TEXT NOT NULL,
    released_at TEXT,
    FOREIGN KEY(dispute_id) REFERENCES disputes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mediated_requests (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    request_type TEXT NOT NULL,
    message TEXT NOT NULL,
    response_text TEXT,
    response_gcs_uri TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING','RESPONDED','EXPIRED')),
    created_at TEXT NOT NULL,
    responded_at TEXT,
    FOREIGN KEY(dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
    FOREIGN KEY(requested_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(dispute_id) REFERENCES disputes(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS abuse_flags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    dispute_id TEXT,
    flag_type TEXT NOT NULL,
    score REAL NOT NULL CHECK (score >= 0 AND score <= 1),
    details TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(dispute_id) REFERENCES disputes(id)
);

CREATE INDEX IF NOT EXISTS idx_disputes_cardmember_status ON disputes (cardmember_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_merchant_status ON disputes (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_dispute_side ON evidence (dispute_id, side);
CREATE INDEX IF NOT EXISTS idx_disputes_deadline_status ON disputes (evidence_deadline, status);
CREATE INDEX IF NOT EXISTS idx_mediated_requests_dispute_status ON mediated_requests (dispute_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_dispute_created_at ON messages (dispute_id, created_at);
