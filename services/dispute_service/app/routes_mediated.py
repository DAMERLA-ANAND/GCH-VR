from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from ...common.auth import get_auth_context
from ...common.database import STORE
from ...common.schemas import UserRole

router = APIRouter(prefix="/api/v1/disputes", tags=["mediated-requests"])


@router.get("/{dispute_id}/mediated-requests")
async def list_mediated_requests(dispute_id: UUID, auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = STORE.disputes.get(dispute_id)
    if dispute is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")
    if auth.user_id not in {dispute.cardmember_id, dispute.merchant_id} and auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    items = [request.model_dump() for request in STORE.mediated_requests.values() if request.dispute_id == dispute_id]
    return {"items": items}
