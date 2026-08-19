"""Acceso a PostgreSQL: claves de API, tarifas y escritura de tramos.

Va directo a la base de datos y no a través de la API de la aplicación, a
diferencia del resto de servicios. El motivo es el volumen: la telemetría son
miles de filas por lote, y hacerlas pasar por Next.js sería poner el cuello de
botella justo donde más tráfico hay.
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from dataclasses import dataclass
from datetime import date, datetime

import asyncpg

from .otlp import LlmSpan

log = logging.getLogger("fluxion.telemetry.store")

_pool: asyncpg.Pool | None = None


async def pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        dsn = os.getenv("DATABASE_URL")
        if not dsn:
            raise RuntimeError("DATABASE_URL no está configurada")
        _pool = await asyncpg.create_pool(dsn, min_size=1, max_size=int(os.getenv("DB_POOL_MAX", "8")))
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


# ── Claves de API ────────────────────────────────────────────────────────────


@dataclass
class ApiKey:
    id: str
    organization_id: str
    scopes: list[str]


async def resolve_api_key(raw_key: str, required_scope: str) -> ApiKey | None:
    """Valida una clave. Mismo hash que `apps/web/lib/auth/api-key.ts`: sha256 hex.

    **Sin caché, a propósito.** Ya nos pasó que la caché de fetch de Next.js
    mantuvo viva una clave revocada durante minutos. Una credencial retirada
    tiene que dejar de funcionar en la siguiente petición, no cuando caduque un
    temporizador.
    """
    if not raw_key.startswith("flx_"):
        return None

    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    async with (await pool()).acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, organization_id, scopes, expires_at, revoked_at
              FROM fluxion.api_keys
             WHERE key_hash = $1
            """,
            key_hash,
        )

    if row is None:
        log.warning("clave desconocida (hash %s…)", key_hash[:12])
        return None

    # Presentar una credencial revocada no es un error de tecleo: o alguien
    # sigue usando una integración dada de baja, o la clave se filtró.
    if row["revoked_at"] is not None:
        log.warning("CLAVE REVOCADA presentada: key=%s revoked_at=%s", row["id"], row["revoked_at"])
        return None

    if row["expires_at"] is not None and row["expires_at"] < datetime.now(row["expires_at"].tzinfo):
        log.warning("clave caducada presentada: key=%s", row["id"])
        return None

    scopes = list(row["scopes"] or [])
    if required_scope not in scopes and "write" not in scopes and "admin" not in scopes:
        return None

    return ApiKey(id=str(row["id"]), organization_id=str(row["organization_id"]), scopes=scopes)


# ── Tarifas ──────────────────────────────────────────────────────────────────


@dataclass
class Price:
    id: str
    input_per_million: float
    output_per_million: float
    cached_input_per_million: float | None
    reasoning_per_million: float | None
    currency: str


_price_cache: dict[tuple[str, str, str], tuple[float, Price | None]] = {}
_PRICE_TTL = 300.0


async def price_for(provider: str, model: str | None, when: date) -> Price | None:
    """Tarifa vigente. Se cachea cinco minutos: los precios no cambian a media
    tarde, y consultarlos por tramo multiplicaría las consultas por mil."""
    if not model:
        return None

    key = (provider, model, when.isoformat())
    hit = _price_cache.get(key)
    if hit and time.monotonic() - hit[0] < _PRICE_TTL:
        return hit[1]

    async with (await pool()).acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, input_per_million, output_per_million,
                   cached_input_per_million, reasoning_per_million, currency
              FROM telemetry.model_prices
             WHERE provider = $1 AND model = $2 AND effective_from <= $3
             ORDER BY effective_from DESC
             LIMIT 1
            """,
            provider, model, when,
        )

    price = (
        Price(
            id=str(row["id"]),
            input_per_million=float(row["input_per_million"]),
            output_per_million=float(row["output_per_million"]),
            cached_input_per_million=(
                float(row["cached_input_per_million"]) if row["cached_input_per_million"] is not None else None
            ),
            reasoning_per_million=(
                float(row["reasoning_per_million"]) if row["reasoning_per_million"] is not None else None
            ),
            currency=row["currency"],
        )
        if row
        else None
    )

    _price_cache[key] = (time.monotonic(), price)
    return price


def compute_cost(span: LlmSpan, price: Price | None) -> dict[str, object]:
    """Coste congelado en el momento de ingerir.

    `cost_status` no es cosmético: distingue una cifra en la que se puede basar
    un presupuesto de otra que solo es un orden de magnitud. Con caché de
    contexto y modelos de razonamiento, ignorar el desglose se desvía por
    factores de tres.
    """
    if price is None:
        return {
            "cost_input": None, "cost_output": None, "cost_total": None,
            "currency": "USD", "price_id": None, "cost_status": "unknown",
        }

    entrada = span.input_tokens or 0
    salida = span.output_tokens or 0
    cacheados = span.cached_tokens or 0
    razonamiento = span.reasoning_tokens or 0

    status = "exact"

    # Los tokens en caché se cobran aparte y más baratos. Si el tramo los
    # declara pero no hay tarifa de caché, la cifra es una estimación por exceso.
    if cacheados and price.cached_input_per_million is None:
        status = "estimated"
    if razonamiento and price.reasoning_per_million is None:
        status = "estimated"

    frescos = max(entrada - cacheados, 0) if price.cached_input_per_million is not None else entrada

    coste_entrada = frescos / 1_000_000 * price.input_per_million
    if price.cached_input_per_million is not None and cacheados:
        coste_entrada += cacheados / 1_000_000 * price.cached_input_per_million

    coste_salida = salida / 1_000_000 * price.output_per_million
    if price.reasoning_per_million is not None and razonamiento:
        coste_salida += razonamiento / 1_000_000 * price.reasoning_per_million

    return {
        "cost_input": round(coste_entrada, 6),
        "cost_output": round(coste_salida, 6),
        "cost_total": round(coste_entrada + coste_salida, 6),
        "currency": price.currency,
        "price_id": price.id,
        "cost_status": status,
    }


# ── Escritura ────────────────────────────────────────────────────────────────

INSERT_SQL = """
INSERT INTO telemetry.llm_spans (
  organization_id, trace_id, span_id, parent_span_id,
  started_at, ended_at, duration_ms,
  operation_name, provider_name, request_model, response_model,
  input_tokens, output_tokens, cached_tokens, reasoning_tokens,
  conversation_id, response_id, finish_reasons, error_type, is_stream,
  cost_input, cost_output, cost_total, currency, price_id, cost_status,
  ai_system_id, service_name, environment, attributes
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
  $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30::jsonb
)
ON CONFLICT (organization_id, started_at, trace_id, span_id) DO NOTHING
"""


async def insert_spans(organization_id: str, rows: list[tuple]) -> int:
    """Inserta en lote. El ON CONFLICT es la deduplicación: los exportadores de
    OTel reintentan ante un 5xx y sin esto un corte de red duplicaría el coste
    del día."""
    if not rows:
        return 0

    async with (await pool()).acquire() as conn:
        async with conn.transaction():
            await conn.executemany(INSERT_SQL, rows)

    return len(rows)
