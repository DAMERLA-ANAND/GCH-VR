from __future__ import annotations

from typing import Any

from .database import STORE
from .observability import get_telemetry


class EventPublisher:
    def __init__(self, service_name: str):
        self.telemetry = get_telemetry(service_name)
        self.events: list[dict[str, Any]] = []

    def publish(self, topic: str, payload: dict[str, Any]) -> None:
        event = {"topic": topic, **payload}
        self.events.append(event)
        self.telemetry.log_event(topic, payload)
        
        # Dispatch to in-memory subscribers for notification and audit tracking
        try:
            from ..notification_service.app.subscribers import handle_dispute_lifecycle as handle_notif
            handle_notif(event)
        except Exception:
            pass
        try:
            from ..audit_service.app.subscribers import handle_dispute_lifecycle as handle_audit
            handle_audit(event)
        except Exception:
            pass


def record_audit_event(action: str, dispute_id: str, actor_id: str, actor_type: str, payload: dict[str, Any]) -> None:
    STORE.audit_events.append(
        {
            "action": action,
            "dispute_id": dispute_id,
            "actor_id": actor_id,
            "actor_type": actor_type,
            "payload": payload,
            "timestamp": payload.get("timestamp") or STORE.now().isoformat(),
        }
    )


PUBLISHER = EventPublisher("events")

