from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any


class AbstractTelemetryLogger(ABC):
    @abstractmethod
    def log_event(self, event_name: str, payload: dict[str, Any], level: str = "INFO") -> None:
        raise NotImplementedError

    @abstractmethod
    def record_metric(self, metric_name: str, value: float, tags: dict[str, str] | None = None) -> None:
        raise NotImplementedError


class ConsoleTelemetryLogger(AbstractTelemetryLogger):
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(logging.INFO)
        if not any(getattr(handler, "stream", None) is sys.stdout for handler in self.logger.handlers):
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter("%(message)s"))
            self.logger.addHandler(handler)

    def log_event(self, event_name: str, payload: dict[str, Any], level: str = "INFO") -> None:
        log_entry = {
            "telemetry_type": "EVENT",
            "service": self.service_name,
            "event_name": event_name,
            "level": level,
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.logger.info(json.dumps(log_entry, default=str))

    def record_metric(self, metric_name: str, value: float, tags: dict[str, str] | None = None) -> None:
        metric_entry = {
            "telemetry_type": "METRIC",
            "service": self.service_name,
            "metric_name": metric_name,
            "value": value,
            "tags": tags or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self.logger.info(json.dumps(metric_entry, default=str))


class GCPTelemetryLogger(AbstractTelemetryLogger):
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        self.logger.setLevel(logging.INFO)

    def log_event(self, event_name: str, payload: dict[str, Any], level: str = "INFO") -> None:
        self.logger.info(json.dumps({"event": event_name, **payload, "level": level}, default=str))

    def record_metric(self, metric_name: str, value: float, tags: dict[str, str] | None = None) -> None:
        self.logger.info(json.dumps({"metric_name": metric_name, "value": value, "tags": tags or {}}, default=str))


def get_telemetry(service_name: str) -> AbstractTelemetryLogger:
    provider = os.getenv("OBSERVABILITY_PROVIDER", "console").lower()
    if provider == "gcp":
        return GCPTelemetryLogger(service_name)
    return ConsoleTelemetryLogger(service_name)


def payload_hash(payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
