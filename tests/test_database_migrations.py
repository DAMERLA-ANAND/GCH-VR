from __future__ import annotations

import sqlite3
from pathlib import Path

from services.common.db_migrations import apply_migrations


def test_migration_creates_expected_tables(tmp_path: Path) -> None:
    db_path = tmp_path / "migration.db"
    apply_migrations(str(db_path))
    connection = sqlite3.connect(db_path)
    try:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        expected = {"users", "disputes", "evidence", "verdicts", "appeals", "funds_holds", "mediated_requests", "messages", "abuse_flags"}
        assert expected.issubset(tables)
    finally:
        connection.close()


def test_database_crud_relationships_constraints(tmp_path: Path) -> None:
    db_path = tmp_path / "crud.db"
    apply_migrations(str(db_path))
    connection = sqlite3.connect(db_path)
    connection.execute("PRAGMA foreign_keys = ON;")
    try:
        # users create/read
        connection.execute(
            "INSERT INTO users (id, type, email, phone, display_name, firebase_uid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
            ("u1", "CARDMEMBER", "cm@example.com", None, "CM", "firebase_cm"),
        )
        connection.execute(
            "INSERT INTO users (id, type, email, phone, display_name, firebase_uid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
            ("u2", "MERCHANT", "mer@example.com", None, "MER", "firebase_mer"),
        )

        # disputes create (relationship)
        connection.execute(
            """
            INSERT INTO disputes (id, cardmember_id, merchant_id, transaction_ref, category, status, amount, currency, description, filed_at, evidence_deadline, resolved_at, rule_set_version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now','+3 days'), NULL, ?, datetime('now'), datetime('now'))
            """,
            ("d1", "u1", "u2", "tok_ref_1", "NON_DELIVERY", "FILED", 149.99, "USD", "desc", "v1.0"),
        )

        # evidence create
        connection.execute(
            "INSERT INTO evidence (id, dispute_id, submitted_by, side, evidence_type, gcs_uri, ocr_text, extracted_fields, content_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            ("e1", "d1", "u2", "MERCHANT", "TRACKING", "gs://bucket/d1/e1.pdf", "Delivered", '{"delivery_status":"DELIVERED"}', "hash1"),
        )

        # verdict create
        connection.execute(
            "INSERT INTO verdicts (id, dispute_id, outcome, explanation, rules_fired, confidence, issued_by, reviewer_id, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
            ("v1", "d1", "MERCHANT_WIN", "Delivered", '[{"rule_id":"ND-001"}]', 0.94, "SYSTEM", None),
        )

        # funds hold create
        connection.execute(
            "INSERT INTO funds_holds (id, dispute_id, amount, currency, status, external_hold_ref, held_at, released_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), NULL)",
            ("h1", "d1", 149.99, "USD", "HELD", "HOLD_REF"),
        )

        # message create
        connection.execute(
            "INSERT INTO messages (id, dispute_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
            ("m1", "d1", "u2", "Please review"),
        )

        # mediated request create
        connection.execute(
            "INSERT INTO mediated_requests (id, dispute_id, requested_by, request_type, message, response_text, response_gcs_uri, status, created_at, responded_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, datetime('now'), NULL)",
            ("mr1", "d1", "u2", "REQUEST_PHOTO_PACKAGING", "Need photo", "PENDING"),
        )

        # constraint checks
        try:
            connection.execute(
                "INSERT INTO disputes (id, cardmember_id, merchant_id, transaction_ref, category, status, amount, currency, description, filed_at, evidence_deadline, resolved_at, rule_set_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now','+3 days'), NULL, ?, datetime('now'), datetime('now'))",
                ("d2", "u1", "u2", "1234567890123456", "NON_DELIVERY", "FILED", 10, "USD", "bad pan", "v1.0"),
            )
            assert False, "PAN check should fail"
        except sqlite3.IntegrityError:
            pass

        try:
            connection.execute(
                "INSERT INTO users (id, type, email, phone, display_name, firebase_uid, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
                ("u3", "CARDMEMBER", "cm@example.com", None, "dup", "firebase_dup"),
            )
            assert False, "Unique email should fail"
        except sqlite3.IntegrityError:
            pass

        connection.commit()

        # delete relationship cascade
        connection.execute("DELETE FROM disputes WHERE id = 'd1'")
        remaining_evidence = connection.execute("SELECT COUNT(*) FROM evidence WHERE dispute_id='d1'").fetchone()[0]
        assert remaining_evidence == 0
    finally:
        connection.close()
