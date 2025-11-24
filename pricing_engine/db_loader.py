"""
Utility to load the JSON databank into PostgreSQL.

- Creates database if missing.
- Applies schema from sql_schema.sql.
- Loads formularies and practice_data JSON into their respective tables.

Requires psycopg2 (`pip install psycopg2-binary`).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

import psycopg2
from psycopg2.extras import execute_batch, Json


ROOT = Path(__file__).resolve().parent.parent
SCHEMA_FILE = ROOT / "sql_schema.sql"
DATA_DIR = ROOT / "databank"


def env(name: str, default: str | None = None) -> str:
    val = os.getenv(name, default)
    if val is None:
        raise RuntimeError(f"Missing required env var: {name}")
    return val


def get_conn_params(dbname: str | None = None) -> Dict[str, Any]:
    return {
        "host": env("DB_HOST", "127.0.0.1"),
        "port": int(env("DB_PORT", "5432")),
        "user": env("DB_USER", "postgres"),
        "password": env("DB_PASSWORD", "mysecretpassword"),
        "dbname": dbname or env("DB_NAME", "vision_automation"),
    }


def ensure_database(dbname: str) -> None:
    params = get_conn_params(dbname="postgres")
    with psycopg2.connect(**params) as conn, conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (dbname,))
        exists = cur.fetchone() is not None
        if not exists:
            cur.execute(f"CREATE DATABASE {dbname}")
            conn.commit()


def apply_schema() -> None:
    sql = SCHEMA_FILE.read_text()
    with psycopg2.connect(**get_conn_params()) as conn, conn.cursor() as cur:
        cur.execute(sql)
        conn.commit()


def load_table(table: str, columns: Tuple[str, ...], rows: Iterable[Tuple[Any, ...]]) -> None:
    placeholders = ", ".join(["%s"] * len(columns))
    cols = ", ".join(columns)
    on_conflict = f"ON CONFLICT ({columns[0]}) DO NOTHING"
    sql = f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) {on_conflict}"
    with psycopg2.connect(**get_conn_params()) as conn, conn.cursor() as cur:
        execute_batch(cur, sql, rows, page_size=100)
        conn.commit()


def load_formulary(filename: str, table: str, fields: Tuple[str, ...]) -> None:
    data = json.loads((DATA_DIR / filename).read_text())
    rows = []
    for item in data:
        row = tuple(item.get(field) for field in fields)
        rows.append(row)
    load_table(table, fields, rows)


def load_practice_data() -> None:
    practice_dir = DATA_DIR / "practice_data"
    for file in practice_dir.glob("practice_*.json"):
        data = json.loads(file.read_text())
        rows = [(
            data.get("practice_id"),
            data.get("practice_name"),
            Json(data.get("uc_prices", {}).get("vsp", {})),
            Json(data.get("uc_prices", {}).get("spectera", {})),
            Json(data.get("uc_prices", {}).get("eyemed", {})),
            Json(data.get("bundles", [])),  # bundle schema is provider-specific; store whole array
            Json([]),
            Json([]),
        )]
        load_table(
            "practice_data",
            (
                "practice_id",
                "practice_name",
                "vsp_uc_prices",
                "spectera_uc_prices",
                "eyemed_uc_prices",
                "vsp_bundles",
                "spectera_bundles",
                "eyemed_bundles",
            ),
            rows,
        )


def main() -> None:
    dbname = env("DB_NAME", "vision_automation")
    ensure_database(dbname)
    apply_schema()

    load_formulary(
        "vsp_progressive_formulary.json",
        "vsp_progressive_formulary",
        (
            "product_id",
            "brand",
            "product_name",
            "tier",
            "tier_name",
            "is_customizable",
            "base_code",
            "design_type",
        ),
    )
    load_formulary(
        "vsp_ar_coating_formulary.json",
        "vsp_ar_coating_formulary",
        (
            "product_id",
            "brand",
            "product_name",
            "vsp_tier",
            "tier_name",
            "code",
            "has_blue_light",
            "warranty_years",
        ),
    )
    load_formulary(
        "spectera_progressive_formulary.json",
        "spectera_progressive_formulary",
        (
            "product_id",
            "brand",
            "product_name",
            "tier",
            "is_digital",
            "is_ray_ban",
            "is_short",
            "design_type",
        ),
    )
    load_formulary(
        "spectera_ar_coating_formulary.json",
        "spectera_ar_coating_formulary",
        (
            "product_id",
            "brand",
            "product_name",
            "tier",
            "has_blue_light",
            "has_mirror_option",
            "has_uv_backside",
            "is_ray_ban",
        ),
    )
    load_formulary(
        "eyemed_progressive_formulary.json",
        "eyemed_progressive_formulary",
        (
            "product_id",
            "brand",
            "product_name",
            "tier",
            "is_digital",
            "is_short",
            "is_wrap",
            "is_occupational",
            "design_type",
        ),
    )
    load_formulary(
        "eyemed_ar_coating_formulary.json",
        "eyemed_ar_coating_formulary",
        (
            "product_id",
            "brand",
            "product_name",
            "tier",
            "has_blue_light",
            "is_backside_only",
            "is_sun_specific",
        ),
    )
    load_practice_data()


if __name__ == "__main__":
    main()
