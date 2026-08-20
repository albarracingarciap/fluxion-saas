"""Escaneo de un repositorio.

Devuelve hallazgos, nunca codigo. Lo que se guarda es "que patron caso, en que
fichero y en que linea": suficiente para ir a mirarlo, y sin convertir a Fluxion
en un almacen de trozos de codigo ajeno con claves dentro.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any

from . import patterns as P
from .providers import Fichero, Repo

log = logging.getLogger("fluxion_connector_shadow_ai.scanner")

# Topes por repositorio. Un monorepo con veinte mil ficheros agotaria el limite
# de peticiones del proveedor y tardaria horas para no decir nada nuevo: los
# manifiestos ya delatan la mayor parte.
MAX_FICHEROS_CODIGO = int(os.getenv("MAX_FICHEROS_CODIGO", "120"))
MAX_BYTES_FICHERO = int(os.getenv("MAX_BYTES_FICHERO", "200000"))

# Peticiones que se dejan sin gastar. Agotar el limite del proveedor no solo
# rompe la pasada: deja sin API a cualquier otra cosa que use ese token durante
# el resto de la hora.
RESERVA_PETICIONES = int(os.getenv("RESERVA_PETICIONES", "500"))

# A partir de cuantos proveedores distintos en un mismo fichero se considera que
# es una LISTA y no una integracion.
#
# Una aplicacion real habla con uno o dos proveedores. Un fichero con diez
# dominios distintos es un catalogo: un analizador de seguridad, una lista de
# bloqueo, documentacion comparando modelos... o el propio catalogo de este
# escaner, que fue lo que delato el problema al escanear el repositorio de
# Fluxion y encontrarse a si mismo.
UMBRAL_CATALOGO = int(os.getenv("UMBRAL_CATALOGO", "4"))


def _lineas_con(texto: str, aguja: str) -> list[int]:
    return [i for i, linea in enumerate(texto.splitlines(), 1) if aguja in linea]


def _escanear_manifiesto(ruta: str, texto: str) -> list[dict[str, Any]]:
    """Librerias declaradas. Es la senal mas fiable: una dependencia declarada
    no es una sospecha, es un hecho."""
    hallazgos: list[dict[str, Any]] = []
    bajo = texto.lower()

    for lib, (categoria, severidad) in P.LIBRERIAS.items():
        if lib not in bajo:
            continue
        # Frontera de palabra para que 'jax' no case dentro de 'jaxlib-extra'
        # ni 'torch' dentro de 'pytorch-lightning' cuando ya se cuenta aparte.
        if not re.search(rf"(^|[^A-Za-z0-9_-]){re.escape(lib)}([^A-Za-z0-9_-]|$)", bajo, re.M):
            continue

        lineas = _lineas_con(bajo, lib)
        hallazgos.append({
            "finding_type": "library",
            "category": categoria,
            "pattern": lib,
            "file_path": ruta,
            "line_number": lineas[0] if lineas else None,
            "severity": severidad,
        })

    return hallazgos


def _escanear_codigo(ruta: str, texto: str) -> list[dict[str, Any]]:
    hallazgos: list[dict[str, Any]] = []
    ejemplo = P.es_ejemplo(ruta)

    encontrados = [(h, v) for h, v in P.ENDPOINTS.items() if h in texto]

    if len(encontrados) >= UMBRAL_CATALOGO:
        # Un solo hallazgo informativo en vez de diez de severidad alta. No se
        # descarta en silencio: si es un catalogo legitimo, quien lo revise lo
        # descarta en dos segundos; y si resulta que la aplicacion habla de
        # verdad con diez proveedores, el hallazgo sigue ahi para verlo.
        hallazgos.append({
            "finding_type": "endpoint",
            "category": "provider",
            "pattern": "catalogo_de_proveedores",
            "file_path": ruta,
            "line_number": None,
            "severity": "info",
            "metadata": {
                "proveedores": len(encontrados),
                "motivo": "el fichero enumera varios proveedores: parece una lista, no una integracion",
            },
        })
    else:
        for host, (categoria, severidad) in encontrados:
            lineas = _lineas_con(texto, host)
            hallazgos.append({
                "finding_type": "endpoint",
                "category": categoria,
                "pattern": host,
                "file_path": ruta,
                "line_number": lineas[0] if lineas else None,
                "severity": "medium" if ejemplo else severidad,
            })

    for nombre, regex, severidad in P.CREDENCIALES:
        for i, linea in enumerate(texto.splitlines(), 1):
            if not regex.search(linea):
                continue
            # El valor encontrado NO se guarda: ni completo, ni truncado, ni en
            # hash. Solo el nombre del patron, el fichero y la linea.
            hallazgos.append({
                "finding_type": "credential",
                "category": "secret",
                "pattern": nombre,
                "file_path": ruta,
                "line_number": i,
                # Un ejemplo copiado de produccion sigue siendo una fuga, pero
                # baja de severidad para no ahogar la lista de lo urgente.
                "severity": "medium" if ejemplo else severidad,
                "metadata": {"en_fichero_de_ejemplo": ejemplo},
            })
            break   # una por fichero y patron: basta para ir a mirarlo

    return hallazgos


def presupuesto_agotado(cliente) -> bool:
    restantes = getattr(cliente, "restantes", None)
    return restantes is not None and restantes <= RESERVA_PETICIONES


def escanear_repo(cliente, repo: Repo) -> list[dict[str, Any]]:
    """Una pasada completa sobre un repositorio."""
    try:
        ficheros: list[Fichero] = cliente.arbol(repo)
    except Exception as e:  # noqa: BLE001
        log.warning("no se pudo leer el arbol de %s: %s", repo.name, e)
        return []

    hallazgos: list[dict[str, Any]] = []

    # 1 · Manifiestos: pocos, pequenos y muy informativos
    for f in ficheros:
        nombre = f.path.rsplit("/", 1)[-1]
        if nombre not in P.MANIFIESTOS:
            continue
        texto = cliente.contenido(repo, f.path)
        if texto:
            hallazgos.extend(_escanear_manifiesto(f.path, texto))

    # 2 · Ficheros de modelo: no hay que abrirlos, basta la extension
    for f in ficheros:
        if f.path.lower().endswith(P.EXTENSIONES_MODELO):
            hallazgos.append({
                "finding_type": "model_file",
                "category": "ml",
                "pattern": f.path.rsplit(".", 1)[-1].lower(),
                "file_path": f.path,
                "line_number": None,
                "severity": "medium",
            })

    # 3 · Codigo: acotado. Se priorizan los ficheros pequenos, que es donde
    # suelen estar la configuracion y las claves; un modelo serializado de 40 MB
    # con extension .py no aporta nada y consume el presupuesto de peticiones.
    candidatos = [
        f for f in ficheros
        if f.path.lower().endswith(P.EXTENSIONES_CODIGO)
        and (f.size == 0 or f.size <= MAX_BYTES_FICHERO)
    ]
    candidatos.sort(key=lambda f: f.size)

    if len(candidatos) > MAX_FICHEROS_CODIGO:
        log.info(
            "%s tiene %s ficheros de codigo; se escanean los %s mas pequenos",
            repo.name, len(candidatos), MAX_FICHEROS_CODIGO,
        )

    for f in candidatos[:MAX_FICHEROS_CODIGO]:
        # Se comprueba dentro del bucle: un repositorio grande puede agotar el
        # presupuesto a mitad, y seguir solo consigue que fallen las peticiones
        # y se pierda tambien lo ya escaneado de los siguientes.
        if presupuesto_agotado(cliente):
            log.warning(
                "presupuesto de peticiones casi agotado: %s escaneado parcialmente",
                repo.name,
            )
            break
        texto = cliente.contenido(repo, f.path)
        if texto:
            hallazgos.extend(_escanear_codigo(f.path, texto))

    return hallazgos


def parece_ia(hallazgos: list[dict[str, Any]]) -> bool:
    """Si el repositorio merece entrar en la bandeja de descubrimientos.

    Una credencial expuesta sola no basta: puede ser una clave de un servicio
    que no es IA. Hace falta una libreria o un punto final de proveedor, que es
    lo que convierte el repositorio en candidato a sistema de IA.
    """
    return any(
        h["finding_type"] in ("library", "endpoint", "model_file")
        and h["pattern"] != "catalogo_de_proveedores"
        for h in hallazgos
    )
