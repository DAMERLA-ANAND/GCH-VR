from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ...common.database import STORE
from ...common.schemas import DisputeCategory, RuleEvaluationRequest, RuleTestRequest, RuleSet
from .evaluator import RuleEvaluator
from .loader import RuleLoader
from .gemini_client import GeminiReasoningClient

router = APIRouter(prefix="/api/v1/admin/rules", tags=["rule-engine-admin"])
internal_router = APIRouter(prefix="/internal/v1", tags=["rule-engine-internal"])
loader = RuleLoader()
evaluator = RuleEvaluator(loader=loader)
gemini_client = GeminiReasoningClient()


@router.get("/categories")
async def list_categories() -> list[dict[str, str]]:
    categories = []
    for category in DisputeCategory:
        categories.append({"category": category.value, "version": loader.load(category).version})
    return categories


@router.get("/{category}")
async def get_rule_set(category: DisputeCategory) -> RuleSet:
    return loader.load(category)


@router.post("/{category}/test")
async def test_rule_set(category: DisputeCategory, payload: RuleTestRequest) -> dict[str, object]:
    result = evaluator.evaluate({"category": category.value}, payload.mock_evidence, payload.rule_set)
    gemini_invoked = result.confidence < float(payload.rule_set.gemini_fallback.get("confidence_threshold", 0.85))
    if gemini_invoked:
        fallback = await gemini_client.evaluate_dispute_fallback({"category": category.value}, payload.mock_evidence, result.rules_fired)
        result = result.model_copy(update={"outcome": fallback.outcome, "confidence": fallback.confidence, "explanation": fallback.explanation, "ai_reasoning_used": True, "evaluator_engine": "Gemini-2.5-Flash-RuleEngine-Hybrid"})
    return {"outcome": result.outcome, "confidence": result.confidence, "rules_fired": result.rules_fired, "gemini_invoked": gemini_invoked, "explanation": result.explanation}


@router.put("/{category}")
async def publish_rule_set(category: DisputeCategory, rule_set: RuleSet) -> RuleSet:
    if rule_set.category != category:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rule set category mismatch")
    STORE.rule_sets[category] = rule_set
    return rule_set


@internal_router.post("/evaluate")
async def internal_evaluate(payload: RuleEvaluationRequest) -> dict[str, object]:
    rule_set = STORE.rule_sets.get(payload.category) or loader.load(payload.category)
    result = evaluator.evaluate(payload.model_dump(), payload.evidence_summaries, rule_set)
    if result.confidence < float(rule_set.gemini_fallback.get("confidence_threshold", 0.85)):
        fallback = await gemini_client.evaluate_dispute_fallback(payload.model_dump(), payload.evidence_summaries, result.rules_fired)
        return {
            "outcome": fallback.outcome,
            "confidence": fallback.confidence,
            "explanation": fallback.explanation,
            "rules_fired": result.rules_fired,
            "ai_reasoning_used": True,
            "evaluator_engine": "Gemini-2.5-Flash-RuleEngine-Hybrid",
        }
    return result.model_dump()
