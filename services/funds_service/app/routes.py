from __future__ import annotations

from fastapi import APIRouter

from ...common.database import STORE
from ...common.schemas import FundsHold, HoldStatus

router = APIRouter(prefix="/internal/v1/funds", tags=["funds-service"])


@router.post("/hold")
async def hold_funds(payload: dict[str, object]) -> dict[str, object]:
    from uuid import UUID
    dispute_id = UUID(str(payload["dispute_id"]))
    dispute = STORE.disputes[dispute_id]
    existing = next((hold for hold in STORE.funds_holds.values() if hold.dispute_id == dispute.id), None)
    if existing:
        return {"hold_id": str(existing.id), "status": existing.status.value, "external_hold_ref": existing.external_hold_ref, "held_at": existing.held_at}
    hold = FundsHold(
        dispute_id=dispute.id,
        amount=dispute.amount,
        currency=dispute.currency,
        status=HoldStatus.HELD,
        external_hold_ref="HOLD_STUB_VISA_88291",
    )
    STORE.funds_holds[hold.id] = hold
    STORE.sync_to_db()
    return {"hold_id": str(hold.id), "status": hold.status.value, "external_hold_ref": hold.external_hold_ref, "held_at": hold.held_at}


@router.post("/release")
async def release_funds(payload: dict[str, object]) -> dict[str, object]:
    from uuid import UUID
    dispute_id = UUID(str(payload["dispute_id"]))
    direction = payload.get("direction", "TO_CARDMEMBER")
    hold = next(hold for hold in STORE.funds_holds.values() if hold.dispute_id == dispute_id)
    if direction == "TO_CARDMEMBER":
        hold.status = HoldStatus.RELEASED_TO_CARDMEMBER
    else:
        hold.status = HoldStatus.RETURNED_TO_MERCHANT
    hold.released_at = STORE.now()
    STORE.sync_to_db()
    return {"hold_id": str(hold.id), "status": hold.status.value, "released_at": hold.released_at}

