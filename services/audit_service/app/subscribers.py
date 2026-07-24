from __future__ import annotations

from uuid import UUID

from ...common.database import STORE


def handle_dispute_lifecycle(event: dict[str, object]) -> None:
    STORE.audit_events.append({"subscriber": "audit-service", **event})
