from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ...common.auth import get_auth_context
from ...common.database import STORE
from ...common.schemas import UserRole

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role not in {UserRole.CARDMEMBER, UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cardmember role required")
    items = [transaction for transaction in STORE.transactions.values() if auth.role != UserRole.CARDMEMBER or transaction.user_id == auth.user_id]
    items.sort(key=lambda item: item.posted_at, reverse=True)
    response = []
    for transaction in items:
        active_dispute = next((dispute for dispute in STORE.disputes.values() if dispute.transaction_ref == transaction.transaction_ref), None)
        response.append({
            **transaction.model_dump(),
            "id": str(transaction.id),
            "user_id": str(transaction.user_id),
            "dispute_id": str(active_dispute.id) if active_dispute else None,
            "active_dispute_status": active_dispute.status if active_dispute else None,
        })
    return {"items": response, "total": len(response)}