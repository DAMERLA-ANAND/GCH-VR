from __future__ import annotations

from pathlib import Path
from uuid import uuid4


def build_gcs_uri(dispute_id: str, filename: str) -> str:
    return f"gs://drp-evidence-dev/{dispute_id}/{filename}"


def create_signed_url(uri: str, ttl_minutes: int = 15) -> dict[str, str]:
    return {"signed_url": f"https://signed.example.local/{uuid4()}", "expires_at": f"+{ttl_minutes}m", "gcs_uri": uri}


def infer_mime_suffix(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix else ".bin"
