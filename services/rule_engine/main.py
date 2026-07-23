from __future__ import annotations

from fastapi import FastAPI

from .app.admin_routes import internal_router, router as admin_router

app = FastAPI(title="Rule Engine", version="1.0.0")
app.include_router(admin_router)
app.include_router(internal_router)
