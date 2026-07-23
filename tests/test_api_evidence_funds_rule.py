from __future__ import annotations

from fastapi.testclient import TestClient

from services.common.database import STORE
from services.common.schemas import DisputeStatus
from services.dispute_service.main import app as dispute_app
from services.evidence_service.main import app as evidence_app
from services.funds_service.main import app as funds_app
from services.rule_engine.main import app as rule_app


def test_evidence_endpoints(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(dispute_app) as dispute_client:
        created = dispute_client.post(
            "/api/v1/disputes",
            headers=auth_headers["cardmember"],
            json={
                "transaction_ref": "tok_test_002",
                "category": "NON_DELIVERY",
                "amount": 200,
                "currency": "USD",
                "description": "Evidence upload test",
            },
        )
        dispute_id = created.json()["id"]

    with TestClient(evidence_app) as evidence_client:
        upload = evidence_client.post(
            f"/api/v1/disputes/{dispute_id}/evidence",
            headers=auth_headers["merchant"],
            files={
                "file": ("tracking.txt", b"USPS Tracking Number: 9400111899223\\nStatus: Delivered", "text/plain"),
            },
            data={"evidence_type": "TRACKING"},
        )
        assert upload.status_code == 201
        evidence_id = upload.json()["id"]

        listing = evidence_client.get(f"/api/v1/disputes/{dispute_id}/evidence", headers=auth_headers["cardmember"])
        assert listing.status_code == 200
        assert len(listing.json()["items"]) == 1

        download = evidence_client.get(f"/api/v1/evidence/{evidence_id}/download", headers=auth_headers["merchant"])
        assert download.status_code == 200
        assert "signed_url" in download.json()


def test_funds_and_rule_engine_endpoints(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(dispute_app) as dispute_client:
        created = dispute_client.post(
            "/api/v1/disputes",
            headers=auth_headers["cardmember"],
            json={
                "transaction_ref": "tok_test_003",
                "category": "NON_DELIVERY",
                "amount": 100,
                "currency": "USD",
                "description": "Funds test",
            },
        )
        dispute_id = created.json()["id"]

    with TestClient(funds_app) as funds_client:
        hold = funds_client.post("/internal/v1/funds/hold", json={"dispute_id": dispute_id, "amount": 100, "currency": "USD"})
        assert hold.status_code == 200
        assert hold.json()["status"] == "HELD"

        release = funds_client.post("/internal/v1/funds/release", json={"dispute_id": dispute_id, "direction": "TO_MERCHANT"})
        assert release.status_code == 200
        assert release.json()["status"] == "RETURNED_TO_MERCHANT"

    with TestClient(rule_app) as rule_client:
        categories = rule_client.get("/api/v1/admin/rules/categories")
        assert categories.status_code == 200
        assert len(categories.json()) >= 1

        get_rule = rule_client.get("/api/v1/admin/rules/NON_DELIVERY")
        assert get_rule.status_code == 200

        dry_run = rule_client.post(
            "/api/v1/admin/rules/NON_DELIVERY/test",
            headers=auth_headers["admin"],
            json={
                "rule_set": {
                    "category": "NON_DELIVERY",
                    "version": "v1.2-draft",
                    "rules": [
                        {
                            "id": "ND-001",
                            "name": "tracking_confirms_delivery",
                            "description": "Tracking shows delivered to cardmember address",
                            "conditions": [
                                {
                                    "field": "merchant.evidence.TRACKING.extracted_fields.delivery_status",
                                    "operator": "eq",
                                    "value": "DELIVERED",
                                }
                            ],
                            "outcome": "MERCHANT_WIN",
                            "weight": 0.5,
                            "explanation_template": "Carrier tracking confirms delivery.",
                        }
                    ],
                    "gemini_fallback": {"enabled": True, "confidence_threshold": 0.85},
                },
                "mock_evidence": [
                    {
                        "side": "MERCHANT",
                        "evidence_type": "TRACKING",
                        "extracted_fields": {"delivery_status": "DELIVERED"},
                    }
                ],
            },
        )
        assert dry_run.status_code == 200
        assert dry_run.json()["outcome"] in {"MERCHANT_WIN", "CARDMEMBER_WIN"}

        put_rule = rule_client.put(
            "/api/v1/admin/rules/NON_DELIVERY",
            json=get_rule.json(),
        )
        assert put_rule.status_code == 200

        internal_eval = rule_client.post(
            "/internal/v1/evaluate",
            json={
                "dispute_id": dispute_id,
                "category": "NON_DELIVERY",
                "amount": 149.99,
                "currency": "USD",
                "description": "Package never arrived",
                "evidence_summaries": [
                    {
                        "side": "MERCHANT",
                        "evidence_type": "TRACKING",
                        "ocr_text": "Delivered July 18",
                        "extracted_fields": {"delivery_status": "DELIVERED"},
                    }
                ],
            },
        )
        assert internal_eval.status_code == 200
