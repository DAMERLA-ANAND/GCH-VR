from __future__ import annotations

import hashlib
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from ...common.database import STORE
from ...common.events import record_audit_event
from ...common.schemas import EvidenceRecord, EvidenceSide, EvidenceType
from .docai import parse_document
from .storage import build_gcs_uri, create_signed_url, infer_mime_suffix

router = APIRouter(prefix="/api/v1", tags=["evidence-service"])


@router.post("/disputes/{dispute_id}/evidence", status_code=status.HTTP_201_CREATED)
async def upload_evidence(dispute_id: str, file: UploadFile = File(...), evidence_type: EvidenceType = Form(...)) -> dict[str, object]:
    dispute = STORE.disputes.get(UUID(dispute_id))
    if dispute is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")
    raw = await file.read()
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Uploaded evidence file exceeds 25 MB limit")
    content_hash = hashlib.sha256(raw).hexdigest()
    parsed = parse_document(raw, file.filename or "evidence.bin")
    submitted_by = dispute.merchant_id if evidence_type in {EvidenceType.TRACKING, EvidenceType.OTHER} else dispute.cardmember_id
    side = EvidenceSide.MERCHANT if submitted_by == dispute.merchant_id else EvidenceSide.CARDMEMBER
    suffix = infer_mime_suffix(file.filename or "evidence.bin")
    gcs_uri = build_gcs_uri(str(dispute.id), f"evi_{dispute.id}{suffix}")
    evidence = EvidenceRecord(
        dispute_id=dispute.id,
        submitted_by=submitted_by,
        side=side,
        evidence_type=evidence_type,
        gcs_uri=gcs_uri,
        content_hash=content_hash,
        ocr_text=parsed.get("ocr_text"),
        extracted_fields=parsed.get("extracted_fields"),
    )
    STORE.evidence[evidence.id] = evidence
    record_audit_event("EVIDENCE_SUBMITTED", str(dispute.id), str(submitted_by), side.value, {"evidence_type": evidence_type.value, "content_hash": content_hash})
    STORE.sync_to_db()
    return evidence.model_dump()


@router.get("/disputes/{dispute_id}/evidence")
async def list_evidence(dispute_id: str) -> dict[str, object]:
    items = [record.model_dump() for record in STORE.evidence.values() if str(record.dispute_id) == dispute_id]
    return {"items": items}


@router.get("/evidence/{evidence_id}/download")
async def download_evidence(evidence_id: str) -> dict[str, object]:
    evidence = STORE.evidence.get(evidence_id)
    if evidence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    return create_signed_url(evidence.gcs_uri)
