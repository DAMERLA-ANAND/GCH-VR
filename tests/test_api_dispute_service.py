from __future__ import annotations

from fastapi.testclient import TestClient

from services.common.database import STORE
from services.common.schemas import AppealStatus, DisputeStatus
from services.dispute_service.main import app


def test_dispute_endpoints(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(app) as client:
        create = client.post(
            "/api/v1/disputes",
            headers=auth_headers["cardmember"],
            json={
                "transaction_ref": "tok_test_001",
                "category": "NON_DELIVERY",
                "amount": 149.99,
                "currency": "USD",
                "description": "Package never arrived",
            },
        )
        assert create.status_code == 201
        dispute_id = create.json()["id"]

        get_one = client.get(f"/api/v1/disputes/{dispute_id}", headers=auth_headers["cardmember"])
        assert get_one.status_code == 200
        assert get_one.json()["status"] == "FILED"

        get_many = client.get("/api/v1/disputes", headers=auth_headers["cardmember"])
        assert get_many.status_code == 200
        assert get_many.json()["total"] >= 1

        msg_create = client.post(
            f"/api/v1/disputes/{dispute_id}/messages",
            headers=auth_headers["merchant"],
            json={"content": "Please review the tracking proof."},
        )
        assert msg_create.status_code == 200

        msg_list = client.get(f"/api/v1/disputes/{dispute_id}/messages", headers=auth_headers["cardmember"])
        assert msg_list.status_code == 200
        assert len(msg_list.json()["items"]) == 1

        mediated = client.post(
            f"/api/v1/disputes/{dispute_id}/mediated-requests",
            headers=auth_headers["merchant"],
            json={
                "request_type": "REQUEST_PHOTO_PACKAGING",
                "message": "Please upload a clear photo of the label.",
            },
        )
        assert mediated.status_code == 200
        assert mediated.json()["status"] == "PENDING"

        timeline = client.get(f"/api/v1/disputes/{dispute_id}/timeline", headers=auth_headers["cardmember"])
        assert timeline.status_code == 200
        assert len(timeline.json()["events"]) >= 3

        no_verdict = client.get(f"/api/v1/disputes/{dispute_id}/verdict", headers=auth_headers["cardmember"])
        assert no_verdict.status_code == 404


def test_appeal_and_review_endpoints(auth_headers: dict[str, dict[str, str]]) -> None:
    with TestClient(app) as client:
        seed = client.post("/api/v1/prototype/seed")
        assert seed.status_code == 200

        seeded_dispute = next(dispute for dispute in STORE.disputes.values() if dispute.status == DisputeStatus.VERDICT_ISSUED)
        appeal = client.post(
            f"/api/v1/disputes/{seeded_dispute.id}/appeal",
            headers=auth_headers["cardmember"],
            json={"reason": "Carrier tracking zip code mismatch", "simulate_ai_reviewer": True},
        )
        assert appeal.status_code == 202
        assert appeal.json()["simulated_outcome"]["appeal_outcome"] == "OVERTURNED"

        queue = client.get("/api/v1/reviews/queue", headers=auth_headers["reviewer"])
        assert queue.status_code == 200
        assert queue.json()["total"] >= 1

        pending_appeal = next(item for item in STORE.appeals.values() if item.status == AppealStatus.FILED)
        decide = client.post(
            f"/api/v1/reviews/{pending_appeal.id}/decide",
            headers=auth_headers["reviewer"],
            json={"appeal_outcome": "UPHELD", "review_notes": "Manual review completed"},
        )
        assert decide.status_code == 200
        assert decide.json()["status"] == "RESOLVED"
