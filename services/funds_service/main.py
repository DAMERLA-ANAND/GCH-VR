from __future__ import annotations

from fastapi import FastAPI

from .app.routes import router

app = FastAPI(title="Funds Service", version="1.0.0")
app.include_router(router)
