from __future__ import annotations

import pytest
from fastapi import HTTPException

from services.common.schemas import DisputeStatus
from services.dispute_service.app.state_machine import validate_state_transition


def test_valid_state_transition() -> None:
    validate_state_transition(DisputeStatus.FILED, DisputeStatus.EVIDENCE_COLLECTION)


def test_invalid_state_transition_raises() -> None:
    with pytest.raises(HTTPException) as exc:
        validate_state_transition(DisputeStatus.FILED, DisputeStatus.CLOSED)
    assert exc.value.status_code == 400
