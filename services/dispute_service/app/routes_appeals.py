from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status as http_status

from ...common.auth import get_auth_context
from ...common.database import STORE
from ...common.schemas import AppealOutcome, AppealStatus, DisputeStatus, ReviewDecisionRequest, UserRole, VerdictOutcome
from .services import DisputeService

router = APIRouter(prefix="/api/v1", tags=["appeals"])
service = DisputeService()


@router.get("/reviews/queue")
async def review_queue(status: str | None = None, page: int = 1, size: int = 20, auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role != UserRole.REVIEWER:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Reviewer role required")
    items = list(STORE.appeals.values())
    if status:
        items = [appeal for appeal in items if appeal.status.value == status]
    start = (page - 1) * size
    page_items = items[start:start + size]
    return {"items": [appeal.model_dump() for appeal in page_items], "total": len(items)}


@router.post("/reviews/{appeal_id}/decide")
async def decide_review(appeal_id: UUID, payload: dict[str, str], auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role != UserRole.REVIEWER:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Reviewer role required")
    appeal = STORE.appeals.get(appeal_id)
    if appeal is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Appeal not found")
    dispute = STORE.disputes[appeal.dispute_id]
    verdict = service.get_verdict(dispute.id)
    decision = ReviewDecisionRequest.model_validate(payload)
    appeal.status = AppealStatus.RESOLVED
    appeal.reviewer_id = auth.user_id
    appeal.review_notes = decision.review_notes
    appeal.appeal_outcome = decision.appeal_outcome
    appeal.resolved_at = STORE.now()
    dispute.status = DisputeStatus.CLOSED
    if verdict and appeal.appeal_outcome == AppealOutcome.OVERTURNED:
        verdict.outcome = VerdictOutcome.CARDMEMBER_WIN if verdict.outcome == VerdictOutcome.MERCHANT_WIN else VerdictOutcome.MERCHANT_WIN
    STORE.sync_to_db()
    return {"appeal_id": str(appeal.id), "status": appeal.status, "resolved_at": appeal.resolved_at}
