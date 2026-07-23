from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from time import time

from ...common.schemas import DisputeCategory, RuleSet


@dataclass
class CachedRuleSet:
    rule_set: RuleSet
    loaded_at: float


class RuleLoader:
    def __init__(self, base_path: Path | None = None, ttl_seconds: int = 300):
        self.base_path = base_path or Path(__file__).resolve().parents[3] / "data" / "rules"
        self.ttl_seconds = ttl_seconds
        self.cache: dict[DisputeCategory, CachedRuleSet] = {}

    def load(self, category: DisputeCategory) -> RuleSet:
        cached = self.cache.get(category)
        if cached and time() - cached.loaded_at < self.ttl_seconds:
            return cached.rule_set
        rule_path = self.base_path / category.value.lower() / "v1.yaml"
        if not rule_path.exists():
            rule_set = RuleSet(category=category, version="v1.0", rules=[])
            self.cache[category] = CachedRuleSet(rule_set=rule_set, loaded_at=time())
            return rule_set
        try:
            import yaml

            parsed = yaml.safe_load(rule_path.read_text(encoding="utf-8"))
        except Exception:
            parsed = json.loads(rule_path.read_text(encoding="utf-8"))
        rule_set = RuleSet.model_validate(parsed)
        self.cache[category] = CachedRuleSet(rule_set=rule_set, loaded_at=time())
        return rule_set
