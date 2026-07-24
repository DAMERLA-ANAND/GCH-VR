from __future__ import annotations

from fastapi.testclient import TestClient

from services.audit_service.main import app as audit_app
from services.common.database import STORE
from services.dispute_service.main import app as dispute_app
from services.notification_service.main import app as notification_app


def test_transaction_feed_notifications_and_audit_logs(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(dispute_app) as dispute_client:
        create = dispute_client.post(
            "/api/v1/disputes",
            headers=auth_headers["cardmember"],
            json={
                "transaction_ref": "tok_surface_001",
                "category": "NON_DELIVERY",
                "amount": 149.99,
                "currency": "USD",
                "description": "Surface coverage test",
            },
        )
        assert create.status_code == 201
        dispute_id = create.json()["id"]

        transactions = dispute_client.get("/api/v1/transactions", headers=auth_headers["cardmember"])
        assert transactions.status_code == 200
        assert transactions.json()["total"] >= 5
        assert all("id" in item and "merchant_name" in item for item in transactions.json()["items"])

        merchant_forbidden = dispute_client.get("/api/v1/transactions", headers=auth_headers["merchant"])
        assert merchant_forbidden.status_code == 403

    with TestClient(notification_app) as notification_client:
        notifications = notification_client.get("/api/v1/notifications", params={"dispute_id": dispute_id})
        assert notifications.status_code == 200
        assert notifications.json()["total"] >= 2
        assert all(item["dispute_id"] == dispute_id for item in notifications.json()["items"])

    with TestClient(audit_app) as audit_client:
        audit_logs = audit_client.get("/api/v1/audit-logs", params={"dispute_id": dispute_id})
        assert audit_logs.status_code == 200
        assert audit_logs.json()["total"] >= 1
        assert all(item["payload_hash"] for item in audit_logs.json()["items"])


def test_auth_and_validation_failures(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(dispute_app) as client:
        missing_auth = client.post(
            "/api/v1/disputes",
            json={
                "transaction_ref": "tok_surface_002",
                "category": "NON_DELIVERY",
                "amount": 149.99,
                "currency": "USD",
                "description": "Missing auth test",
            },
        )
        assert missing_auth.status_code == 401

        wrong_role = client.post(
            "/api/v1/disputes",
            headers=auth_headers["merchant"],
            json={
                "transaction_ref": "tok_surface_003",
                "category": "NON_DELIVERY",
                "amount": 149.99,
                "currency": "USD",
                "description": "Merchant cannot file dispute",
            },
        )
        assert wrong_role.status_code == 403

        invalid_pan = client.post(
            "/api/v1/disputes",
            headers=auth_headers["cardmember"],
            json={
                "transaction_ref": "1234567890123456",
                "category": "NON_DELIVERY",
                "amount": 149.99,
                "currency": "USD",
                "description": "Raw PAN should fail",
            },
        )
        assert invalid_pan.status_code == 422


def test_notify_and_audit_endpoints_support_filters(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(dispute_app) as dispute_client:
        create = dispute_client.post(
            "/api/v1/disputes",
            headers=auth_headers["cardmember"],
            json={
                "transaction_ref": "tok_surface_004",
                "category": "NON_DELIVERY",
                "amount": 75.25,
                "currency": "USD",
                "description": "Filter test",
            },
        )
        dispute_id = create.json()["id"]

    cardmember = next(user for user in STORE.users.values() if user.email == "alice@example.com")

    with TestClient(notification_app) as notification_client:
        by_user = notification_client.get("/api/v1/notifications", params={"user_id": str(cardmember.id)})
        assert by_user.status_code == 200
        assert by_user.json()["total"] >= 1

    with TestClient(audit_app) as audit_client:
        by_action = audit_client.get("/api/v1/audit-logs", params={"action_type": "DISPUTE_FILED"})
        assert by_action.status_code == 200
        assert by_action.json()["total"] >= 1
        by_dispute = audit_client.get("/api/v1/audit-logs", params={"dispute_id": dispute_id})
        assert by_dispute.status_code == 200
        assert by_dispute.json()["total"] >= 1