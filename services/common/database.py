from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import json
import os
import sqlite3
from typing import Any
from uuid import UUID, uuid4

from .db_migrations import apply_migrations
from .schemas import (
    Appeal,
    AppealOutcome,
    AppealStatus,
    AuditLogRecord,
    Dispute,
    DisputeCategory,
    DisputeStatus,
    EvidenceRecord,
    EvidenceSide,
    EvidenceType,
    FundsHold,
    HoldStatus,
    MediatedRequest,
    Message,
    NotificationRecord,
    TransactionRecord,
    RuleSet,
    User,
    UserRole,
    Verdict,
    VerdictIssuer,
    VerdictOutcome,
)


class InMemoryStore:
    def __init__(self) -> None:
        self.db_path = os.getenv("DRP_DB_PATH", "drp.db")
        apply_migrations(self.db_path)
        self.users: dict[UUID, User] = {}
        self.disputes: dict[UUID, Dispute] = {}
        self.evidence: dict[UUID, EvidenceRecord] = {}
        self.evidence_blobs: dict[UUID, tuple[bytes, str]] = {}
        self.verdicts: dict[UUID, Verdict] = {}
        self.appeals: dict[UUID, Appeal] = {}
        self.funds_holds: dict[UUID, FundsHold] = {}
        self.messages: dict[UUID, Message] = {}
        self.mediated_requests: dict[UUID, MediatedRequest] = {}
        self.transactions: dict[UUID, TransactionRecord] = {}
        self.notifications: dict[UUID, NotificationRecord] = {}
        self.audit_logs: dict[UUID, AuditLogRecord] = {}
        self.audit_events: list[dict[str, Any]] = []
        self.rule_sets: dict[DisputeCategory, RuleSet] = {}
        self.transaction_map: dict[str, UUID] = {}
        self.current_time: datetime = datetime.now(timezone.utc)
        self.seed_defaults()
        self.sync_to_db()

    def seed_defaults(self) -> None:
        if self.users:
            return
        self.transactions.clear()
        self.notifications.clear()
        self.audit_logs.clear()
        cardmember = User(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            type=UserRole.CARDMEMBER,
            email="alice@example.com",
            display_name="Alice Cardmember",
            firebase_uid="firebase_uid_cardmember",
        )
        merchant = User(
            id=UUID("00000000-0000-0000-0000-000000000002"),
            type=UserRole.MERCHANT,
            email="merchant_techstore@example.com",
            display_name="TechStore Merchant",
            firebase_uid="firebase_uid_merchant",
        )
        reviewer = User(
            id=UUID("00000000-0000-0000-0000-000000000003"),
            type=UserRole.REVIEWER,
            email="reviewer_bob@example.com",
            display_name="Bob Reviewer",
            firebase_uid="firebase_uid_reviewer",
        )
        admin = User(
            id=UUID("00000000-0000-0000-0000-000000000004"),
            type=UserRole.ADMIN,
            email="admin@example.com",
            display_name="Platform Admin",
            firebase_uid="firebase_uid_admin",
        )
        merchant.merchant_id = merchant.id
        self.users[cardmember.id] = cardmember
        self.users[merchant.id] = merchant
        self.users[reviewer.id] = reviewer
        self.users[admin.id] = admin
        self.transaction_map["tok_visa_txn_998877"] = merchant.id
        self.transaction_map["tok_abc123"] = merchant.id
        self.transaction_map["tok_demo_unauthorized"] = merchant.id
        for transaction_ref, merchant_name, amount, description in [
            ("tok_visa_txn_998877", "TechStore Online", 149.99, "Ordered sneakers on July 10th."),
            ("tok_sneaker_001", "Sneaker World", 210.00, "Running shoes purchase."),
            ("tok_unknown_002", "Unknown Vendor NYC", 89.50, "Unclear point-of-sale charge."),
            ("tok_air_003", "Airline Tickets", 450.00, "Travel booking charge."),
            ("tok_coffee_004", "Coffee Shop", 4.75, "Morning coffee purchase."),
        ]:
            transaction = TransactionRecord(
                user_id=cardmember.id,
                transaction_ref=transaction_ref,
                merchant_name=merchant_name,
                amount=amount,
                description=description,
            )
            self.transactions[transaction.id] = transaction

    def now(self) -> datetime:
        return self.current_time

    def advance_time(self, hours: int) -> datetime:
        self.current_time = self.current_time + timedelta(hours=hours)
        return self.current_time

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.execute("PRAGMA foreign_keys = ON;")
        return connection

    def sync_to_db(self) -> None:
        connection = self._connect()
        try:
            cursor = connection.cursor()
            cursor.executescript(
                """
                DELETE FROM messages;
                DELETE FROM mediated_requests;
                DELETE FROM appeals;
                DELETE FROM verdicts;
                DELETE FROM evidence;
                DELETE FROM funds_holds;
                DELETE FROM disputes;
                DELETE FROM audit_logs;
                DELETE FROM notifications;
                DELETE FROM transactions;
                DELETE FROM users;
                """
            )

            for user in self.users.values():
                cursor.execute(
                    """
                    INSERT INTO users (id, type, email, phone, display_name, firebase_uid, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(user.id),
                        user.type.value,
                        user.email,
                        user.phone,
                        user.display_name,
                        user.firebase_uid,
                        user.created_at.isoformat(),
                        user.updated_at.isoformat(),
                    ),
                )

            for dispute in self.disputes.values():
                cursor.execute(
                    """
                    INSERT INTO disputes (id, cardmember_id, merchant_id, transaction_ref, category, status, amount, currency, description, filed_at, evidence_deadline, resolved_at, rule_set_version, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(dispute.id),
                        str(dispute.cardmember_id),
                        str(dispute.merchant_id),
                        dispute.transaction_ref,
                        dispute.category.value,
                        dispute.status.value,
                        dispute.amount,
                        dispute.currency,
                        dispute.description,
                        dispute.filed_at.isoformat(),
                        dispute.evidence_deadline.isoformat(),
                        dispute.resolved_at.isoformat() if dispute.resolved_at else None,
                        dispute.rule_set_version,
                        dispute.created_at.isoformat(),
                        dispute.updated_at.isoformat(),
                    ),
                )

            for evidence in self.evidence.values():
                cursor.execute(
                    """
                    INSERT INTO evidence (id, dispute_id, submitted_by, side, evidence_type, gcs_uri, ocr_text, extracted_fields, content_hash, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(evidence.id),
                        str(evidence.dispute_id),
                        str(evidence.submitted_by),
                        evidence.side.value,
                        evidence.evidence_type.value,
                        evidence.gcs_uri,
                        evidence.ocr_text,
                        json.dumps(evidence.extracted_fields) if evidence.extracted_fields else None,
                        evidence.content_hash,
                        evidence.created_at.isoformat(),
                    ),
                )

            for verdict in self.verdicts.values():
                cursor.execute(
                    """
                    INSERT INTO verdicts (id, dispute_id, outcome, explanation, rules_fired, confidence, issued_by, reviewer_id, issued_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(verdict.id),
                        str(verdict.dispute_id),
                        verdict.outcome.value,
                        verdict.explanation,
                        json.dumps(verdict.rules_fired),
                        verdict.confidence,
                        verdict.issued_by.value,
                        str(verdict.reviewer_id) if verdict.reviewer_id else None,
                        verdict.issued_at.isoformat(),
                    ),
                )

            for appeal in self.appeals.values():
                cursor.execute(
                    """
                    INSERT INTO appeals (id, dispute_id, filed_by, reason, status, reviewer_id, review_notes, appeal_outcome, filed_at, resolved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(appeal.id),
                        str(appeal.dispute_id),
                        str(appeal.filed_by),
                        appeal.reason,
                        appeal.status.value,
                        str(appeal.reviewer_id) if appeal.reviewer_id else None,
                        appeal.review_notes,
                        appeal.appeal_outcome.value if appeal.appeal_outcome else None,
                        appeal.filed_at.isoformat(),
                        appeal.resolved_at.isoformat() if appeal.resolved_at else None,
                    ),
                )

            for hold in self.funds_holds.values():
                cursor.execute(
                    """
                    INSERT INTO funds_holds (id, dispute_id, amount, currency, status, external_hold_ref, held_at, released_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(hold.id),
                        str(hold.dispute_id),
                        hold.amount,
                        hold.currency,
                        hold.status.value,
                        hold.external_hold_ref,
                        hold.held_at.isoformat(),
                        hold.released_at.isoformat() if hold.released_at else None,
                    ),
                )

            for req in self.mediated_requests.values():
                cursor.execute(
                    """
                    INSERT INTO mediated_requests (id, dispute_id, requested_by, request_type, message, response_text, response_gcs_uri, status, created_at, responded_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(req.id),
                        str(req.dispute_id),
                        str(req.requested_by),
                        req.request_type,
                        req.message,
                        req.response_text,
                        req.response_gcs_uri,
                        req.status.value,
                        req.created_at.isoformat(),
                        req.responded_at.isoformat() if req.responded_at else None,
                    ),
                )

            for transaction in self.transactions.values():
                cursor.execute(
                    """
                    INSERT INTO transactions (id, user_id, transaction_ref, merchant_name, amount, currency, posted_at, description, mcc, category, dispute_id, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(transaction.id),
                        str(transaction.user_id),
                        transaction.transaction_ref,
                        transaction.merchant_name,
                        transaction.amount,
                        transaction.currency,
                        transaction.posted_at.isoformat(),
                        transaction.description,
                        transaction.mcc,
                        transaction.category.value if transaction.category else None,
                        str(transaction.dispute_id) if transaction.dispute_id else None,
                        transaction.status,
                    ),
                )

            for notification in self.notifications.values():
                cursor.execute(
                    """
                    INSERT INTO notifications (id, user_id, dispute_id, event_type, channel, subject, body, payload, created_at, delivery_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(notification.id),
                        str(notification.user_id),
                        str(notification.dispute_id) if notification.dispute_id else None,
                        notification.event_type,
                        notification.channel,
                        notification.subject,
                        notification.body,
                        json.dumps(notification.payload),
                        notification.created_at.isoformat(),
                        notification.delivery_status,
                    ),
                )

            for audit_log in self.audit_logs.values():
                cursor.execute(
                    """
                    INSERT INTO audit_logs (id, dispute_id, actor_id, actor_type, action, payload, payload_hash, timestamp, environment)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        str(audit_log.id),
                        str(audit_log.dispute_id),
                        audit_log.actor_id,
                        audit_log.actor_type,
                        audit_log.action,
                        json.dumps(audit_log.payload),
                        audit_log.payload_hash,
                        audit_log.timestamp.isoformat(),
                        audit_log.environment,
                    ),
                )

            for message in self.messages.values():
                cursor.execute(
                    """
                    INSERT INTO messages (id, dispute_id, sender_id, content, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        str(message.id),
                        str(message.dispute_id),
                        str(message.sender_id),
                        message.content,
                        message.created_at.isoformat(),
                    ),
                )

            connection.commit()
        finally:
            connection.close()


STORE = InMemoryStore()


@asynccontextmanager
async def get_store() -> AsyncIterator[InMemoryStore]:
    yield STORE


async def seed_demo_data() -> dict[str, int]:
    STORE.seed_defaults()
    cardmember = next(user for user in STORE.users.values() if user.type == UserRole.CARDMEMBER)
    merchant = next(user for user in STORE.users.values() if user.type == UserRole.MERCHANT)
    dispute = Dispute(
        cardmember_id=cardmember.id,
        merchant_id=merchant.id,
        transaction_ref="tok_visa_txn_998877",
        category=DisputeCategory.NON_DELIVERY,
        amount=149.99,
        currency="USD",
        description="Ordered sneakers on July 10th. Merchant provided no tracking and package has not arrived.",
        filed_at=STORE.now(),
        evidence_deadline=STORE.now() + timedelta(hours=72),
        rule_set_version="v1.0",
    )
    STORE.disputes[dispute.id] = dispute
    hold = FundsHold(
        dispute_id=dispute.id,
        amount=dispute.amount,
        currency=dispute.currency,
        status=HoldStatus.HELD,
        external_hold_ref="HOLD_STUB_VISA_88291",
        held_at=STORE.now(),
    )
    STORE.funds_holds[hold.id] = hold
    evidence_record = EvidenceRecord(
        dispute_id=dispute.id,
        submitted_by=merchant.id,
        side=EvidenceSide.MERCHANT,
        evidence_type=EvidenceType.TRACKING,
        gcs_uri=f"gs://drp-evidence-dev/{dispute.id}/evi_seed.pdf",
        content_hash="seeded_hash",
        ocr_text="USPS Tracking Number: 9400111899223\nStatus: Delivered July 18 2026 2:34pm",
        extracted_fields={
            "carrier": "USPS",
            "tracking_number": "9400111899223",
            "delivery_status": "DELIVERED",
            "delivery_date": "2026-07-18",
        },
    )
    STORE.evidence[evidence_record.id] = evidence_record
    verdict = Verdict(
        dispute_id=dispute.id,
        outcome=VerdictOutcome.MERCHANT_WIN,
        explanation="Shipping records confirm delivery to your registered address on July 18.",
        rules_fired=[{"rule_id": "ND-001", "result": True, "weight": 0.5}],
        confidence=0.94,
        issued_by=VerdictIssuer.SYSTEM,
        issued_at=STORE.now(),
    )
    STORE.verdicts[verdict.id] = verdict
    dispute.status = DisputeStatus.VERDICT_ISSUED
    dispute.resolved_at = STORE.now()
    STORE.sync_to_db()
    return {
        "users_created": 4,
        "disputes_created": 1,
        "evidence_created": 1,
        "verdicts_created": 1,
        "appeals_created": 0,
        "funds_holds_created": 1,
    }
