"""Servicio de renderizado a PDF.

Recibe HTML, devuelve PDF. No sabe nada de Fluxion, ni de la base de datos, ni
de quién le pide las cosas.

Esa ignorancia es el diseño, no una limitación: la alternativa —darle una URL
de la aplicación y una credencial para autenticarse— convierte un generador de
PDF en un lector de todo el inventario si alguien se lleva el token. Aquí no hay
token que llevarse ni red por la que salir.

El contenedor arranca sin acceso a internet. Si algún día un HTML trae un
`<img src="http://…">`, no se cargará, y eso es lo correcto: un renderizador que
puede hacer peticiones es un cliente HTTP dentro de tu red interna disfrazado de
generador de documentos.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Response
from playwright.async_api import async_playwright
from pydantic import BaseModel, Field

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("fluxion.renderer")

RENDERER_SECRET = os.getenv("RENDERER_SECRET", "")
MAX_HTML_BYTES = int(os.getenv("MAX_HTML_BYTES", str(20 * 1024 * 1024)))

_browser = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Un único Chromium para todo el proceso.

    Levantarlo por petición cuesta entre uno y dos segundos y multiplica la
    memoria; el navegador no guarda estado entre renders porque cada uno usa su
    propio contexto.
    """
    global _browser
    async with async_playwright() as p:
        _browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        log.info("chromium listo")
        try:
            yield
        finally:
            await _browser.close()
            _browser = None


app = FastAPI(title="Fluxion · renderer", version="1.0.0", lifespan=lifespan)


class RenderRequest(BaseModel):
    html: str = Field(min_length=1)
    format: str = "A4"
    margin_top: str = "18mm"
    margin_bottom: str = "18mm"
    margin_left: str = "16mm"
    margin_right: str = "16mm"
    header_html: str | None = None
    footer_html: str | None = None


def _check_auth(authorization: str | None) -> None:
    # Sin secreto configurado el servicio queda abierto. Es exactamente el fallo
    # silencioso que ya nos mordió con CRON_SECRET, así que aquí se rechaza todo
    # en vez de dejar pasar todo.
    if not RENDERER_SECRET:
        log.error("RENDERER_SECRET no está configurado; rechazando la petición")
        raise HTTPException(status_code=503, detail="renderer sin configurar")
    if authorization != f"Bearer {RENDERER_SECRET}":
        raise HTTPException(status_code=401, detail="no autorizado")


@app.get("/health")
async def health() -> dict[str, object]:
    return {"status": "ok", "browser": _browser is not None}


@app.post("/render/v1/pdf")
async def render_pdf(
    req: RenderRequest,
    authorization: str | None = Header(default=None),
) -> Response:
    _check_auth(authorization)

    size = len(req.html.encode("utf-8"))
    if size > MAX_HTML_BYTES:
        raise HTTPException(status_code=413, detail=f"html de {size} bytes excede el máximo")

    if _browser is None:
        raise HTTPException(status_code=503, detail="navegador no disponible")

    context = await _browser.new_context()
    try:
        page = await context.new_page()
        # `wait_until="load"` y no "networkidle": no hay red, así que esperar
        # inactividad de red sería esperar a un temporizador.
        await page.set_content(req.html, wait_until="load")

        pdf = await page.pdf(
            format=req.format,
            print_background=True,
            display_header_footer=bool(req.header_html or req.footer_html),
            header_template=req.header_html or "<span></span>",
            footer_template=req.footer_html or "<span></span>",
            margin={
                "top": req.margin_top,
                "bottom": req.margin_bottom,
                "left": req.margin_left,
                "right": req.margin_right,
            },
        )
    finally:
        await context.close()

    log.info("render ok: %s bytes de html -> %s bytes de pdf", size, len(pdf))
    return Response(content=pdf, media_type="application/pdf")
