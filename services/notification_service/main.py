from __future__ import annotations

from uuid import UUID

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..common.database import STORE
from ..common.schemas import NotificationRecord


app = FastAPI(title="Notification Service", version="1.0.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


@app.get("/api/v1/notifications")
async def list_notifications(user_id: UUID | None = None, dispute_id: UUID | None = None, event_type: str | None = None) -> dict[str, object]:
	items = list(STORE.notifications.values())
	if user_id is not None:
		items = [item for item in items if item.user_id == user_id]
	if dispute_id is not None:
		items = [item for item in items if item.dispute_id == dispute_id]
	if event_type is not None:
		items = [item for item in items if item.event_type == event_type]
	items.sort(key=lambda item: item.created_at, reverse=True)
	return {"items": [item.model_dump() for item in items], "total": len(items)}
