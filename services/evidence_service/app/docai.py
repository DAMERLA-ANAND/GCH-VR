from __future__ import annotations

import re
from typing import Any


def parse_document(file_bytes: bytes, filename: str) -> dict[str, Any]:
    text = file_bytes.decode("utf-8", errors="ignore") if file_bytes else ""
    extracted: dict[str, Any] = {}
    lowered = text.lower()
    if "delivered" in lowered:
        extracted["delivery_status"] = "DELIVERED"
    if "usps" in lowered:
        extracted["carrier"] = "USPS"
    if "tracking" in lowered:
        match = re.search(r"\b\d{10,20}\b", text)
        if match:
            extracted["tracking_number"] = match.group(0)
    if "zip" in lowered and "mismatch" in lowered:
        extracted["zip_code_mismatch"] = True
    return {"ocr_text": text[:4000], "extracted_fields": extracted}
