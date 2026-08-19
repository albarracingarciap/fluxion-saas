"""Instrumentación de llamadas a modelos, conforme al semconv de GenAI.

Instrumentación **manual y no automática**, a propósito. Las librerías de
instrumentación automática de LLM capturan por omisión el contenido de prompts
y respuestas; aunque el ingestor de Fluxion lo descarta al recibirlo, enviarlo
por la red ya es una decisión que no queremos tomar por el cliente. Aquí solo
sale lo que se escribe explícitamente, y no hay ninguna función para adjuntar
contenido.

Sirve además de implementación de referencia: es literalmente lo que se le
enseña a un cliente que pregunta "¿y yo cómo mando esto?".

Si `OTEL_EXPORTER_OTLP_ENDPOINT` no está definida, todo esto es inofensivo y no
hace nada. La telemetría nunca puede ser el motivo de que un servicio falle.
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from typing import Iterator

log = logging.getLogger("fluxion.telemetry")

_tracer = None
_enabled = False


def init_telemetry(
    service_name: str,
    system_id: str | None = None,
    environment: str | None = None,
) -> bool:
    """Arranca el exportador. Idempotente; devuelve si quedó activa."""
    global _tracer, _enabled

    if _tracer is not None:
        return _enabled

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not endpoint:
        log.info("telemetría desactivada: falta OTEL_EXPORTER_OTLP_ENDPOINT")
        _tracer, _enabled = False, False
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        attrs = {"service.name": service_name}
        if system_id:
            # Sin esto los tramos entran sin sistema asignado y hay que
            # reconciliarlos a mano en la bandeja de telemetría sin adscribir.
            attrs["fluxion.system_id"] = system_id
        if environment or os.getenv("FLUXION_ENV"):
            attrs["deployment.environment.name"] = environment or os.getenv("FLUXION_ENV", "")

        provider = TracerProvider(resource=Resource.create(attrs))
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        trace.set_tracer_provider(provider)

        _tracer = trace.get_tracer("fluxion.llm")
        _enabled = True
        log.info("telemetría activa hacia %s", endpoint)
    except Exception as e:  # noqa: BLE001
        log.warning("no se pudo iniciar la telemetría: %s", e)
        _tracer, _enabled = False, False

    return _enabled


class LlmCall:
    """Recolector de metadatos de una llamada. No admite contenido."""

    def __init__(self, span) -> None:
        self._span = span

    def usage(
        self,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        cached_tokens: int | None = None,
        reasoning_tokens: int | None = None,
    ) -> None:
        if self._span is None:
            return
        for key, value in (
            ("gen_ai.usage.input_tokens", input_tokens),
            ("gen_ai.usage.output_tokens", output_tokens),
            ("gen_ai.usage.cached_input_tokens", cached_tokens),
            ("gen_ai.usage.reasoning_tokens", reasoning_tokens),
        ):
            if value is not None:
                self._span.set_attribute(key, int(value))

    def response(
        self,
        model: str | None = None,
        response_id: str | None = None,
        finish_reasons: list[str] | None = None,
    ) -> None:
        if self._span is None:
            return
        if model:
            self._span.set_attribute("gen_ai.response.model", model)
        if response_id:
            self._span.set_attribute("gen_ai.response.id", response_id)
        if finish_reasons:
            self._span.set_attribute("gen_ai.response.finish_reasons", finish_reasons)

    def from_openai(self, response) -> None:
        """Atajo para una respuesta del SDK de OpenAI."""
        usage = getattr(response, "usage", None)
        if usage is not None:
            details = getattr(usage, "prompt_tokens_details", None)
            reasoning = getattr(usage, "completion_tokens_details", None)
            self.usage(
                input_tokens=getattr(usage, "prompt_tokens", None),
                output_tokens=getattr(usage, "completion_tokens", None),
                cached_tokens=getattr(details, "cached_tokens", None) if details else None,
                reasoning_tokens=getattr(reasoning, "reasoning_tokens", None) if reasoning else None,
            )
        choices = getattr(response, "choices", None) or []
        self.response(
            model=getattr(response, "model", None),
            response_id=getattr(response, "id", None),
            finish_reasons=[c.finish_reason for c in choices if getattr(c, "finish_reason", None)],
        )


@contextmanager
def llm_span(
    operation: str,
    provider: str,
    model: str,
    conversation_id: str | None = None,
    stream: bool = False,
) -> Iterator[LlmCall]:
    """Envuelve una llamada al modelo.

    El nombre del tramo sigue la convención `{operación} {modelo}`.
    Una excepción marca `error.type` y se vuelve a lanzar: la telemetría
    observa, no decide.
    """
    if not _enabled or _tracer in (None, False):
        yield LlmCall(None)
        return

    from opentelemetry.trace import Status, StatusCode

    with _tracer.start_as_current_span(f"{operation} {model}") as span:
        span.set_attribute("gen_ai.operation.name", operation)
        span.set_attribute("gen_ai.provider.name", provider)
        span.set_attribute("gen_ai.request.model", model)
        span.set_attribute("gen_ai.request.stream", stream)
        if conversation_id:
            span.set_attribute("gen_ai.conversation.id", conversation_id)

        try:
            yield LlmCall(span)
        except Exception as e:  # noqa: BLE001
            span.set_attribute("error.type", type(e).__name__)
            span.set_status(Status(StatusCode.ERROR))
            raise
