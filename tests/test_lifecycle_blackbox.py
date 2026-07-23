from __future__ import annotations

from fastapi.testclient import TestClient

from services.common.database import STORE
from services.common.schemas import DisputeStatus
from services.dispute_service.main import app as dispute_app
from services.evidence_service.main import app as evidence_app
from services.rule_engine.main import app as rule_app


def test_blackbox_lifecycle_flow(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(dispute_app) as dispute_client:
        created = dispute_client.post(
            "/api/v1/disputes",
            headers=auth_headers["cardmember"],
            json={
                "transaction_ref": "tok_test_900",
                "category": "NON_DELIVERY",
                "amount": 149.99,
                "currency": "USD",
                "description": "Package never arrived",
            },
        )
        assert created.status_code == 201
        dispute_id = created.json()["id"]

        dispute = STORE.disputes[next(key for key in STORE.disputes if str(key) == dispute_id)]
        dispute.status = DisputeStatus.EVIDENCE_COLLECTION

    with TestClient(evidence_app) as evidence_client:
        upload = evidence_client.post(
            f"/api/v1/disputes/{dispute_id}/evidence",
            headers=auth_headers["merchant"],
            files={"file": ("tracking.txt", b"USPS Delivered", "text/plain")},
            data={"evidence_type": "TRACKING"},
        )
        assert upload.status_code == 201

    with TestClient(rule_app) as rule_client:
        result = rule_client.post(
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
                        "ocr_text": "Delivered",
                        "extracted_fields": {"delivery_status": "DELIVERED"},
                    }
                ],
            },
        )
        assert result.status_code == 200

    with TestClient(dispute_app) as dispute_client:
        seeded = dispute_client.post("/api/v1/prototype/seed")
        assert seeded.status_code == 200
        verdict_dispute = next(d for d in STORE.disputes.values() if d.status == DisputeStatus.VERDICT_ISSUED)
        appeal = dispute_client.post(
            f"/api/v1/disputes/{verdict_dispute.id}/appeal",
            headers=auth_headers["cardmember"],
            json={"reason": "zip code mismatch", "simulate_ai_reviewer": True},
        )
        assert appeal.status_code == 202
        assert appeal.json()["simulated_outcome"]["appeal_outcome"] == "OVERTURNED"
