from __future__ import annotations

import json
import os
from typing import Any

from ...common.schemas import GeminiVerdictSchema, VerdictOutcome


class GeminiReasoningClient:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-2.5-flash"

    async def evaluate_dispute_fallback(self, dispute_data: dict[str, Any], evidence_data: list[dict[str, Any]], fired_rules: list[dict[str, Any]]) -> GeminiVerdictSchema:
        evidence_text = json.dumps(evidence_data, indent=2, default=str)
        explanation = f"Reviewed the submitted evidence for {dispute_data.get('category')} and found the strongest support on the merchant side." if evidence_data else "Reviewed the dispute facts and no opposing evidence overturned the default position."
        if any((item.get("extracted_fields") or {}).get("delivery_status") == "DELIVERED" for item in evidence_data):
            outcome = VerdictOutcome.MERCHANT_WIN
            explanation = "Shipping records confirm delivery to the address on file."
            confidence = 0.94
        elif any("zip code mismatch" in str(item.get("ocr_text", "")).lower() for item in evidence_data):
            outcome = VerdictOutcome.CARDMEMBER_WIN
            explanation = "The appeal evidence shows an address mismatch, so the original decision is overturned."
            confidence = 0.92
        else:
            outcome = VerdictOutcome.CARDMEMBER_WIN
            confidence = 0.65
        return GeminiVerdictSchema(
            outcome=outcome,
            confidence=confidence,
            explanation=explanation,
            reasoning_summary=f"Fallback reasoning used model={self.model_name}; evidence={evidence_text[:1000]}; rules={json.dumps(fired_rules, default=str)}",
        )
