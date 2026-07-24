from __future__ import annotations

import re
from typing import Any


def parse_document(file_bytes: bytes, filename: str) -> dict[str, Any]:
    text = file_bytes.decode("utf-8", errors="ignore") if file_bytes else ""
    extracted: dict[str, Any] = {}
    
    # If raw PDF stream binary tags present, clean up ocr_text for readability
    is_pdf_binary = file_bytes and file_bytes.startswith(b"%PDF")
    
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
        
    cleaned_ocr_text = text[:4000]
    if is_pdf_binary:
        # Extract readable string lines from PDF stream or format structured summary
        readable_lines = [line.strip() for line in text.splitlines() if line.strip() and not line.startswith("%") and not line.startswith("<<") and not line.startswith(">>") and not line.startswith("stream") and not line.startswith("endstream") and not line.startswith("endobj") and not line.startswith("xref")]
        cleaned_ocr_text = "\n".join(readable_lines[:20]) if readable_lines else f"PDF Document: {filename}"

    return {"ocr_text": cleaned_ocr_text, "extracted_fields": extracted}
