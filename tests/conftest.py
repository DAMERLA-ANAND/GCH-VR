from __future__ import annotations

import os
from pathlib import Path

import pytest

from services.common.database import STORE
from services.common.db_migrations import apply_migrations
from services.common.schemas import UserRole


@pytest.fixture(autouse=True)
def reset_store(tmp_path: Path):
    db_file = tmp_path / "drp_test.db"
    os.environ["DRP_DB_PATH"] = str(db_file)
    apply_migrations(str(db_file))

    STORE.db_path = str(db_file)
    STORE.users.clear()
    STORE.disputes.clear()
    STORE.evidence.clear()
    STORE.verdicts.clear()
    STORE.appeals.clear()
    STORE.funds_holds.clear()
    STORE.messages.clear()
    STORE.mediated_requests.clear()
    STORE.audit_events.clear()
    STORE.rule_sets.clear()
    STORE.transaction_map.clear()
    STORE.seed_defaults()
    STORE.sync_to_db()
    yield


@pytest.fixture
def auth_headers() -> dict[str, dict[str, str]]:
    cardmember = next(user for user in STORE.users.values() if user.type == UserRole.CARDMEMBER)
    merchant = next(user for user in STORE.users.values() if user.type == UserRole.MERCHANT)
    reviewer = next(user for user in STORE.users.values() if user.type == UserRole.REVIEWER)
    admin = next(user for user in STORE.users.values() if user.type == UserRole.ADMIN)
    return {
        "cardmember": {"X-Endpoint-API-UserInfo": f"role=CARDMEMBER;user_id={cardmember.id};email={cardmember.email}"},
        "merchant": {"X-Endpoint-API-UserInfo": f"role=MERCHANT;user_id={merchant.id};merchant_id={merchant.id};email={merchant.email}"},
        "reviewer": {"X-Endpoint-API-UserInfo": f"role=REVIEWER;user_id={reviewer.id};email={reviewer.email}"},
        "admin": {"X-Endpoint-API-UserInfo": f"role=ADMIN;user_id={admin.id};email={admin.email}"},
    }
