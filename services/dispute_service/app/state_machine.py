from __future__ import annotations

from fastapi import HTTPException, status

from ...common.schemas import DisputeStatus

ALLOWED_TRANSITIONS = {
    DisputeStatus.FILED: {DisputeStatus.EVIDENCE_COLLECTION},
    DisputeStatus.EVIDENCE_COLLECTION: {DisputeStatus.UNDER_REVIEW},
    DisputeStatus.UNDER_REVIEW: {DisputeStatus.VERDICT_ISSUED},
    DisputeStatus.VERDICT_ISSUED: {DisputeStatus.APPEALED, DisputeStatus.CLOSED},
    DisputeStatus.APPEALED: {DisputeStatus.CLOSED},
    DisputeStatus.CLOSED: set(),
}


def validate_state_transition(current_status: DisputeStatus, target_status: DisputeStatus) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition from {current_status} to {target_status}",
        )
