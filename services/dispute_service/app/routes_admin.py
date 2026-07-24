from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status

from ...common.auth import get_auth_context
from ...common.database import STORE
from ...common.schemas import CategoryCreateRequest, CategoryRecord, DisputeStatus, UserRole, VerdictOutcome
from .services import DisputeService

router = APIRouter(prefix="/api/v1/admin", tags=["admin-portal"])
service = DisputeService()


@router.get("/categories")
async def admin_list_categories(auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return {"categories": [cat.model_dump() for cat in STORE.categories.values()]}


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def admin_create_category(payload: CategoryCreateRequest, auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    code = payload.code.upper().strip()
    category = CategoryRecord(
        code=code,
        display_name=payload.display_name,
        description=payload.description,
        is_active=True,
    )
    STORE.categories[code] = category
    STORE.sync_to_db()
    return category.model_dump()


@router.delete("/categories/{code}")
async def admin_delete_category(code: str, auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    code_clean = code.upper().strip()
    if code_clean in STORE.categories:
        STORE.categories[code_clean].is_active = False
        STORE.sync_to_db()
    return {"message": f"Category {code_clean} deactivated"}


@router.post("/disputes/{dispute_id}/advance-status")
async def admin_advance_dispute_status(
    dispute_id: UUID,
    payload: dict[str, object],
    auth=Depends(get_auth_context),
) -> dict[str, object]:
    if auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    dispute = STORE.disputes.get(dispute_id)
    if dispute is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    target_status = str(payload.get("target_status", "UNDER_REVIEW")).upper()
    force_verdict = payload.get("outcome")
    trigger_ai = payload.get("trigger_ai", True)

    previous_status = dispute.status.value
    dispute.status = DisputeStatus(target_status)

    verdict_info = None
    if force_verdict:
        outcome = VerdictOutcome(str(force_verdict))
        explanation = str(payload.get("explanation", "Manual verdict issued by platform Admin."))
        verdict = service.issue_verdict(dispute_id, outcome, explanation, [], 1.0)
        verdict_info = verdict.model_dump()
    elif trigger_ai and dispute.status in {DisputeStatus.UNDER_REVIEW, DisputeStatus.VERDICT_ISSUED}:
        # Trigger Gemini AI Rule Engine Evaluation
        evidence_items = [e.model_dump() for e in STORE.evidence.values() if e.dispute_id == dispute_id]
        dispute_dict = dispute.model_dump()
        from ...rule_engine.app.evaluator import RuleEvaluator
        evaluator = RuleEvaluator()
        res = evaluator.evaluate(dispute_dict, evidence_items)
        verdict = service.issue_verdict(dispute_id, res.outcome, res.explanation, res.rules_fired, res.confidence)
        verdict_info = verdict.model_dump()

    STORE.sync_to_db()
    return {
        "dispute_id": str(dispute_id),
        "previous_status": previous_status,
        "new_status": dispute.status.value,
        "verdict": verdict_info,
    }


@router.get("/telemetry")
async def get_admin_telemetry(auth=Depends(get_auth_context)) -> dict[str, object]:
    if auth.role not in {UserRole.ADMIN, UserRole.REVIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return {"audit_events": STORE.audit_events[-50:]}
