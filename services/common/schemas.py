from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    CARDMEMBER = "CARDMEMBER"
    MERCHANT = "MERCHANT"
    REVIEWER = "REVIEWER"
    ADMIN = "ADMIN"


class DisputeCategory(str, Enum):
    NON_DELIVERY = "NON_DELIVERY"
    UNAUTHORIZED_CHARGE = "UNAUTHORIZED_CHARGE"


class DisputeStatus(str, Enum):
    FILED = "FILED"
    EVIDENCE_COLLECTION = "EVIDENCE_COLLECTION"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERDICT_ISSUED = "VERDICT_ISSUED"
    APPEALED = "APPEALED"
    CLOSED = "CLOSED"


class EvidenceType(str, Enum):
    RECEIPT = "RECEIPT"
    PHOTO = "PHOTO"
    TRACKING = "TRACKING"
    CHAT_LOG = "CHAT_LOG"
    ORDER_CONFIRMATION = "ORDER_CONFIRMATION"
    OTHER = "OTHER"


class EvidenceSide(str, Enum):
    CARDMEMBER = "CARDMEMBER"
    MERCHANT = "MERCHANT"


class VerdictOutcome(str, Enum):
    CARDMEMBER_WIN = "CARDMEMBER_WIN"
    MERCHANT_WIN = "MERCHANT_WIN"


class VerdictIssuer(str, Enum):
    SYSTEM = "SYSTEM"
    HUMAN = "HUMAN"
    AI_SIMULATOR = "AI_SIMULATOR"


class HoldStatus(str, Enum):
    HELD = "HELD"
    RELEASED_TO_CARDMEMBER = "RELEASED_TO_CARDMEMBER"
    RETURNED_TO_MERCHANT = "RETURNED_TO_MERCHANT"


class AppealStatus(str, Enum):
    FILED = "FILED"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"


class AppealOutcome(str, Enum):
    UPHELD = "UPHELD"
    OVERTURNED = "OVERTURNED"


class MediatedRequestStatus(str, Enum):
    PENDING = "PENDING"
    RESPONDED = "RESPONDED"
    EXPIRED = "EXPIRED"


class User(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: UserRole
    email: str
    phone: str | None = None
    display_name: str
    firebase_uid: str
    merchant_id: UUID | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class TransactionRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    transaction_ref: str
    merchant_name: str
    amount: float
    currency: str = "USD"
    posted_at: datetime = Field(default_factory=utc_now)
    description: str
    mcc: str = "5732"
    category: DisputeCategory | None = None
    dispute_id: UUID | None = None
    status: str = "POSTED"


class DisputeCreateRequest(BaseModel):
    transaction_ref: str
    category: DisputeCategory
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    description: str

    @field_validator("transaction_ref")
    @classmethod
    def validate_transaction_ref(cls, value: str) -> str:
        if value.isdigit() and 13 <= len(value) <= 19:
            raise ValueError("transaction_ref must not be a raw PAN")
        return value


class Dispute(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    cardmember_id: UUID
    merchant_id: UUID
    transaction_ref: str
    category: DisputeCategory
    status: DisputeStatus = DisputeStatus.FILED
    amount: float
    currency: str = "USD"
    description: str
    filed_at: datetime = Field(default_factory=utc_now)
    evidence_deadline: datetime
    resolved_at: datetime | None = None
    rule_set_version: str = "v1.0"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class DisputeSummary(BaseModel):
    id: UUID
    category: DisputeCategory
    status: DisputeStatus
    amount: float
    currency: str
    filed_at: datetime
    evidence_deadline: datetime
    verdict: dict[str, Any] | None = None


class Verdict(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    dispute_id: UUID
    outcome: VerdictOutcome
    explanation: str
    rules_fired: list[dict[str, Any]]
    confidence: float = Field(ge=0.0, le=1.0)
    issued_by: VerdictIssuer = VerdictIssuer.SYSTEM
    reviewer_id: UUID | None = None
    issued_at: datetime = Field(default_factory=utc_now)


class Appeal(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    dispute_id: UUID
    filed_by: UUID
    reason: str
    status: AppealStatus = AppealStatus.FILED
    reviewer_id: UUID | None = None
    review_notes: str | None = None
    appeal_outcome: AppealOutcome | None = None
    filed_at: datetime = Field(default_factory=utc_now)
    resolved_at: datetime | None = None


class AppealCreateRequest(BaseModel):
    reason: str
    simulate_ai_reviewer: bool = False


class MediatedRequestCreateRequest(BaseModel):
    request_type: str
    message: str


class MessageCreateRequest(BaseModel):
    content: str


class ReviewDecisionRequest(BaseModel):
    appeal_outcome: AppealOutcome
    review_notes: str | None = None


class MediatedRequest(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    dispute_id: UUID
    requested_by: UUID
    request_type: str
    message: str
    response_text: str | None = None
    response_gcs_uri: str | None = None
    status: MediatedRequestStatus = MediatedRequestStatus.PENDING
    created_at: datetime = Field(default_factory=utc_now)
    responded_at: datetime | None = None


class NotificationRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    dispute_id: UUID | None = None
    event_type: str
    channel: str
    subject: str
    body: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)
    delivery_status: str = "SENT"


class AuditLogRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    dispute_id: UUID
    actor_id: str
    actor_type: str
    action: str
    payload: dict[str, Any]
    payload_hash: str
    timestamp: datetime = Field(default_factory=utc_now)
    environment: str = "prototype-gcp"


class EvidenceCreateResponse(BaseModel):
    id: UUID
    dispute_id: UUID
    submitted_by: UUID
    side: EvidenceSide
    evidence_type: EvidenceType
    gcs_uri: str
    content_hash: str
    ocr_text: str | None = None
    extracted_fields: dict[str, Any] | None = None
    created_at: datetime


class EvidenceRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    dispute_id: UUID
    submitted_by: UUID
    side: EvidenceSide
    evidence_type: EvidenceType
    gcs_uri: str
    content_hash: str
    ocr_text: str | None = None
    extracted_fields: dict[str, Any] | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Message(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    dispute_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime = Field(default_factory=utc_now)


class FundsHold(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    dispute_id: UUID
    amount: float
    currency: str = "USD"
    status: HoldStatus = HoldStatus.HELD
    external_hold_ref: str
    held_at: datetime = Field(default_factory=utc_now)
    released_at: datetime | None = None


class RuleCondition(BaseModel):
    field: str
    operator: str
    value: Any | None = None


class RuleDefinition(BaseModel):
    id: str
    name: str
    description: str
    conditions: list[RuleCondition] = Field(default_factory=list)
    outcome: VerdictOutcome
    weight: float = Field(ge=0.0, le=1.0)
    explanation_template: str


class RuleSet(BaseModel):
    category: DisputeCategory
    version: str
    rules: list[RuleDefinition] = Field(default_factory=list)
    gemini_fallback: dict[str, Any] = Field(default_factory=lambda: {"enabled": True, "confidence_threshold": 0.85})


class GeminiVerdictSchema(BaseModel):
    outcome: VerdictOutcome
    confidence: float = Field(ge=0.0, le=1.0)
    explanation: str
    reasoning_summary: str


class RuleEvaluationRequest(BaseModel):
    dispute_id: UUID
    category: DisputeCategory
    amount: float
    currency: str
    description: str
    evidence_summaries: list[dict[str, Any]] = Field(default_factory=list)


class RuleEvaluationResult(BaseModel):
    outcome: VerdictOutcome
    confidence: float
    explanation: str
    rules_fired: list[dict[str, Any]]
    ai_reasoning_used: bool = False
    evaluator_engine: str = "DeterministicRuleEngine"


class RuleTestRequest(BaseModel):
    rule_set: RuleSet
    mock_evidence: list[dict[str, Any]]


class ProblemDetail(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    code: str
    instance: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    invalid_params: list[dict[str, Any]] = Field(default_factory=list)


class AuthContext(BaseModel):
    role: UserRole
    user_id: UUID
    merchant_id: UUID | None = None
    email: str | None = None


class AuditEvent(BaseModel):
    event_id: str
    dispute_id: UUID
    actor_id: str
    actor_type: str
    action: str
    payload: dict[str, Any]
    payload_hash: str
    timestamp: datetime = Field(default_factory=utc_now)
    environment: str = "prototype-gcp"


class PrototypeSeedResponse(BaseModel):
    users_created: int
    disputes_created: int
    evidence_created: int
    verdicts_created: int
    appeals_created: int
    funds_holds_created: int


class PrototypeAdvanceTimeRequest(BaseModel):
    dispute_id: UUID
    hours_to_advance: int


class PrototypeAdvanceTimeResponse(BaseModel):
    dispute_id: UUID
    previous_status: DisputeStatus
    new_status: DisputeStatus
    message: str
    verdict_outcome: VerdictOutcome
    explanation: str
