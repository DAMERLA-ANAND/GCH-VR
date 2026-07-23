from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .app.admin_routes import internal_router, router as admin_router

app = FastAPI(title="Rule Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(internal_router)

