from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException, status

from .schemas import AuthContext, UserRole


ROLE_ALIASES = {
    "cardmember": UserRole.CARDMEMBER,
    "merchant": UserRole.MERCHANT,
    "reviewer": UserRole.REVIEWER,
    "admin": UserRole.ADMIN,
}


async def get_auth_context(
    x_endpoint_api_userinfo: str | None = Header(default=None, alias="X-Endpoint-API-UserInfo"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> AuthContext:
    token = x_endpoint_api_userinfo or authorization
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication context")
    if token.startswith("Bearer "):
        token = token.removeprefix("Bearer ")
    if token.startswith("drp_token_"):
        parts = token.split("_")
        role_key = parts[2] if len(parts) > 2 else "cardmember"
        if role_key in {"admin", "reviewer"}:
            return AuthContext(role=UserRole.ADMIN, user_id=UUID("00000000-0000-0000-0000-000000000004"), email="admin@example.com")
        elif role_key == "merchant":
            return AuthContext(role=UserRole.MERCHANT, user_id=UUID("00000000-0000-0000-0000-000000000002"), merchant_id=UUID("00000000-0000-0000-0000-000000000002"), email="merchant@example.com")
        else:
            return AuthContext(role=UserRole.CARDMEMBER, user_id=UUID("00000000-0000-0000-0000-000000000001"), email="alice@example.com")
    if token.startswith("role="):
        values: dict[str, str] = {}
        for fragment in token.split(";"):
            if "=" in fragment:
                key, value = fragment.split("=", 1)
                values[key.strip()] = value.strip()
        try:
            role = ROLE_ALIASES[values.get("role", "").lower()]
        except KeyError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid role claim") from exc
        try:
            user_id = UUID(values.get("user_id", ""))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user_id claim") from exc
        merchant_id = None
        merchant_value = values.get("merchant_id")
        if merchant_value:
            merchant_id = UUID(merchant_value)
        return AuthContext(role=role, user_id=user_id, merchant_id=merchant_id, email=values.get("email"))
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unsupported authentication context")
