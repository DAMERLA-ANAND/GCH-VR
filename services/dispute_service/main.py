from __future__ import annotations

from uuid import UUID

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from ..common.database import STORE
from ..common.observability import get_telemetry
from ..common.schemas import ProblemDetail, UserRole
from .app.routes_appeals import router as appeals_router
from .app.routes_disputes import router as disputes_router
from .app.routes_mediated import router as mediated_router
from .app.services import DisputeService

app = FastAPI(title="Dispute Service", version="1.0.0")
telemetry = get_telemetry("dispute-service")
service = DisputeService()
app.include_router(disputes_router)
app.include_router(appeals_router)
app.include_router(mediated_router)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    code = "HTTP_ERROR"
    if "Invalid state transition" in detail:
        code = "INVALID_STATE_TRANSITION"
    elif "raw PAN" in detail:
        code = "RAW_PAN_DETECTED"
    problem = ProblemDetail(type=f"https://api.drp.example.com/errors/{code}", title=detail, status=exc.status_code, detail=detail, code=code, instance=None)
    return JSONResponse(status_code=exc.status_code, content=problem.model_dump(mode="json"))


@app.post("/api/v1/prototype/advance-time")
async def advance_time(payload: dict[str, object]) -> dict[str, object]:
    dispute_id = UUID(str(payload["dispute_id"]))
    previous_status, new_status, message, outcome = service.advance_time_and_autoadjudicate(dispute_id, int(payload["hours_to_advance"]))
    return {
        "dispute_id": str(dispute_id),
        "previous_status": previous_status,
        "new_status": new_status,
        "message": message,
        "verdict_outcome": outcome,
        "explanation": "Merchant failed to submit evidence within the 72-hour window. Dispute auto-resolved in cardmember favor." if str(outcome) == "CARDMEMBER_WIN" else "Deadline advanced.",
    }


@app.post("/api/v1/prototype/seed")
async def seed() -> dict[str, int]:
    return await service.seed()
