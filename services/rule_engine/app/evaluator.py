from __future__ import annotations

from typing import Any

from ...common.schemas import DisputeCategory, RuleEvaluationResult, RuleSet, VerdictOutcome
from .loader import RuleLoader


class RuleEvaluator:
    def __init__(self, loader: RuleLoader | None = None):
        self.loader = loader or RuleLoader()

    def evaluate(self, dispute_data: dict[str, Any], evidence_summaries: list[dict[str, Any]], rule_set: RuleSet | None = None) -> RuleEvaluationResult:
        rule_set = rule_set or self.loader.load(DisputeCategory(dispute_data["category"]))
        rules_fired: list[dict[str, Any]] = []
        for rule in rule_set.rules:
            matched = False
            for condition in rule.conditions:
                extracted = self._resolve_field(dispute_data, evidence_summaries, condition.field)
                if condition.operator == "eq":
                    matched = str(extracted).lower() == str(condition.value).lower() if extracted is not None else False
                elif condition.operator == "neq":
                    matched = str(extracted).lower() != str(condition.value).lower() if extracted is not None else True
                elif condition.operator == "exists":
                    matched = extracted is not None
                elif condition.operator == "not_exists":
                    matched = extracted is None
                elif condition.operator in {">=", "gte"}:
                    matched = extracted is not None and float(extracted) >= float(condition.value)
                elif condition.operator in {"<=", "lte"}:
                    matched = extracted is not None and float(extracted) <= float(condition.value)
                elif condition.operator in {">", "gt"}:
                    matched = extracted is not None and float(extracted) > float(condition.value)
                elif condition.operator in {"<", "lt"}:
                    matched = extracted is not None and float(extracted) < float(condition.value)
                elif condition.operator == "contains":
                    matched = str(condition.value).lower() in str(extracted).lower() if extracted is not None else False
                elif condition.operator == "fuzzy_match":
                    matched = True if extracted is not None else False
                else:
                    matched = False

                if not matched:
                    break
            if matched:
                rules_fired.append({"rule_id": rule.id, "result": True, "weight": rule.weight})
        if rules_fired:
            best = max(rules_fired, key=lambda item: item["weight"])
            outcome = next(rule.outcome for rule in rule_set.rules if rule.id == best["rule_id"])
            confidence = min(0.99, 0.5 + sum(item["weight"] for item in rules_fired))
            explanation = next(rule.explanation_template for rule in rule_set.rules if rule.id == best["rule_id"])
            return RuleEvaluationResult(
                outcome=outcome,
                confidence=confidence,
                explanation=explanation,
                rules_fired=rules_fired,
                ai_reasoning_used=False,
                evaluator_engine="DeterministicRuleEngine",
            )
        default_outcome = VerdictOutcome.CARDMEMBER_WIN if dispute_data.get("category") == DisputeCategory.UNAUTHORIZED_CHARGE.value else VerdictOutcome.MERCHANT_WIN
        return RuleEvaluationResult(
            outcome=default_outcome,
            confidence=0.4,
            explanation="No deterministic rule matched; fallback to reasoning layer required.",
            rules_fired=[],
            ai_reasoning_used=False,
            evaluator_engine="DeterministicRuleEngine",
        )

    def _resolve_field(self, dispute_data: dict[str, Any], evidence_summaries: list[dict[str, Any]], field: str) -> Any:
        if field.startswith("dispute."):
            return dispute_data.get(field.removeprefix("dispute."))
        if field.startswith("merchant.evidence.") or field.startswith("cardmember.evidence."):
            fragments = field.split(".")
            if len(fragments) < 3:
                return None
            evidence_type = fragments[2]
            remainder = fragments[3:]
            for evidence in evidence_summaries:
                if evidence.get("evidence_type") == evidence_type:
                    if not remainder:
                        return evidence
                    value: Any = evidence
                    for fragment in remainder:
                        if not isinstance(value, dict):
                            return None
                        value = value.get(fragment)
                    return value
        return None
