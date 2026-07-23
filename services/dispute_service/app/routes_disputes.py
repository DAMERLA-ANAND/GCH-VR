from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ...common.auth import get_auth_context
from ...common.database import STORE
from ...common.schemas import AppealCreateRequest, DisputeCreateRequest, DisputeStatus, DisputeSummary, MessageCreateRequest, MediatedRequestCreateRequest, UserRole
from .services import DisputeService

router = APIRouter(prefix="/api/v1/disputes", tags=["disputes"])
service = DisputeService()


@router.post("", status_code=status.HTTP_201_CREATED)
async def file_dispute(payload: DisputeCreateRequest, auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role != UserRole.CARDMEMBER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cardmember role required")
    dispute = service.create_dispute(auth.user_id, payload)
    return {
        "id": str(dispute.id),
        "cardmember_id": str(dispute.cardmember_id),
        "merchant_id": str(dispute.merchant_id),
        "transaction_ref": dispute.transaction_ref,
        "category": dispute.category,
        "status": dispute.status,
        "amount": dispute.amount,
        "currency": dispute.currency,
        "description": dispute.description,
        "filed_at": dispute.filed_at,
        "evidence_deadline": dispute.evidence_deadline,
        "rule_set_version": dispute.rule_set_version,
    }


@router.get("")
async def list_disputes(status: DisputeStatus | None = None, category: str | None = None, page: int = 1, limit: int = 20, auth=Depends(get_auth_context)) -> dict[str, object]:
    items = service.list_disputes(auth.user_id, auth.role, status, category)
    limit = min(limit, 100)
    start = (page - 1) * limit
    page_items = items[start:start + limit]
    summaries = []
    for dispute in page_items:
        verdict = service.get_verdict(dispute.id)
        summaries.append(DisputeSummary(
            id=dispute.id,
            category=dispute.category,
            status=dispute.status,
            amount=dispute.amount,
            currency=dispute.currency,
            filed_at=dispute.filed_at,
            evidence_deadline=dispute.evidence_deadline,
            verdict=verdict.model_dump() if verdict else None,
        ).model_dump())
    return {"items": summaries, "total": len(items), "page": page, "limit": limit, "pages": max(1, (len(items) + limit - 1) // limit)}


@router.get("/{dispute_id}")
async def get_dispute(dispute_id: UUID, auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = service.get_dispute(dispute_id)
    if auth.role not in {UserRole.ADMIN, UserRole.REVIEWER} and auth.user_id not in {dispute.cardmember_id, dispute.merchant_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    verdict = service.get_verdict(dispute_id)
    evidence_count = len([item for item in STORE.evidence.values() if item.dispute_id == dispute_id])
    mediated_count = len([item for item in STORE.mediated_requests.values() if item.dispute_id == dispute_id])
    return {
        **dispute.model_dump(),
        "id": str(dispute.id),
        "cardmember_id": str(dispute.cardmember_id),
        "merchant_id": str(dispute.merchant_id),
        "verdict": verdict.model_dump() if verdict else None,
        "evidence_count": evidence_count,
        "mediated_requests_count": mediated_count,
    }


@router.get("/{dispute_id}/timeline")
async def timeline(dispute_id: UUID, auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = service.get_dispute(dispute_id)
    if auth.role not in {UserRole.ADMIN, UserRole.REVIEWER} and auth.user_id not in {dispute.cardmember_id, dispute.merchant_id}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return {"events": service.dispute_timeline(dispute_id)}


@router.post("/{dispute_id}/messages")
async def add_message(dispute_id: UUID, payload: MessageCreateRequest, auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = service.get_dispute(dispute_id)
    if auth.user_id not in {dispute.cardmember_id, dispute.merchant_id} and auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    message = service.add_message(dispute_id, auth.user_id, payload.content)
    return {"id": str(message.id), "sender_id": str(message.sender_id), "created_at": message.created_at}


@router.get("/{dispute_id}/messages")
async def list_messages(dispute_id: UUID, cursor: str | None = Query(default=None), limit: int = Query(default=20, le=100), auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = service.get_dispute(dispute_id)
    if auth.user_id not in {dispute.cardmember_id, dispute.merchant_id} and auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    items, next_cursor = service.list_messages(dispute_id, cursor, limit)
    return {"items": [message.model_dump() for message in items], "next_cursor": next_cursor}


@router.get("/{dispute_id}/verdict")
async def get_verdict(dispute_id: UUID, auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = service.get_dispute(dispute_id)
    if auth.user_id not in {dispute.cardmember_id, dispute.merchant_id} and auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    verdict = service.get_verdict(dispute_id)
    if verdict is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verdict not found")
    return {
        "outcome": verdict.outcome,
        "explanation": verdict.explanation,
        "confidence": verdict.confidence,
        "issued_by": verdict.issued_by,
        "issued_at": verdict.issued_at,
    }


@router.post("/{dispute_id}/appeal", status_code=status.HTTP_202_ACCEPTED)
async def file_appeal(dispute_id: UUID, payload: AppealCreateRequest, auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = service.get_dispute(dispute_id)
    if auth.user_id not in {dispute.cardmember_id, dispute.merchant_id} and auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    appeal, simulated = service.file_appeal(dispute_id, auth.user_id, payload)
    response = {
        "appeal_id": str(appeal.id),
        "dispute_id": str(dispute_id),
        "status": appeal.status,
        "filed_at": appeal.filed_at,
    }
    if simulated:
        response["simulated_outcome"] = simulated
    return response


@router.post("/{dispute_id}/mediated-requests")
async def mediated_request(dispute_id: UUID, payload: MediatedRequestCreateRequest, auth=Depends(get_auth_context)) -> dict[str, object]:
    dispute = service.get_dispute(dispute_id)
    if auth.user_id != dispute.merchant_id and auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Merchant only")
    request = service.create_mediated_request(dispute_id, auth.user_id, payload)
    return {
        "id": str(request.id),
        "dispute_id": str(request.dispute_id),
        "requested_by": str(request.requested_by),
        "request_type": request.request_type,
        "message": request.message,
        "status": request.status,
        "created_at": request.created_at,
    }
