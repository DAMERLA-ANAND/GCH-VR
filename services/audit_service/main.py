from __future__ import annotations

from uuid import UUID

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..common.database import STORE


app = FastAPI(title="Audit Service", version="1.0.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.get("/api/v1/audit-logs")
async def list_audit_logs(dispute_id: UUID | None = None, actor_id: str | None = None, action_type: str | None = None) -> dict[str, object]:
	items = list(STORE.audit_logs.values())
	if dispute_id is not None:
		items = [item for item in items if item.dispute_id == dispute_id]
	if actor_id is not None:
		items = [item for item in items if item.actor_id == actor_id]
	if action_type is not None:
		items = [item for item in items if item.action == action_type]
	items.sort(key=lambda item: item.timestamp, reverse=True)
	return {"items": [item.model_dump() for item in items], "total": len(items)}
