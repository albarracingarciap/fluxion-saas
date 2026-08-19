"""Traducción de OTLP a tramos de LLM.

Dos caminos de entrada porque hay dos formatos reales:

  · protobuf — lo que envían por omisión casi todos los SDK de OpenTelemetry
  · JSON     — lo que envían los que se configuran con http/json

No se usa `google.protobuf.json_format` para el JSON, aunque parezca lo obvio:
**OTLP/JSON codifica trace_id y span_id en hexadecimal, mientras que la
codificación JSON estándar de protobuf usa base64**. Pasarle uno al otro falla,
y falla de una forma sutil. Se recorre el diccionario a mano, que además es poco
código porque solo se extraen unos pocos campos.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

log = logging.getLogger("fluxion.telemetry.otlp")

# ── Qué se conserva y qué no ─────────────────────────────────────────────────

# Un tramo entra solo si declara ser una operación de IA generativa. El resto de
# la traza del cliente se descarta: esto no es un APM.
GENAI_MARKERS = ("gen_ai.operation.name", "gen_ai.system", "gen_ai.provider.name")

# Fluxion NO almacena el contenido de prompts ni de respuestas. No basta con no
# pedirlo: un SDK mal configurado lo enviará algún día, y no puede quedarse nada.
# La lista es deliberadamente amplia; ante la duda, se descarta el atributo.
CONTENT_MARKERS = (
    "prompt", "completion", "content", "message", "input.value", "output.value",
    "gen_ai.input", "gen_ai.output", "tool.arguments", "tool.result",
)

# Alias históricos. Los atributos de GenAI se han renombrado más de una vez y
# las convenciones se mudaron a su propio repositorio; hay instrumentaciones
# antiguas en producción que seguirán enviando los nombres viejos durante años.
ALIASES = {
    "gen_ai.system": "gen_ai.provider.name",
    "gen_ai.usage.prompt_tokens": "gen_ai.usage.input_tokens",
    "gen_ai.usage.completion_tokens": "gen_ai.usage.output_tokens",
    "gen_ai.usage.total_tokens": "gen_ai.usage._total_tokens",
    "llm.usage.prompt_tokens": "gen_ai.usage.input_tokens",
    "llm.usage.completion_tokens": "gen_ai.usage.output_tokens",
    "deployment.environment": "deployment.environment.name",
}

MAX_FUTURE = timedelta(hours=48)
MAX_PAST = timedelta(days=30)


@dataclass
class LlmSpan:
    trace_id: str
    span_id: str
    parent_span_id: str | None
    started_at: datetime
    ended_at: datetime
    duration_ms: int
    operation_name: str
    provider_name: str
    request_model: str | None = None
    response_model: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cached_tokens: int | None = None
    reasoning_tokens: int | None = None
    conversation_id: str | None = None
    response_id: str | None = None
    finish_reasons: list[str] | None = None
    error_type: str | None = None
    is_stream: bool | None = None
    ai_system_id: str | None = None
    service_name: str | None = None
    environment: str | None = None
    attributes: dict[str, Any] = field(default_factory=dict)


@dataclass
class ParseResult:
    spans: list[LlmSpan] = field(default_factory=list)
    dropped_not_genai: int = 0
    dropped_out_of_window: int = 0
    dropped_content_attrs: int = 0
    seen_aliases: set[str] = field(default_factory=set)


# ── Utilidades ───────────────────────────────────────────────────────────────


def _as_int(v: Any) -> int | None:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _is_content(key: str) -> bool:
    k = key.lower()
    return any(m in k for m in CONTENT_MARKERS)


def _hex(v: Any) -> str | None:
    """trace_id/span_id llegan como hex (JSON) o como bytes (protobuf)."""
    if v is None:
        return None
    if isinstance(v, bytes):
        return v.hex()
    s = str(v).strip()
    return s or None


def _attr_value(v: dict[str, Any]) -> Any:
    """Desenvuelve un AnyValue de OTLP en JSON."""
    if not isinstance(v, dict):
        return v
    for k in ("stringValue", "boolValue", "intValue", "doubleValue"):
        if k in v:
            return int(v[k]) if k == "intValue" else v[k]
    if "arrayValue" in v:
        return [_attr_value(x) for x in v["arrayValue"].get("values", [])]
    return None


def _flatten_json_attrs(raw: list[dict[str, Any]] | None) -> tuple[dict[str, Any], int]:
    out: dict[str, Any] = {}
    dropped = 0
    for a in raw or []:
        key = a.get("key")
        if not key:
            continue
        if _is_content(key):
            dropped += 1
            continue
        out[key] = _attr_value(a.get("value", {}))
    return out, dropped


def _flatten_pb_attrs(raw: Any) -> tuple[dict[str, Any], int]:
    out: dict[str, Any] = {}
    dropped = 0
    for a in raw or []:
        key = a.key
        if _is_content(key):
            dropped += 1
            continue
        v = a.value
        which = v.WhichOneof("value")
        if which == "string_value":
            out[key] = v.string_value
        elif which == "bool_value":
            out[key] = v.bool_value
        elif which == "int_value":
            out[key] = int(v.int_value)
        elif which == "double_value":
            out[key] = v.double_value
        elif which == "array_value":
            out[key] = [
                x.string_value if x.WhichOneof("value") == "string_value" else None
                for x in v.array_value.values
            ]
    return out, dropped


def _normalise(attrs: dict[str, Any], seen: set[str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in attrs.items():
        if k in ALIASES:
            seen.add(k)
            out.setdefault(ALIASES[k], v)
        else:
            out[k] = v
    return out


def _build_span(
    attrs: dict[str, Any],
    resource: dict[str, Any],
    trace_id: str | None,
    span_id: str | None,
    parent_id: str | None,
    start_ns: int | None,
    end_ns: int | None,
    result: ParseResult,
) -> LlmSpan | None:
    if not trace_id or not span_id or not start_ns or not end_ns:
        return None

    started = datetime.fromtimestamp(start_ns / 1e9, tz=timezone.utc)
    ended = datetime.fromtimestamp(end_ns / 1e9, tz=timezone.utc)

    # El reloj lo pone la máquina del cliente. Si va desfasado, los agregados
    # diarios se desplazan y nadie entiende por qué. Se descartan y se cuentan;
    # descartarlos en silencio sería peor que aceptarlos.
    now = datetime.now(timezone.utc)
    if started > now + MAX_FUTURE or started < now - MAX_PAST:
        result.dropped_out_of_window += 1
        return None

    operation = attrs.get("gen_ai.operation.name")
    if not operation:
        return None

    known = {
        "gen_ai.operation.name", "gen_ai.provider.name", "gen_ai.request.model",
        "gen_ai.response.model", "gen_ai.usage.input_tokens", "gen_ai.usage.output_tokens",
        "gen_ai.usage.cached_input_tokens", "gen_ai.usage.reasoning_tokens",
        "gen_ai.conversation.id", "gen_ai.response.id", "gen_ai.response.finish_reasons",
        "error.type", "gen_ai.request.stream",
    }

    return LlmSpan(
        trace_id=trace_id,
        span_id=span_id,
        parent_span_id=parent_id or None,
        started_at=started,
        ended_at=ended,
        duration_ms=max(int((end_ns - start_ns) / 1e6), 0),
        operation_name=str(operation),
        provider_name=str(attrs.get("gen_ai.provider.name") or "unknown"),
        request_model=attrs.get("gen_ai.request.model"),
        response_model=attrs.get("gen_ai.response.model"),
        input_tokens=_as_int(attrs.get("gen_ai.usage.input_tokens")),
        output_tokens=_as_int(attrs.get("gen_ai.usage.output_tokens")),
        cached_tokens=_as_int(attrs.get("gen_ai.usage.cached_input_tokens")),
        reasoning_tokens=_as_int(attrs.get("gen_ai.usage.reasoning_tokens")),
        conversation_id=attrs.get("gen_ai.conversation.id"),
        response_id=attrs.get("gen_ai.response.id"),
        finish_reasons=[
            str(x) for x in (attrs.get("gen_ai.response.finish_reasons") or []) if x
        ] or None,
        error_type=attrs.get("error.type"),
        is_stream=attrs.get("gen_ai.request.stream"),
        ai_system_id=resource.get("fluxion.system_id"),
        service_name=resource.get("service.name"),
        environment=resource.get("deployment.environment.name"),
        attributes={k: v for k, v in attrs.items() if k not in known},
    )


# ── JSON ─────────────────────────────────────────────────────────────────────


def parse_json(payload: dict[str, Any]) -> ParseResult:
    result = ParseResult()

    for rs in payload.get("resourceSpans", []) or []:
        res_attrs, res_dropped = _flatten_json_attrs(
            (rs.get("resource") or {}).get("attributes")
        )
        result.dropped_content_attrs += res_dropped
        res_attrs = _normalise(res_attrs, result.seen_aliases)

        for ss in rs.get("scopeSpans", []) or []:
            for sp in ss.get("spans", []) or []:
                attrs, dropped = _flatten_json_attrs(sp.get("attributes"))
                result.dropped_content_attrs += dropped
                attrs = _normalise(attrs, result.seen_aliases)

                if not any(m in attrs for m in GENAI_MARKERS):
                    result.dropped_not_genai += 1
                    continue

                span = _build_span(
                    attrs, res_attrs,
                    _hex(sp.get("traceId")), _hex(sp.get("spanId")),
                    _hex(sp.get("parentSpanId")),
                    _as_int(sp.get("startTimeUnixNano")),
                    _as_int(sp.get("endTimeUnixNano")),
                    result,
                )
                if span:
                    result.spans.append(span)
                elif result.dropped_out_of_window == 0:
                    result.dropped_not_genai += 1

    return result


# ── protobuf ─────────────────────────────────────────────────────────────────


def parse_protobuf(body: bytes) -> ParseResult:
    from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import (
        ExportTraceServiceRequest,
    )

    req = ExportTraceServiceRequest()
    req.ParseFromString(body)

    result = ParseResult()

    for rs in req.resource_spans:
        res_attrs, res_dropped = _flatten_pb_attrs(rs.resource.attributes)
        result.dropped_content_attrs += res_dropped
        res_attrs = _normalise(res_attrs, result.seen_aliases)

        for ss in rs.scope_spans:
            for sp in ss.spans:
                attrs, dropped = _flatten_pb_attrs(sp.attributes)
                result.dropped_content_attrs += dropped
                attrs = _normalise(attrs, result.seen_aliases)

                if not any(m in attrs for m in GENAI_MARKERS):
                    result.dropped_not_genai += 1
                    continue

                span = _build_span(
                    attrs, res_attrs,
                    _hex(sp.trace_id), _hex(sp.span_id), _hex(sp.parent_span_id),
                    sp.start_time_unix_nano, sp.end_time_unix_nano,
                    result,
                )
                if span:
                    result.spans.append(span)

    return result
