from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.common.database import STORE
from services.common.schemas import AppealCreateRequest, DisputeCreateRequest, DisputeCategory, DisputeStatus, EvidenceType, UserRole, VerdictOutcome
from services.dispute_service.app.services import DisputeService
from services.evidence_service.app.docai import parse_document


async def main() -> None:
    service = DisputeService()
    STORE.seed_defaults()
    cardmember = next(user for user in STORE.users.values() if user.type == UserRole.CARDMEMBER)
    dispute = service.create_dispute(cardmember.id, DisputeCreateRequest(transaction_ref="tok_visa_txn_998877", category=DisputeCategory.NON_DELIVERY, amount=149.99, currency="USD", description="Item never arrived"))
    print(f"Filed dispute {dispute.id}")
    evidence = parse_document(b"USPS tracking delivered July 18", "tracking.pdf")
    print(f"Parsed evidence: {evidence}")
    dispute.status = DisputeStatus.EVIDENCE_COLLECTION
    dispute.status = DisputeStatus.UNDER_REVIEW
    verdict = service.issue_verdict(dispute.id, outcome=VerdictOutcome.MERCHANT_WIN, explanation="Shipping records confirm delivery to your registered address on July 18.", rules_fired=[{"rule_id": "ND-001", "result": True, "weight": 0.5}], confidence=0.94)
    print(f"Verdict: {verdict.outcome}")
    appeal, simulated = service.file_appeal(dispute.id, cardmember.id, AppealCreateRequest(reason="Zip code mismatch", simulate_ai_reviewer=True))
    print(f"Appeal {appeal.id} -> {simulated}")


if __name__ == "__main__":
    asyncio.run(main())
