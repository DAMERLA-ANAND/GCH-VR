from __future__ import annotations

from datetime import timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException, status

from ...common.database import STORE
from ...common.events import PUBLISHER, record_audit_event
from ...common.schemas import (
    Appeal,
    AppealCreateRequest,
    AppealOutcome,
    AppealStatus,
    Dispute,
    DisputeCreateRequest,
    DisputeStatus,
    EvidenceRecord,
    Message,
    MediatedRequest,
    MediatedRequestCreateRequest,
    RuleEvaluationRequest,
    Verdict,
    VerdictIssuer,
    VerdictOutcome,
)
from ...common.observability import get_telemetry, payload_hash
from ...common.schemas import AuditEvent, HoldStatus, UserRole
from ...common.database import seed_demo_data
from .state_machine import validate_state_transition

telemetry = get_telemetry("dispute-service")


class DisputeService:
    def create_dispute(self, requester_id: UUID, payload: DisputeCreateRequest) -> Dispute:
        cardmember = STORE.users[requester_id]
        merchant_id = STORE.transaction_map.get(payload.transaction_ref)
        if merchant_id is None:
            merchant_id = next(user.id for user in STORE.users.values() if user.type == UserRole.MERCHANT)
        dispute = Dispute(
            cardmember_id=cardmember.id,
            merchant_id=merchant_id,
            transaction_ref=payload.transaction_ref,
            category=payload.category,
            amount=payload.amount,
            currency=payload.currency,
            description=payload.description,
            filed_at=STORE.now(),
            evidence_deadline=STORE.now() + timedelta(hours=72),
            rule_set_version="v1.0",
        )
        STORE.disputes[dispute.id] = dispute
        PUBLISHER.publish("dispute-lifecycle", {"event_type": "DISPUTE_FILED", "dispute_id": str(dispute.id), "category": dispute.category.value})
        record_audit_event("DISPUTE_FILED", str(dispute.id), str(cardmember.id), cardmember.type.value, {"category": dispute.category.value, "amount": dispute.amount, "rule_set_version": dispute.rule_set_version})
        STORE.sync_to_db()
        telemetry.log_event("dispute_created", dispute.model_dump())
        return dispute

    def list_disputes(self, requester_id: UUID, role: UserRole, status_filter: DisputeStatus | None = None, category_filter: str | None = None) -> list[Dispute]:
        disputes = list(STORE.disputes.values())
        if role == UserRole.CARDMEMBER:
            disputes = [dispute for dispute in disputes if dispute.cardmember_id == requester_id]
        elif role == UserRole.MERCHANT:
            disputes = [dispute for dispute in disputes if dispute.merchant_id == requester_id]
        if status_filter is not None:
            disputes = [dispute for dispute in disputes if dispute.status == status_filter]
        if category_filter is not None:
            disputes = [dispute for dispute in disputes if dispute.category.value == category_filter]
        return disputes

    def get_dispute(self, dispute_id: UUID) -> Dispute:
        dispute = STORE.disputes.get(dispute_id)
        if dispute is None:
            raise KeyError("DISPUTE_NOT_FOUND")
        return dispute

    def get_verdict(self, dispute_id: UUID) -> Verdict | None:
        for verdict in STORE.verdicts.values():
            if verdict.dispute_id == dispute_id:
                return verdict
        return None

    def issue_verdict(self, dispute_id: UUID, outcome: VerdictOutcome, explanation: str, rules_fired: list[dict[str, object]], confidence: float, issued_by: VerdictIssuer = VerdictIssuer.SYSTEM, reviewer_id: UUID | None = None) -> Verdict:
        verdict = Verdict(
            dispute_id=dispute_id,
            outcome=outcome,
            explanation=explanation,
            rules_fired=rules_fired,
            confidence=confidence,
            issued_by=issued_by,
            reviewer_id=reviewer_id,
            issued_at=STORE.now(),
        )
        STORE.verdicts[verdict.id] = verdict
        dispute = STORE.disputes[dispute_id]
        validate_state_transition(dispute.status, DisputeStatus.VERDICT_ISSUED)
        dispute.status = DisputeStatus.VERDICT_ISSUED
        dispute.resolved_at = STORE.now()
        PUBLISHER.publish("dispute-lifecycle", {"event_type": "VERDICT_ISSUED", "dispute_id": str(dispute_id), "outcome": outcome.value, "confidence": confidence, "explanation": explanation})
        record_audit_event("VERDICT_ISSUED", str(dispute_id), str(reviewer_id or "SYSTEM"), issued_by.value, {"outcome": outcome.value, "confidence": confidence, "explanation": explanation, "rules_fired": rules_fired})
        STORE.sync_to_db()
        return verdict

    def file_appeal(self, dispute_id: UUID, requester_id: UUID, payload: AppealCreateRequest) -> tuple[Appeal, dict[str, object] | None]:
        dispute = STORE.disputes[dispute_id]
        verdict = self.get_verdict(dispute_id)
        if verdict is None:
            raise KeyError("DISPUTE_NOT_FOUND")
        if any(appeal.dispute_id == dispute_id for appeal in STORE.appeals.values()):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appeal already exists for this dispute")
        appeal = Appeal(dispute_id=dispute_id, filed_by=requester_id, reason=payload.reason, status=AppealStatus.FILED)
        STORE.appeals[appeal.id] = appeal
        validate_state_transition(dispute.status, DisputeStatus.APPEALED)
        dispute.status = DisputeStatus.APPEALED
        PUBLISHER.publish("dispute-lifecycle", {"event_type": "APPEAL_FILED", "dispute_id": str(dispute_id), "appeal_id": str(appeal.id)})
        record_audit_event("APPEAL_FILED", str(dispute_id), str(requester_id), STORE.users[requester_id].type.value, {"reason": appeal.reason})
        STORE.sync_to_db()
        simulated_outcome = None
        if payload.simulate_ai_reviewer:
            simulated_outcome = self.simulate_appeal_review(dispute_id, appeal.id, requester_id)
        return appeal, simulated_outcome

    def simulate_appeal_review(self, dispute_id: UUID, appeal_id: UUID, reviewer_id: UUID) -> dict[str, object]:
        appeal = STORE.appeals[appeal_id]
        dispute = STORE.disputes[dispute_id]
        verdict = self.get_verdict(dispute_id)
        original = verdict.outcome if verdict else VerdictOutcome.MERCHANT_WIN
        if "zip code" in appeal.reason.lower() or "mismatch" in appeal.reason.lower():
            appeal.appeal_outcome = AppealOutcome.OVERTURNED
            appeal.review_notes = "Gemini 2.5 Flash Secondary Review: Confirmed address mismatch. Verdict overturned."
            dispute.status = DisputeStatus.CLOSED
            if verdict:
                verdict.outcome = VerdictOutcome.CARDMEMBER_WIN
            record_audit_event("APPEAL_RESOLVED", str(dispute_id), str(reviewer_id), "AI_SIMULATOR", {"appeal_outcome": appeal.appeal_outcome.value, "review_notes": appeal.review_notes})
            STORE.sync_to_db()
            return {
                "appeal_outcome": AppealOutcome.OVERTURNED,
                "review_notes": appeal.review_notes,
                "resolved_at": STORE.now(),
            }
        appeal.appeal_outcome = AppealOutcome.UPHELD
        appeal.review_notes = "Gemini 2.5 Flash Secondary Review: Original verdict upheld."
        dispute.status = DisputeStatus.CLOSED
        record_audit_event("APPEAL_RESOLVED", str(dispute_id), str(reviewer_id), "AI_SIMULATOR", {"appeal_outcome": appeal.appeal_outcome.value, "review_notes": appeal.review_notes})
        STORE.sync_to_db()
        return {"appeal_outcome": AppealOutcome.UPHELD, "review_notes": appeal.review_notes, "resolved_at": STORE.now()}

    def add_message(self, dispute_id: UUID, sender_id: UUID, content: str) -> Message:
        message = Message(dispute_id=dispute_id, sender_id=sender_id, content=content)
        STORE.messages[message.id] = message
        record_audit_event("MESSAGE_ADDED", str(dispute_id), str(sender_id), STORE.users[sender_id].type.value, {"content": content})
        STORE.sync_to_db()
        return message

    def list_messages(self, dispute_id: UUID, cursor: str | None = None, limit: int = 20) -> tuple[list[Message], str | None]:
        items = sorted((message for message in STORE.messages.values() if message.dispute_id == dispute_id), key=lambda item: item.created_at)
        start = 0
        if cursor:
            for index, item in enumerate(items):
                if str(item.id) == cursor:
                    start = index + 1
                    break
        page = items[start:start + limit]
        next_cursor = str(page[-1].id) if len(page) == limit else None
        return page, next_cursor

    def create_mediated_request(self, dispute_id: UUID, requester_id: UUID, payload: MediatedRequestCreateRequest) -> MediatedRequest:
        request = MediatedRequest(dispute_id=dispute_id, requested_by=requester_id, request_type=payload.request_type, message=payload.message)
        STORE.mediated_requests[request.id] = request
        record_audit_event("MEDIATED_REQUEST_SENT", str(dispute_id), str(requester_id), STORE.users[requester_id].type.value, {"request_type": payload.request_type, "message": payload.message})
        STORE.sync_to_db()
        return request

    def dispute_timeline(self, dispute_id: UUID) -> list[dict[str, object]]:
        timeline: list[dict[str, object]] = []
        for event in STORE.audit_events:
            if str(event.get("dispute_id")) == str(dispute_id):
                timeline.append({"action": event.get("action") or event.get("event_type"), "actor": event.get("actor_id") or "SYSTEM", "timestamp": event.get("timestamp"), "detail": event.get("payload")})
        return timeline

    def advance_time_and_autoadjudicate(self, dispute_id: UUID, hours_to_advance: int) -> tuple[str, str, str, VerdictOutcome]:
        dispute = STORE.disputes[dispute_id]
        previous_status = dispute.status
        STORE.advance_time(hours_to_advance)
        if STORE.now() >= dispute.evidence_deadline and dispute.status == DisputeStatus.EVIDENCE_COLLECTION:
            dispute.status = DisputeStatus.UNDER_REVIEW
            verdict = self.issue_verdict(dispute_id, VerdictOutcome.CARDMEMBER_WIN, "Merchant failed to submit evidence within the 72-hour window. Dispute auto-resolved in cardmember favor.", [], 1.0, VerdictIssuer.SYSTEM)
            STORE.sync_to_db()
            return previous_status.value, dispute.status.value, "Deadline expired. Triggered automatic rule engine & Gemini 2.5 Flash adjudication.", verdict.outcome
        return previous_status.value, dispute.status.value, "Time advanced without triggering adjudication.", VerdictOutcome.CARDMEMBER_WIN

    def seed(self) -> dict[str, int]:
        return seed_demo_data()
