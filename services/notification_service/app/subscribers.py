from __future__ import annotations

from uuid import UUID

from ...common.database import STORE
from ...common.schemas import NotificationRecord


def _build_notification(event_type: str, dispute_id: UUID, user_id: UUID, channel: str, subject: str, body: str) -> NotificationRecord:
    return NotificationRecord(
        user_id=user_id,
        dispute_id=dispute_id,
        event_type=event_type,
        channel=channel,
        subject=subject,
        body=body,
        payload={"event_type": event_type, "channel": channel},
    )


def handle_dispute_lifecycle(event: dict[str, object]) -> None:
    dispute_id = UUID(str(event.get("dispute_id")))
    dispute = STORE.disputes.get(dispute_id)
    if dispute is None:
        return
    event_type = str(event.get("event_type", "DISPUTE_EVENT"))
    subject_map = {
        "DISPUTE_FILED": "Dispute filed",
        "VERDICT_ISSUED": "Verdict issued",
        "APPEAL_FILED": "Appeal filed",
        "APPEAL_RESOLVED": "Appeal resolved",
        "MEDIATED_REQUEST_CREATED": "Mediated request created",
        "EVIDENCE_SUBMITTED": "Evidence submitted",
    }
    body_map = {
        "DISPUTE_FILED": "A new dispute has been filed.",
        "VERDICT_ISSUED": "A verdict has been issued for the dispute.",
        "APPEAL_FILED": "An appeal has been filed.",
        "APPEAL_RESOLVED": "The appeal review has completed.",
        "MEDIATED_REQUEST_CREATED": "A mediated request requires attention.",
        "EVIDENCE_SUBMITTED": "New evidence was submitted.",
    }
    recipients = [dispute.cardmember_id, dispute.merchant_id]
    for recipient_id in recipients:
        for channel in ("email", "push"):
            notification = _build_notification(
                event_type=event_type,
                dispute_id=dispute_id,
                user_id=recipient_id,
                channel=channel,
                subject=subject_map.get(event_type, "Dispute update"),
                body=body_map.get(event_type, "The dispute has been updated."),
            )
            STORE.notifications[notification.id] = notification
    STORE.sync_to_db()
