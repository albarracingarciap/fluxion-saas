"""Ingesta OTLP de telemetría de modelos.

Habla OTLP estándar a propósito. El cliente no instala nada de Fluxion: apunta
su exportador aquí con tres variables de entorno que ya conoce. La diferencia
entre una integración de una tarde y un proyecto de tres meses.

    OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.fluxion-ai.es
    OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer flx_xxx
    OTEL_RESOURCE_ATTRIBUTES=service.name=scoring,fluxion.system_id=<uuid>
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Request, Response

from . import store
from .otlp import ParseResult, parse_json, parse_protobuf

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("fluxion.telemetry")

REQUIRED_SCOPE = "telemetry:write"
MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", str(8 * 1024 * 1024)))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await store.pool()
    log.info("conexión a la base de datos lista")
    try:
        yield
    finally:
        await store.close_pool()


app = FastAPI(title="Fluxion · telemetría", version="1.0.0", lifespan=lifespan)


# HEAD además de GET: muchos monitores de disponibilidad usan HEAD por omisión,
# y un 405 ahí se interpreta como servicio caído.
@app.api_route("/health", methods=["GET", "HEAD"])
async def health() -> dict[str, object]:
    try:
        async with (await store.pool()).acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "ok", "db": True}
    except Exception as e:  # noqa: BLE001
        log.error("health: %s", e)
        return {"status": "degraded", "db": False}


def _empty_otlp_response(content_type: str) -> Response:
    """Respuesta conforme al contrato de OTLP.

    Aquí no se devuelve el recuento de tramos aceptados, aunque sería cómodo:
    OTLP espera un `ExportTraceServiceResponse` y algunos exportadores fallan
    al encontrarse campos que no reconocen. Los recuentos van en cabeceras
    `x-fluxion-*`, que nadie parsea y todo el mundo puede leer.
    """
    if "protobuf" in content_type:
        from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import (
            ExportTraceServiceResponse,
        )

        return Response(
            content=ExportTraceServiceResponse().SerializeToString(),
            media_type="application/x-protobuf",
        )
    return Response(content="{}", media_type="application/json")


@app.post("/v1/traces")
async def ingest_traces(
    request: Request,
    authorization: str | None = Header(default=None),
) -> Response:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="falta la credencial")

    key = await store.resolve_api_key(authorization[len("Bearer ") :].strip(), REQUIRED_SCOPE)
    if key is None:
        raise HTTPException(status_code=401, detail="credencial inválida o sin permiso")

    body = await request.body()
    if len(body) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail="lote demasiado grande")

    content_type = (request.headers.get("content-type") or "").lower()

    try:
        if "protobuf" in content_type:
            result: ParseResult = parse_protobuf(body)
        else:
            result = parse_json(json.loads(body or b"{}"))
    except Exception as e:  # noqa: BLE001
        log.warning("lote ilegible de org=%s: %s", key.organization_id, e)
        raise HTTPException(status_code=400, detail="lote ilegible") from e

    rows = []
    for span in result.spans:
        price = await store.price_for(
            span.provider_name, span.request_model, span.started_at.date(),
            key.organization_id,
        )
        cost = store.compute_cost(span, price)

        rows.append((
            key.organization_id, span.trace_id, span.span_id, span.parent_span_id,
            span.started_at, span.ended_at, span.duration_ms,
            span.operation_name, span.provider_name, span.request_model, span.response_model,
            span.input_tokens, span.output_tokens, span.cached_tokens, span.reasoning_tokens,
            span.conversation_id, span.response_id, span.finish_reasons, span.error_type,
            span.is_stream, span.ttft_ms,
            cost["cost_input"], cost["cost_output"], cost["cost_total"],
            cost["currency"], cost["price_id"], cost["cost_status"],
            span.ai_system_id, span.service_name, span.environment,
            json.dumps(span.attributes, default=str),
        ))

    try:
        written = await store.insert_spans(key.organization_id, rows)
    except Exception as e:  # noqa: BLE001
        # 5xx a propósito: el exportador reintentará y la deduplicación por
        # clave primaria hace que reintentar sea gratis.
        log.error("escritura fallida org=%s: %s", key.organization_id, e)
        raise HTTPException(status_code=503, detail="no se pudo escribir el lote") from e

    if result.seen_aliases:
        log.info("atributos con nombre antiguo: %s", ", ".join(sorted(result.seen_aliases)))

    log.info(
        "org=%s aceptados=%s no_ia=%s fuera_ventana=%s attrs_contenido=%s",
        key.organization_id, written, result.dropped_not_genai,
        result.dropped_out_of_window, result.dropped_content_attrs,
    )

    response = _empty_otlp_response(content_type)
    response.headers["x-fluxion-accepted"] = str(written)
    response.headers["x-fluxion-dropped-not-genai"] = str(result.dropped_not_genai)
    response.headers["x-fluxion-dropped-out-of-window"] = str(result.dropped_out_of_window)
    response.headers["x-fluxion-dropped-content-attrs"] = str(result.dropped_content_attrs)
    return response
