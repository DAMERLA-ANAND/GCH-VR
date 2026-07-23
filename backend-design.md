# Backend Specific Design Document

> **System**: Dispute Resolution Platform Microservices  
> **Runtime**: Python 3.12 / FastAPI / Uvicorn  
> **AI / Reasoning Core**: Gemini 2.5 Flash API (`google-genai` SDK)  
> **ORM / DB Layer**: SQLAlchemy 2.0 / AsyncPG / Alembic  
> **Event Infrastructure**: Google Cloud Pub/Sub + Cloud Run Push Subscriptions

---

## 1. Microservices Structure & Architecture

```
services/
├── common/                     # Shared models, auth verifier, DB connector
│   ├── auth.py                 # Firebase JWT verification & custom claims extractor
│   ├── database.py             # Async SQLAlchemy engine & session maker
│   ├── schemas.py              # Shared Pydantic base classes & enums
│   └── events.py               # Pub/Sub publisher utility
├── dispute-service/            # Core state machine & REST API gateway target
│   ├── main.py
│   ├── app/
│   │   ├── state_machine.py    # Status transition validation & side-effects
│   │   ├── routes_disputes.py  # Public API routes
│   │   ├── routes_mediated.py  # Mediated information request endpoints
│   │   ├── routes_appeals.py   # Appeal submission & simulator routes
│   │   └── services.py         # Business logic
├── evidence-service/           # Upload processing & Document AI OCR
│   ├── main.py
│   ├── app/
│   │   ├── storage.py          # GCS upload & signed URL generation
│   │   ├── docai.py            # Document AI Form Parser integration
│   │   └── routes.py           # Evidence endpoints
├── rule-engine/                # Business rule evaluator + Gemini 2.5 Flash AI
│   ├── main.py
│   ├── app/
│   │   ├── evaluator.py        # Deterministic condition checker
│   │   ├── gemini_client.py    # Gemini 2.5 Flash SDK integration
│   │   ├── loader.py           # GCS YAML rule reader with 5-min TTL cache
│   │   └── admin_routes.py     # Visual Rule Authoring UI API endpoints
├── funds-service/              # Provisional hold / release orchestration
│   ├── main.py
│   └── app/routes.py
├── notification-service/       # SendGrid & FCM subscriber
│   ├── main.py
│   └── app/subscribers.py
└── audit-service/              # Firestore append & BigQuery sink
    ├── main.py
    └── app/subscribers.py
```

---

## 2. Gemini 2.5 Flash Integration Specification

### 2.1 Role & Responsibilities
Gemini 2.5 Flash is invoked under two specific conditions:
1. **Rule Evaluation Fallback**: When deterministic YAML rules do not match with high confidence (confidence < 0.85) or when the dispute category requires unstructured evidence reasoning (e.g. comparing chat notes / item descriptions).
2. **Explainable Plain-Language Verdict Generation**: Formulates transparent, unbiased, human-understandable explanation strings for both cardmember and merchant viewports based on the exact rules fired.

### 2.2 Python Client Implementation (`rule-engine/app/gemini_client.py`)

```python
import json
import os
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Pydantic schema for structured Gemini 2.5 Flash output
class GeminiVerdictSchema(BaseModel):
    outcome: str = Field(description="Verdict outcome: CARDMEMBER_WIN or MERCHANT_WIN")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    explanation: str = Field(description="Plain-language explanation for cardmember and merchant")
    reasoning_summary: str = Field(description="Internal summary of evidence evaluation steps")

class GeminiReasoningClient:
    def __init__(self):
        # Initializes Gemini 2.5 Flash client via standard Google GenAI SDK
        api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key) if api_key else genai.Client()
        self.model_name = "gemini-2.5-flash"

    async def evaluate_dispute_fallback(
        self,
        dispute_data: Dict[str, Any],
        evidence_data: list[Dict[str, Any]],
        fired_rules: list[Dict[str, Any]]
    ) -> GeminiVerdictSchema:
        prompt = f"""
        You are an expert card network dispute arbitrator (Visa/Mastercard rules expert).
        Evaluate the following dispute facts and evidence impartially.
        
        Dispute Context:
        Category: {dispute_data.get('category')}
        Amount: {dispute_data.get('amount')} {dispute_data.get('currency')}
        Description: {dispute_data.get('description')}
        
        Submitted Evidence:
        {json.dumps(evidence_data, indent=2)}
        
        Rules Fired So Far:
        {json.dumps(fired_rules, indent=2)}
        
        Instructions:
        1. Determine if the evidence conclusively supports the cardmember or merchant.
        2. Assign a confidence score between 0.0 and 1.0.
        3. Provide a clear, polite, plain-language explanation outlining the exact factual basis for the decision.
        """

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiVerdictSchema,
                temperature=0.2, # Low temperature for consistent deterministic reasoning
            ),
        )

        return GeminiVerdictSchema.model_validate_json(response.text)
```

---

## 3. State Machine & Transition Rules (`dispute-service/app/state_machine.py`)

```python
from enum import Enum
from fastapi import HTTPException, status

class DisputeStatus(str, Enum):
    FILED = "FILED"
    EVIDENCE_COLLECTION = "EVIDENCE_COLLECTION"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERDICT_ISSUED = "VERDICT_ISSUED"
    APPEALED = "APPEALED"
    CLOSED = "CLOSED"

# Valid state transition matrix
ALLOWED_TRANSITIONS = {
    DisputeStatus.FILED: {DisputeStatus.EVIDENCE_COLLECTION},
    DisputeStatus.EVIDENCE_COLLECTION: {DisputeStatus.UNDER_REVIEW},
    DisputeStatus.UNDER_REVIEW: {DisputeStatus.VERDICT_ISSUED},
    DisputeStatus.VERDICT_ISSUED: {DisputeStatus.APPEALED, DisputeStatus.CLOSED},
    DisputeStatus.APPEALED: {DisputeStatus.CLOSED},
    DisputeStatus.CLOSED: set(),
}

def validate_state_transition(current_status: DisputeStatus, target_status: DisputeStatus):
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition from {current_status} to {target_status}"
        )
```

---

## 4. Visual Rule Authoring API Specs (`rule-engine/app/admin_routes.py`)

Exposes REST endpoints consumed by the Visual Rule Authoring UI in the Merchant/Admin Portal:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/rules/categories` | Returns list of available dispute categories and versioned YAML filenames |
| `GET` | `/api/v1/admin/rules/{category}` | Reads current YAML rule file from GCS and parses to JSON schema for the visual builder |
| `POST` | `/api/v1/admin/rules/{category}/test` | Accepts a draft rule payload and test evidence JSON; returns dry-run verdict & fired rules |
| `PUT` | `/api/v1/admin/rules/{category}` | Validates rule syntax, increments version, and writes new YAML definition back to GCS |

---

## 5. Pub/Sub Event Schemas

### 5.1 `dispute-lifecycle` Event Payload

```json
{
  "event_id": "evt_10203040",
  "event_type": "VERDICT_ISSUED",
  "timestamp": "2026-07-23T14:05:00Z",
  "data": {
    "dispute_id": "99332211-4455-6677-8899-aabbccddeeff",
    "cardmember_id": "usr_cm123",
    "merchant_id": "usr_mer456",
    "category": "NON_DELIVERY",
    "outcome": "MERCHANT_WIN",
    "confidence": 0.94,
    "issued_by": "SYSTEM",
    "explanation": "Shipping records confirm delivery to front door on July 18."
  }
}
```

---

## 6. Simulated Appeal Reviewer Agent (`dispute-service/app/routes_appeals.py`)

To simulate appeal review without waiting for human operator intervention:
- When a user posts to `/api/v1/disputes/{id}/appeal` with `simulate_ai_reviewer=true`, the endpoint invokes Gemini 2.5 Flash in "Senior Arbitrator Mode".
- The AI Reviewer re-evaluates the appeal reason against existing evidence, determines whether to `UPHELD` or `OVERTURNED` the original verdict, writes to `appeals`, and releases funds accordingly.

---

## 7. Swappable Observability Architecture (Console-First)

To ensure maximum simplicity for local development and demonstration while maintaining production readiness, the prototype implements an **Abstract Telemetry Provider Layer**.

### 7.1 Provider Interface & Design (`services/common/observability.py`)

By default, the backend outputs structured JSON telemetry directly to `sys.stdout` (Console). The logger implementation is pluggable via the `OBSERVABILITY_PROVIDER` environment variable.

```python
import json
import logging
import os
import sys
from abc import ABC, abstractmethod
from typing import Dict, Any

class AbstractTelemetryLogger(ABC):
    @abstractmethod
    def log_event(self, event_name: str, payload: Dict[str, Any], level: str = "INFO"):
        pass

    @abstractmethod
    def record_metric(self, metric_name: str, value: float, tags: Dict[str, str] = None):
        pass

# 1. Console Implementation (Default for Prototype)
class ConsoleTelemetryLogger(AbstractTelemetryLogger):
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(service_name)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def log_event(self, event_name: str, payload: Dict[str, Any], level: str = "INFO"):
        log_entry = {
            "telemetry_type": "EVENT",
            "service": self.service_name,
            "event_name": event_name,
            "level": level,
            "payload": payload,
            "timestamp": logging.Formatter().formatTime(logging.LogRecord("", 0, "", 0, "", (), None))
        }
        self.logger.info(json.dumps(log_entry))

    def record_metric(self, metric_name: str, value: float, tags: Dict[str, str] = None):
        metric_entry = {
            "telemetry_type": "METRIC",
            "service": self.service_name,
            "metric_name": metric_name,
            "value": value,
            "tags": tags or {},
        }
        self.logger.info(json.dumps(metric_entry))

# 2. GCP Implementation (Swappable via env var)
class GCPTelemetryLogger(AbstractTelemetryLogger):
    def __init__(self, service_name: str):
        from google.cloud import logging as gcp_logging
        self.client = gcp_logging.Client()
        self.logger = self.client.logger(service_name)

    def log_event(self, event_name: str, payload: Dict[str, Any], level: str = "INFO"):
        self.logger.log_struct({"event": event_name, **payload}, severity=level)

    def record_metric(self, metric_name: str, value: float, tags: Dict[str, str] = None):
        # Swappable integration with Cloud Monitoring API
        pass

def get_telemetry(service_name: str) -> AbstractTelemetryLogger:
    provider = os.getenv("OBSERVABILITY_PROVIDER", "console").lower()
    if provider == "gcp":
        return GCPTelemetryLogger(service_name)
    return ConsoleTelemetryLogger(service_name)
```

---

## 8. Swappable Testing Architecture & Console Harness

### 8.1 Testing Strategy Hierarchy

| Test Level | Scope | Harness | Target |
|---|---|---|---|
| **Unit Tests** | State machine logic, YAML rule evaluation, hash calculations | `pytest` + `ConsoleTelemetryLogger` | Local Terminal (`pytest services/`) |
| **Integration Tests** | API contracts, DB transactions, GCS uploads | FastAPI `TestClient` + Postgres/Emulators | Local Docker Container |
| **Simulated E2E Flow** | Complete dispute lifecycle demo | Console CLI Script (`python scripts/run_demo_suite.py`) | Running Prototype API |

### 8.2 Terminal Demo Suite Script (`scripts/run_demo_suite.py`)

A console-driven test script that executes the entire dispute workflow, printing colored step-by-step stdout progress:

```python
# Demo test harness executing:
# 1. File Non-Delivery Dispute
# 2. Upload Merchant Tracking Evidence
# 3. Trigger Rule Engine + Gemini 2.5 Flash Evaluation
# 4. Assert Verdict = MERCHANT_WIN
# 5. File Appeal + Run Gemini AI Reviewer Simulation
# 6. Assert Appeal Verdict = OVERTURNED
```

