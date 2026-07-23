from __future__ import annotations

import sqlite3
from pathlib import Path


def apply_migrations(db_path: str) -> None:
    sql_path = Path(__file__).resolve().parents[2] / "migrations" / "versions" / "001_initial_schema.sql"
    script = sql_path.read_text(encoding="utf-8")
    connection = sqlite3.connect(db_path)
    try:
        connection.executescript(script)
        connection.commit()
    finally:
        connection.close()
