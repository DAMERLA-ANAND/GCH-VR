from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from ...common.database import STORE
from ...common.schemas import CategoryCreateRequest, CategoryRecord, LoginRequest, LoginResponse, UserRole

router = APIRouter(prefix="/api/v1", tags=["auth-and-categories"])


@router.post("/auth/login")
async def login(payload: LoginRequest) -> LoginResponse:
    username = payload.username.lower().strip()
    password = payload.password.strip()

    if password != "password123" and password != "admin123":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    if username in {"admin", "reviewer"}:
        return LoginResponse(
            token="drp_token_admin",
            user_id=UUID("00000000-0000-0000-0000-000000000004"),
            role=UserRole.ADMIN,
            email="admin@example.com",
            display_name="Platform Admin",
        )
    elif username in {"merchant", "merchant_techstore"}:
        return LoginResponse(
            token="drp_token_merchant",
            user_id=UUID("00000000-0000-0000-0000-000000000002"),
            role=UserRole.MERCHANT,
            email="merchant_techstore@example.com",
            display_name="TechStore Merchant",
            merchant_id=UUID("00000000-0000-0000-0000-000000000002"),
        )
    elif username in {"alice", "cardmember"}:
        return LoginResponse(
            token="drp_token_cardmember",
            user_id=UUID("00000000-0000-0000-0000-000000000001"),
            role=UserRole.CARDMEMBER,
            email="alice@example.com",
            display_name="Alice Cardmember",
        )
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")


@router.get("/categories")
async def list_categories() -> dict[str, object]:
    items = [cat.model_dump() for cat in STORE.categories.values() if cat.is_active]
    return {"categories": items}
